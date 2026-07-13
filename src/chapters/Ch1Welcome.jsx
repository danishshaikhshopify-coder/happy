import { useEffect, useRef } from "react";
import gsap from "gsap";
import { runCanvas, rand, clamp, isMobile, prefersReducedMotion } from "../lib/canvas.js";
import { content } from "../content.js";

/* ------- the night sky: stars are born one by one, then breathe ------- */
function makeSky() {
  const N = isMobile() ? 140 : 320;
  const stars = Array.from({ length: N }, (_, i) => ({
    x: Math.random(),
    y: Math.random() * 0.92,
    r: rand(0.4, 1.7),
    tw: rand(1.5, 4.5),        // twinkle speed
    ph: rand(0, Math.PI * 2),  // twinkle phase
    born: (i / N) * 5 + rand(0, 1.5), // seconds until this star appears
    hue: Math.random() < 0.12 ? "255, 214, 170" : "226, 233, 255",
  }));
  let shooting = null;

  return (ctx, w, h, t, drift) => {
    // deep-night gradient
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#04050f");
    g.addColorStop(0.55, "#0a0f26");
    g.addColorStop(1, "#141a38");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // a soft distant moon glow, top right
    const mg = ctx.createRadialGradient(w * 0.78, h * 0.16, 0, w * 0.78, h * 0.16, w * 0.3);
    mg.addColorStop(0, "rgba(210, 220, 255, 0.14)");
    mg.addColorStop(1, "rgba(210, 220, 255, 0)");
    ctx.fillStyle = mg;
    ctx.fillRect(0, 0, w, h);

    // stars
    for (const s of stars) {
      const birth = clamp((t - s.born) / 2.5, 0, 1); // slow fade-in
      if (birth <= 0) continue;
      const tw = 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
      const a = birth * tw;
      const x = ((s.x + drift.x * (s.r / 1.7) * 0.012 + t * 0.0016) % 1) * w;
      const y = (s.y + drift.y * (s.r / 1.7) * 0.008) * h;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.hue}, ${a * 0.9})`;
      ctx.fill();
      if (s.r > 1.3) {
        ctx.beginPath();
        ctx.arc(x, y, s.r * 3.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.hue}, ${a * 0.08})`;
        ctx.fill();
      }
    }

    // an occasional wish
    if (!shooting && t > 6 && Math.random() < 0.0035) {
      shooting = { x: rand(0.15, 0.75) * w, y: rand(0.05, 0.3) * h, t: 0 };
    }
    if (shooting) {
      shooting.t += 0.016;
      const p = shooting.t / 1.1;
      if (p >= 1) shooting = null;
      else {
        const dx = 240 * p, dy = 120 * p;
        const trail = ctx.createLinearGradient(
          shooting.x + dx, shooting.y + dy,
          shooting.x + dx - 90, shooting.y + dy - 45
        );
        trail.addColorStop(0, `rgba(255,255,255,${0.85 * (1 - p)})`);
        trail.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = trail;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(shooting.x + dx, shooting.y + dy);
        ctx.lineTo(shooting.x + dx - 90, shooting.y + dy - 45);
        ctx.stroke();
      }
    }
  };
}

export default function Ch1Welcome({ onBegin, begun }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const drift = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const sky = makeSky();
    const stop = runCanvas(canvasRef.current, (ctx, w, h, t) => {
      const d = drift.current;
      d.x += (d.tx - d.x) * 0.03; // lazy camera follow
      d.y += (d.ty - d.y) * 0.03;
      sky(ctx, w, h, prefersReducedMotion() ? 60 : t, d);
    });

    const onMove = (e) => {
      drift.current.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      drift.current.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove);

    const ctxG = gsap.context(() => {
      // the whole scene drifts up & fades as you leave — like a camera crane
      gsap.to(".w-content", {
        yPercent: -30,
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, rootRef);

    return () => {
      stop();
      window.removeEventListener("pointermove", onMove);
      ctxG.revert();
    };
  }, []);

  // touch the sky, leave a star — a tiny wish wherever she taps
  const makeWish = (e) => {
    if (e.target.closest("button")) return;
    const host = rootRef.current;
    const r = host.getBoundingClientRect();
    const star = document.createElement("div");
    star.className = "wish-star";
    star.style.left = `${e.clientX - r.left - 11}px`;
    star.style.top = `${e.clientY - r.top - 11}px`;
    star.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.6 8.2L24 9.3l-6.9 5.4L19.4 24 12 18.9 4.6 24l2.3-9.3L0 9.3l9.4-1.1L12 0z"/></svg>';
    star.addEventListener("animationend", () => star.remove());
    host.appendChild(star);
  };

  const c = content.welcome;

  return (
    <section
      id="chapter-welcome"
      ref={rootRef}
      className="relative flex h-[100svh] items-center justify-center overflow-hidden"
      onPointerDown={makeWish}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,5,0.55)_100%)]" />

      <div className="w-content relative z-10 flex flex-col items-center px-6 text-center">
        <p className="rise font-script text-2xl text-amber-100/80 md:text-3xl" style={{ "--rise": "0.7s" }}>
          {c.eyebrow}
        </p>
        <h1
          className="rise font-serif-d text-glow mt-4 text-6xl font-light tracking-wide text-[#f7f1e6] md:text-8xl"
          style={{ "--rise": "1.3s" }}
        >
          {c.title}
        </h1>
        <div className="rise divider-line mt-7 w-40 md:w-56" style={{ "--rise": "2s" }} />
        <p
          className="rise mt-6 max-w-md font-light tracking-[0.18em] text-sm uppercase text-slate-300/80 md:text-base"
          style={{ "--rise": "2.3s" }}
        >
          {c.subtitle}
        </p>

        <div className="rise mt-12" style={{ "--rise": "3s" }}>
          <button
            onClick={onBegin}
            disabled={begun}
            className="glass ring-pulse group rounded-full px-9 py-4 text-sm tracking-[0.22em] uppercase text-amber-50 transition-all duration-500 hover:scale-[1.04] hover:border-amber-200/40 hover:bg-white/10 active:scale-95 disabled:opacity-60"
          >
            <span className="transition-all duration-500 group-hover:tracking-[0.3em]">
              {c.button}
            </span>
          </button>
        </div>

        <div className="rise mt-14 flex flex-col items-center gap-2 text-slate-400/70" style={{ "--rise": "3.8s" }}>
          <span className="text-[11px] tracking-[0.3em] uppercase">scroll gently</span>
          <span className="block h-8 w-px animate-pulse bg-gradient-to-b from-slate-300/60 to-transparent" />
        </div>
      </div>
    </section>
  );
}
