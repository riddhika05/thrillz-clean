import React from "react";
import { useNavigate } from "react-router-dom";
// import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate("/post");
  };

  return (
    <section className="relative w-screen min-h-screen text-white bg-[url('/whisper-walls-bg.png')] bg-cover bg-center bg-no-repeat overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 to-black/25 z-10"></div>

      <div className="absolute top-8 left-1/2 -translate-x-1/2 font-['Segoe_Script'] font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-wide text-shadow whitespace-nowrap z-20 text-center">
        Whisper Walls
      </div>

      <p className="absolute top-24 right-9 italic text-xs sm:text-sm md:text-base lg:text-lg text-shadow z-20 text-right md:top-32 md:right-12">
        Where whispers shape hearts...
      </p>

      <div className="absolute left-9 top-1/3 -translate-y-1/2 text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-widest leading-relaxed font-semibold text-shadow z-20 md:top-1/2">
        <div>WANDER,</div>
        <div>WONDER,</div>
        <div>REPEAT</div>
      </div>

      <button
        type="button"
        className="absolute left-9 bottom-16 bg-white/85 text-black border border-white/70 rounded-full px-5 py-3 text-sm md:text-base cursor-pointer shadow-lg backdrop-blur-sm z-20 transition-colors hover:bg-white md:left-12 md:bottom-20"
        onClick={handleContinue}
        aria-label="Continue"
      >
        click here to continue →
      </button>
    </section>
  );
};

export default Home;
