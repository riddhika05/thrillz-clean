import React, { useState, useEffect } from "react";
import girl from "../assets/username.png";
import "./EditProfile.css";
import { useNavigate } from "react-router-dom";
import {
  uniqueNamesGenerator,
  adjectives,
  animals,
} from "unique-names-generator";
import { supabase } from "../supabaseClient";
import { FaArrowLeft } from "react-icons/fa";
import ContentFilter from "../utils/contentFilter";

const contentFilter = new ContentFilter();

function generateUsername() {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: "",
    style: "capital",
    length: 2,
  });
}

const EditProfile = () => {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [triggerWordInput, setTriggerWordInput] = useState("");
  const [triggerWords, setTriggerWords] = useState([]);
  const [profanity, setProfanity] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Load user profile and preferences
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return;

        const { data, error } = await supabase
          .from("users")
          .select("id, username, profilepic, trigger_words, profanity_filter")
          .eq("user_id", user.id)
          .single();

        if (!error && data) {
          setProfileId(data.id);
          setNickname(data.username || generateUsername());
          setProfilePic(data.profilepic || null);
          setAvatarPreview(data.profilepic || null);
          setTriggerWords(data.trigger_words || []);
          setProfanity(data.profanity_filter !== false); // Default to true
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    }
    loadProfile();
  }, []);

  const handleAddTriggerWord = () => {
    const word = triggerWordInput.trim().toLowerCase();
    if (!word) return;

    // Check if word already exists or is too similar to existing words
    const similarWord = triggerWords.find(existing => 
      contentFilter.similarity(word, existing.toLowerCase()) > 85
    );

    if (similarWord) {
      alert(`"${word}" is too similar to existing trigger word: "${similarWord}"`);
      return;
    }

    // Check if word is longer than 1 character
    if (word.length < 2) {
      alert("Trigger words must be at least 2 characters long");
      return;
    }

    setTriggerWords([...triggerWords, word]);
    setTriggerWordInput("");
  };

  const handleRemoveTriggerWord = (wordToRemove) => {
    setTriggerWords(triggerWords.filter((word) => word !== wordToRemove));
  };

  const handleToggleProfanity = () => setProfanity(!profanity);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error(authError?.message || "No logged-in user");

      let profilepicUrl = profilePic || null;

      // Handle avatar upload
      if (selectedAvatarFile) {
        const file = selectedAvatarFile;
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
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

      // Update user profile with trigger words and profanity filter
      const updates = { 
        username: nickname,
        trigger_words: triggerWords,
        profanity_filter: profanity
      };
      if (profilepicUrl) updates.profilepic = profilepicUrl;

      // Update password if provided
      if (password.trim()) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password
        });
        if (passwordError) throw passwordError;
      }

      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
      if (profilepicUrl) setProfilePic(profilepicUrl);
      
      alert("Profile updated successfully!");
      setPassword(""); // Clear password field after successful update
    } catch (err) {
      console.error("Error saving profile:", err.message);
      alert(`Failed to save profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Error logging out");
    }
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
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleContinue = () => {
    navigate("/profile");
  };

  return (
    <div className="edit-profile-container">
      {/* Top bar with logout */}
      <div className="flex items-center justify-end">
        <button className="logout-btn-gradient" onClick={handleLogout}>
          <span className="logout-btn-text">LOG-OUT</span>
        </button>
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
            required
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
            <span className="trigger-help-text"></span>
          </label>
          <div className="trigger-input-container">
            <input
              id="triggerWordInput"
              className="edit-input"
              type="text"
              value={triggerWordInput}
              onChange={(e) => setTriggerWordInput(e.target.value)}
              placeholder="Enter trigger word"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTriggerWord();
                }
              }}
            />
            <button
              type="button"
              className="add-trigger-btn"
              onClick={handleAddTriggerWord}
              disabled={loading}
            >
              +
            </button>
          </div>
        </div>

        <div className="trigger-words-section" id="triggerWords">
          {triggerWords.length > 0 ? (
            triggerWords.map((word, idx) => (
              <span key={idx} className="trigger-word">
                {word}
                <button
                  type="button"
                  className="remove-trigger-btn"
                  title="Remove trigger word"
                  onClick={() => handleRemoveTriggerWord(word)}
                >
                  &times;
                </button>
              </span>
            ))
          ) : (
            <div className="no-trigger-words">
              <p>No trigger words set. All content will be visible in your feed.</p>
            </div>
          )}
        </div>

        <div className="form-row">
          <label className="edit-label" htmlFor="profanity-toggle">
            Profanity Filter
            <span className="profanity-help-text"></span>
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

        <button type="submit" className="save-btn" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
};

export default EditProfile;