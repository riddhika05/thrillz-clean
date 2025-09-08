import React, { useState, useRef, useEffect } from "react";
import backgroundImage from "../assets/new post.png";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import axios from "axios";
import musicIcon from "../assets/music.png"; // ✅ Make sure path is correct

export default function NewPost({ audioRef }) {
  const [text, setText] = useState("Write your Whisper!");
  const [color, setColor] = useState("#784552");
  const [fontSize, setFontSize] = useState("text-base");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [image, setImage] = useState(null);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef();
  const textareaRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState("Loading location...");
  const [profileId, setProfileId] = useState(null);

  const navigate = useNavigate();

  // 🎵 Music state
  const [isMuted, setIsMuted] = useState(false);

  // ✅ Sync with audioRef state on mount
  useEffect(() => {
    if (audioRef?.current) {
      setIsMuted(audioRef.current.muted);
    }
  }, [audioRef]);

  // ✅ Mute toggle
  const toggleMute = () => {
    if (!audioRef?.current) return;
    const newMuteState = !audioRef.current.muted;
    audioRef.current.muted = newMuteState;
    setIsMuted(newMuteState);
  };

  // Handle image upload
  const handleImageUpload = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleContinue = () => navigate("/post");
  const handleColorChange = (event) => setColor(event.target.value);
  const handleFontSize = () =>
    setFontSize(fontSize === "text-base" ? "text-xl" : "text-base");
  const handleBold = () => setIsBold(!isBold);
  const handleItalic = () => setIsItalic(!isItalic);
  const handleClear = () => {
    setText("");
    setImage(null);
    setFile(null);
  };

  // Upload whisper to Supabase
  const handleUpload = async () => {
    try {
      let imageUrl = null;

      if (file) {
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("Post_images")
          .upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("Post_images")
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      if (!profileId) {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) throw new Error(authError?.message || "No user");

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (profileError) throw profileError;
        setProfileId(profile.id);
      }

      const effectiveUserId =
        profileId ||
        (await (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = await supabase
            .from("users")
            .select("id")
            .eq("user_id", user.id)
            .single();
          return profile.id;
        })());

      const { error: insertError } = await supabase.from("Whispers").insert([
        { content: text, user_id: effectiveUserId, Image_url: imageUrl },
      ]);
      if (insertError) throw insertError;

      navigate("/post");
    } catch (err) {
      console.error("Error uploading whisper:", err.message);
      alert("Upload failed: " + err.message);
    }
  };

  // Fetch location from Supabase or geocoding
  useEffect(() => {
    const fetchLocation = async () => {
      let idToUse = profileId;
      if (!idToUse) {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
          setCurrentLocation("Could not fetch location.");
          return;
        }
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (profileError) {
          setCurrentLocation("Could not fetch location.");
          return;
        }
        idToUse = profile.id;
        setProfileId(idToUse);
      }

      const { data, error } = await supabase
        .from("users")
        .select("Location")
        .eq("id", idToUse)
        .single();
      if (error) {
        setCurrentLocation("Could not fetch location.");
        return;
      }

      const userLocation = data?.Location;
      if (!userLocation) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude, longitude } = pos.coords;
              try {
                const response = await axios.get(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                );
                const fetchedLocationName = response.data.display_name;
                setCurrentLocation(fetchedLocationName);

                await supabase
                  .from("users")
                  .update({ Location: fetchedLocationName })
                  .eq("id", idToUse);
              } catch {
                setCurrentLocation("Location not found.");
              }
            },
            () => setCurrentLocation("Location access denied.")
          );
        } else {
          setCurrentLocation("Geolocation not supported.");
        }
      } else {
        setCurrentLocation(userLocation);
      }
    };

    fetchLocation();
  }, []);

  // Keep cursor at end
  useEffect(() => {
    if (textareaRef.current) {
      const end = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(end, end);
      textareaRef.current.focus();
    }
  }, [text]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-cover bg-center relative"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Back button */}
      <div className="absolute top-6 left-6 z-10">
        <FaArrowLeft
          className="text-pink-300 text-3xl cursor-pointer"
          onClick={handleContinue}
        />
      </div>

      {/* 🎵 Music Icon */}
      <div className="absolute top-6 right-6 z-20">
        <div className="relative cursor-pointer" onClick={toggleMute}>
          <img
            src={musicIcon}
            alt="Music"
            className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
          />
          {isMuted && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-[3px] bg-red-600 rotate-45"></div>
            </div>
          )}
        </div>
      </div>

      <header className="text-center mb-6">
        <h1 className="font-bold text-4xl mb-2 text-white">New Whisper</h1>
        <p className="text-sm text-white font-bold">
          Location - {currentLocation}
        </p>
      </header>

      {/* Post composer */}
      <div className="flex flex-col items-center w-full">
        <section
          className={`w-full max-w-2xl bg-pink-200 border-t border-l border-r border-pink-200 overflow-hidden ${
            image ? "rounded-t-lg" : "rounded-lg"
          } h-30 sm:h-40 md:h-60`}
        >
          {/* Toolbar */}
          <div className="flex gap-3 p-3 border-b border-pink-200 bg-pink-400">
            <div className="relative p-2 rounded bg-pink-400 hover:bg-pink-300">
              🎨
              <input
                type="color"
                value={color}
                onChange={handleColorChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <button
              onClick={handleFontSize}
              className="p-2 rounded bg-pink-400 hover:bg-pink-300 text-white"
            >
              Aa
            </button>
            <button
              onClick={handleBold}
              className={`p-2 rounded ${
                isBold ? "bg-pink-300" : "bg-pink-400"
              } text-white`}
            >
              B
            </button>
            <button
              onClick={handleItalic}
              className={`p-2 rounded ${
                isItalic ? "bg-pink-300" : "bg-pink-400"
              } text-white`}
            >
              I
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded bg-pink-400 hover:bg-pink-300 text-white"
            >
              ⌫
            </button>
            <div
              className="relative p-2 rounded bg-pink-400 hover:bg-pink-300 cursor-pointer"
              onClick={() => fileInputRef.current.click()}
              title="Upload image"
            >
              🖼️
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                style={{ width: "100%", height: "100%" }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Textarea */}
          <div className="relative h-70">
            <div
              className={`absolute inset-0 overflow-auto whitespace-pre-wrap p-4 pointer-events-none ${fontSize} ${
                isBold ? "font-bold" : "font-medium"
              } ${isItalic ? "italic" : ""}`}
              style={{ color: color, lineHeight: "1.5" }}
            >
              {text.split("\n").map((line, idx) => (
                <p key={idx} className="my-1">
                  {line}
                </p>
              ))}
            </div>

            <textarea
              className={`absolute inset-0 w-full h-full resize-none caret-pink-500 p-4 outline-none selection:bg-pink-200 bg-white font-[cursive] text-sm ${fontSize} leading-6 ${
                isBold ? "font-bold" : "font-medium"
              } ${isItalic ? "italic" : ""}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck="true"
              ref={textareaRef}
              style={{ color: color, lineHeight: "1.5" }}
            />
          </div>
        </section>

        {image && (
          <div className="flex justify-center mt-0 w-full bg-white max-w-2xl border-b border-l border-r border-pink-200 rounded-b-lg">
            <img
              src={image}
              alt="Uploaded"
              className="w-40 h-40 object-cover rounded-lg shadow mb-3"
            />
          </div>
        )}
      </div>

      {/* Upload button */}
      <div className="mt-6">
        <button
          onClick={handleUpload}
          className="px-6 py-2 rounded-full bg-pink-400 text-white font-semibold
          transition-all duration-200 hover:shadow-lg active:scale-95"
        >
          UPLOAD
        </button>
      </div>
    </div>
  );
}
