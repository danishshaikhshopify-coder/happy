/* Shared canvas helpers: DPR-aware sizing + a rAF loop that sleeps offscreen. */

export function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const { clientWidth: w, clientHeight: h } = canvas;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h, dpr };
}

/**
 * Runs `draw(ctx, w, h, t)` every frame while `canvas` is on screen.
 * Returns a cleanup function.
 */
export function runCanvas(canvas, draw) {
  let raf = 0;
  let visible = true;
  let start = performance.now();

  const io = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (visible) loop();
    },
    { rootMargin: "80px" }
  );
  io.observe(canvas);

  const onResize = () => fitCanvas(canvas);
  window.addEventListener("resize", onResize);

  function loop() {
    if (!visible) return;
    const { ctx, w, h } = fitCanvas(canvas);
    draw(ctx, w, h, (performance.now() - start) / 1000);
    raf = requestAnimationFrame(loop);
  }
  loop();

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener("resize", onResize);
  };
}

export const rand = (a, b) => a + Math.random() * (b - a);
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smooth = (t) => t * t * (3 - 2 * t);

export const isMobile = () =>
  window.matchMedia("(max-width: 768px)").matches ||
  navigator.maxTouchPoints > 1;

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
