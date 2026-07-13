import { useEffect, useRef } from "react";
import gsap from "gsap";
import { runCanvas, rand, clamp, smooth, lerp, isMobile } from "../lib/canvas.js";
import { content } from "../content.js";

/* ============================================================
   The Finale — one particle engine, five acts:
   photograph → stardust → white rose → pollen over a meadow → heart
   ============================================================ */

const PHASES = (p) => {
  if (p < 0.16) return "image";
  if (p < 0.30) return "scatter";
  if (p < 0.48) return "rose";
  if (p < 0.70) return "pollen";
  return "heart";
};

/* ---------- target-shape generators ---------- */

function sampleImage(img, w, h, N) {
  const maxH = Math.min(h * 0.66, w * 0.9 * (img.height / img.width));
  const dh = maxH;
  const dw = dh * (img.width / img.height);
  const ox = (w - dw) / 2;
  const oy = h * 0.46 - dh / 2;

  const off = document.createElement("canvas");
  const step = Math.max(2, Math.sqrt((dw * dh) / N));
  off.width = Math.ceil(dw / step);
  off.height = Math.ceil(dh / step);
  const octx = off.getContext("2d", { willReadFrequently: true });
  octx.drawImage(img, 0, 0, off.width, off.height);
  const data = octx.getImageData(0, 0, off.width, off.height).data;

  const pts = [];
  for (let y = 0; y < off.height; y++) {
    for (let x = 0; x < off.width; x++) {
      const i = (y * off.width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      pts.push({
        x: ox + (x + 0.5) * step,
        y: oy + (y + 0.5) * step,
        c: [lum, lum, lum],
        a: 0.35 + (lum / 255) * 0.65,
      });
    }
  }
  return { pts, rect: { ox, oy, dw, dh, cx: w / 2, cy: h * 0.46 } };
}

function drawRoseSilhouette(size) {
  // line-art rose: stroked petal rings + a spiral bud, so the particles
  // trace it like a constellation instead of filling a blob
  const off = document.createElement("canvas");
  off.width = off.height = size;
  const c = off.getContext("2d", { willReadFrequently: true });
  const cx = size / 2, cy = size / 2;
  c.strokeStyle = "#fff";
  c.lineWidth = size * 0.02;
  const rings = [
    { n: 7, r: size * 0.40, pr: size * 0.165, rot: 0 },
    { n: 6, r: size * 0.27, pr: size * 0.13, rot: 0.45 },
    { n: 5, r: size * 0.165, pr: size * 0.10, rot: 0.9 },
  ];
  for (const ring of rings) {
    for (let i = 0; i < ring.n; i++) {
      const a = (i / ring.n) * Math.PI * 2 + ring.rot;
      c.save();
      c.translate(cx + Math.cos(a) * ring.r * 0.62, cy + Math.sin(a) * ring.r * 0.62);
      c.rotate(a + Math.PI / 2);
      c.beginPath();
      // open petal arc (not a closed ellipse) reads softer
      c.ellipse(0, 0, ring.pr * 0.7, ring.pr, 0, -Math.PI * 0.92, Math.PI * 0.92);
      c.stroke();
      c.restore();
    }
  }
  // spiral bud at the heart
  c.beginPath();
  for (let t = 0; t < Math.PI * 5; t += 0.08) {
    const r = size * 0.012 + t * size * 0.0135;
    const x = cx + Math.cos(t * 1.9) * r;
    const y = cy + Math.sin(t * 1.9) * r;
    t === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
  }
  c.stroke();
  return off;
}

function sampleRose(w, h, N) {
  const size = Math.min(w, h) * 0.52;
  const off = drawRoseSilhouette(300);
  const octx = off.getContext("2d");
  const data = octx.getImageData(0, 0, 300, 300).data;
  const pts = [];
  const ivory = () => {
    const v = 225 + Math.random() * 30;
    return [v, v - rand(2, 10), v - rand(8, 22)];
  };
  let guard = 0;
  while (pts.length < N && guard++ < N * 60) {
    const x = Math.random() * 300, y = Math.random() * 300;
    if (data[((y | 0) * 300 + (x | 0)) * 4 + 3] > 100) {
      pts.push({
        x: w / 2 + ((x - 150) / 300) * size,
        y: h * 0.44 + ((y - 150) / 300) * size,
        c: ivory(),
        a: rand(0.5, 1),
      });
    }
  }
  return pts;
}

function sampleHeart(w, h, N) {
  const s = Math.min(w, h) * 0.031;
  const palette = [
    [255, 143, 168], [232, 77, 111], [250, 224, 180],
    [255, 196, 160], [244, 226, 165], [255, 255, 245],
  ];
  const pts = [];
  let guard = 0;
  while (pts.length < N && guard++ < N * 40) {
    const x = rand(-1.35, 1.35), y = rand(-1.2, 1.5);
    // classic heart inequality (y flipped for canvas)
    if (Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y < 0) {
      pts.push({
        x: w / 2 + x * s * 16,
        y: h * 0.44 - y * s * 13,
        c: palette[(Math.random() * palette.length) | 0],
        a: rand(0.5, 1),
      });
    }
  }
  return pts;
}

const sampleScatter = (w, h, N, gold) =>
  Array.from({ length: N }, () => ({
    x: rand(-40, w + 40),
    y: rand(-40, h + 40),
    c: gold ? [255, 214 + rand(-20, 20), 150 + rand(-30, 30)] : [235, 235, 240],
    a: gold ? rand(0.25, 0.7) : rand(0.3, 0.9),
  }));

/* ---------- decorative field pieces ---------- */

function MeadowFlower({ x, hue, scale, sway }) {
  return (
    <div
      className="absolute bottom-0 origin-bottom"
      style={{ left: x, animation: `sway ${sway}s ease-in-out infinite alternate` }}
    >
      <svg width={44 * scale} height={96 * scale} viewBox="0 0 54 110" fill="none">
        <path d="M27 110 C27 78 25 60 27 42" stroke="#6c9a4f" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M27 86 C18 80 12 80 7 72 C16 72 23 76 27 82 Z" fill="#79a85a" />
        {[0, 60, 120, 180, 240, 300].map((r) => (
          <ellipse key={r} cx="27" cy="30" rx="9.5" ry="16.5" transform={`rotate(${r} 27 38)`} fill={hue} opacity="0.95" />
        ))}
        <circle cx="27" cy="38" r="6.5" fill="#ffd98a" />
      </svg>
    </div>
  );
}

function Butterfly({ delay = 0, hue = "#ffb3c4", path = 1 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const tl = gsap.timeline({ repeat: -1, yoyo: true, delay });
    tl.to(el, { x: path * 160, y: -70, rotation: path * 12, duration: 6, ease: "sine.inOut" })
      .to(el, { x: path * 40, y: -140, rotation: -path * 8, duration: 5, ease: "sine.inOut" });
    return () => tl.kill();
  }, [delay, path]);
  return (
    <div ref={ref} className="absolute" style={{ filter: "drop-shadow(0 4px 10px rgba(80,40,0,0.25))" }}>
      <svg width="34" height="26" viewBox="0 0 34 26">
        <g style={{ transformOrigin: "17px 13px", animation: "flap 0.5s ease-in-out infinite alternate" }}>
          <ellipse cx="10" cy="10" rx="9" ry="7" fill={hue} opacity="0.9" transform="rotate(-20 10 10)" />
          <ellipse cx="10" cy="19" rx="6" ry="5" fill={hue} opacity="0.75" transform="rotate(15 10 19)" />
        </g>
        <g style={{ transformOrigin: "17px 13px", animation: "flap 0.5s ease-in-out infinite alternate-reverse" }}>
          <ellipse cx="24" cy="10" rx="9" ry="7" fill={hue} opacity="0.9" transform="rotate(20 24 10)" />
          <ellipse cx="24" cy="19" rx="6" ry="5" fill={hue} opacity="0.75" transform="rotate(-15 24 19)" />
        </g>
        <rect x="16" y="5" width="2" height="17" rx="1" fill="#4a3423" />
      </svg>
    </div>
  );
}

