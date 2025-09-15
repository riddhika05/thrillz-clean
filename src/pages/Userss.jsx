import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, MessageCircle, UserPlus, ArrowLeft, Mail, Award, Users } from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import Post from './Post';
import clouds from "../assets/clouds.png";
import Loader from '../components/loader'; // Corrected import path

import { useNavigate } from 'react-router-dom';

const UserSearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Fetch users from Supabase
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('users')
          .select('id, username, profilepic, gmail, Location, points, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setUsers(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // ✅ Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    return users.filter(user =>
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.Location?.toLowerCase().includes(searchQuery.toLowerCase()) || // Note: schema uses "Location"
      user.gmail?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, users]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  const navigate = useNavigate();
  function handleleft() {
    navigate("/post");
  }
  const ProfileModal = ({ user, onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl max-w-md w-full mx-4 overflow-hidden shadow-2xl">
        {/* Header */}

   <div className="relative p-6 bg-gradient-to-br from-amber-200 via-rose-300 to-pink-400">


      
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>

          <div className="text-center pt-8">
            <div className="relative inline-block">
              <img
                src={user.profilepic || '/api/placeholder/120/120'}
                alt={user.username}
                className="w-24 h-24 rounded-full border-4 border-white/30 shadow-lg object-cover"
              />
              <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-2 border-white"></div>
            </div>
            <h2 className="text-2xl font-bold text-white mt-4">@{user.username}</h2>
            <p className="text-white/80 flex items-center justify-center mt-2">
              <MapPin size={16} className="mr-1" />
              {user.Location || 'Location not set'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-4 text-center bg-pink-blur-sm">
              <Award className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{user.points || 0}</div>
              <div className="text-white/60 text-sm">Points</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
              <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">0</div>
              <div className="text-white/60 text-sm">Following</div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
           
            <div className="text-white/60 text-xs text-center">
              Joined {formatDate(user.created_at)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
           
            <button className="flex-1 bg-white/20 text-white py-3 rounded-xl font-semibold hover:bg-white/30 transition-colors flex items-center justify-center">
              <UserPlus size={18} className="mr-2" />
              Follow
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-300 via-pink-300 to-rose-400 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 flex items-center justify-center">
        <div className="text-white text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
  <div
  className="min-h-screen bg-cover bg-center bg-no-repeat p-4 flex flex-col items-center justify-start"
  style={{ backgroundImage: `url(${clouds})` }}
>
      <div className="max-w-6xl w-full mx-auto">
        {/* Header */}
             <button
    onClick={handleleft}
    className="absolute left-4 top-4 p-2 text-pink-200 hover:text-pink-300 transition-colors"
  >
    <ArrowLeft size={34} />
  </button>
  
        <div className="text-center mb-8 mt-12">
          <h1 className="text-4xl font-bold text-white mb-4 font-['Delius'] ">Discover People</h1>
          <p className="text-white/80 font-dilan ">Find and connect with amazing people in your network</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-white/60" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-6 hover:bg-white/30 hover:scale-105 transition-all duration-200 cursor-pointer group"
            >
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <img
                    src={user.profilepic || '/api/placeholder/80/80'}
                    alt={user.username}
                    className="w-20 h-20 rounded-full border-3 border-white/40 shadow-lg object-cover group-hover:border-white/60 transition-colors"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                </div>

                <h3 className="text-white font-semibold text-lg mb-1">@{user.username}</h3>

                <div className="flex items-center justify-center text-white/70 text-sm mb-3">
                  <MapPin size={14} className="mr-1" />
                  {user.Location || 'Unknown'}
                </div>

                <div className="flex items-center justify-center text-white/60 text-sm mb-4">
                  <Award size={14} className="mr-1 text-yellow-400" />
                  {user.points || 0} points
                </div>

                <div className="flex gap-2">
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Add follow logic
                    }}
                className="flex-1 bg-gradient-to-r from-purple-200 to-pink-200 hover:from-purple-300 hover:to-pink-300 text-purple-900 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center"



                  >
                    <UserPlus size={14} className="mr-1" />
                    Follow
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredUsers.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <div className="text-white/60 text-lg">No users found matching "{searchQuery}"</div>
            <p className="text-white/40 mt-2">Try searching with different keywords</p>
          </div>
        )}

        {/* Profile Modal */}
        {selectedUser && (
          <ProfileModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </div>
    </div>
  );
};

export default UserSearchPage;