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
  const [isLocationLoading, setIsLocationLoading] = useState(true); // New state variable
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
          setIsLocationLoading(false); // Set to false on success
        },
        (err) => {
          console.error("Location error:", err);
          setIsLocationLoading(false); // Set to false on error
        }
      );
    } else {
      setIsLocationLoading(false); // Also set to false if geolocation isn't supported
    }
  }, []);

  // Fetch whispers
  useEffect(() => {
    async function fetchWhispers() {
      // Don't fetch whispers until location is available or confirmed unavailable
      if (isLocationLoading) return;

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
          // If location is not available, all whispers are "locked"
          return { ...w, distance: Infinity };
        }
        if (!w.latitude || !w.longitude) {
          // If whisper has no location, it's also "locked"
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
    fetchWhispers();
  }, [userLocation, isLocationLoading]); // Add isLocationLoading to dependency array

  if (error) return <div>Error: {error}</div>;
  if (isLocationLoading) return <DreamyLoader />; // Show loader while getting location
  if (!whispers.length) return <DreamyLoader />; // Show loader while fetching whispers

  return (
    <ul style={{ listStyleType: "none" }}>
      {whispers.map((w) => (
        <li key={w.id}>
          <Whisper whisper={w} maxDistance={maxDistance} />
        </li>
      ))}
    </ul>
  );
};

export default Whispers;