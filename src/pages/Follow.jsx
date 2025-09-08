import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { FaArrowLeft } from "react-icons/fa";
import profileBkg from "../assets/profile_bkg.png";
import heartIcon from "../assets/heart.png";
import commentIcon from "../assets/comment.png";
import trashIcon from "../assets/Trash.png";
import { useNavigate, useLocation } from "react-router-dom";
import { useWindowSize } from "react-use";
import Confetti from "react-confetti";
import HeartButton from "../components/heart";
import DreamyLoader from '../components/loader'
const Follow = () => {
  const [whispers, setWhispers] = useState([]);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { whisper } = location.state || {};
  const { width, height } = useWindowSize();
  const [currentProfileId, setCurrentProfileId] = useState(null);

  // Fetch current auth user and map to profile id, redirect if viewing self
  useEffect(() => {
    async function fetchCurrentProfileId() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!error && data?.id) {
        setCurrentProfileId(data.id);
        if (whisper && whisper.user_id === data.id) {
          navigate("/profile");
        }
      }
    }
    fetchCurrentProfileId();
  }, [navigate, whisper]);

  const handleCommentClick = (whisper) => {
    navigate("/comments", { state: { whisper } });
  };
  const handleChat = () => {
    navigate("/chat");
  };

  const handleContinue = () => {
    navigate("/post");
  };

  const handleDelete = async (whisperId) => {
    try {
      const { error } = await supabase
        .from("Whispers")
        .delete()
        .eq("id", whisperId);
      if (error) throw error;

      setWhispers(whispers.filter((w) => w.id !== whisperId));
    } catch (error) {
      console.error("Error deleting whisper:", error.message);
      setError("Failed to delete the whisper. Please try again.");
    }
  };

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 6000);
  };

  useEffect(() => {
    async function fetchWhispers() {
      const userId = whisper ? whisper.user_id : null;

      if (!userId) return;

      const { data, error } = await supabase
        .from("Whispers")
        .select(
          `
          id,
          content,
          user_id,
          Image_url,
          users:user_id (username, gmail, profilepic)
        `
        )
        .eq("user_id", userId);

      if (error) {
        setError(error.message);
      } else {
        setWhispers(data);
      }
    }
    fetchWhispers();
  }, [whisper]);

  const displayedUser = whisper
    ? whisper.users
    : { username: "Guest User", profilepic: "placeholder_url", whispers: 0 };

  const isCurrentUserProfile = whisper && currentProfileId && whisper.user_id === currentProfileId;

  // 🚨 Prevent rendering anything while redirecting
  if (isCurrentUserProfile) return null;

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${profileBkg})` }}
    >
      <div className="flex justify-between p-4 md:p-6 lg:p-8">
        <FaArrowLeft
          className="text-pink-300 text-3xl cursor-pointer"
          onClick={handleContinue}
        />
      </div>

      <div className="flex flex-col items-center gap-5 mt-5">
        <div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full overflow-hidden border-4 border-pink-300">
          <img
            src={
              isCurrentUserProfile
                ? "/path/to/myImage.png"
                : displayedUser.profilepic
            }
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-6 md:gap-8 lg:gap-10">
          <div className="flex flex-col items-center">
            <span className="font-sans text-2xl md:text-3xl lg:text-4xl font-bold text-white">
              2k
            </span>
            <span className="font-sans text-sm md:text-base lg:text-lg text-white">
              points
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-sans text-2xl md:text-3xl lg:text-4xl font-bold text-white">
              2k
            </span>
            <span className="font-sans text-sm md:text-base lg:text-lg text-white">
              likes
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-sans text-2xl md:text-3xl lg:text-4xl font-bold text-white">
              {whispers.length}
            </span>
            <span className="font-sans text-sm md:text-base lg:text-lg text-white">
              whispers
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-5 gap-5">
        {isCurrentUserProfile ? (
          <button
            className="bg-pink-300 text-white font-['Pacifico'] rounded-full px-6 py-2 text-lg md:text-xl lg:text-2xl cursor-pointer"
            onClick={() => navigate("/profile")}
          >
            Edit Profile
          </button>
        ) : (
          <button
            className="bg-pink-300 text-white font-['Pacifico'] rounded-full px-6 py-2 text-lg md:text-xl lg:text-2xl cursor-pointer"
            onClick={toggleFollow}
          >
            {isFollowing ? "Following" : "Follow"}
            {showConfetti && (
              <Confetti width={width} height={height} numberOfPieces={300} />
            )}
          </button>
        )}
        <button
          className="bg-pink-300 text-white font-['Pacifico'] rounded-full px-6 py-2 text-lg md:text-xl lg:text-2xl cursor-pointer"
          onClick={handleChat}
        >
          Chat
        </button>
      </div>

      <h2 className="text-2xl md:text-3xl lg:text-4xl text-center font-['Delius'] mt-6 md:mt-8 text-white font-bold">
        {isCurrentUserProfile
          ? "My Whispers"
          : `${displayedUser.username}'s Whispers`}
      </h2>

      <div className="flex flex-wrap justify-center gap-4 md:gap-1 lg:gap-4 mt-4">
        {error && <div className="text-red-500">{error}</div>}
        {whispers.length === 0 && !error && (
          <DreamyLoader/>
        )}
        {whispers.map((whisper) => (
          <div
            key={whisper.id}
            className="relative w-11/12 max-w-lg mx-auto rounded-3xl shadow-lg bg-pink-100 py-4 px-6 sm:py-6 sm:px-8 mb-3 sm:mb-4"
          >
            <div className="mt-2 font-[cursive] text-sm sm:text-[16px] text-[#784552] leading-6">
              {whisper.content}
            </div>
            {whisper.Image_url && (
              <div className="mt-2 flex justify-center">
                <img
                  src={whisper.Image_url}
                  alt="Whisper"
                  className="w-40 h-40 object-cover rounded-lg shadow" // Fixed size
                />
              </div>
            )}
            <div className="flex gap-4 sm:gap-6 md:gap-8 bg-pink-400 rounded-2xl px-4 py-2 sm:px-6 sm:py-3 mt-4 sm:mt-6 justify-center shadow-lg overflow-hidden">
              <button className="hover:scale-110 transition-transform">
                <HeartButton/>
              </button>
              <button
                onClick={() => handleCommentClick(whisper)}
                className="hover:scale-110 transition-transform"
              >
                <img
                  src={commentIcon}
                  alt="Comment"
                  className="w-5 h-5 sm:w-6 sm:h-6"
                />
              </button>
              {isCurrentUserProfile && (
                <button
                  className="hover:scale-110 transition-transform"
                  onClick={() => handleDelete(whisper.id)}
                >
                  <img
                    src={trashIcon}
                    alt="Delete"
                    className="w-5 h-5 sm:w-6 sm:h-6"
                  />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Follow;
