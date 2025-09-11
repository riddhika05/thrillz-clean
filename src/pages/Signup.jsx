import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signUp } from "../Services/Auth";
import { supabase } from "../supabaseClient";
import bgd from "../assets/login_bg.jpg";

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

 const handleSignup = async () => {
  if (!email || !password || !confirmPassword) {
    alert("Please fill all fields");
    return;
  }
  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  try {
    setLoading(true);

    // 1. Sign up the user
    const { data, error } = await signUp(email, password, "user");
    if (error) {
      alert(error.message || "Signup failed");
      return;
    }

    let authUserId = data?.user?.id;
    if (!authUserId) {
      const { data: getUserData } = await supabase.auth.getUser();
      authUserId = getUserData?.user?.id || null;
    }

    if (!authUserId) {
      alert("Failed to get user ID");
      return;
    }

    // 2. Generate a default avatar
    const username = (email || "").split("@")[0];
    const randomNumber = Math.floor(Math.random() * (100 - 20 + 1)) + 20;
    const avatarUrl = `https://avatar.iran.liara.run/public/${randomNumber}`;

    // Fetch the avatar as a blob
    const res = await fetch(avatarUrl);
    if (!res.ok) throw new Error("Failed to fetch avatar");
    const blob = await res.blob();
    const file = new File([blob], `${username}-avatar.png`, { type: blob.type });

    // 3. Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from("avatars") // your bucket name
      .upload(`public/${username}.png`, file, { upsert: true });

    let storedAvatarUrl = avatarUrl; // fallback
    if (storageError) {
      console.warn("Error uploading avatar:", storageError.message);
    } else if (storageData?.path) {
      storedAvatarUrl = supabase.storage.from("avatars").getPublicUrl(storageData.path).publicUrl;
    }

    // 4. Insert into users table with starting points = 20
    const { error: insertError } = await supabase
      .from("users")
      .insert({
        user_id: authUserId,
        username,
        profilepic: storedAvatarUrl,
        points: 20,
      });

    if (insertError && insertError.code !== "23505") {
      console.warn("Could not insert into users table:", insertError.message);
    }

    // Show welcome modal, then navigate to /post after a short delay
    setShowWelcomeModal(true);
    setTimeout(() => {
      setShowWelcomeModal(false);
      navigate("/post");
    }, 2000);
  } catch (err) {
    console.error("Signup error:", err);
    alert("Something went wrong during signup.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div
      className="flex flex-col justify-center items-center h-screen w-full text-center bg-cover bg-center"
      style={{ backgroundImage: `url(${bgd})` }}
    >
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-2xl shadow-2xl text-center max-w-sm mx-4">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-pink-700">Welcome to Whisper Walls!</h2>
            <div className="mt-2 text-pink-600 font-semibold">+20 points</div>
          </div>
        </div>
      )}
      <h1 className="font-baloo text-6xl font-bold mb-6 text-[#ffe6cc]">
        Sign Up
      </h1>

      <div className="w-72 my-2">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-full text-center text-base outline-none bg-white/30 font-baloo"
        />
      </div>

      <div className="w-72 my-2">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-full text-center text-base outline-none bg-white/30 font-baloo"
        />
      </div>

      <div className="w-72 my-2">
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-full text-center text-base outline-none bg-white/30 font-baloo"
        />
      </div>

      <p className="font-baloo my-4 text-sm text-white">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-500 font-bold cursor-pointer">Login</Link>
      </p>

      <button onClick={handleSignup} disabled={loading} className="font-baloo w-52 py-3 rounded-full text-lg bg-[rgba(245,222,179,0.7)] text-white/50 transition hover:bg-[rgba(245,222,179,0.9)] disabled:opacity-50">
        {loading ? "Creating..." : "Create Account"}
      </button>
    </div>
  );
};

export default Signup;
