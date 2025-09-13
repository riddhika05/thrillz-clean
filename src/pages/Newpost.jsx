import React, { useState, useRef, useEffect } from "react";
import backgroundImage from "../assets/new post.png";
import { FaArrowLeft, FaGem } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import axios from "axios";
import musicIcon from "../assets/music.png"; // ✅ Ensure path is correct

export default function NewPost({ audioRef }) {
  const [text, setText] = useState("");
  const [color, setColor] = useState("#784552");
  const [fontSize, setFontSize] = useState("text-base");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [image, setImage] = useState(null);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef();
  const textareaRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState("Loading location...");
  const [profileId, setProfileId] = useState(null);

  // 🎉 Bonus modal state
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [bonusTitle, setBonusTitle] = useState("");

  // 🎵 Music mute state
  const [isMuted, setIsMuted] = useState(false);
  useEffect(() => {
    if (audioRef?.current) {
      setIsMuted(audioRef.current.muted);
    }
  }, [audioRef]);

  const toggleMute = () => {
    if (!audioRef?.current) return;
    const newMuteState = !audioRef.current.muted;
    audioRef.current.muted = newMuteState;
    setIsMuted(newMuteState);
  };

  const navigate = useNavigate();

  // Bonus Modal Component
  const BonusModal = ({ isOpen, title, points }) => {
    useEffect(() => {
      if (isOpen) {
        const timer = setTimeout(() => {
          setShowBonusModal(false);
          navigate("/post"); // navigate after modal closes
        }, 2000);
        return () => clearTimeout(timer);
      }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm mx-4">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-pink-700 mb-2">{title}</h2>
          <div className="flex items-center justify-center gap-2 text-xl text-pink-500 font-semibold mb-4">
            <FaGem className="text-2xl" />
            <span>+{points} Points</span>
          </div>
          <p className="text-gray-600 text-sm">Welcome to the whisper community!</p>
        </div>
      </div>
    );
  };

  // Handle image upload
  const handleImageUpload = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleContinue = () => navigate("/post");
  const handleColorChange = (event) => setColor(event.target.value);
  const handleFontSize = () =>
    setFontSize(fontSize === "text-base" ? "text-xl" : "text-base");
  const handleBold = () => setIsBold(!isBold);
  const handleItalic = () => setIsItalic(!isItalic);
  const handleClear = () => {
    setText("");
    setImage(null);
    setFile(null);
  };

  // Upload whisper to Supabase
  const handleUpload = async () => {
    try {
      let imageUrl = null;

      // Upload image if selected
      if (file) {
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("Post_images")
          .upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("Post_images")
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      // Resolve user + profile ID
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user)
        throw new Error(authError?.message || "No logged-in user");

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, points")
        .eq("user_id", user.id)
        .single();
      if (profileError) throw profileError;

      const effectiveUserId = profile.id;
      setProfileId(effectiveUserId);

      // Get current whisper count
      const { data: existingWhispers } = await supabase
        .from("Whispers")
        .select("id")
        .eq("user_id", effectiveUserId);
      const currentCount = Array.isArray(existingWhispers)
        ? existingWhispers.length
        : 0;

      // Determine milestone
      const newTotalCount = currentCount + 1;
      let milestoneBonus = 0;
      let milestoneTitle = "";
      if (newTotalCount === 1) {
        milestoneBonus = 5;
        milestoneTitle = "First Whisper Bonus!";
      } else if (newTotalCount === 10) {
        milestoneBonus = 10;
        milestoneTitle = "Milestone: 10 Whispers!";
      } else if (newTotalCount === 50) {
        milestoneBonus = 30;
        milestoneTitle = "Milestone: 50 Whispers!";
      }

      if (milestoneBonus > 0) {
        setBonusPoints(milestoneBonus);
        setBonusTitle(milestoneTitle);
        setShowBonusModal(true);
      }

      // Get live coordinates
      let latitude = null,
        longitude = null;
      if (navigator.geolocation) {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              latitude = pos.coords.latitude;
              longitude = pos.coords.longitude;
              resolve();
            },
            reject
          );
        });
      }

      // Insert whisper
      const { error: insertError } = await supabase.from("Whispers").insert([
        {
          content: text,
          user_id: effectiveUserId,
          Image_url: imageUrl,
          latitude,
          longitude,
        },
      ]);
      if (insertError) throw insertError;

      // If milestone, update points
      if (milestoneBonus > 0) {
        const newPoints = profile.points + milestoneBonus;
        await supabase
          .from("users")
          .update({ points: newPoints })
          .eq("user_id", user.id);
        return;
      }

      navigate("/post");
    } catch (err) {
      console.error("Error uploading whisper:", err.message);
      alert("Upload failed: " + err.message);
    }
  };

  // Fetch + set user location
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        let idToUse = profileId;
        if (!idToUse) {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();
          if (authError || !user)
            return setCurrentLocation("Could not fetch location.");

          const { data: profile } = await supabase
            .from("users")
            .select("id")
            .eq("user_id", user.id)
            .single();
          if (!profile) return setCurrentLocation("Could not fetch location.");

          idToUse = profile.id;
          setProfileId(idToUse);
        }

        const { data } = await supabase
          .from("users")
          .select("Location")
          .eq("id", idToUse)
          .single();

        const userLocation = data?.Location;
        if (!userLocation && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude, longitude } = pos.coords;
              try {
                const response = await axios.get(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                );
                const fetchedLocationName = response.data.display_name;
                setCurrentLocation(fetchedLocationName);

                await supabase
                  .from("users")
                  .update({ Location: fetchedLocationName })
                  .eq("id", idToUse);
              } catch {
                setCurrentLocation("Location not found.");
              }
            },
            () =>
              setCurrentLocation("Location access denied or not available.")
          );
        } else {
          setCurrentLocation(userLocation || "Unknown");
        }
      } catch {
        setCurrentLocation("Could not fetch location.");
      }
    };

    fetchLocation();
  }, []);

  // Keep cursor at end
  useEffect(() => {
    if (textareaRef.current) {
      const end = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(end, end);
      textareaRef.current.focus();
    }
  }, [text]);

  return (
    <>
      <BonusModal
        isOpen={showBonusModal}
        title={bonusTitle}
        points={bonusPoints}
      />

      <div
        className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        {/* Back button */}
        <div className="absolute top-6 left-6 z-10">
          <FaArrowLeft
            className="text-pink-300 text-3xl cursor-pointer"
            onClick={handleContinue}
          />
        </div>

        {/* 🎵 Music Icon */}
        <div className="absolute top-6 right-6 z-20">
          <div className="relative cursor-pointer" onClick={toggleMute}>
            <img
              src={musicIcon}
              alt="Music"
              className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
            />
            {isMuted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-[3px] bg-red-600 rotate-45"></div>
              </div>
            )}
          </div>
        </div>

        <header className="text-center mb-6">
          <h1 className="font-bold text-4xl mb-2 text-white">New Whisper</h1>
          <p className="text-sm opacity-100 text-white font-bold">
            Location - {currentLocation}
          </p>
        </header>

        <div className="flex flex-col items-center w-full">
          <section
            className={`w-full max-w-2xl bg-pink-200 border-t border-l border-r border-pink-200 overflow-hidden ${
              image ? "rounded-t-lg" : "rounded-lg"
            } h-30 sm:h-40 md:h-60`}
          >
            <div className="flex gap-3 p-3 border-b border-pink-200 bg-pink-400">
              <div className="relative p-2 rounded bg-pink-400 hover:bg-pink-300">
                🎨
                <input
                  type="color"
                  value={color}
                  onChange={handleColorChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <button
                onClick={handleFontSize}
                className="p-2 rounded bg-pink-400 hover:bg-pink-300 text-white"
              >
                Aa
              </button>
              <button
                onClick={handleBold}
                className={`p-2 rounded ${
                  isBold ? "bg-pink-300" : "bg-pink-400"
                } text-white`}
              >
                B
              </button>
              <button
                onClick={handleItalic}
                className={`p-2 rounded ${
                  isItalic ? "bg-pink-300" : "bg-pink-400"
                } text-white`}
              >
                I
              </button>
              <button
                onClick={handleClear}
                className="p-2 rounded bg-pink-400 hover:bg-pink-300 text-white"
              >
                ⌫
              </button>
              <div
                className="relative p-2 rounded bg-pink-400 hover:bg-pink-300 cursor-pointer"
                onClick={() => fileInputRef.current.click()}
                title="Upload image"
              >
                🖼️
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  style={{ width: "100%", height: "100%" }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="relative h-70">
              <div
                className={`absolute inset-0 overflow-auto whitespace-pre-wrap p-4 pointer-events-none ${fontSize} ${
                  isBold ? "font-bold" : "font-medium"
                } ${isItalic ? "italic" : ""}`}
                style={{ color: color, lineHeight: "1.5" }}
              >
                {text.split("\n").map((line, idx) => (
                  <p key={idx} className="my-1">
                    {line}
                  </p>
                ))}
              </div>

              <textarea
                className={`absolute inset-0 w-full h-full resize-none caret-pink-500 p-4 outline-none selection:bg-pink-200 bg-white font-[cursive] text-sm ${fontSize} leading-6 ${
                  isBold ? "font-bold" : "font-medium"
                } ${isItalic ? "italic" : ""}`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck="true"
                aria-label="Post text"
                placeholder="Write your Whisper!"
                style={{ color: color, lineHeight: "1.5" }}
                ref={textareaRef}
              />
            </div>
          </section>

          {image && (
            <div className="flex justify-center mt-0 w-full bg-white max-w-2xl border-b border-l border-r border-pink-200 rounded-b-lg">
              <img
                src={image}
                alt="Uploaded"
                className="w-40 h-40 object-cover rounded-lg shadow mb-3"
              />
            </div>
          )}
        </div>
        <div className="mt-6">
          <button
            onClick={handleUpload}
            className="px-6 py-2 rounded-full bg-pink-400 text-white font-semibold
            transition-all duration-200 hover:shadow-lg active:scale-95"
          >
            UPLOAD
          </button>
        </div>
      </div>
    </>
  );
}
