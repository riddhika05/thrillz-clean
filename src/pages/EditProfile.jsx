import React, { useState, useEffect } from "react";
import girl from "../assets/username.png";
import musicIcon from "../assets/music.png";
import "./EditProfile.css";
import { useNavigate } from "react-router-dom";
import {
  uniqueNamesGenerator,
  adjectives,
  animals,
} from "unique-names-generator";
import { supabase } from "../supabaseClient";
import { FaArrowLeft } from "react-icons/fa";

function generateUsername() {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: "",
    style: "capital",
    length: 2,
  });
}

const EditProfile = ({ audioRef }) => {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [triggerWordInput, setTriggerWordInput] = useState("");
  const [triggerWords, setTriggerWords] = useState([]);
  const [profanity, setProfanity] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  const navigate = useNavigate();

  // keep sync with audioRef
  useEffect(() => {
    if (audioRef?.current) {
      setIsMuted(audioRef.current.muted);
    }
  }, [audioRef]);

  const toggleMusic = () => {
    if (audioRef?.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  };

  const handleAddTriggerWord = () => {
    if (
      triggerWordInput.trim() &&
      !triggerWords.includes(triggerWordInput.trim())
    ) {
      setTriggerWords([...triggerWords, triggerWordInput.trim()]);
      setTriggerWordInput("");
    }
  };

  const handleRemoveTriggerWord = (wordToRemove) => {
    setTriggerWords(triggerWords.filter((word) => word !== wordToRemove));
  };

  const handleToggleProfanity = () => setProfanity(!profanity);

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user)
        throw new Error(authError?.message || "No logged-in user");

      let profilepicUrl = profilePic || null;

      if (selectedAvatarFile) {
        const file = selectedAvatarFile;
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        profilepicUrl = publicData?.publicUrl || profilepicUrl;
      }

      const updates = { username: nickname };
      if (profilepicUrl) updates.profilepic = profilepicUrl;

      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
      if (profilepicUrl) setProfilePic(profilepicUrl);
      alert("Profile updated!");
    } catch (err) {
      console.error("Error saving profile:", err.message);
      alert("Failed to save profile");
    }
  };

  const handleLogout = () => {
    alert("Logged Out");
    navigate("/");
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
      setSelectedAvatarFile(file);
    }
  };

  useEffect(() => {
    if (!nickname) {
      setNickname(generateUsername());
    }
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleContinue = () => {
    navigate("/profile");
  };

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) return;
      const { data, error } = await supabase
        .from("users")
        .select("id, username, profilepic")
        .eq("user_id", user.id)
        .single();
      if (!error && data) {
        setProfileId(data.id);
        setProfilePic(data.profilepic || null);
        setAvatarPreview(data.profilepic || null);
      }
    }
    loadProfile();
  }, []);

  return (
    <div className="edit-profile-container">
      {/* Top bar with logout + music */}
      <div className="flex items-center justify-between">
        <button className="logout-btn-gradient" onClick={handleLogout}>
          <span className="logout-btn-text">LOG-OUT</span>
        </button>

        {/* music toggle */}
        <div className="music" onClick={toggleMusic}>
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

      {/* Back Arrow */}
      <div className="Arrow">
        <FaArrowLeft
          className="text-pink-300 text-3xl cursor-pointer"
          onClick={handleContinue}
        />
      </div>

      {/* Avatar Section */}
      <div className="avatar-container">
        <div className="avatar">
          <img
            src={avatarPreview || profilePic || girl}
            alt="User Avatar"
            style={{ width: "100%", height: "100%", borderRadius: "50%" }}
          />
        </div>
        <div
          className="plus-icon"
          onClick={() => document.getElementById("avatar-upload").click()}
          style={{ cursor: "pointer" }}
          title="Change profile picture"
        >
          +
        </div>
        <input
          type="file"
          accept="image/*"
          id="avatar-upload"
          style={{ display: "none" }}
          onChange={handleAvatarChange}
        />
      </div>

      {/* Form Section */}
      <form className="edit-profile-form" onSubmit={handleSave}>
        <div className="form-row">
          <label className="edit-label" htmlFor="nickname">
            Change nickname
          </label>
          <input
            className="edit-input"
            type="text"
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter nickname"
          />
        </div>

        <div className="form-row">
          <label className="edit-label" htmlFor="password">
            Change password
          </label>
          <input
            className="edit-input"
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
          />
        </div>

        <div className="form-row">
          <label className="edit-label" htmlFor="triggerWordInput">
            Trigger words
          </label>
          <input
            id="triggerWordInput"
            className="edit-input"
            type="text"
            value={triggerWordInput}
            onChange={(e) => setTriggerWordInput(e.target.value)}
            placeholder="Trigger word"
          />
          <button
            type="button"
            className="add-trigger-btn"
            onClick={handleAddTriggerWord}
          >
            +
          </button>
        </div>

        <div className="trigger-words-section" id="triggerWords">
          {triggerWords.map((word, idx) => (
            <span key={idx} className="trigger-word">
              {word}
              <button
                type="button"
                className="ml-2 text-white"
                title="Remove trigger word"
                onClick={() => handleRemoveTriggerWord(word)}
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        <div className="form-row">
          <label className="edit-label" htmlFor="profanity-toggle">
            Profanity Remover
          </label>
          <div
            id="profanity-toggle"
            role="switch"
            aria-checked={profanity}
            className={`toggle ${profanity ? "active" : ""}`}
            onClick={handleToggleProfanity}
            tabIndex={0}
          >
            <div className={`toggle-knob ${profanity ? "active" : ""}`} />
          </div>
        </div>

        <button type="submit" className="save-btn">
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditProfile;
