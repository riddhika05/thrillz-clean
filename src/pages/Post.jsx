// Post.jsx

import React, { useState, useEffect } from "react";
import musicIcon from "../assets/music.png"; // Ensure this path is correct
import profileAvatar from "../assets/username.png"; // Ensure this path is correct
import Whispers from "./Whispers"; // Ensure this path is correct
import { useNavigate } from "react-router-dom";
import postBackground from "../assets/post.png"; // Ensure this path is correct
import { supabase } from "../supabaseClient";
import { FaGem, FaBell, FaUsers } from "react-icons/fa"; // Import all required icons

// Main Post component, now receiving audioRef as a prop
function Post({ audioRef }) {
  return (
    <div
      className="w-screen bg-cover bg-no-repeat bg-center bg-fixed min-h-screen m-0"
      style={{ backgroundImage: `url(${postBackground})` }}
    >
      {/* Pass audioRef down to the Header component */}
      <Header audioRef={audioRef} />
    </div>
  );
}

// Header component, now receiving audioRef as a prop
function Header({ audioRef }) {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false); // State to track mute status
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [points, setPoints] = useState(0);
  

  // Effect to synchronize mute state with the audioRef on component mount
  useEffect(() => {
    if (audioRef.current) {
      setIsMuted(audioRef.current.muted);
    }
  }, [audioRef]);

  useEffect(() => {
    async function loadAvatar() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;
      const { data, error } = await supabase
        .from("users")
        .select(`profilepic,points`)
        .eq("user_id", user.id)
        .single();
      if (!error) {
        setAvatarUrl(data?.profilepic || null);
        setPoints(data?.points || 0);
      }
    }
    loadAvatar();
  }, []);

  function handleClick() {
    navigate("/profile");
  }

  function handleAddPost() {
    navigate("/newpost");
  }

  function handleNotificationClick() {
    navigate("/notif");
  }

  function handleUsersClick() {
    navigate("/usersss");
  }

  // Function to toggle music mute state
  function toggleMusic() {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  }

  return (
    <>
      <div className="sticky top-0 left-0 p-4 sm:p-6 md:p-8 flex items-center z-10">
        <div className="flex flex-col items-center">
            <img
              src={avatarUrl || profileAvatar}
              alt="Profile Avatar"
              className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 cursor-pointer"
              onClick={handleClick}
            />
            {/* Points display below the profile picture */}
            <div className="flex items-center gap-1 mt-1">
              <FaGem className="text-pink-300 text-sm sm:text-base md:text-lg lg:text-xl" />
              <span className="text-pink-300 text-sm sm:text-base md:text-lg lg:text-xl">{points}</span>
            </div>
        </div>
      
        <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 text-[#5a4fcf]">
          {/* Music button with mute indicator */}
          <div className="relative cursor-pointer" onClick={toggleMusic}>
            <img
              src={musicIcon}
              alt="Music"
              className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12"
            />
            {isMuted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-[2px] sm:h-[3px] bg-red-600 rotate-45"></div>
              </div>
            )}
          </div>

          {/* Notification bell */}
          <div className="cursor-pointer hover:scale-110 transition-transform" onClick={handleNotificationClick}>
            <FaBell className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-pink-300 hover:text-pink-500 transition-colors" />
          </div>

          {/* Users icon */}
          <div className="cursor-pointer hover:scale-110 transition-transform" onClick={handleUsersClick}>
            <FaUsers className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-pink-300 hover:text-pink-500 transition-colors" />
          </div>

          <Explore />
          <div
            className="w-20 h-8 sm:w-24 sm:h-10 md:w-28 md:h-12 bg-[#D9D9D9] rounded-[40px] flex items-center justify-center cursor-pointer text-xs sm:text-sm hover:bg-gray-300 transition-colors"
            onClick={handleAddPost}
          >
            <div className="font-['Pacifico'] font-normal not-italic text-center">
              Add Whisper
            </div>
          </div>
        </div>
      </div>
      <div className="w-9/12 mx-auto mt-4 sm:mt-8 md:mt-12 max-h-[70vh] overflow-y-auto hide-scrollbar">
        <Whispers />
      </div>
    </>
  );
}

function Explore() {
  const navigate = useNavigate();
  function handleClick() {
    navigate("/explore");
  }
  return (
    <div
      className="w-20 h-8 sm:w-24 sm:h-10 md:w-28 md:h-12 bg-[#D9D9D9] rounded-[40px] flex items-center justify-center cursor-pointer text-xs sm:text-sm hover:bg-gray-300 transition-colors"
      onClick={handleClick}
    >
      <div className="font-['Pacifico'] font-normal not-italic text-center">
        Explore Map
      </div>
    </div>
  );
}

export default Post;