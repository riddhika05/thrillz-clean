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

  // Fetch whispers and user points
  useEffect(() => {
    async function fetchWhispersAndPoints() {
      if (isLocationLoading) return;

      const { data: { user } } = await supabase.auth.getUser();

      // Fetch user's points
      if (user) {
          const { data: userData, error: userError } = await supabase
              .from('users')
              .select('points')
              .eq('user_id', user.id)
              .single();
          if (!userError) {
              setUserPoints(userData.points);
          }
      }

      // Fetch whispers
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

  // New function to handle points update from Whisper component
  const handlePointsUpdate = (newPoints) => {
    setUserPoints(newPoints);
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
            onPointsUpdate={handlePointsUpdate}
          />
        </li>
      ))}
    </ul>
  );
};

export default Whispers;