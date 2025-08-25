"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import heartIcon from "../assets/heart.png";
import commentIcon from "../assets/comment.png";
import trashIcon from "../assets/Trash.png";
import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import HeartButton from "../components/heart";
const Whisper = ({ whisper, containerRef }) => {
  const user = whisper.users;
  const ref = useRef(null);

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

  // New handler for clicking on the user's profile
  const handleUserClick = () => {
    navigate("/follow", { state: { whisper } });
  };

  return (
    <motion.div
      ref={ref}
      style={{ scale, opacity }}
      className="relative w-11/12 max-w-lg mx-auto rounded-3xl shadow-lg bg-pink-100 py-4 px-6 sm:py-6 sm:px-8 mb-16 sm:mb-20 transition-all duration-300"
      initial={{ scale: 0.85, opacity: 0.5 }}
      whileInView={{ scale: 1.1, opacity: 1 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ type: "spring", bounce: 0.4 }}
    >
      <div className="flex items-center gap-3 pb-2">
        {user && (
          <>
            <img
              src={user.profilepic}
              alt={user.username}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-pink-300"
            />
            <div
              className="flex flex-col cursor-pointer"
              onClick={handleUserClick}
            >
              {" "}
              {/* Added onClick here */}
              <span className="text-pink-800 font-semibold text-xs sm:text-sm">
                {user.username}
              </span>
            </div>
          </>
        )}
      </div>
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
  );
};

export default Whisper;
