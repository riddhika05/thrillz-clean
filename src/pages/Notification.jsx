import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import clouds from '../assets/clouds.png';
import profileAvatar from "../assets/username.png";
import { FaArrowLeft, FaBell, FaUsers, FaHeart, FaUserPlus, FaEye } from 'react-icons/fa';
import DreamyLoader from '../components/loader';

const Notification = () => {
  const [CurrentProfileId, setCurrentProfileId] = useState(null);
  const [followers, setFollowers] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const navigate = useNavigate();

  // useEffect to fetch the current user's profile ID only once on mount
  useEffect(() => {
    async function fetchCurrentProfileId() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error('Auth error:', authError);
          setIsLoading(false);
          return;
        }

        if (!user) {
          console.warn('No authenticated user found');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("id, username, profilepic")
          .eq("user_id", user.id)
          .single();

        console.log("Current user data:", data);

        if (error) {
          console.error('Error fetching user profile:', error);
          setIsLoading(false);
          return;
        }

        if (data && data.id) {
          setCurrentProfileId(data.id);
        }

      } catch (error) {
        console.error('Unexpected error in fetchCurrentProfileId:', error);
        setIsLoading(false);
      }
    }

    fetchCurrentProfileId();
  }, []);

  // useEffect to fetch followers, which depends on CurrentProfileId
  useEffect(() => {
    async function fetchFollowers() {
      // Only run this function if we have a valid CurrentProfileId
      if (!CurrentProfileId) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from("Following")
          .select(`
              follower,
              created_at,
              users:follower (id, username, profilepic)
          `)
          .eq("following", CurrentProfileId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching followers:', error);
          setIsLoading(false);
          return;
        }

        console.log("Followers data:", data);
        setFollowers(data);
        setFollowersCount(data?.length || 0);
        setIsLoading(false);
        
      } catch (error) {
        console.error('Unexpected error in fetchFollowers:', error);
        setIsLoading(false);
      }
    }

    fetchFollowers();
  }, [CurrentProfileId]);

  // Function to handle viewing user profile
  const handleViewProfile = async (followerData) => {
    try {
      // Find a whisper from this user to pass to the Follow component
      const { data: whisperData, error } = await supabase
        .from("Whispers")
        .select(`
          id,
          content,
          user_id,
          Image_url,
          latitude,
          longitude,
          users:user_id (id, username, gmail, profilepic)
        `)
        .eq("user_id", followerData.users.id)
        .limit(1)
        .single();

      if (error) {
        console.warn('No whispers found for user, creating dummy whisper data:', error);
        // Create a dummy whisper object if no whispers exist
        const dummyWhisper = {
          id: null,
          content: "",
          user_id: followerData.users.id,
          Image_url: null,
          latitude: null,
          longitude: null,
          users: {
            id: followerData.users.id,
            username: followerData.users.username,
            profilepic: followerData.users.profilepic,
            gmail: null
          }
        };
        navigate("/follow", { state: { whisper: dummyWhisper } });
        return;
      }

      // Navigate to the follow page with the whisper data
      navigate("/follow", { state: { whisper: whisperData } });

    } catch (error) {
      console.error('Error navigating to profile:', error);
      // Fallback - create basic whisper data
      const fallbackWhisper = {
        id: null,
        content: "",
        user_id: followerData.users.id,
        Image_url: null,
        latitude: null,
        longitude: null,
        users: {
          id: followerData.users.id,
          username: followerData.users.username,
          profilepic: followerData.users.profilepic,
          gmail: null
        }
      };
      navigate("/follow", { state: { whisper: fallbackWhisper } });
    }
  };

  const handleGoBack = () => {
    navigate(-1); // Go back to previous page
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Recently';
    
    const now = new Date();
    const createdAt = new Date(timestamp);
    const diffInMilliseconds = now - createdAt;
    const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return createdAt.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center flex items-center justify-center" 
        style={{ backgroundImage: `url(${clouds})` }}
      >
        <DreamyLoader />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center" 
      style={{ backgroundImage: `url(${clouds})` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 md:p-8">
        <FaArrowLeft
          className="text-pink-500 text-3xl cursor-pointer hover:text-pink-400 transition-colors"
          onClick={handleGoBack}
        />
        <div className="flex items-center gap-3">
          <FaBell className="text-pink-500 text-2xl" />
          <h1 className="text-2xl md:text-3xl font-bold text-white font-['Delius']">
            Notifications
          </h1>
        </div>
        <div className="w-8"></div> {/* Spacer for centering */}
      </div>

      <div className="container mx-auto px-4 pb-8">
        {/* Stats Card */}
        <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/30 shadow-xl">
          <div className="flex items-center justify-center gap-4 text-white">
            <div className="flex items-center gap-2">
              <FaUsers className="text-pink-500 text-2xl" />
              <div className="text-center">
                <div className="text-3xl font-bold">{followersCount}</div>
                <div className="text-sm opacity-80">Followers</div>
              </div>
            </div>
          
          </div>
        </div>

        {/* Followers List */}
        {followers === null ? (
          <div className="flex justify-center">
            <DreamyLoader />
          </div>
        ) : followers.length === 0 ? (
          <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/20">
            <FaUserPlus className="text-6xl text-pink-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-bold text-white mb-2">No Followers Yet</h3>
            <p className="text-white/80 text-lg">
              Start sharing amazing whispers to attract followers! ✨
            </p>
            <button
              onClick={() => navigate('/post')}
              className="mt-6 bg-gradient-to-r from-pink-400 to-purple-400 text-white px-8 py-3 rounded-full font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300 shadow-lg"
            >
              Create Your First Whisper
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <FaUsers className="text-pink-500" />
              Recent Followers
            </h2>
            
            <div className="grid grid-cols-1 gap-4">
              {followers.map((follower, index) => (
                <div 
                  key={index} 
                  className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Profile Picture */}
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-pink-400 shadow-lg group-hover:scale-105 transition-transform duration-300">
                          <img
                            src={follower.users.profilepic || profileAvatar}
                            alt={`${follower.users.username}'s profile`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = profileAvatar;
                            }}
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full p-1">
                          <FaUserPlus className="text-white text-xs" />
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <button
                          onClick={() => handleViewProfile(follower)}
                          className="text-white font-bold text-lg hover:text-pink-500 transition-colors duration-300 cursor-pointer text-left"
                        >
                          {follower.users.username}
                        </button>
                        <div className="flex items-center gap-2 mt-1">
                          <FaHeart className="text-pink-500 text-sm" />
                          <span className="text-white/80 text-sm">
                            Started following you
                          </span>
                        </div>
                        <span className="text-white/60 text-xs">
                          {formatTimeAgo(follower.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* View Profile Button */}
                    <button
                      onClick={() => handleViewProfile(follower)}
                      className="bg-gradient-to-r from-pink-400 to-purple-400 text-white px-6 py-2 rounded-full font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300 shadow-lg flex items-center gap-2 text-sm opacity-0 group-hover:opacity-100"
                    >
                      <FaEye />
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        
      </div>
    </div>
  );
};

export default Notification;