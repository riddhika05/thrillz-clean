// Whisper.jsx

"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import commentIcon from "../assets/comment.png";
import { useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import HeartButton from "../components/heart";
import { supabase } from "../supabaseClient";
import { FaGem } from "react-icons/fa";

// Make sure your CSS is imported
import "../styles/animation.css";

// Helper function to generate petals
const generatePetals = (containerRef) => {
  if (!containerRef.current) return;
  const count = 10;
  const container = containerRef.current;

  for (let i = 0; i < count; i++) {
    const petal = document.createElement("div");
    petal.classList.add("petal");
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.top = `${Math.random() * 100}%`;
    petal.style.animationDelay = `${Math.random() * 0.5}s`;
    container.appendChild(petal);

    // Clean up the petal element after the animation
    petal.addEventListener("animationend", () => {
      petal.remove();
    });
  }
};


// Modal component
const PointsModal = ({ isOpen, currentPoints, onClose }) => {
  const modalRef = useRef(null);
  const [isBlooming, setIsBlooming] = useState(false);

  useEffect(() => {
    if (isOpen && !isBlooming) {
      setIsBlooming(true);
      // Trigger the petal generation
      generatePetals(modalRef);
    }
  }, [isOpen, isBlooming]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div 
        ref={modalRef}
        className="relative bg-white p-6 rounded-lg shadow-lg text-center overflow-hidden" // Added relative and overflow-hidden
      >
        <h2 className="text-xl font-bold text-pink-700">Whisper Unlocked!</h2>
        <div className="flex items-center justify-center gap-2 mt-4 text-pink-500 font-semibold">
          <FaGem className="text-lg" />
          <span>Your current points: {currentPoints}</span>
        </div>
        <button
          onClick={onClose}
          className="mt-6 bg-pink-500 text-white rounded-full px-4 py-2 hover:bg-pink-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const Whisper = ({ whisper, containerRef, maxDistance, userPoints, onPointsUpdate, unlocked, onUnlockSuccess }) => {
  const user = whisper.users;
  const ref = useRef(null);
  const [locationName, setLocationName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayPoints, setDisplayPoints] = useState(userPoints);

  const { scrollYProgress } = useScroll({
    target: ref,
    container: containerRef,
    offset: ["start end", "center center"],
  });

  const navigate = useNavigate();
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1.1, 0.85]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.5, 1, 0.5]);

  const handleCommentClick = () => {
    navigate("/comments", { state: { whisper } });
  };

  const handleUserClick = () => {
    navigate("/follow", { state: { whisper } });
  };

  useEffect(() => {
    const fetchLocation = async () => {
      if (!whisper.latitude || !whisper.longitude) return;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${whisper.latitude}&lon=${whisper.longitude}&format=json`
        );
        const data = await res.json();
        if (data?.display_name) {
          setLocationName(data.display_name);
        }
      } catch (err) {
        console.error("Error fetching location:", err);
      }
    };

    fetchLocation();
  }, [whisper.latitude, whisper.longitude]);

  const isLockedByDistance = whisper.distance > maxDistance;
  const isWhisperLocked = isLockedByDistance && !unlocked;

  const handleUnlock = async () => {
    if (userPoints < 2) {
      alert("You don't have enough points to unlock this whisper. You need 2 points.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { data: userData, error: userFetchError } = await supabase
      .from('users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (userFetchError) {
      console.error("Error fetching user's bigint ID:", userFetchError);
      alert("Failed to unlock whisper. Please try again.");
      return;
    }
    
    const userIdBigInt = userData.id;
    const newPoints = userPoints - 2;

    const { error: pointsError } = await supabase
      .from('users')
      .update({ points: newPoints })
      .eq('user_id', user.id);

    if (pointsError) {
      console.error("Error updating points:", pointsError);
      alert("Failed to unlock whisper. Please try again.");
      return;
    }

    const { error: unlockError } = await supabase
      .from('unlocked_whispers')
      .insert({ user_id: userIdBigInt, whisper_id: whisper.id });

    if (unlockError) {
      console.error("Error inserting unlock record:", unlockError);
      alert("Failed to unlock whisper. Please try again.");
      return;
    }

    onPointsUpdate(newPoints);
    onUnlockSuccess(whisper.id);

    setDisplayPoints(newPoints);
    setIsModalOpen(true);
  };

  return (
    <>
      <motion.div
        ref={ref}
        style={{ scale, opacity }}
        className="relative w-11/12 max-w-lg mx-auto rounded-3xl shadow-lg bg-pink-100 py-4 px-6 sm:py-6 sm:px-8 mb-16 sm:mb-20 transition-all duration-300 overflow-hidden"
        initial={{ scale: 0.85, opacity: 0.5 }}
        whileInView={{ scale: 1.1, opacity: 1 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={{ type: "spring", bounce: 0.4 }}
      >
        {isWhisperLocked && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-20 flex-col">
            <span className="text-pink-700 font-bold text-lg bg-white/70 rounded-sm p-1">🔒 Unlock to view</span>
            <button onClick={handleUnlock} className="mt-2 text-white bg-pink-500 rounded-full px-4 py-2 text-sm font-semibold hover:bg-pink-600 transition-colors">
              Unlock (2 pts)
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 pb-2">
          {user && (
            <>
              <img
                src={user.profilepic}
                alt={user.username}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-pink-300 ${isWhisperLocked ? "blur-sm" : ""}`}
              />
              <div
                className="flex flex-col cursor-pointer"
                onClick={handleUserClick}
              >
                <span className={`text-pink-800 font-semibold text-xs sm:text-sm ${isWhisperLocked ? "blur-sm" : ""}`}>
                  {user.username}
                </span>
                {locationName && (
                  <span className="text-pink-600 text-[10px] sm:text-xs">
                    📍 {locationName}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className={`mt-2 font-[cursive] text-sm sm:text-[16px] text-[#784552] leading-6 ${isWhisperLocked ? "blur-sm" : ""}`}>
          {whisper.content}
        </div>

        {whisper.Image_url && (
          <div className="mt-2 flex justify-center">
            <img
              src={whisper.Image_url}
              alt="Whisper"
              className={`w-40 h-40 object-cover rounded-lg shadow ${isWhisperLocked ? "blur-sm" : ""}`}
            />
          </div>
        )}

        <div className="flex gap-4 sm:gap-6 md:gap-8 bg-pink-400 rounded-2xl px-4 py-2 sm:px-6 sm:py-3 mt-4 sm:mt-6 justify-center shadow-lg">
          <button className="hover:scale-110 transition-transform">
            <HeartButton />
          </button>
          <button
            onClick={handleCommentClick}
            className="hover:scale-110 transition-transform"
          >
            <img
              src={commentIcon}
              alt="Comment"
              className="w-5 h-5 sm:w-6 sm:h-6"
            />
          </button>
        </div>
      </motion.div>

      <PointsModal
        isOpen={isModalOpen}
        currentPoints={displayPoints}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default Whisper;