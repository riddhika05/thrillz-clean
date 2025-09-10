// Whispers.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";
import Whisper from "./Whisper";
import DreamyLoader from '../components/loader';

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
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
  const [unlockedWhisperIds, setUnlockedWhisperIds] = useState([]); // New state for unlocked whisper IDs
  const maxDistance = 1.2; // hardcoded distance in km

  // Get user location
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

  // Fetch whispers and user points and unlocked whispers
  useEffect(() => {
    async function fetchWhispersAndPoints() {
      if (isLocationLoading) return;

      const { data: { user } } = await supabase.auth.getUser();

     if (user) {
    // Step 1: Fetch the bigint `id` from the users table using the UUID `user.id`
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, points') // Fetch both id and points in one query
        .eq('user_id', user.id)
        .single();

    if (userError) {
        console.error("Error fetching user data:", userError);
        return; // Exit if user data cannot be fetched
    }

    const { id, points } = userData;
    setUserPoints(points);

    // Step 2: Use the fetched bigint `id` to query the unlocked_whispers table
    const { data: unlockedData, error: unlockedError } = await supabase
        .from('unlocked_whispers')
        .select('whisper_id')
        .eq('user_id', id);

    if (unlockedError) {
        console.error("Error fetching unlocked whispers:", unlockedError);
    } else {
        setUnlockedWhisperIds(unlockedData.map(uw => uw.whisper_id));
        console.log(unlockedData);
    }
}

      // Fetch all whispers
      const { data, error } = await supabase.from("Whispers").select(`
        id,
        content,
        user_id,
        Image_url,
        longitude,
        latitude,
        users:user_id (username, gmail, profilepic)
      `);

      if (error) {
        setError(error.message);
        return;
      }

      const whispersWithDistance = data.map((w) => {
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
  }, [userLocation, isLocationLoading]); 

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
    <ul style={{ listStyleType: "none" }}>
      {whispers.map((w) => (
        <li key={w.id}>
          <Whisper 
            whisper={w} 
            maxDistance={maxDistance} 
            userPoints={userPoints}
            unlocked={unlockedWhisperIds.includes(w.id)} // Pass the unlock status
            onPointsUpdate={handlePointsUpdate}
            onUnlockSuccess={handleUnlockSuccess}
          />
        </li>
      ))}
    </ul>
  );
};

export default Whispers;
