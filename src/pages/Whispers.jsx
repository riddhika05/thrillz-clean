import React from 'react'
import {supabase} from "../supabaseClient"
import { useState,useEffect } from 'react'
import Whisper from "./Whisper"
import DreamyLoader from '../components/loader'
const Whispers = () => {
  const [whispers, setWhispers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchWhispers() {
      const { data, error } = await supabase.from('Whispers').select(`
    id,
    content,
    user_id,
    Image_url,
    longitude,
    latitude,
    users:user_id (username, gmail, profilepic)
  `);
   console.log("Full response:", { data, error });
      if (error) {
        setError(error.message);
      } else {
        setWhispers(data);
      }
    }
    fetchWhispers();
  }, [supabase]); 

  if (error) return <div>Error: {error}</div>;
  if (!whispers.length) return <DreamyLoader/>; //Aaayush ka kaam

  return (
    <ul style={{ listStyleType: "none" }}>
      {whispers.map((w) => (
        <li key={w.id}><Whisper whisper={w} /></li> 
      ))}
    </ul>
  );
}

export default Whispers
