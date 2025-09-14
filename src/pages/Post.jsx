import React, { useState, useEffect } from "react";
import musicIcon from "../assets/music.png";
import profileAvatar from "../assets/username.png";
import Whispers from "./Whispers";
import { useNavigate } from "react-router-dom";
import postBackground from "../assets/post.png";
import { supabase } from "../supabaseClient";
import { FaGem, FaBell, FaUsers } from "react-icons/fa";
import Loader from '../components/loader';

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
  const [isMuted, setIsMuted] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  // Effect to synchronize mute state with the audioRef on component mount
  useEffect(() => {
    if (audioRef.current) {
      setIsMuted(audioRef.current.muted);
    }
  }, [audioRef]);

  // Effect to load user data and update location
  useEffect(() => {
    async function loadUserDataAndLocation() {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setLoading(false);
        return;
      }

      // 1. Get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;

          // 2. Use a reverse geocoding API to get a readable address
          // Note: You need to replace this with a real API call.
          // This is a simplified placeholder.
          let locationName = "Unknown Location";
          try {
            // Using Nominatim for a more complete address
            const geoApiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
            const response = await fetch(geoApiUrl);
            const data = await response.json();
            
            // Prioritize a full display name for a more complete location
            locationName = data.display_name || data.address.city || data.address.town || data.address.village || "Unknown Location";
            
          } catch (geoError) {
            console.error("Reverse geocoding failed:", geoError);
          }

          // 3. Update the 'Location' column in the 'users' table on Supabase
          const { data: updateData, error: updateError } = await supabase
            .from("users")
            .update({ Location: locationName })
            .eq("user_id", user.id);
          
          if (updateError) {
            console.error("Error updating user location:", updateError);
          }
        }, (error) => {
          console.error("Geolocation failed:", error);
        });
      }

      const { data, error } = await supabase
        .from("users")
        .select(`profilepic, points`)
        .eq("user_id", user.id)
        .single();
      
      if (!error) {
        setAvatarUrl(data?.profilepic || null);
        setPoints(data?.points || 0);
      }
      setLoading(false);
    }

    loadUserDataAndLocation();
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
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader />
        </div>
      ) : (
        <>
          <div className="sticky top-0 left-0 p-4 sm:p-6 md:p-8 flex items-center z-10">
            <div className="flex flex-col items-center">
              <img
                src={avatarUrl || profileAvatar}
                alt="Profile Avatar"
                className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 cursor-pointer"
                onClick={handleClick}
              />
              <div className="flex items-center gap-1 mt-1">
                <FaGem className="text-pink-300 text-sm sm:text-base md:text-lg lg:text-xl" />
                <span className="text-pink-300 text-sm sm:text-base md:text-lg lg:text-xl">{points}</span>
              </div>
            </div>
          
            <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 text-[#5a4fcf]">
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

              <div className="cursor-pointer hover:scale-110 transition-transform" onClick={handleNotificationClick}>
                <FaBell className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-pink-300 hover:text-pink-500 transition-colors" />
              </div>

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
      )}
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