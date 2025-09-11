import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { FaArrowLeft, FaGem, FaEllipsisV } from "react-icons/fa";
import profileBkg from "../assets/profile_bkg.png";
import heartIcon from "../assets/heart.png";
import commentIcon from "../assets/comment.png";
import trashIcon from "../assets/Trash.png";
import { useNavigate, useLocation } from "react-router-dom";
import { useWindowSize } from "react-use";
import Confetti from "react-confetti";
import HeartButton from "../components/heart";
import DreamyLoader from '../components/loader'

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  const [userLocation, setUserLocation] = useState({ latitude: null, longitude: null });
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [currentUserRowId, setCurrentUserRowId] = useState(null);
  const [unlockedWhisperIds, setUnlockedWhisperIds] = useState([]);
  const maxDistance = 1.2;
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [viewedUserPoints, setViewedUserPoints] = useState(0);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);

  // Fetch current auth user and map to profile id, redirect if viewing self
  useEffect(() => {
    async function fetchCurrentProfileId() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;
      const { data, error } = await supabase
        .from("users")
        .select("id, points")
        .eq("user_id", user.id)
        .single();
      if (!error && data?.id) {
        setCurrentProfileId(data.id);
        setCurrentUserRowId(data.id);
        setUserPoints(data.points || 0);
        if (whisper && whisper.user_id === data.id) {
          navigate("/profile");
        }

        // Fetch unlocked whispers for this user
        const { data: unlockedData } = await supabase
          .from('unlocked_whispers')
          .select('whisper_id')
          .eq('user_id', data.id);
        if (Array.isArray(unlockedData)) {
          setUnlockedWhisperIds(unlockedData.map(u => u.whisper_id));
        }
      }
    }
    fetchCurrentProfileId();
  }, [navigate, whisper]);

  // Check if users are blocked
  useEffect(() => {
    async function checkBlockStatus() {
      if (!currentUserRowId || !whisper?.user_id) return;

      // Check if current user blocked the viewed user
      const { data: blockedData } = await supabase
        .from('Blocked')
        .select('*')
        .eq('blocked_by', currentUserRowId)
        .eq('blocked', whisper.user_id)
        .maybeSingle();
      
      setIsBlocked(!!blockedData);

      // Check if current user is blocked by the viewed user
      const { data: blockedByData } = await supabase
        .from('Blocked')
        .select('*')
        .eq('blocked_by', whisper.user_id)
        .eq('blocked', currentUserRowId)
        .maybeSingle();
      
      setIsBlockedByOther(!!blockedByData);
    }
    checkBlockStatus();
  }, [currentUserRowId, whisper]);

  // Get user location for distance locking
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          setIsLocationLoading(false);
        },
        () => setIsLocationLoading(false)
      );
    } else {
      setIsLocationLoading(false);
    }
  }, []);

  const handleCommentClick = (whisper) => {
    navigate("/comments", { state: { whisper } });
  };

  const handleChat = () => {
    if (!isFollowing || isBlocked || isBlockedByOther) return;
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

  const toggleFollow = async () => {
    if (!currentUserRowId || !whisper?.user_id || isBlocked || isBlockedByOther) return;
    
    const followerId = currentUserRowId;
    const followingId = whisper.user_id;
    
    if (!isFollowing) {
      const { error } = await supabase
        .from('Following')
        .insert({ follower: followerId, following: followingId });
      if (!error) {
        setIsFollowing(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 6000);
      } else {
        console.error('Follow failed:', error);
      }
    } else {
      const { error } = await supabase
        .from('Following')
        .delete()
        .eq('follower', followerId)
        .eq('following', followingId);
      if (!error) {
        setIsFollowing(false);
      } else {
        console.error('Unfollow failed:', error);
      }
    }
  };

  const handleBlockUser = async () => {
    if (!currentUserRowId || !whisper?.user_id) return;

    try {
      if (!isBlocked) {
        // Block the user
        const { error } = await supabase
          .from('Blocked')
          .insert({ 
            blocked: whisper.user_id, 
            blocked_by: currentUserRowId 
          });
        
        if (!error) {
          setIsBlocked(true);
          setIsFollowing(false);
          // Remove from following if they were following
          await supabase
            .from('Following')
            .delete()
            .eq('follower', currentUserRowId)
            .eq('following', whisper.user_id);
          alert('User has been blocked successfully.');
        } else {
          console.error('Block failed:', error);
          alert('Failed to block user. Please try again.');
        }
      } else {
        // Unblock the user
        const { error } = await supabase
          .from('Blocked')
          .delete()
          .eq('blocked_by', currentUserRowId)
          .eq('blocked', whisper.user_id);
        
        if (!error) {
          setIsBlocked(false);
          alert('User has been unblocked successfully.');
        } else {
          console.error('Unblock failed:', error);
          alert('Failed to unblock user. Please try again.');
        }
      }
      setShowMenuDropdown(false);
    } catch (error) {
      console.error('Block/Unblock error:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleReportUser = async () => {
    try {
      // You can implement a reports table or send to moderation system
      // For now, just show a confirmation
      const reportReason = prompt('Please provide a reason for reporting this user:');
      if (reportReason && reportReason.trim()) {
        // Here you would typically insert into a Reports table
        // const { error } = await supabase
        //   .from('Reports')
        //   .insert({
        //     reported_user: whisper.user_id,
        //     reported_by: currentUserRowId,
        //     reason: reportReason.trim(),
        //     created_at: new Date().toISOString()
        //   });
        
        alert('User has been reported. Thank you for helping keep our community safe.');
      }
      setShowMenuDropdown(false);
    } catch (error) {
      console.error('Report error:', error);
      alert('Failed to report user. Please try again.');
    }
  };

  useEffect(() => {
    async function checkFollowing() {
      try {
        if (!currentUserRowId || !whisper?.user_id || isBlocked || isBlockedByOther) {
          setIsFollowing(false);
          return;
        }
        const { data, error } = await supabase
          .from('Following')
          .select('follower')
          .eq('follower', currentUserRowId)
          .eq('following', whisper.user_id)
          .maybeSingle();
        if (!error && data) {
          setIsFollowing(true);
        } else {
          setIsFollowing(false);
        }
        if (error && error.code !== 'PGRST116') {
          console.warn('checkFollowing error:', error);
        }
      } catch (e) {
        console.warn('checkFollowing exception:', e);
        setIsFollowing(false);
      }
    }
    checkFollowing();
  }, [currentUserRowId, whisper, isBlocked, isBlockedByOther]);

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
          latitude,
          longitude,
          users:user_id (username, gmail, profilepic)
        `
        )
        .eq("user_id", userId);

      if (error) {
        setError(error.message);
      } else {
        const withDistance = data.map((w) => {
          if (!userLocation.latitude || !userLocation.longitude || !w.latitude || !w.longitude) {
            return { ...w, distance: Infinity };
          }
          const distance = getDistanceFromLatLonInKm(userLocation.latitude, userLocation.longitude, w.latitude, w.longitude);
          return { ...w, distance };
        });
        setWhispers(withDistance);
        
        const { data: viewedUser, error: pointsErr } = await supabase
          .from('users')
          .select('points')
          .eq('id', userId)
          .single();
        if (!pointsErr && viewedUser) {
          setViewedUserPoints(viewedUser.points || 0);
        }
      }
    }
    fetchWhispers();
  }, [whisper, userLocation]);

  const handleUnlock = async (whisperId) => {
    try {
      if (!currentUserRowId) return;
      if (userPoints < 2) {
        alert("You need 2 points to unlock this whisper.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const newPoints = userPoints - 2;
      const { error: pointsError } = await supabase
        .from('users')
        .update({ points: newPoints })
        .eq('user_id', user.id);
      if (pointsError) throw pointsError;

      const { error: insertError } = await supabase
        .from('unlocked_whispers')
        .insert({ user_id: currentUserRowId, whisper_id: whisperId });
      if (insertError) throw insertError;

      setUserPoints(newPoints);
      setIsPointsModalOpen(true);
      setUnlockedWhisperIds((prev) => [...prev, whisperId]);
    } catch (e) {
      console.error('Unlock failed:', e);
      alert('Failed to unlock. Please try again.');
    }
  };

  const displayedUser = whisper
    ? whisper.users
    : { username: "Guest User", profilepic: "placeholder_url", whispers: 0 };

  const isCurrentUserProfile = whisper && currentProfileId && whisper.user_id === currentProfileId;

  // Prevent rendering anything while redirecting
  if (isCurrentUserProfile) return null;

  // Show blocked message if user is blocked by the other user
  if (isBlockedByOther) {
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{ backgroundImage: `url(${profileBkg})` }}
      >
        <div className="bg-white/90 p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-6">You cannot view this profile.</p>
          <button
            onClick={() => navigate("/post")}
            className="bg-pink-500 text-white px-6 py-2 rounded-full hover:bg-pink-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${profileBkg})` }}
    >
      <div className="flex justify-between items-center p-4 md:p-6 lg:p-8">
        <FaArrowLeft
          className="text-pink-300 text-3xl cursor-pointer"
          onClick={handleContinue}
        />
        
        {/* Three dots menu - only show if not current user's profile */}
        {!isCurrentUserProfile && (
          <div className="relative">
            <FaEllipsisV
              className="text-pink-300 text-2xl cursor-pointer hover:text-pink-400 transition-colors"
              onClick={() => setShowMenuDropdown(!showMenuDropdown)}
            />
            
            {/* Dropdown Menu */}
            {showMenuDropdown && (
              <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg py-2 w-40 z-50">
                <button
                  onClick={handleBlockUser}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors text-gray-700"
                >
                  {isBlocked ? '🔓 Unblock User' : '🚫 Block User'}
                </button>
                <button
                  onClick={handleReportUser}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors text-red-600"
                >
                  🚩 Report User
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {showMenuDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMenuDropdown(false)}
        />
      )}

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
              {viewedUserPoints}
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
            className={`bg-pink-300 text-white font-['Pacifico'] rounded-full px-6 py-2 text-lg md:text-xl lg:text-2xl ${
              isBlocked || isBlockedByOther ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            }`}
            onClick={toggleFollow}
            disabled={isBlocked || isBlockedByOther}
          >
            {isBlocked ? "Blocked" : isFollowing ? "Following" : "Follow"}
            {showConfetti && !isBlocked && (
              <Confetti width={width} height={height} numberOfPieces={300} />
            )}
          </button>
        )}
        <button
          className={`bg-pink-300 text-white font-['Pacifico'] rounded-full px-6 py-2 text-lg md:text-xl lg:text-2xl ${
            isFollowing && !isBlocked && !isBlockedByOther ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-60'
          }`}
          onClick={handleChat}
          disabled={!isFollowing || isBlocked || isBlockedByOther}
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
        {whispers.map((whisper) => {
          const isLockedByDistance = (whisper.distance ?? Infinity) > maxDistance;
          const isUnlocked = unlockedWhisperIds.includes(whisper.id);
          const isLocked = isLockedByDistance && !isUnlocked;
          return (
          <div
            key={whisper.id}
            className="relative w-11/12 max-w-lg mx-auto rounded-3xl shadow-lg bg-pink-100 py-4 px-6 sm:py-6 sm:px-8 mb-3 sm:mb-4"
          >
            {isLocked && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-20 flex-col rounded-3xl">
                <span className="text-pink-700 font-bold text-lg bg-white/70 rounded-sm p-1">🔒 Unlock to view</span>
                <button onClick={() => handleUnlock(whisper.id)} className="mt-2 text-white bg-pink-500 rounded-full px-4 py-2 text-sm font-semibold hover:bg-pink-600 transition-colors">
                  Unlock (2 pts)
                </button>
              </div>
            )}

            <div className={`mt-2 font-[cursive] text-sm sm:text-[16px] text-[#784552] leading-6 ${isLocked ? "blur-sm" : ""}`}>
              {whisper.content}
            </div>
            {whisper.Image_url && (
              <div className="mt-2 flex justify-center">
                <img
                  src={whisper.Image_url}
                  alt="Whisper"
                  className={`w-40 h-40 object-cover rounded-lg shadow ${isLocked ? "blur-sm" : ""}`}
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
        );})}
      </div>

      {isPointsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h2 className="text-xl font-bold text-pink-700">Whisper Unlocked!</h2>
            <div className="flex items-center justify-center gap-2 mt-4 text-pink-500 font-semibold">
              <FaGem className="text-lg" />
              <span>Your current points: {userPoints}</span>
            </div>
            <button
              onClick={() => setIsPointsModalOpen(false)}
              className="mt-6 bg-pink-500 text-white rounded-full px-4 py-2 hover:bg-pink-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Follow;