import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import musicIcon from "../assets/music.png";
import profileAvatar from "../assets/girl.png";
import chatbkg from "../assets/profile_bkg.png";
import { FaArrowLeft } from "react-icons/fa";

// Receive audioRef as a prop
const Chat = ({ audioRef }) => { 
  const navigate = useNavigate();
  const location = useLocation();
  const { whisper } = location.state || {};

  const [comments, setComments] = useState([
    {
      id: 1,
      user: "crazypanda_11",
      text: "nicee pretty! can we talk in private chat?",
      likes: 4,
    },
    { id: 2, user: "kittycat12", text: "woww awesome post!", likes: 2 },
    { id: 3, user: "cake_lover5", text: "amazing work!", likes: 7 },
    { id: 4, user: "pookie11", text: "keep going!", likes: 1 },
    { id: 5, user: "lovepizza19", text: "this is great!", likes: 5 },
  ]);
  const [isMuted, setIsMuted] = useState(false); // State to track mute status

  // Effect to synchronize mute state with the audioRef on component mount
  useEffect(() => {
    if (audioRef.current) {
      setIsMuted(audioRef.current.muted);
    }
  }, [audioRef]);

  const toggleLike = (id) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              likes: c.liked ? c.likes - 1 : c.likes + 1,
              liked: !c.liked,
            }
          : c
      )
    );
  };

  const handleClick = () => navigate("/profile");
  const handleBack = () => navigate("/post");
  const handleClickBot = () => navigate("/chatbot");
  const handleExploreClick = () => navigate("/explore");

  // Function to toggle music mute state
  function toggleMusic() {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  }

  const PostCard = () => {
    if (!whisper) {
      return (
        <div className="w-full bg-white/80 rounded-2xl p-4 shadow-md text-center text-gray-700">
          No post selected.
        </div>
      );
    }
    return (
      <div className="w-full bg-white/80 rounded-2xl p-4 shadow-md">
        <div className="flex items-center gap-3">
          <img
            src={whisper.users.profilepic}
            alt="Profile"
            className="h-10 w-10 rounded-full"
          />
          <div>
            <div className="font-semibold text-pink-800">
              {whisper.users.username}
            </div>
          </div>
        </div>
        <p className="mt-2 font-[cursive] text-sm sm:text-[16px] text-[#784552] leading-6">
          {whisper.content}
        </p>
        {whisper.Image_url && (
          <div className="mt-2 flex justify-center">
            <img
              src={whisper.Image_url}
              alt="Whisper"
              className="w-40 h-40 object-cover rounded-lg shadow"
              loading="lazy" // Added lazy loading
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-no-repeat bg-center bg-fixed m-0"
      style={{ backgroundImage: `url(${chatbkg})` }}
    >
      {/* Main Content Wrapper */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className="sticky top-0 left-0 flex items-center z-20 w-full py-1 pr-2  bg-gradient-to-r from-pink-100/60 to-purple-100/60 backdrop-blur-md rounded-b-xl shadow-sm mb-2">
          <div
            className="flex justify-between p-2 md:p-4 lg:p-6"
            onClick={handleBack}
          >
            <FaArrowLeft className="text-pink-400 text-3xl cursor-pointer" />
          </div>
          <img
            src={profileAvatar}
            alt="Profile Avatar"
            className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 cursor-pointer"
            onClick={handleClick}
          />
          <div className="ml-auto flex items-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 text-[#5a4fcf]">
            {/* Music button with mute indicator */}
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

            <div
              className="w-28 h-10 sm:w-32 sm:h-12 bg-[#D9D9D9] rounded-[40px] flex items-center justify-center cursor-pointer text-sm sm:text-base shadow-md hover:bg-[#c9c9c9] transition-colors p-2"
              onClick={handleExploreClick}
            >
              <div className="font-['Pacifico'] font-normal not-italic text-center">
                Explore Map
              </div>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg w-full mx-auto mt-6 overflow-hidden">
          {/* Post Card */}
          <div className="mt-4">
            <PostCard />
          </div>

          {/* Comments Section */}
          <div className="w-full mt-6 bg-gray-200/50 backdrop-blur-sm rounded-2xl p-4 shadow-md">
            <h3 className="font-bold text-lg mb-3 text-pink-800">Comments</h3>
            <div className="max-h-[30rem] overflow-y-auto pr-2 hide-scrollbar">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-3 mb-4 p-2 max-w-[85%] mx-auto rounded-lg hover:bg-white/30 transition-colors"
                >
                  <img
                    src={profileAvatar}
                    alt="Comment"
                    className="h-8 w-8 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-pink-800">
                      {c.user}{" "}
                      <span className="ml-2 text-xs text-gray-500">6w</span>
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{c.text}</p>
                    <span
                      className="text-xs text-gray-600 cursor-pointer mt-1 inline-block"
                      onClick={() => toggleLike(c.id)}
                    >
                      {c.likes} likes {c.liked ? "❤️" : "🤍"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
