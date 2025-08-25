import React, { useState } from "react";
import musicIcon from "../assets/music.png";
import profileAvatar from "../assets/girl.png";
import Whispers from "./Whispers";
import { useNavigate } from "react-router-dom";
import postBackground from "../assets/post.png";

function Post({ audioRef }) {
  return (
    <div
      className="w-screen bg-cover bg-no-repeat bg-center bg-fixed min-h-screen m-0"
      style={{ backgroundImage: `url(${postBackground})` }}
    >
      <Header audioRef={audioRef} />
    </div>
  );
}

function Header({ audioRef }) {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);

  function handleClick() {
    navigate("/profile");
  }

  function handleAddPost() {
    navigate("/newpost");
  }

  function toggleMusic() {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  }

  return (
    <>
      <div className="sticky top-0 left-0 p-4 sm:p-6 md:p-8 flex items-center z-10">
        <img
          src={profileAvatar}
          alt="Profile Avatar"
          className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 cursor-pointer"
          onClick={handleClick}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 text-[#5a4fcf]">
          {/* Music button */}
          <div className="relative cursor-pointer" onClick={toggleMusic}>
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

          <Explore />
          <div
            className="w-24 h-10 sm:w-28 sm:h-12 bg-[#D9D9D9] rounded-[40px] flex items-center justify-center cursor-pointer text-xs sm:text-sm"
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
      className="w-24 h-10 sm:w-28 sm:h-12 bg-[#D9D9D9] rounded-[40px] flex items-center justify-center cursor-pointer text-xs sm:text-sm"
      onClick={handleClick}
    >
      <div className="font-['Pacifico'] font-normal not-italic text-center">
        Explore Map
      </div>
    </div>
  );
}

export default Post;
