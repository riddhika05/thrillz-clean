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
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [selectedReportCategory, setSelectedReportCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Safety check - redirect if no whisper data
  useEffect(() => {
    if (!whisper) {
      console.warn('No whisper data found in location state, redirecting to post page');
      navigate("/post");
      return;
    }
    setIsLoading(false);
  }, [whisper, navigate]);

  // Fetch current auth user and map to profile id, redirect if viewing self
  useEffect(() => {
    async function fetchCurrentProfileId() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error('Auth error:', authError);
          return;
        }
        
        if (!user) {
          console.warn('No authenticated user found');
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("id, points")
          .eq("user_id", user.id)
          .single();
          
        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }
        
        if (data && data.id) {
          setCurrentProfileId(data.id);
          setCurrentUserRowId(data.id);
          setUserPoints(data.points || 0);
          
          // Safety check before accessing whisper properties
          if (whisper && whisper.user_id === data.id) {
            navigate("/profile");
            return;
          }

          // Fetch unlocked whispers for this user
          try {
            const { data: unlockedData } = await supabase
              .from('unlocked_whispers')
              .select('whisper_id')
              .eq('user_id', data.id);
            if (Array.isArray(unlockedData)) {
              setUnlockedWhisperIds(unlockedData.map(u => u.whisper_id));
            }
          } catch (unlockedError) {
            console.warn('Error fetching unlocked whispers:', unlockedError);
          }
        }
      } catch (error) {
        console.error('Unexpected error in fetchCurrentProfileId:', error);
      }
    }
    
    if (!isLoading && whisper) {
      fetchCurrentProfileId();
    }
  }, [navigate, whisper, isLoading]);

  // Check if users are blocked
  useEffect(() => {
    async function checkBlockStatus() {
      if (!currentUserRowId || !whisper || !whisper.user_id) return;

      try {
        // Check if current user blocked the viewed user
        const { data: blockedData, error: blockedError } = await supabase
          .from('Blocked')
          .select('*')
          .eq('blocked_by', currentUserRowId)
          .eq('blocked', whisper.user_id)
          .maybeSingle();
        
        if (blockedError && blockedError.code !== 'PGRST116') {
          console.error('Error checking blocked status:', blockedError);
        }
        setIsBlocked(!!blockedData);

        // Check if current user is blocked by the viewed user
        const { data: blockedByData, error: blockedByError } = await supabase
          .from('Blocked')
          .select('*')
          .eq('blocked_by', whisper.user_id)
          .eq('blocked', currentUserRowId)
          .maybeSingle();
        
        if (blockedByError && blockedByError.code !== 'PGRST116') {
          console.error('Error checking blocked by status:', blockedByError);
        }
        setIsBlockedByOther(!!blockedByData);
      } catch (error) {
        console.error('Block status check failed:', error);
      }
    }
    checkBlockStatus();
  }, [currentUserRowId, whisper]);

  // Get user location for distance locking
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ 
            latitude: position.coords.latitude, 
            longitude: position.coords.longitude 
          });
          setIsLocationLoading(false);
        },
        () => setIsLocationLoading(false)
      );
    } else {
      setIsLocationLoading(false);
    }
  }, []);

  const handleCommentClick = (whisperData) => {
    if (whisperData) {
      navigate("/comments", { state: { whisper: whisperData } });
    }
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
    if (!currentUserRowId || !whisper || !whisper.user_id || isBlocked || isBlockedByOther) return;
    
    const followerId = currentUserRowId;
    const followingId = whisper.user_id;
    
    try {
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
    } catch (error) {
      console.error('Toggle follow error:', error);
    }
  };

  const handleBlockUser = async () => {
    if (!currentUserRowId || !whisper || !whisper.user_id) return;

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
    setIsReportModalOpen(true);
    setShowMenuDropdown(false);
  };

  const submitReport = async () => {
    try {
      if (!selectedReportCategory || !reportReason.trim()) {
        alert('Please select a category and provide a reason for reporting.');
        return;
      }

      // Here you would typically insert into a Reports table
      // const { error } = await supabase
      //   .from('Reports')
      //   .insert({
      //     reported_user: whisper.user_id,
      //     reported_by: currentUserRowId,
      //     category: selectedReportCategory,
      //     reason: reportReason.trim(),
      //     created_at: new Date().toISOString()
      //   });

      console.log('Report submitted:', {
        reported_user: whisper ? whisper.user_id : null,
        reported_by: currentUserRowId,
        category: selectedReportCategory,
        reason: reportReason.trim()
      });

      setIsReportModalOpen(false);
      setReportReason('');
      setSelectedReportCategory('');
      alert('User has been reported. Thank you for helping keep our community safe.');
    } catch (error) {
      console.error('Report error:', error);
      alert('Failed to report user. Please try again.');
    }
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
    setReportReason('');
    setSelectedReportCategory('');
  };

  useEffect(() => {
    async function checkFollowing() {
      try {
        if (!currentUserRowId || !whisper || !whisper.user_id || isBlocked || isBlockedByOther) {
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
      if (!whisper || !whisper.user_id) return;

      const userId = whisper.user_id;

      try {
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
            const distance = getDistanceFromLatLonInKm(
              userLocation.latitude, 
              userLocation.longitude, 
              w.latitude, 
              w.longitude
            );
            return { ...w, distance };
          });
          setWhispers(withDistance);
          
          // Fetch viewed user's current points
          const { data: viewedUser, error: pointsErr } = await supabase
            .from('users')
            .select('points')
            .eq('id', userId)
            .single();
          if (!pointsErr && viewedUser) {
            setViewedUserPoints(viewedUser.points || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching whispers:', error);
        setError('Failed to load whispers.');
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
      if (!user) return;

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

  const displayedUser = (whisper && whisper.users) ? whisper.users : { 
    username: "Guest User", 
    profilepic: "placeholder_url"
  };

  const isCurrentUserProfile = whisper && currentProfileId && whisper.user_id === currentProfileId;

  // Show loading state
  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{ backgroundImage: `url(${profileBkg})` }}
      >
        <DreamyLoader />
      </div>
    );
  }

  // Safety check - if no whisper data after loading, show error
  if (!whisper) {
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{ backgroundImage: `url(${profileBkg})` }}
      >
        <div className="bg-white/90 p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">Unable to load the requested profile.</p>
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
            src={displayedUser.profilepic || "/path/to/default/profile.png"}
            alt="Profile"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = "/path/to/default/profile.png";
            }}
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
        {error && <div className="text-red-500 bg-white p-4 rounded-lg mx-4">{error}</div>}
        {whispers.length === 0 && !error && (
          <DreamyLoader/>
        )}
        {whispers.map((whisperData) => {
          const isLockedByDistance = (whisperData.distance ?? Infinity) > maxDistance;
          const isUnlocked = unlockedWhisperIds.includes(whisperData.id);
          const isLocked = isLockedByDistance && !isUnlocked;
          return (
          <div
            key={whisperData.id}
            className="relative w-11/12 max-w-lg mx-auto rounded-3xl shadow-lg bg-pink-100 py-4 px-6 sm:py-6 sm:px-8 mb-3 sm:mb-4"
          >
            {isLocked && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-20 flex-col rounded-3xl">
                <span className="text-pink-700 font-bold text-lg bg-white/70 rounded-sm p-1">🔒 Unlock to view</span>
                <button 
                  onClick={() => handleUnlock(whisperData.id)} 
                  className="mt-2 text-white bg-pink-500 rounded-full px-4 py-2 text-sm font-semibold hover:bg-pink-600 transition-colors"
                >
                  Unlock (2 pts)
                </button>
              </div>
            )}

            <div className={`mt-2 font-[cursive] text-sm sm:text-[16px] text-[#784552] leading-6 ${isLocked ? "blur-sm" : ""}`}>
              {whisperData.content}
            </div>
            {whisperData.Image_url && (
              <div className="mt-2 flex justify-center">
                <img
                  src={whisperData.Image_url}
                  alt="Whisper"
                  className={`w-40 h-40 object-cover rounded-lg shadow ${isLocked ? "blur-sm" : ""}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="flex gap-4 sm:gap-6 md:gap-8 bg-pink-400 rounded-2xl px-4 py-2 sm:px-6 sm:py-3 mt-4 sm:mt-6 justify-center shadow-lg overflow-hidden">
              <button className="hover:scale-110 transition-transform">
                <HeartButton/>
              </button>
              <button
                onClick={() => handleCommentClick(whisperData)}
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
                  onClick={() => handleDelete(whisperData.id)}
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

      {/* Report User Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                🚩 Report User
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Help us keep the community safe by reporting inappropriate behavior.
              </p>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Report Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why are you reporting this user? *
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'harassment', label: '🚫 Harassment or bullying' },
                    { value: 'inappropriate_content', label: '⚠️ Inappropriate content' },
                    { value: 'spam', label: '📧 Spam or unwanted messages' },
                    { value: 'fake_profile', label: '👤 Fake or impersonated profile' },
                    { value: 'hate_speech', label: '💬 Hate speech or discrimination' },
                    { value: 'violence', label: '⚔️ Threats or violence' },
                    { value: 'other', label: '📝 Other (please specify)' }
                  ].map((category) => (
                    <label key={category.value} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="reportCategory"
                        value={category.value}
                        checked={selectedReportCategory === category.value}
                        onChange={(e) => setSelectedReportCategory(e.target.value)}
                        className="mr-3 text-pink-500 focus:ring-pink-400"
                      />
                      <span className="text-sm text-gray-700">{category.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional details *
                </label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Please provide specific details about why you're reporting this user..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent resize-none"
                  rows="4"
                  maxLength="500"
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {reportReason.length}/500 characters
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">Privacy Notice:</span> Your report will be reviewed by our moderation team. 
                  Reports are kept confidential and the reported user will not know who submitted the report.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={closeReportModal}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={!selectedReportCategory || !reportReason.trim()}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
              >
                🚩 Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Follow;