import { useState } from "react";
import { music } from "../audio/MusicEngine.js";

export default function MusicToggle() {
  const [playing, setPlaying] = useState(false);

  const toggle = async () => {
    if (!music.started) {
      await music.start();
      setPlaying(true);
      return;
    }
    const next = !playing;
    music.setMuted(!next);
    setPlaying(next);
  };

  // Keep local state in sync when "Begin" starts the music elsewhere.
  if (music.started && !music.muted && !playing) setPlaying(true);

  return (
    <button
      onClick={toggle}
      aria-label={playing ? "Mute music" : "Play music"}
      className="glass fixed top-5 right-5 z-[100] flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-300 hover:scale-110 active:scale-95"
    >
      {playing ? (
        <span className="flex h-4 items-end gap-[3px]">
          {[0.9, 0.5, 1.1, 0.7].map((d, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-amber-100/90"
              style={{
                height: "100%",
                animation: `eq 1s ease-in-out ${i * 0.15}s infinite alternate`,
                transformOrigin: "bottom",
                animationDuration: `${d}s`,
              }}
            />
          ))}
          <style>{`@keyframes eq { from { transform: scaleY(0.25);} to { transform: scaleY(1);} }`}</style>
        </span>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-amber-100/90">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
          <path d="m16 9 5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
