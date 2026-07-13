import { useEffect, useRef } from "react";
import gsap from "gsap";
import { runCanvas, rand, isMobile } from "../lib/canvas.js";
import { content } from "../content.js";

/* dreamy teal-gold bokeh drifting like fireflies remembering */
function makeBokeh() {
  const N = isMobile() ? 18 : 42;
  const orbs = Array.from({ length: N }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: rand(8, 60),
    vy: rand(-0.012, -0.003),
    vx: rand(-0.006, 0.006),
    a: rand(0.03, 0.12),
    ph: rand(0, Math.PI * 2),
    warm: Math.random() < 0.35,
  }));
  return (ctx, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    for (const o of orbs) {
      const y = ((o.y + t * o.vy) % 1 + 1) % 1;
      const x = ((o.x + t * o.vx + Math.sin(t * 0.3 + o.ph) * 0.02) % 1 + 1) % 1;
      const a = o.a * (0.7 + 0.3 * Math.sin(t * 0.8 + o.ph));
      const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, o.r);
      const col = o.warm ? "252, 211, 158" : "125, 200, 210";
      g.addColorStop(0, `rgba(${col}, ${a})`);
      g.addColorStop(1, `rgba(${col}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x * w, y * h, o.r, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

export default function Ch3Journey() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const stop = runCanvas(canvasRef.current, makeBokeh());

    const ctxG = gsap.context(() => {
      // the photo breathes: slow zoom-out as you scroll through, parallax lift
      gsap.fromTo(
        ".journey-img",
        { scale: 1.28, yPercent: 6 },
        {
          scale: 1,
          yPercent: -4,
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2,
          },
        }
      );
      gsap.from(".journey-frame", {
        opacity: 0,
        y: 90,
        scale: 0.92,
        duration: 1.8,
        ease: "power3.out",
        scrollTrigger: { trigger: ".journey-frame", start: "top 85%" },
      });
      gsap.from(".journey-text > *", {
        opacity: 0,
        y: 30,
        stagger: 0.2,
        duration: 1.3,
        ease: "power3.out",
        scrollTrigger: { trigger: ".journey-text", start: "top 85%" },
      });
      // light shimmer sweeps across the glass every few seconds
      gsap.fromTo(
        ".journey-shine",
        { xPercent: -140 },
        { xPercent: 240, duration: 3.2, ease: "power2.inOut", repeat: -1, repeatDelay: 3.5 }
      );
    }, rootRef);

    // gentle 3D tilt following the pointer
    const frame = frameRef.current;
    const onMove = (e) => {
      const r = frame.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(frame, {
        rotateY: px * 7,
        rotateX: -py * 7,
        duration: 0.9,
        ease: "power2.out",
      });
    };
    const onLeave = () =>
      gsap.to(frame, { rotateX: 0, rotateY: 0, duration: 1.2, ease: "elastic.out(1, 0.5)" });
    frame.addEventListener("pointermove", onMove);
    frame.addEventListener("pointerleave", onLeave);

    return () => {
      stop();
      ctxG.revert();
      frame.removeEventListener("pointermove", onMove);
      frame.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const c = content.journey;

  return (
    <section
      id="chapter-journey"
      ref={rootRef}
      className="relative overflow-hidden py-[16vh]"
      style={{
        background:
          "linear-gradient(180deg, #0d1220 0%, #0a1a24 30%, #0c222c 60%, #0a141f 100%)",
      }}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6">
        <div className="journey-text text-center">
          <p className="font-script text-3xl text-teal-100/70 md:text-4xl">{c.eyebrow}</p>
        </div>

        <div style={{ perspective: "1200px" }} className="mt-14 w-full max-w-xl">
          <figure
            ref={frameRef}
            className="journey-frame glass relative overflow-hidden rounded-[1.6rem] p-3 md:p-4"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="relative overflow-hidden rounded-[1.1rem]">
              <img
                src={`${import.meta.env.BASE_URL}images/our-journey.jpeg`}
                alt="Us — where it all began"
                className="journey-img block w-full will-change-transform"
                draggable="false"
              />
              {/* soft inner light */}
              <div className="pointer-events-none absolute inset-0 rounded-[1.1rem] shadow-[inset_0_0_80px_rgba(6,12,20,0.55)]" />
              {/* shimmer sweep */}
              <div className="journey-shine pointer-events-none absolute inset-y-0 w-1/3 rotate-6 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2 pb-1 pt-4">
              <span className="font-serif-d text-lg italic text-teal-50/90 md:text-xl">
                {c.caption}
              </span>
              <span className="font-script text-lg text-amber-100/75 md:text-xl">
                {c.date}
              </span>
            </figcaption>
          </figure>
        </div>

        <div className="journey-text mt-16 max-w-lg text-center">
          <div className="divider-line mx-auto mb-8 w-32" />
          <p className="font-serif-d text-xl font-light italic leading-relaxed text-[#dcebe9]/85 md:text-2xl">
            “{c.note}”
          </p>
        </div>
      </div>
    </section>
  );
}
