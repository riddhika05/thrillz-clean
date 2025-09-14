import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// Drop <HeartButton /> anywhere in your app.
// Requires Tailwind CSS and framer-motion: `npm i framer-motion`
export default function HeartButton() {
  const [liked, setLiked] = React.useState(false);
  const [burstKey, setBurstKey] = React.useState(0);

  const burstHearts = React.useMemo(() => {
    const COUNT = 14;
    const MAX_R = 120; // px radius
    return Array.from({ length: COUNT }, (_, i) => {
      const baseAngle = (i / COUNT) * Math.PI * 2;
      const jitter = (Math.random() - 0.5) * 0.6; // randomness
      const angle = baseAngle + jitter;
      const r = MAX_R * (0.7 + Math.random() * 0.3);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      const rotate = (angle * 180) / Math.PI + (Math.random() * 120 - 60);
      const scale = 0.7 + Math.random() * 0.6;
      const delay = Math.random() * 0.05;
      return { id: `${burstKey}-${i}-${Math.random().toString(36).slice(2)}`, x, y, rotate, scale, delay };
    });
  }, [burstKey]);

  function triggerBurst() {
    setLiked((v) => !v);
    setBurstKey((k) => k + 1);
  }

  return (
    <motion.button
      aria-label={liked ? "Unlike" : "Like"}
      onClick={triggerBurst}
      whileTap={{ scale: 0.9 }}
      className="relative grid place-items-center size-8 rounded-full bg-rose-50 hover:bg-rose-100 transition shadow-sm"
    >
      {/* Center Heart */}
      <motion.svg
        viewBox="0 0 24 24"
        className="size-5"
        initial={false}
        animate={{ scale: liked ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
      >
        <motion.path
          d="M12 21s-6.716-4.318-9.192-8.052C1.295 10.513 1 8.9 1 8.1 1 5.836 2.86 4 5.1 4c1.214 0 2.38.51 3.201 1.39L12 9.2l3.699-3.81A4.46 4.46 0 0 1 18.9 4C21.14 4 23 5.836 23 8.1c0 .8-.295 2.413-1.808 4.848C18.716 16.682 12 21 12 21z"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.5}
          className={liked ? "text-rose-500" : "text-rose-400"}
        />
      </motion.svg>

      {/* Burst Hearts */}
      <AnimatePresence>
        {burstHearts.map(({ id, x, y, rotate, scale, delay }) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.2, rotate: 0 }}
            animate={{ opacity: [0, 1, 0], x, y, scale, rotate }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut", delay }}
            className="pointer-events-none absolute"
            style={{ left: "50%", top: "50%", translate: "-50% -50%" }}
          >
            <svg viewBox="0 0 24 24" className="size-4">
              <path
                d="M12 21s-6.716-4.318-9.192-8.052C1.295 10.513 1 8.9 1 8.1 1 5.836 2.86 4 5.1 4c1.214 0 2.38.51 3.201 1.39L12 9.2l3.699-3.81A4.46 4.46 0 0 1 18.9 4C21.14 4 23 5.836 23 8.1c0 .8-.295 2.413-1.808 4.848C18.716 16.682 12 21 12 21z"
                fill="currentColor"
              />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.button>
  );
}