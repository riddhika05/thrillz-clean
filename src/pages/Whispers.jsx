import React, { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";
import Whisper from "./Whisper";
import DreamyLoader from '../components/loader';
import ContentFilter from '../utils/contentFilter';

const contentFilter = new ContentFilter();

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const Whispers = () => {
  const [whispers, setWhispers] = useState([]);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState({ latitude: null, longitude: null });
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [unlockedWhisperIds, setUnlockedWhisperIds] = useState([]);
  const [userPreferences, setUserPreferences] = useState({ trigger_words: [], profanity_filter: true });
  const [filteredCount, setFilteredCount] = useState(0);
  
  const maxDistance = 1.2;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsLocationLoading(false);
        },
        (err) => {
          console.error("Location error:", err);
          setIsLocationLoading(false);
        }
      );
    } else {
      setIsLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchWhispersAndPoints() {
      if (isLocationLoading) return;

      const { data: { user } } = await supabase.auth.getUser();
      
      // 🔥 Use local variable instead of state for immediate filtering
      let currentUserPreferences = { trigger_words: [], profanity_filter: true };

      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, points, trigger_words, profanity_filter')
          .eq('user_id', user.id)
          .single();

        if (userError) {
          console.error("Error fetching user data:", userError);
          return;
        }

        const { id, points, trigger_words, profanity_filter } = userData;
        setUserPoints(points);
        
        // 🔥 Set local variable first for immediate use
        currentUserPreferences = {
          trigger_words: trigger_words || [],
          profanity_filter: profanity_filter !== false
        };
        
        // Update state for display purposes
        setUserPreferences(currentUserPreferences);
        
        // 🔥 Debug log to verify trigger words are loaded
        console.log("Loaded trigger words:", currentUserPreferences.trigger_words);

        const { data: unlockedData, error: unlockedError } = await supabase
          .from('unlocked_whispers')
          .select('whisper_id')
          .eq('user_id', id);

        if (unlockedError) {
          console.error("Error fetching unlocked whispers:", unlockedError);
        } else {
          setUnlockedWhisperIds(unlockedData.map(uw => uw.whisper_id));
        }
      }

      const { data, error } = await supabase.from("Whispers").select(`
        id,
        content,
        user_id,
        Image_url,
        longitude,
        latitude,
        Likes,
        created_at,
        users:user_id (username, gmail, profilepic)
      `);

      if (error) {
        setError(error.message);
        return;
      }

      let filteredWhispers = data;
      const originalCount = data.length;

      // 🔥 Use local variable for filtering (not state)
      if (currentUserPreferences.trigger_words && currentUserPreferences.trigger_words.length > 0) {
        console.log("Filtering with trigger words:", currentUserPreferences.trigger_words);
        
        filteredWhispers = data.filter(whisper => {
          const filterResult = contentFilter.containsTriggerWords(
            whisper.content,
            currentUserPreferences.trigger_words,
            70
          );
          
          // 🔥 Debug log for filtered whispers
          if (filterResult.hasMatch) {
            console.log(`🚫 FILTERED: "${whisper.content}" - matches:`, filterResult.matches);
          }
          
          return !filterResult.hasMatch;
        });
      }

      if (currentUserPreferences.profanity_filter) {
        filteredWhispers = filteredWhispers.map(whisper => ({
          ...whisper,
          content: contentFilter.censorProfanity(whisper.content, 80)
        }));
      }

      setFilteredCount(originalCount - filteredWhispers.length);
      
      // 🔥 Debug log for filtering results
      console.log(`📊 Filtered ${originalCount - filteredWhispers.length} out of ${originalCount} whispers`);

      const whispersWithDistance = filteredWhispers.map((w) => {
        if (!userLocation.latitude || !userLocation.longitude) {
          return { ...w, distance: Infinity };
        }
        if (!w.latitude || !w.longitude) {
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
      
      whispersWithDistance.sort((a, b) => a.distance - b.distance);
      setWhispers(whispersWithDistance);
    }
    
    fetchWhispersAndPoints();
  }, [userLocation, isLocationLoading]); // 🔥 Don't include userPreferences here

  const handlePointsUpdate = (newPoints) => {
    setUserPoints(newPoints);
  };
  
  const handleUnlockSuccess = (whisperId) => {
    setUnlockedWhisperIds(prevIds => [...prevIds, whisperId]);
  };

  if (error) return <div>Error: {error}</div>;
  if (isLocationLoading) return <DreamyLoader />; 
  if (!whispers.length) return <DreamyLoader />; 

  return (
    <div>
      {filteredCount > 0 && (
        <div style={{
          background: 'rgba(255, 214, 186, 0.2)',
          padding: '10px',
          borderRadius: '10px',
          margin: '10px 0',
          textAlign: 'center',
          color: '#FFD6BA',
          fontSize: '14px'
        }}>
          📱 {filteredCount} whisper{filteredCount > 1 ? 's' : ''} filtered based on your preferences
        </div>
      )}

      <ul style={{ listStyleType: "none" }}>
        {whispers.map((w) => (
          <li key={w.id}>
            <Whisper 
              whisper={w} 
              maxDistance={maxDistance} 
              userPoints={userPoints}
              unlocked={unlockedWhisperIds.includes(w.id)}
              onPointsUpdate={handlePointsUpdate}
              onUnlockSuccess={handleUnlockSuccess}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Whispers;
