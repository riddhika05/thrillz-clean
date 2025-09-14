import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export const useNotifications = (currentUserId) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [currentUserId]);

  // Create notification helper function
  const createNotification = useCallback(async (recipientId, type, message, triggeringUserId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          type: type,
          message: message,
          is_read: false,
          created_at: new Date().toISOString(),
          triggering_user_id: triggeringUserId,
        });
      
      if (error) {
        console.error('Error creating notification:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Notification creation failed:', error);
      return false;
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUserId) return false;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false);

      if (error) throw error;
      
      setUnreadCount(0);
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }, [currentUserId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!currentUserId) return;

    // Initial fetch
    fetchUnreadCount();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`notifications:user_id=eq.${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUserId}`
      }, (payload) => {
        console.log('New notification received:', payload.new);
        setUnreadCount(prev => prev + 1);
        
        // Add to notifications list if it exists
        setNotifications(prev => [payload.new, ...prev]);
        
        // Optional: Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Whisper App', {
            body: payload.new.message,
            icon: '/path/to/your/app-icon.png'
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUserId}`
      }, (payload) => {
        console.log('Notification updated:', payload.new);
        // Refresh unread count
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentUserId, fetchUnreadCount]);

  // Request notification permissions
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  return {
    unreadCount,
    notifications,
    loading,
    createNotification,
    markAsRead,
    markAllAsRead,
    fetchUnreadCount,
    requestNotificationPermission
  };
};

// Notification helper functions that can be used throughout the app
export const NotificationHelpers = {
  // Create follow notification
  createFollowNotification: async (followerId, followingId) => {
    try {
      const { data: followerData } = await supabase
        .from('users')
        .select('username')
        .eq('id', followerId)
        .single();

      const followerUsername = followerData?.username || 'Someone';
      
      return await supabase
        .from('notifications')
        .insert({
          user_id: followingId,
          type: 'follow',
          message: `${followerUsername} started following you!`,
          is_read: false,
          triggering_user_id: followerId,
        });
    } catch (error) {
      console.error('Error creating follow notification:', error);
      return { error };
    }
  },

  // Create mutual follow notification
  createMutualFollowNotifications: async (userId1, userId2) => {
    try {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, username')
        .in('id', [userId1, userId2]);

      if (!usersData || usersData.length !== 2) {
        throw new Error('Could not fetch user data');
      }

      const user1 = usersData.find(u => u.id === userId1);
      const user2 = usersData.find(u => u.id === userId2);

      const notifications = [
        {
          user_id: userId1,
          type: 'mutual_follow',
          message: `You and ${user2?.username || 'Someone'} are now mutual followers! All whispers unlocked!`,
          is_read: false,
          triggering_user_id: userId2,
        },
        {
          user_id: userId2,
          type: 'mutual_follow',
          message: `You and ${user1?.username || 'Someone'} are now mutual followers! All whispers unlocked!`,
          is_read: false,
          triggering_user_id: userId1,
        }
      ];

      return await supabase
        .from('notifications')
        .insert(notifications);
    } catch (error) {
      console.error('Error creating mutual follow notifications:', error);
      return { error };
    }
  },

  // Create like notification
  createLikeNotification: async (likerId, whisperOwnerId, whisperId) => {
    try {
      if (likerId === whisperOwnerId) return; // Don't notify for self-likes

      const { data: likerData } = await supabase
        .from('users')
        .select('username')
        .eq('id', likerId)
        .single();

      const likerUsername = likerData?.username || 'Someone';
      
      return await supabase
        .from('notifications')
        .insert({
          user_id: whisperOwnerId,
          type: 'like',
          message: `${likerUsername} liked your whisper!`,
          is_read: false
        });
    } catch (error) {
      console.error('Error creating like notification:', error);
      return { error };
    }
  },

  // Create comment notification
  createCommentNotification: async (commenterId, whisperOwnerId, whisperId) => {
    try {
      if (commenterId === whisperOwnerId) return; // Don't notify for self-comments

      const { data: commenterData } = await supabase
        .from('users')
        .select('username')
        .eq('id', commenterId)
        .single();

      const commenterUsername = commenterData?.username || 'Someone';
      
      return await supabase
        .from('notifications')
        .insert({
          user_id: whisperOwnerId,
          type: 'comment',
          message: `${commenterUsername} commented on your whisper!`,
          is_read: false
        });
    } catch (error) {
      console.error('Error creating comment notification:', error);
      return { error };
    }
  },

  // Clean up old notifications (call this periodically)
  cleanupOldNotifications: async (daysOld = 30) => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      return await supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString());
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return { error };
    }
  }
};