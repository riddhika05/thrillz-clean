import React from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate("/post");
  };

  return (
    <section className="relative w-screen min-h-screen text-white bg-[url('/whisper-walls-bg.png')] bg-cover bg-center bg-no-repeat overflow-hidden">
      {/* Overlay gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/25 z-10"></div>
      <div className="absolute inset-0 overflow-hidden z-10">
        {[...Array(15)].map((_, i) => (
          <span
            key={i}
            className="absolute animate-float-heart"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 18 + 14}px`,
              color: ["#fda4af", "#fbcfe8", "#c4b5fd", "#a5b4fc"][
                Math.floor(Math.random() * 4)
              ],
              animationDuration: `${Math.random() * 5 + 4}s`,
            }}
          >
            ♥
          </span>
        ))}
      </div>
      {/* Title */}
      <h1 className="absolute top-6 left-1/2 -translate-x-1/2 w-200 font-['Pacifico']  text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-wide text-shadow z-20 text-center">
        Whisper Walls
      </h1>
      {/* Tagline */}
      <p className="absolute top-25 font-bold sm:top-24 md:top-28 right-6 sm:right-10 text-sm sm:text-base md:text-lg lg:text-xl italic text-shadow z-20 text-right">
        Where whispers shape hearts...
      </p>
      {/* Motto */}
       <div className="absolute left-6 font-['Delius'] sm:left-10 top-1/2 -translate-y-1/2 text-2xl sm:text-5xl md:text-6xl lg:text-5xl tracking-widest leading-relaxed font-semibold text-shadow z-20">
        <div>WANDER,</div>
        <div className="relative left-12">WONDER,</div>
        <div className="relative left-30">REPEAT</div>
      </div>
      {/* Continue Button */}
      <button
        type="button"
        className="
  absolute 
  left-6 sm:left-10 
  bottom-10 sm:bottom-14 md:bottom-16 
  w-auto 
  bg-white/40 text-black 
  border border-white/40 
  rounded-full 
  px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 
  text-sm sm:text-base md:text-lg 
  cursor-pointer 
  shadow-lg backdrop-blur-sm 
  z-20 
  transition hover:bg-white
"
        onClick={handleContinue}
      >
        click here to continue →
      </button>
      <style jsx>{`
        @keyframes float-heart {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-50px) scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-120px) scale(1);
            opacity: 0;
          }
        }
        .animate-float-heart {
          animation-name: float-heart;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
      `}</style>
      
    </section>
  );
};

export default Home;
