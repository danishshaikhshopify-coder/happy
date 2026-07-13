import { useEffect, useRef } from "react";
import gsap from "gsap";
import { runCanvas, rand, isMobile } from "../lib/canvas.js";
import { content } from "../content.js";

const NUMERALS = ["I", "II", "III", "IV", "V"];

/* candlelit dust motes drifting upward */
function makeMotes() {
  const N = isMobile() ? 24 : 60;
  const motes = Array.from({ length: N }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: rand(0.6, 2.2),
    vy: rand(0.008, 0.028),
    vx: rand(-0.008, 0.008),
    a: rand(0.08, 0.4),
    ph: rand(0, Math.PI * 2),
  }));
  return (ctx, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    for (const m of motes) {
      const y = ((m.y - t * m.vy) % 1 + 1) % 1;
      const x = ((m.x + Math.sin(t * 0.4 + m.ph) * 0.01 + t * m.vx) % 1 + 1) % 1;
      const a = m.a * (0.6 + 0.4 * Math.sin(t * 1.2 + m.ph));
      ctx.beginPath();
      ctx.arc(x * w, y * h, m.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 216, 168, ${a})`;
      ctx.fill();
    }
  };
}

/* split a string into animatable word spans so each word settles like ink */
function Words({ text, className = "" }) {
  return (
    <span className={className}>
      {text.split(/\s+/).map((word, i) => (
        <span key={i} className="story-word inline-block will-change-transform">
          <span>
            {word}
          </span>
          {" "}
        </span>
      ))}
    </span>
  );
}

export default function Ch2Story() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const stop = runCanvas(canvasRef.current, makeMotes());

    const ctxG = gsap.context(() => {
      // heading writes itself in
      gsap.from(".story-heading", {
        opacity: 0,
        y: 30,
        duration: 1.6,
        ease: "power3.out",
        scrollTrigger: { trigger: ".story-heading", start: "top 80%" },
      });

      // each passage: ornament draws, words rise like ink settling
      gsap.utils.toArray(".story-passage").forEach((passage) => {
        const words = passage.querySelectorAll(".story-word");
        gsap
          .timeline({
            scrollTrigger: { trigger: passage, start: "top 72%" },
          })
          .from(passage.querySelector(".story-ornament"), {
            scaleX: 0,
            opacity: 0,
            duration: 1.1,
            ease: "power2.inOut",
          })
          .from(
            passage.querySelector(".story-numeral"),
            { opacity: 0, scale: 1.4, duration: 1, ease: "power3.out" },
            "-=0.7"
          )
          .from(
            passage.querySelector(".story-title"),
            { opacity: 0, y: 18, duration: 0.9, ease: "power3.out" },
            "-=0.6"
          )
          .from(
            words,
            {
              opacity: 0,
              y: 14,
              rotateX: -35,
              duration: 0.7,
              stagger: 0.018,
              ease: "power2.out",
            },
            "-=0.4"
          );
      });
    }, rootRef);

    return () => {
      stop();
      ctxG.revert();
    };
  }, []);

  const c = content.story;

  return (
    <section
      id="chapter-story"
      ref={rootRef}
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #141a38 0%, #1c1410 18%, #201509 50%, #1a110c 82%, #0d1220 100%)",
      }}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      {/* candle glow pools */}
      <div className="pointer-events-none absolute left-[-10%] top-[20%] h-[45vh] w-[45vh] rounded-full bg-[radial-gradient(circle,rgba(255,166,87,0.10),transparent_70%)]" />
      <div className="pointer-events-none absolute right-[-12%] top-[58%] h-[55vh] w-[55vh] rounded-full bg-[radial-gradient(circle,rgba(255,140,80,0.08),transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-[18vh]">
        <header className="text-center">
          <p className="story-heading font-script text-4xl text-amber-200/90 md:text-6xl text-glow">
            {c.heading}
          </p>
        </header>

        <div className="mt-[14vh] flex flex-col gap-[16vh]">
          {c.passages.map((p, i) => (
            <article key={i} className="story-passage text-center" style={{ perspective: "600px" }}>
              <div className="story-ornament divider-line mx-auto w-48" />
              <div className="story-numeral font-serif-d mt-8 text-5xl font-light text-amber-100/25 md:text-6xl">
                {NUMERALS[i] ?? i + 1}
              </div>
              <h3 className="story-title font-serif-d mt-3 text-2xl font-medium italic tracking-wide text-amber-50/90 md:text-3xl">
                {p.title}
              </h3>
              <p className="font-serif-d mt-7 text-xl font-light leading-relaxed text-[#e8ddcd]/90 md:text-[1.55rem] md:leading-[1.9]">
                <Words text={p.text} />
              </p>
            </article>
          ))}
        </div>

        <footer className="mt-[16vh] text-center">
          <p className="font-script text-2xl text-amber-200/60 md:text-3xl">
            and the pages kept turning…
          </p>
        </footer>
      </div>
    </section>
  );
}
