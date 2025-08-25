import React from "react";
import myImage from "../assets/girl.png";
import { supabase } from "../supabaseClient";
import { FaArrowLeft } from "react-icons/fa";
import profileBkg from "../assets/profile_bkg.png";
import { useState, useEffect } from "react";
import heartIcon from "../assets/heart.png";
import commentIcon from "../assets/comment.png";
import trashIcon from "../assets/Trash.png";
import { useNavigate } from "react-router-dom";
import DreamyLoader from '../components/loader';
import HeartButton from "../components/heart";
const Profile = () => {
  const [whispers, setWhispers] = useState([]);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleCommentClick = (whisper) => {
    navigate("/comments", { state: { whisper } });
  };

  const handleContinue = () => {
    navigate("/post");
  };

  const handleEdit = () => {
    navigate("/edit-profile");
  };

  // New handleDelete function
  const handleDelete = async (whisperId) => {
    try {
      const { error } = await supabase
        .from("Whispers")
        .delete()
        .eq("id", whisperId);

      if (error) {
        throw error;
      }

      // If deletion is successful, update the state to remove the whisper from the UI
      setWhispers(whispers.filter((whisper) => whisper.id !== whisperId));
    } catch (error) {
      console.error("Error deleting whisper:", error.message);
      setError("Failed to delete the whisper. Please try again.");
    }
  };

  useEffect(() => {
    async function fetchWhispers() {
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
        .eq("user_id", 3);

      if (error) {
        setError(error.message);
      } else {
        setWhispers(data);
      }
    }
    fetchWhispers();
  }, []);

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
            src={myImage}
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

      <div className="flex justify-center mt-5">
        <button
          className="bg-pink-300 text-white font-['Pacifico'] rounded-full px-6 py-2 text-lg md:text-xl lg:text-2xl cursor-pointer"
          onClick={handleEdit}
        >
          Edit Profile
        </button>
      </div>

      {/* Recently Viewed */}
      <h2 className="text-2xl md:text-3xl lg:text-4xl text-center mt-6 md:mt-8 text-white font-bold">
        Whispers
      </h2>
      <div className="flex flex-wrap justify-center gap-4 md:gap-6 lg:gap-8 mt-4">
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
                  className="max-h-60 max-w-full rounded-lg shadow"
                />
              </div>
            )}
            <div className="flex gap-4 sm:gap-6 md:gap-8 bg-pink-400 rounded-2xl px-4 py-2 sm:px-6 sm:py-3 mt-4 sm:mt-6 justify-center shadow-lg overflow-hidden">
              <button className="hover:scale-110 transition-transform ">
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
              <button
                className="hover:scale-110 transition-transform"
                onClick={() => handleDelete(whisper.id)} // Pass the ID here
              >
                <img
                  src={trashIcon}
                  alt="Delete"
                  className="w-5 h-5 sm:w-6 sm:h-6"
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile;
