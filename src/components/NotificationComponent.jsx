import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FaBell, FaHeart, FaUserPlus, FaComment, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const NotificationsComponent = ({ isOpen, onClose, currentUserId }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setNotifications(data || []);
      
      // Count unread notifications
      const unread = data ? data.filter(n => !n.is_read).length : 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'follow':
        return <FaUserPlus className="text-blue-500" />;
      case 'mutual_follow':
        return <FaHeart className="text-pink-500" />;
      case 'like':
        return <FaHeart className="text-red-500" />;
      case 'comment':
        return <FaComment className="text-green-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - notificationTime) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return notificationTime.toLocaleDateString();
  };

  const handleNotificationClick = (notification) => {
    if (notification.type === 'follow' || notification.type === 'mutual_follow') {
      // Navigate to the follower's profile page
      navigate(`/follow`, { state: { whisper: { user_id: notification.triggering_user_id } } });
    }
    // Mark as read after navigating
    markAsRead(notification.id);
  };


  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchNotifications();
    }
  }, [isOpen, currentUserId]);

  // Real-time notifications subscription
  useEffect(() => {
    if (!currentUserId) return;

    const subscription = supabase
      .channel(`notifications:user_id=eq.${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUserId}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentUserId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FaBell className="text-xl text-pink-500" />
            <h2 className="text-xl font-bold text-gray-800">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            <FaTimes />
          </button>
        </div>

        {/* Actions */}
        {unreadCount > 0 && (
          <div className="p-3 border-b border-gray-100">
            <button
              onClick={markAllAsRead}
              className="text-sm text-pink-500 hover:text-pink-600 font-medium"
            >
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <FaBell className="text-4xl mx-auto mb-4 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${
                        !notification.is_read ? 'font-medium text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-blue-500 hover:text-blue-600"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-gray-400 hover:text-red-500 text-sm"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Notifications are kept for 30 days
          </p>
        </div>
      </div>
    </div>
  );
};

// Notification Bell Icon Component (for navbar/header)
export const NotificationBell = ({ unreadCount, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="relative p-2 text-pink-300 hover:text-pink-400 transition-colors"
    >
      <FaBell className="text-2xl" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationsComponent;