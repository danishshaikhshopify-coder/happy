import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import Ch1Welcome from "./chapters/Ch1Welcome.jsx";
import Ch2Story from "./chapters/Ch2Story.jsx";
import Ch3Journey from "./chapters/Ch3Journey.jsx";
import Ch4Storm from "./chapters/Ch4Storm.jsx";
import Ch5Reasons from "./chapters/Ch5Reasons.jsx";
import Ch6Forever from "./chapters/Ch6Forever.jsx";
import MusicToggle from "./ui/MusicToggle.jsx";
import ChapterDots from "./ui/ChapterDots.jsx";
import { music } from "./audio/MusicEngine.js";
import { scrollRef } from "./lib/scrollRef.js";

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const lenisRef = useRef(null);
  const [begun, setBegun] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.35,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;
    scrollRef.lenis = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      scrollRef.lenis = null;
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  const handleBegin = () => {
    setBegun(true);
    music.start();
    // glide down to chapter two like a curtain drawing back
    lenisRef.current?.scrollTo("#chapter-story", { duration: 2.6 });
  };

  return (
    <div className="grain letterbox">
      <div className="lb-bar lb-top" />
      <div className="lb-bar lb-bottom" />
      <MusicToggle />
      <ChapterDots />
      <main>
        <Ch1Welcome onBegin={handleBegin} begun={begun} />
        <Ch2Story />
        <Ch3Journey />
        <Ch4Storm />
        <Ch5Reasons />
        <Ch6Forever />
      </main>
    </div>
  );
}
