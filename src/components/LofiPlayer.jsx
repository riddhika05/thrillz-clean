import React, { forwardRef, useImperativeHandle, useRef } from "react";

const LofiPlayer = forwardRef((props, ref) => {
  const audioRef = useRef(null);

  useImperativeHandle(ref, () => ({
    play: () => {
      if (audioRef.current) {
        audioRef.current.play().catch((err) => {
          console.log("Play blocked:", err);
        });
      }
    },
    setMuted: (mute) => {
      if (audioRef.current) {
        audioRef.current.muted = mute;
      }
    }
  }));

  return (
    <audio ref={audioRef} loop>
      <source src="/lofi.mp3" type="audio/mpeg" />
      Your browser does not support the audio element.
    </audio>
  );
});

export default LofiPlayer;
