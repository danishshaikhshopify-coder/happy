import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { content } from "../content.js";

const HEART_SPOTS = [
  { x: "12%", y: "16%", s: 1.0, d: 0.0 },
  { x: "68%", y: "8%",  s: 0.85, d: 1.1 },
  { x: "38%", y: "34%", s: 1.15, d: 0.5 },
  { x: "82%", y: "42%", s: 0.9, d: 1.7 },
  { x: "18%", y: "62%", s: 0.95, d: 0.8 },
  { x: "58%", y: "68%", s: 1.05, d: 1.4 },
];

function HeartShape({ size = 64, glow = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={glow ? { filter: "drop-shadow(0 0 14px rgba(255,110,140,0.55))" } : undefined}>
      <path
        d="M16 28C8 22 2.5 16.5 2.5 10.8 2.5 6.5 5.8 3.5 9.6 3.5c2.6 0 5 1.4 6.4 3.7C17.4 4.9 19.8 3.5 22.4 3.5c3.8 0 7.1 3 7.1 7.3C29.5 16.5 24 22 16 28Z"
        fill="url(#hg)"
        stroke="rgba(255,190,200,0.55)"
        strokeWidth="0.6"
      />
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff8fa8" />
          <stop offset="55%" stopColor="#e84d6f" />
          <stop offset="100%" stopColor="#a52447" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* tiny hearts that burst out when one is opened */
function Burst({ x, y }) {
  const bits = Array.from({ length: 9 }, (_, i) => ({
    ang: (i / 9) * Math.PI * 2 + Math.random() * 0.5,
    dist: 60 + Math.random() * 70,
    s: 0.5 + Math.random() * 0.7,
  }));
  return (
    <div className="pointer-events-none fixed z-[95]" style={{ left: x, top: y }}>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: Math.cos(b.ang) * b.dist,
            y: Math.sin(b.ang) * b.dist - 30,
            scale: b.s,
            opacity: 0,
          }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="absolute text-lg"
        >
          ❤️
        </motion.span>
      ))}
    </div>
  );
}

export default function Ch5Reasons() {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(null);
  const [burst, setBurst] = useState(null);

  useEffect(() => {
    const ctxG = gsap.context(() => {
      gsap.from(".reasons-head > *", {
        opacity: 0, y: 34, stagger: 0.18, duration: 1.3, ease: "power3.out",
        scrollTrigger: { trigger: ".reasons-head", start: "top 80%" },
      });
      gsap.from(".reason-heart", {
        opacity: 0, scale: 0, stagger: 0.12, duration: 1, ease: "back.out(1.8)",
        scrollTrigger: { trigger: ".reasons-field", start: "top 75%" },
      });
    }, rootRef);
    return () => ctxG.revert();
  }, []);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const openHeart = (i, e) => {
    setBurst({ x: e.clientX, y: e.clientY, key: Date.now() });
    setOpen(i);
  };

  const c = content.reasons;

  return (
    <section
      id="chapter-reasons"
      ref={rootRef}
      className="relative overflow-hidden py-[16vh]"
      style={{
        background:
          "linear-gradient(180deg, #0a141f 0%, #1d0b16 22%, #2a0f1d 55%, #1a0912 100%)",
      }}
    >
      {/* rose glow pools */}
      <div className="pointer-events-none absolute left-1/2 top-[30%] h-[70vh] w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(232,77,111,0.10),transparent_65%)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <header className="reasons-head text-center">
          <h2 className="font-serif-d text-glow text-4xl font-light text-rose-50 md:text-6xl">
            {c.heading}
          </h2>
          <p className="mt-5 text-sm tracking-[0.25em] uppercase text-rose-200/60">{c.sub}</p>
        </header>

        <div className="reasons-field relative mt-16 h-[64vh] min-h-[420px]">
          {c.items.map((item, i) => {
            const spot = HEART_SPOTS[i % HEART_SPOTS.length];
            return (
              <motion.button
                key={i}
                className="reason-heart absolute cursor-pointer"
                style={{ left: spot.x, top: spot.y }}
                animate={{ y: [0, -16, 0], rotate: [0, 4, -3, 0] }}
                transition={{ duration: 5.5 + spot.d, repeat: Infinity, ease: "easeInOut", delay: spot.d }}
                whileHover={{ scale: 1.25 }}
                whileTap={{ scale: 0.85 }}
                onClick={(e) => openHeart(i, e)}
                aria-label={item.title}
              >
                <motion.div
                  animate={{ scale: [1, 1.07, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: spot.d }}
                >
                  <HeartShape size={54 * spot.s + (window.innerWidth < 768 ? 0 : 14)} />
                </motion.div>
                <span className="mt-1 block text-center font-serif-d text-xs italic text-rose-100/50">
                  {item.title}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {burst && <Burst key={burst.key} x={burst.x} y={burst.y} />}

      <AnimatePresence>
        {open !== null && (
          <motion.div
            className="fixed inset-0 z-[96] flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={c.items[open].title}
              className="glass relative max-w-md rounded-3xl p-9 text-center md:p-12"
              style={{ background: "linear-gradient(150deg, rgba(90,20,40,0.55), rgba(30,8,18,0.65))" }}
              initial={{ scale: 0.6, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto -mt-16 mb-4 w-fit">
                <HeartShape size={76} />
              </div>
              <h3 className="font-script text-3xl text-rose-100">{c.items[open].title}</h3>
              <p className="font-serif-d mt-5 text-lg font-light leading-relaxed text-rose-50/85">
                {c.items[open].text}
              </p>
              <button
                onClick={() => setOpen(null)}
                className="mt-8 rounded-full border border-rose-200/25 px-6 py-2 text-xs tracking-[0.25em] uppercase text-rose-100/70 transition hover:bg-rose-100/10"
              >
                close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
