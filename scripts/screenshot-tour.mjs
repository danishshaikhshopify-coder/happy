// Visual verification: drive the experience headlessly, screenshot every act.
// Usage: node scripts/screenshot-tour.mjs <output-dir> [mobile]
import { chromium } from "playwright-core";
import path from "path";

const OUT = process.argv[2] || ".";
const MOBILE = process.argv[3] === "mobile";

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({
  viewport: MOBILE ? { width: 375, height: 812 } : { width: 1280, height: 800 },
});
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 300)); });

await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.waitForTimeout(5500);

const pre = MOBILE ? "m-" : "d-";
const shot = (name) => page.screenshot({ path: path.join(OUT, pre + name + ".png") });

// scroll helpers — positions computed from real section geometry
const geo = await page.evaluate(() => {
  const g = {};
  for (const s of document.querySelectorAll("section")) {
    g[s.id] = { top: s.offsetTop, h: s.offsetHeight };
  }
  g.vh = innerHeight;
  return g;
});
// for pinned sections: scroll so that ScrollTrigger progress == p
const pinned = (id, p) => geo[id].top + p * (geo[id].h - geo.vh);
const at = (id, f = 0) => geo[id].top + f * geo[id].h;
const go = async (y, wait = 2200) => {
  await page.evaluate((v) => window.scrollTo({ top: v, behavior: "instant" }), y);
  await page.waitForTimeout(wait);
};

await shot("01-welcome");
await page.click("text=Begin Our Story");
await page.waitForTimeout(3200);
await shot("02-after-begin");

await go(at("chapter-story", 0.35)); await shot("03-story");
await go(at("chapter-journey", 0.15)); await shot("04-journey");

await go(pinned("chapter-storm", 0.12)); await shot("05-storm-rain");
await go(pinned("chapter-storm", 0.45), 3000); await shot("06-storm-letter");
await go(pinned("chapter-storm", 0.85), 3000); await shot("07-storm-sun");

await go(at("chapter-reasons", 0.25)); await shot("08-reasons");
const heart = await page.$(".reason-heart");
if (heart) {
  await heart.click({ force: true });
  await page.waitForTimeout(1200);
  await shot("09-reason-open");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
}

await go(pinned("chapter-forever", 0.06), 2500); await shot("10-forever-photo");
await go(pinned("chapter-forever", 0.24), 3000); await shot("11-forever-stardust");
await go(pinned("chapter-forever", 0.42), 4500); await shot("12-forever-rose");
await go(pinned("chapter-forever", 0.62), 3000); await shot("13-forever-meadow");
await go(pinned("chapter-forever", 0.82), 5000); await shot("14-forever-heart");
await go(pinned("chapter-forever", 0.93), 2500); await shot("15-the-end");
await go(pinned("chapter-forever", 1.0), 2500); await shot("16-epilogue");

console.log("ERRORS:", JSON.stringify(errors, null, 2));
await browser.close();
