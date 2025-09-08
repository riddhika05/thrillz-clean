import React, { useState, useRef, useEffect } from "react";
import backgroundImage from "../assets/new post.png";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import axios from "axios";

export default function NewPost() {
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

  const handleImageUpload = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleContinue = () => {
    navigate("/post");
  };

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

      // Resolve current auth user -> users.id
      if (!profileId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error(authError?.message || "No logged-in user");
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (profileError) throw profileError;
        setProfileId(profile.id);
      }

      const effectiveUserId = profileId || (await (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from("users").select("id").eq("user_id", user.id).single();
        return profile.id;
      })());
      
       // Get live coordinates
    let latitude = null;
    let longitude = null;
    if (navigator.geolocation) {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
            resolve();
          },
          reject
        );
      });
    }
      const { error: insertError } = await supabase.from("Whispers").insert([
        {
          content: text,
          user_id: effectiveUserId,
          Image_url: imageUrl,
          latitude,
          longitude,
        },
      ]);

      if (insertError) throw insertError;
      console.log(insertError);

      navigate("/post");
    } catch (err) {
      console.error("Error uploading whisper:", err.message);
      alert("Upload failed: " + err.message);
    }
  };

  // Fetches location from Supabase or geocodes if null
  useEffect(() => {
    const fetchLocation = async () => {
      // Resolve profile id if not set
      let idToUse = profileId;
      if (!idToUse) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
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

      // 1. Fetch location from Supabase for this user profile
      const { data, error } = await supabase
        .from("users")
        .select("Location")
        .eq("id", idToUse)
        .single();
      
      if (error) {
        console.error("Error fetching location:", error);
        setCurrentLocation("Could not fetch location.");
        return;
      }
      
      const userLocation = data?.Location;

      // 2. If Location is NULL, perform reverse geocoding
      if (!userLocation) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude, longitude } = pos.coords;
              try {
                // Use a reverse geocoding service (Nominatim in this case)
                const response = await axios.get(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                );
                const fetchedLocationName = response.data.display_name;
                setCurrentLocation(fetchedLocationName);

                // 3. Update the Location column in Supabase
                const { error: updateError } = await supabase
                  .from("users")
                  .update({ Location: fetchedLocationName })
                  .eq("id", idToUse);

                if (updateError) {
                  console.error("Error updating location:", updateError);
                }
              } catch (err) {
                console.error("Reverse geocoding failed:", err);
                setCurrentLocation("Location not found.");
              }
            },
            (geoError) => {
              console.error("Geolocation denied or failed:", geoError);
              setCurrentLocation("Location access denied or not available.");
            }
          );
        } else {
          setCurrentLocation("Geolocation not supported by browser.");
        }
      } else {
        // 4. Display the location from Supabase
        setCurrentLocation(userLocation);
      }
    };

    fetchLocation();
  }, []);

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
      <div className="absolute top-6 left-6 z-10">
        <FaArrowLeft
          className="text-pink-300 text-3xl cursor-pointer"
          onClick={handleContinue}
        />
      </div>
      <header className="text-center mb-6">
        <h1 className="font-bold text-4xl mb-2 text-white">New Whisper</h1>
        <p className="text-sm opacity-100 text-white font-bold">
          Location - {currentLocation}
        </p>
      </header>
      <div className="flex flex-col items-center w-full">
        <section
          className={`w-full max-w-2xl bg-pink-200 border-t border-l border-r border-pink-200 overflow-hidden ${
            image ? "rounded-t-lg" : "rounded-lg"
          } h-30 sm:h-40 md:h-60`}
        >
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
              aria-label="Post text"
              style={{ color: color, lineHeight: "1.5" }}
              ref={textareaRef}
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