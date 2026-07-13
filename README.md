# Our Story ❤️

A private, cinematic love story — a single-page interactive experience in six chapters,
built as a gift.

## The six chapters

| # | Chapter | Atmosphere |
|---|---------|-----------|
| I | **Welcome** | A midnight sky where stars are born one by one, with a glowing invitation |
| II | **Our Story** | A candlelit storybook whose words settle onto the page like ink |
| III | **Our Journey** | The photograph, held in glass — parallax, slow zoom, drifting bokeh |
| IV | **Through Every Storm** | Rain, clouds and distant lightning that scroll into sunshine and blooming flowers |
| V | **Why I Choose You** | Floating hearts that open into reasons when touched |
| VI | **Forever** | The photograph dissolves into stardust → a white rose → a golden meadow with butterflies → a heart holding your names → *The End… or maybe just the beginning* |

## ✍️ Every word is yours to change

**Everything personal lives in one file: [`src/content.js`](src/content.js)** —
the story passages, the letter, the six reasons, the photo caption, and the names.
Edit anything there and the whole experience updates; nothing else needs touching.

The photograph lives at `public/images/our-journey.jpeg` — replace that file
(keeping the same name) to change the picture everywhere at once.

## Run it

```bash
npm install
npm run dev        # local preview at http://localhost:5173
npm run build      # production build in /dist
```

## Craft notes

- **GSAP + ScrollTrigger** drive the scroll-scrubbed cinematography; **Lenis** makes the scroll itself feel weighted and smooth; **Framer Motion** powers the interactive hearts.
- The stars, dust, bokeh, rain, pollen and the entire finale are hand-tuned **2D canvas particle engines** — the finale samples the actual pixels of your photograph and morphs them through every shape (stardust → rose → heart).
- The music is **generated live** with the Web Audio API — a soft felt-piano progression (Am–F–C–G) with humanized timing and convolution reverb. No audio files, nothing copyrighted. Mute it any time with the button in the corner.
- Canvas work pauses off-screen, particle counts adapt to mobile, and `prefers-reduced-motion` is respected.

*Made with all my heart, for her.*
