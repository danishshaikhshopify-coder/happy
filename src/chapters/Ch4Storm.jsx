import { useEffect, useRef } from "react";
import gsap from "gsap";
import { runCanvas, rand, clamp, smooth, lerp, isMobile } from "../lib/canvas.js";
import { content } from "../content.js";

/* ---------- color helpers (work on [r,g,b] arrays so they compose) ---------- */
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mixC = (A, B, t) => A.map((v, i) => lerp(v, B[i], t));
const rgba = (A, a = 1) => `rgba(${A.map((v) => Math.round(v)).join(",")},${a})`;

/* ---------- the storm that learns to shine ---------- */
function makeStorm(progressRef) {
  const RAIN = isMobile() ? 110 : 260;
  const drops = Array.from({ length: RAIN }, () => ({
    x: Math.random(), y: Math.random(), len: rand(0.02, 0.05), sp: rand(0.9, 1.7),
  }));
  const clouds = Array.from({ length: 7 }, (_, i) => ({
    x: rand(-0.1, 1), y: rand(0.02, 0.3), rx: rand(0.22, 0.42), ry: rand(0.07, 0.13),
    sp: rand(0.004, 0.012) * (i % 2 ? 1 : -1), a: rand(0.35, 0.7),
  }));
  const pollen = Array.from({ length: isMobile() ? 20 : 50 }, () => ({
    x: Math.random(), y: rand(0.3, 1), r: rand(1, 2.6), ph: rand(0, Math.PI * 2), sp: rand(0.01, 0.03),
  }));
  let flash = 0, nextFlash = 3;

  return (ctx, w, h, t) => {
    const p = progressRef.current;
    const dark = clamp(1 - p / 0.55, 0, 1);          // how stormy
    const light = clamp((p - 0.45) / 0.45, 0, 1);    // how golden

    // sky
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(mixC(mixC(hex("#11151f"), hex("#1c2333"), dark), hex("#f0a35e"), smooth(light) * 0.9)));
    g.addColorStop(0.55, rgba(mixC(hex("#1a2130"), hex("#f6c98a"), smooth(light))));
    g.addColorStop(1, rgba(mixC(hex("#232a38"), hex("#fbe3b0"), smooth(light))));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // sun rising through
    if (light > 0.02) {
      const sy = h * lerp(0.95, 0.34, smooth(light));
      const sun = ctx.createRadialGradient(w / 2, sy, 0, w / 2, sy, w * 0.45);
      sun.addColorStop(0, `rgba(255, 244, 214, ${0.85 * light})`);
      sun.addColorStop(0.25, `rgba(255, 214, 150, ${0.4 * light})`);
      sun.addColorStop(1, "rgba(255, 214, 150, 0)");
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, w, h);

      // slow god-rays
      ctx.save();
      ctx.translate(w / 2, sy);
      for (let i = 0; i < 7; i++) {
        const ang = -Math.PI / 2 + (i - 3) * 0.35 + Math.sin(t * 0.1 + i) * 0.03;
        const rayG = ctx.createLinearGradient(0, 0, Math.cos(ang) * h, Math.sin(ang) * h);
        rayG.addColorStop(0, `rgba(255, 236, 190, ${0.10 * light})`);
        rayG.addColorStop(1, "rgba(255,236,190,0)");
        ctx.fillStyle = rayG;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, h * 1.2, ang - 0.06, ang + 0.06);
        ctx.fill();
      }
      ctx.restore();
    }

    // clouds — heavy, then dissolving
    const cloudA = clamp(1 - light * 1.6, 0, 1);
    if (cloudA > 0.01) {
      for (const c of clouds) {
        const x = ((c.x + t * c.sp) % 1.4 + 1.4) % 1.4 - 0.2;
        const cg = ctx.createRadialGradient(x * w, c.y * h, 0, x * w, c.y * h, c.rx * w);
        const shade = mixC(hex("#0c0f16"), hex("#8a7c6d"), light);
        cg.addColorStop(0, rgba(shade, c.a * cloudA));
        cg.addColorStop(1, rgba(shade, 0));
        ctx.fillStyle = cg;
        ctx.save();
        ctx.translate(x * w, c.y * h);
        ctx.scale(1, c.ry / c.rx);
        ctx.beginPath();
        ctx.arc(0, 0, c.rx * w, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // lightning — rare, soft, far away
    if (dark > 0.5) {
      if (t > nextFlash) { flash = rand(0.5, 0.9); nextFlash = t + rand(4, 9); }
      if (flash > 0.01) {
        ctx.fillStyle = `rgba(200, 214, 255, ${flash * 0.16 * dark})`;
        ctx.fillRect(0, 0, w, h);
        flash *= 0.86;
      }
    }

    // rain — thick, then thinning to nothing
    const rainA = clamp(1 - p / 0.6, 0, 1);
    if (rainA > 0.01) {
      ctx.strokeStyle = `rgba(173, 196, 221, ${0.34 * rainA})`;
      ctx.lineWidth = 1;
      const n = Math.floor(RAIN * rainA);
      for (let i = 0; i < n; i++) {
        const d = drops[i];
        const y = ((d.y + t * d.sp * 0.6) % 1.1) * h;
        const x = ((d.x + t * 0.02) % 1.02) * w;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - d.len * h * 0.18, y + d.len * h);
        ctx.stroke();
      }
    }

    // golden pollen once the sun is out
    if (light > 0.2) {
      for (const s of pollen) {
        const y = ((s.y - t * s.sp) % 1 + 1) % 1;
        const x = (s.x + Math.sin(t * 0.5 + s.ph) * 0.02) % 1;
        ctx.beginPath();
        ctx.arc(x * w, y * h, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 226, 160, ${0.35 * light * (0.5 + 0.5 * Math.sin(t * 2 + s.ph))})`;
        ctx.fill();
      }
    }
  };
}

/* a simple, elegant flower that grows from the earth */
function Flower({ hue = "#f7b7c8", x = "10%", scale = 1 }) {
  return (
    <div
      className="storm-flower absolute bottom-0 origin-bottom"
      style={{ left: x, transform: "scale(0)" }}
    >
      <svg width={54 * scale} height={110 * scale} viewBox="0 0 54 110" fill="none">
        <path d="M27 110 C27 78 25 60 27 42" stroke="#5f8a5a" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M27 84 C18 78 12 78 7 70 C16 70 23 74 27 80 Z" fill="#67955f" />
        <path d="M27 68 C36 62 42 62 47 54 C38 54 31 58 27 64 Z" fill="#67955f" />
        <g>
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <ellipse key={r} cx="27" cy="30" rx="9" ry="16"
              transform={`rotate(${r} 27 38)`} fill={hue} opacity="0.92" />
          ))}
          <circle cx="27" cy="38" r="6.5" fill="#ffd98a" />
        </g>
      </svg>
    </div>
  );
}

export default function Ch4Storm() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    // Improve letter scrolling: prevent Lenis/page scroll from stealing wheel/touch events
    const el = document.querySelector('.letter-scroll');
    if (!el) return;

    const onWheel = (e) => {
      // allow inner scroll; prevent propagation so smooth page scroll doesn't fire
      if (el.scrollHeight > el.clientHeight) {
        e.stopPropagation();
      }
    };
    const onTouchMove = (e) => {
      if (el.scrollHeight > el.clientHeight) {
        e.stopPropagation();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  useEffect(() => {
    const stop = runCanvas(canvasRef.current, makeStorm(progressRef));

    const ctxG = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: (self) => (progressRef.current = self.progress),
        },
      });

      // 0 → .28 : the dark words arrive, one by one, then drift away
      tl.fromTo(".storm-dark-line", { opacity: 0, y: 34 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.13 }, 0.02)
        .to(".storm-dark", { opacity: 0, y: -40, duration: 0.08 }, 0.28)
        // .31 → .60 : his letter, held in glass while the rain thins
        .fromTo(".storm-message", { opacity: 0, y: 60, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.09 }, 0.31)
        .to(".storm-message", { opacity: 0, y: -50, duration: 0.07 }, 0.60)
        // .66 → : the light words
        .fromTo(".storm-light-line", { opacity: 0, y: 34 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.11 }, 0.66)
        // flowers bloom with the sun
        .fromTo(".storm-flower", { scale: 0, rotate: -8 }, { scale: 1, rotate: 0, stagger: 0.03, duration: 0.16, ease: "back.out(2.2)" }, 0.62);
    }, rootRef);

    return () => { stop(); ctxG.revert(); };
  }, []);

  const c = content.storm;
  const L = c.letter;
  const flowers = [
    { x: "4%", hue: "#f7b7c8", scale: 0.8 }, { x: "12%", hue: "#f4e2a5", scale: 1.05 },
    { x: "22%", hue: "#e9a1b8", scale: 0.7 }, { x: "70%", hue: "#f4c4a0", scale: 0.9 },
    { x: "80%", hue: "#f7b7c8", scale: 1.1 }, { x: "90%", hue: "#f4e2a5", scale: 0.75 },
  ];

  return (
    <section id="chapter-storm" ref={rootRef} className="relative h-[500vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* blooming meadow edge */}
        <div className="absolute inset-x-0 bottom-0 h-40">
          {flowers.map((f, i) => <Flower key={i} {...f} />)}
        </div>

        {/* the dark words */}
        <div className="storm-dark absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          {c.darkLines.map((line, i) => (
            <p key={i} className="storm-dark-line font-serif-d text-2xl font-light italic text-slate-200/85 md:text-4xl">
              {line}
            </p>
          ))}
        </div>

        {/* the letter */}
        <div className="storm-message absolute inset-0 flex items-center justify-center px-4 py-[6svh] md:px-6">
          <div className="glass w-full max-w-2xl rounded-3xl p-6 md:p-10">
            <p className="font-script mb-5 text-center text-3xl text-amber-100/85 md:text-4xl">
              {L.greeting}
            </p>
            <div data-lenis-prevent className="letter-scroll max-h-[48svh] overflow-y-auto pr-3 md:max-h-[52svh]">
              {L.paragraphs.map((para, i) => (
                <p
                  key={i}
                  className="font-serif-d mb-4 text-left text-[1.02rem] font-light leading-[1.75] text-[#f0e9dc]/92 md:text-lg md:leading-[1.85]"
                >
                  {para}
                </p>
              ))}
            </div>
            <div className="mt-5 text-right">
              <p className="font-script text-xl text-amber-100/75 md:text-2xl">{L.signoff}</p>
              <p className="font-script mt-1 text-2xl text-amber-200/95 md:text-3xl">{L.signature}</p>
            </div>
          </div>
        </div>

        {/* the light words */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          {c.lightLines.map((line, i) => (
            <p
              key={i}
              className="storm-light-line font-serif-d text-2xl font-light italic md:text-4xl"
              style={{ color: "#4a3416", textShadow: "0 1px 24px rgba(255,240,200,0.6)" }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
