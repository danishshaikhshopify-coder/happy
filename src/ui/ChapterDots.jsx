import { useEffect, useState } from "react";
import { scrollRef } from "../lib/scrollRef.js";

const CHAPTERS = [
  { id: "chapter-welcome", label: "Welcome" },
  { id: "chapter-story", label: "Our Story" },
  { id: "chapter-journey", label: "Our Journey" },
  { id: "chapter-storm", label: "Through Every Storm" },
  { id: "chapter-reasons", label: "Why I Choose You" },
  { id: "chapter-forever", label: "Forever" },
];

export default function ChapterDots() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    // Track which chapter owns the center of the screen.
    const onScroll = () => {
      const mid = window.scrollY + window.innerHeight / 2;
      let current = 0;
      CHAPTERS.forEach((c, i) => {
        const el = document.getElementById(c.id);
        if (el && el.offsetTop <= mid) current = i;
      });
      setActive(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="fixed right-5 top-1/2 z-[100] hidden -translate-y-1/2 flex-col items-end gap-4 md:flex">
      {CHAPTERS.map((c, i) => (
        <a
          key={c.id}
          href={`#${c.id}`}
          className="group flex items-center gap-3"
          aria-label={c.label}
          onClick={(e) => {
            if (scrollRef.lenis) {
              e.preventDefault();
              scrollRef.lenis.scrollTo(`#${c.id}`, { duration: 2 });
            }
          }}
        >
          <span
            className={`font-serif-d text-xs italic tracking-wide text-amber-100/0 transition-all duration-500 group-hover:text-amber-100/80 ${
              active === i ? "text-amber-100/60" : ""
            }`}
          >
            {c.label}
          </span>
          <span
            className={`block rounded-full transition-all duration-500 ${
              active === i
                ? "h-2.5 w-2.5 bg-amber-200 shadow-[0_0_12px_rgba(252,220,170,0.8)]"
                : "h-1.5 w-1.5 bg-white/30 group-hover:bg-white/60"
            }`}
          />
        </a>
      ))}
    </nav>
  );
}
