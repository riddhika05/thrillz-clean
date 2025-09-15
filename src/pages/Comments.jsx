import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";

import musicIcon from "../assets/music.png";
import profileAvatar from "../assets/girl.png";
import chatbkg from "../assets/profile_bkg.png";
import { FaArrowLeft } from "react-icons/fa";

const Comments = ({ audioRef }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { whisper } = location.state || {};

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  // ✅ Sync mute state
  useEffect(() => {
    if (audioRef?.current) {
      setIsMuted(audioRef.current.muted);
    }
  }, [audioRef]);

  // ✅ Fetch logged in user + profile
  useEffect(() => {
    const checkSessionAndProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const { data: profileData, error } = await supabase
          .from("users")
          .select("username, profilepic")
          .eq("user_id", session.user.id)
          .single();
        if (!error) setUserProfile(profileData);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    };
    checkSessionAndProfile();
  }, []);

  // ✅ Fetch comments for the whisper + realtime subscription
  useEffect(() => {
    if (!whisper) return;

    const fetchComments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("comments")
        .select("*, users(username, profilepic, user_id)")
        .eq("whisper_id", whisper.id)
        .order("created_at", { ascending: true });
      if (!error) setComments(data);
      setLoading(false);
    };
    fetchComments();

    // ✅ Realtime updates
    const subscription = supabase
      .channel(`comments_for_whisper_${whisper.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `whisper_id=eq.${whisper.id}`,
        },
        async (payload) => {
          const newComment = payload.new;
          const { data: userData } = await supabase
            .from("users")
            .select("username, profilepic, user_id")
            .eq("user_id", newComment.user_id)
            .single();
          const commentWithUser = { ...newComment, users: userData };
          setComments((prev) => [...prev, commentWithUser]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [whisper]);

  // ✅ Navigate to follow page with user's profile data from comment
  const handleProfileClick = async (commentUserData) => {
    if (commentUserData && commentUserData.user_id) {
      const { data: userProfileData, error } = await supabase
        .from("users")
        .select("id, username, profilepic")
        .eq("user_id", commentUserData.user_id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error.message);
        return;
      }

      const profileWhisper = {
        user_id: userProfileData.id,
        users: {
          username: userProfileData.username,
          profilepic: userProfileData.profilepic,
        },
      };

      navigate("/follow", { state: { whisper: profileWhisper } });
    }
  };

  // ✅ Post new comment
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) return alert("You must be logged in to comment!");

    const { error } = await supabase.from("comments").insert({
      content: newComment,
      user_id: currentUser.id,
      whisper_id: whisper.id,
    });
    if (!error) setNewComment("");
  };

  // ✅ Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure?")) return;
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);
    if (!error) setComments((c) => c.filter((cm) => cm.id !== commentId));
  };

  const handleClick = () => navigate("/profile");
  const handleBack = () => navigate("/post");
  const handleExploreClick = () => navigate("/explore");

  // ✅ Toggle music
  const toggleMusic = () => {
    if (audioRef?.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  };

  // ✅ PostCard for main whisper
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
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/follow", { state: { whisper: whisper } })}
        >
          <img
            src={whisper.users?.profilepic || profileAvatar}
            alt="Profile"
            className="h-10 w-10 rounded-full"
          />
          <div>
            <div className="font-semibold text-pink-800">
              {whisper.users?.username || "Unknown User"}
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
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className="sticky top-0 left-0 flex items-center z-20 w-full py-1 pr-2 bg-gradient-to-r from-pink-100/60 to-purple-100/60 backdrop-blur-md rounded-b-xl shadow-sm mb-2">
          <div
            className="flex justify-between p-2 md:p-4 lg:p-6"
            onClick={handleBack}
          >
            <FaArrowLeft className="text-pink-400 text-3xl cursor-pointer" />
          </div>
          <img
            src={userProfile?.profilepic || profileAvatar}
            alt="Profile Avatar"
            className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 cursor-pointer"
            onClick={handleClick}
          />
          <div className="ml-auto flex items-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 text-[#5a4fcf]">
            <div className="relative cursor-pointer" onClick={toggleMusic}>
              <img
                src={musicIcon}
                alt="Music"
                className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
              />
              {isMuted && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-[3px] bg-red-600 rotate-45 transform"></div>
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

        {/* Whisper + Comments */}
        <div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg w-full mx-auto mt-6 overflow-hidden">
          <div className="mt-4">
            <PostCard />
          </div>

          <div className="w-full mt-6 bg-gray-200/50 backdrop-blur-sm rounded-2xl p-4 shadow-md">
            <h3 className="font-bold text-lg mb-3 text-pink-800">Comments</h3>
            <div className="max-h-[30rem] overflow-y-auto pr-2 hide-scrollbar">
              {loading && <p>Loading comments...</p>}
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-1 mb-4 p-2 max-w-[85%] mx-auto rounded-lg hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex-shrink-0 cursor-pointer"
                      onClick={() => handleProfileClick(c.users)}
                    >
                      <img
                        src={c.users?.profilepic || profileAvatar}
                        alt="Commenter"
                        className="h-8 w-8 rounded-full"
                      />
                    </div>
                    <p
                      className="text-sm font-semibold text-pink-800 cursor-pointer inline-block"
                      onClick={() => handleProfileClick(c.users)}
                    >
                      {c.users?.username || "User"}
                      <span className="ml-2 text-xs text-gray-500 font-normal">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </p>
                  </div>

                  <p className="text-sm text-gray-700">{c.content}</p>

                  {/* Only show delete for user's own comment */}
                  {user && user.id === c.user_id && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="text-xs text-red-500 hover:text-red-700 cursor-pointer font-semibold"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* New Comment Form */}
            <form onSubmit={handleCommentSubmit} className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Comments;