/* ============================================================ */

export default function Ch6Forever() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const N = isMobile() ? 850 : 1600;
    let particles = [];
    let shape = "none";
    let img = null;
    let imageData = null;
    let sizeKey = "";

    const image = new Image();
    image.src = "/images/our-journey.jpeg";
    image.onload = () => (img = image);

    const ensureTargets = (w, h) => {
      const key = `${w}x${h}`;
      if (key !== sizeKey && img) {
        sizeKey = key;
        imageData = sampleImage(img, w, h, N);
        shape = "none"; // force re-assignment at new size
      }
    };

    const assign = (newShape, w, h) => {
      shape = newShape;
      let pts;
      if (newShape === "image") pts = imageData.pts;
      else if (newShape === "scatter") pts = sampleScatter(w, h, N, false);
      else if (newShape === "rose") pts = sampleRose(w, h, N);
      else if (newShape === "pollen") pts = sampleScatter(w, h, N, true);
      else pts = sampleHeart(w, h, N);

      if (particles.length === 0) {
        particles = Array.from({ length: N }, () => ({
          x: rand(0, w), y: rand(0, h), c: [255, 255, 255], a: 0, s: rand(0.7, 1.8),
          ph: rand(0, Math.PI * 2), sp: rand(0.4, 1.1),
        }));
      }
      for (let i = 0; i < N; i++) {
        const t = pts[i % pts.length];
        particles[i].tx = t.x;
        particles[i].ty = t.y;
        particles[i].tc = t.c;
        particles[i].ta = t.a;
      }
    };

    const stop = runCanvas(canvasRef.current, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const p = progressRef.current;
      if (!img) return;
      ensureTargets(w, h);
      if (!imageData) return;

      const desired = PHASES(p);
      if (desired !== shape) assign(desired, w, h);

      /* --- Act I: the photograph itself, breathing slowly --- */
      const imgAlpha = clamp(1 - (p - 0.115) / 0.045, 0, 1);
      if (imgAlpha > 0) {
        const z = 1 + 0.14 * smooth(clamp(p / 0.16, 0, 1));
        const { ox, oy, dw, dh, cx, cy } = imageData.rect;
        ctx.save();
        ctx.globalAlpha = imgAlpha;
        ctx.translate(cx, cy);
        ctx.scale(z, z);
        ctx.drawImage(img, ox - cx, oy - cy, dw, dh);
        // vignette inside the photo
        const v = ctx.createRadialGradient(0, 0, dh * 0.25, 0, 0, dh * 0.75);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, "rgba(0,0,0,0.5)");
        ctx.fillStyle = v;
        ctx.fillRect(ox - cx, oy - cy, dw, dh);
        ctx.restore();
      }

      /* --- particle veil --- */
      let veil = 0;
      if (p < 0.16) veil = clamp((p - 0.10) / 0.04, 0, 1);
      else if (p > 0.94) veil = clamp(1 - (p - 0.94) / 0.05, 0, 1);
      else veil = 1;
      if (veil <= 0.001) return;

      const glowy = shape !== "image";
      ctx.globalCompositeOperation = glowy ? "lighter" : "source-over";

      const zHold = 1 + 0.14 * smooth(clamp(p / 0.16, 0, 1));
      const { cx, cy } = imageData.rect;
      const ease = shape === "scatter" ? 0.02 : shape === "heart" ? 0.08 : 0.055;
      const wig = shape === "scatter" ? 26 : shape === "pollen" ? 14 : 2.4;

      for (const pt of particles) {
        let tx = pt.tx, ty = pt.ty;
        if (shape === "image") {
          tx = cx + (pt.tx - cx) * zHold;
          ty = cy + (pt.ty - cy) * zHold;
        }
        pt.x += (tx - pt.x) * ease + Math.sin(t * pt.sp + pt.ph) * wig * 0.016;
        pt.y += (ty - pt.y) * ease + Math.cos(t * pt.sp * 0.8 + pt.ph) * wig * 0.014;
        pt.c[0] = lerp(pt.c[0], pt.tc[0], 0.04);
        pt.c[1] = lerp(pt.c[1], pt.tc[1], 0.04);
        pt.c[2] = lerp(pt.c[2], pt.tc[2], 0.04);
        pt.a = lerp(pt.a, pt.ta, 0.05);

        const tw = glowy ? 0.65 + 0.35 * Math.sin(t * 2.2 * pt.sp + pt.ph) : 1;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.s * (glowy ? 1.25 : 1), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pt.c[0] | 0},${pt.c[1] | 0},${pt.c[2] | 0},${pt.a * veil * tw})`;
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    });

    /* --- DOM choreography, scrubbed to scroll --- */
    const ctxG = gsap.context(() => {
      const lb = document.querySelector(".letterbox");
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
          onUpdate: (self) => (progressRef.current = self.progress),
          onToggle: (self) =>
            lb && lb.style.setProperty("--letterbox", self.isActive ? "6vh" : "0px"),
        },
      });

      tl.fromTo(".fv-opening", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.03 }, 0.015)
        .to(".fv-opening", { opacity: 0, y: -26, duration: 0.03 }, 0.105)
        .fromTo(".fv-stardust", { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.19)
        .to(".fv-stardust", { opacity: 0, duration: 0.03 }, 0.27)
        .fromTo(".fv-rose-line", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.03 }, 0.35)
        .to(".fv-rose-line", { opacity: 0, duration: 0.03 }, 0.44)
        // the world blooms
        .fromTo(".fv-field", { opacity: 0 }, { opacity: 1, duration: 0.07 }, 0.48)
        .fromTo(".fv-field-flowers", { yPercent: 24 }, { yPercent: 0, duration: 0.1 }, 0.5)
        .to(".fv-field", { opacity: 0, duration: 0.06 }, 0.715)
        .fromTo(".fv-dusk", { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.715)
        // names in the heart
        .fromTo(".fv-vow", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.05 }, 0.765)
        .to(".fv-vow", { opacity: 0, duration: 0.04 }, 0.875)
        .to(".fv-dusk", { opacity: 0, duration: 0.05 }, 0.875)
        // curtain
        .fromTo(".fv-black", { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.885)
        .fromTo(".fv-end", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.03 }, 0.915)
        .fromTo(".fv-epilogue", { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.955)
        .fromTo(".fv-sign", { opacity: 0 }, { opacity: 0.7, duration: 0.02 }, 0.98);
    }, rootRef);

    return () => { stop(); ctxG.revert(); };
  }, []);

  const c = content.forever;
  const { his, hers } = content.names;

  const flowerRow = [
    { x: "2%", hue: "#f7b7c8", scale: 1.0, sway: 3.2 }, { x: "9%", hue: "#f4e2a5", scale: 1.3, sway: 4.1 },
    { x: "17%", hue: "#e9a1b8", scale: 0.8, sway: 3.6 }, { x: "26%", hue: "#f4c4a0", scale: 1.15, sway: 4.4 },
    { x: "35%", hue: "#f7d7e0", scale: 0.9, sway: 3.9 }, { x: "44%", hue: "#f4e2a5", scale: 1.25, sway: 3.3 },
    { x: "54%", hue: "#f7b7c8", scale: 1.0, sway: 4.2 }, { x: "63%", hue: "#e9a1b8", scale: 1.35, sway: 3.7 },
    { x: "72%", hue: "#f4c4a0", scale: 0.85, sway: 4.0 }, { x: "81%", hue: "#f7d7e0", scale: 1.2, sway: 3.5 },
    { x: "90%", hue: "#f4e2a5", scale: 1.0, sway: 4.3 }, { x: "96%", hue: "#f7b7c8", scale: 0.8, sway: 3.4 },
  ];

  return (
    <section id="chapter-forever" ref={rootRef} className="relative h-[750vh] bg-black">
      <style>{`
        @keyframes sway { from { transform: rotate(-2.6deg); } to { transform: rotate(2.6deg); } }
        @keyframes flap { from { transform: scaleX(1); } to { transform: scaleX(0.35); } }
      `}</style>

      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* deep space behind everything */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#101018_0%,#000_75%)]" />

        {/* the golden meadow (Act IV) */}
        <div className="fv-field absolute inset-0 opacity-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, #f9c97c 0%, #fbd9a0 34%, #f7e3b6 52%, #a8c078 74%, #6f9a4e 100%)",
            }}
          />
          {/* sun + volumetric haze */}
          <div className="absolute left-1/2 top-[30%] h-[46vmin] w-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,252,235,0.95),rgba(255,224,160,0.5)_38%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,246,220,0.28)_0%,transparent_30%,rgba(255,246,220,0.16)_46%,transparent_66%,rgba(255,246,220,0.2)_82%,transparent_100%)]" />
          {/* rolling hills */}
          <div className="absolute inset-x-0 bottom-0 h-[34vh] rounded-[100%_100%_0_0/80%_80%_0_0] bg-[#7ba456] opacity-80" style={{ transform: "scaleX(1.6) translateY(30%)" }} />
          <div className="absolute inset-x-0 bottom-0 h-[26vh] rounded-[100%_100%_0_0/70%_70%_0_0] bg-[#6a924a]" style={{ transform: "scaleX(1.8) translateY(38%)" }} />
          {/* flowers */}
          <div className="fv-field-flowers absolute inset-x-0 bottom-0 h-44">
            {flowerRow.map((f, i) => <MeadowFlower key={i} {...f} />)}
          </div>
          {/* butterflies */}
          <div className="absolute bottom-[26%] left-[18%]"><Butterfly hue="#ffb3c4" path={1} /></div>
          <div className="absolute bottom-[20%] right-[22%]"><Butterfly hue="#ffd98a" path={-1} delay={1.2} /></div>
          <div className="absolute bottom-[34%] left-[55%]"><Butterfly hue="#cfe3ff" path={1} delay={2.3} /></div>
          {/* out-of-focus foreground blooms for depth */}
          <div className="absolute -bottom-8 -left-6" style={{ filter: "blur(6px)", transform: "scale(2.4)", transformOrigin: "bottom" }}>
            <MeadowFlower x="0" hue="#f3a8be" scale={1.4} sway={4.6} />
          </div>
          <div className="absolute -bottom-10 right-2" style={{ filter: "blur(7px)", transform: "scale(2.8)", transformOrigin: "bottom" }}>
            <MeadowFlower x="0" hue="#f4d98f" scale={1.3} sway={3.8} />
          </div>
        </div>

        {/* dusk behind the particle heart */}
        <div
          className="fv-dusk absolute inset-0 opacity-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 42%, #3a1226 0%, #1c0714 45%, #07030a 100%)",
          }}
        />

        {/* particles + photograph */}
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* ---- captions ---- */}
        <div className="fv-opening absolute inset-x-0 bottom-[9%] px-6 text-center opacity-0">
          <p className="font-serif-d text-2xl font-light italic text-white/90 md:text-4xl">{c.opening}</p>
          <p className="font-script mt-3 text-2xl text-amber-200/85 md:text-3xl">{c.openingSub}</p>
        </div>

        <p className="fv-stardust absolute inset-x-0 bottom-[12%] px-6 text-center font-serif-d text-xl font-light italic text-slate-200/80 opacity-0 md:text-3xl">
          If we were scattered into stardust…
        </p>

        <p className="fv-rose-line absolute inset-x-0 bottom-[12%] px-6 text-center font-serif-d text-xl font-light italic text-amber-50/90 opacity-0 md:text-3xl">
          …we would find our way back as something beautiful.
        </p>

        {/* the vow inside the heart */}
        <div className="fv-vow absolute inset-0 flex flex-col items-center justify-center px-6 text-center opacity-0" style={{ paddingBottom: "4vh" }}>
          <p className="font-script text-4xl text-white md:text-6xl" style={{ textShadow: "0 2px 30px rgba(120,20,50,0.8)" }}>
            {his} <span className="text-rose-200">&</span> {hers}
          </p>
          <p className="mt-4 text-sm tracking-[0.4em] uppercase text-white/85 md:text-base" style={{ textShadow: "0 2px 20px rgba(120,20,50,0.9)" }}>
            {c.vow}
          </p>
        </div>

        {/* curtain */}
        <div className="fv-black absolute inset-0 bg-black opacity-0" />
        <div className="fv-end absolute inset-0 flex items-center justify-center opacity-0">
          <p className="font-serif-d text-4xl font-light tracking-[0.2em] text-white/90 md:text-6xl">{c.theEnd}</p>
        </div>
        <p className="fv-epilogue absolute inset-x-0 bottom-[22%] px-6 text-center font-script text-2xl text-amber-200/90 opacity-0 md:text-4xl">
          {c.epilogue}
        </p>
        <p className="fv-sign absolute inset-x-0 bottom-[8%] text-center text-[10px] tracking-[0.35em] uppercase text-white/30 opacity-0">
          made with all my heart, for you
        </p>
      </div>
    </section>
  );
}
