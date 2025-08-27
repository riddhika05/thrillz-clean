import React, { useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Post from "./pages/Post";
import Map from "./pages/Map";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Avatar from "./pages/Avatar";
import Chatbot from "./pages/Chatbot";
import Chat from "./pages/Chat";
import Comments from "./pages/Comments";
import Newpost from "./pages/Newpost";
import Follow from "./pages/Follow";

function App() {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;

    if (audio) {
      // Autoplay requires a user interaction in most browsers
      const playAudio = () => {
        audio.play().catch((err) => {
          console.warn("Autoplay blocked, waiting for user interaction", err);
        });
        window.removeEventListener("click", playAudio);
      };

      // Try autoplay immediately
      audio.play().catch(() => {
        console.warn("Autoplay blocked, waiting for user interaction");
        // If blocked, wait for first user click
        window.addEventListener("click", playAudio);
      });
    }
  }, []);

  return (
    <Router>
      {/* Hidden audio player */}
      <audio ref={audioRef} src="/lofi2.mp3" loop />

      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/post' element={<Post audioRef={audioRef} />} />
        <Route path='/explore' element={<Map />} />
        <Route path='/profile' element={<Profile />} />
        <Route path='/edit-profile' element={<EditProfile audioRef={audioRef}  />} />
        <Route path='/avatar' element={<Avatar />} />
        <Route path='/chatbot' element={<Chatbot />} />
        <Route path='/chat' element={<Chat />} />
        {/* Pass audioRef to Comments component */}
        <Route path='/comments' element={<Comments audioRef={audioRef} />} /> 
        <Route path='/newpost' element={<Newpost />} />
        <Route path='/follow' element={<Follow />} />
      </Routes>
    </Router>
  );
}

export default App;
