/*
 * MusicEngine — lightweight audio player that prefers a user-uploaded file.
 * It attempts to detect common filenames under the public server (e.g. /audio/music.mp3),
 * plays only after an explicit user gesture (the "Begin" button), fades in, and loops.
 */

export class MusicEngine {
  constructor() {
    this.audio = null;
    this.started = false;
    this.muted = false;
    this._fadeHandle = null;
    this._targetVolume = 0.65;
    this._fadeDuration = 1800; // ms
  }

  async start() {
    if (this.started) {
      this.setMuted(false);
      return;
    }
    // candidate paths to try (user should place their file in public/ so it's served)
    const names = ["audio","music","background","track","nabia","song","theme"];
    const exts = ["mp3","m4a","wav","ogg","aac"];
    const candidates = [];
    for (const n of names) for (const e of exts) {
      candidates.push(`/${n}.${e}`);
      candidates.push(`/audio/${n}.${e}`);
      candidates.push(`/assets/${n}.${e}`);
      candidates.push(`/src/audio/${n}.${e}`);
    }
    // also try a few explicit paths
    candidates.push("/nabia.mp3", "/nabia.m4a", "/audio/nabia.mp3");

    const tryLoad = (src, timeout = 3000) => new Promise((resolve, reject) => {
      const a = new Audio();
      a.preload = "auto";
      a.loop = true;
      a.crossOrigin = "anonymous";
      let done = false;
      const clean = () => {
        a.removeEventListener("canplaythrough", onCan);
        a.removeEventListener("error", onErr);
        clearTimeout(timer);
      };
      const onCan = () => { if (done) return; done = true; clean(); resolve(a); };
      const onErr = () => { if (done) return; done = true; clean(); reject(new Error("load error")); };
      const timer = setTimeout(() => { if (done) return; done = true; clean(); reject(new Error("timeout")); }, timeout);
      a.addEventListener("canplaythrough", onCan, { once: true });
      a.addEventListener("error", onErr, { once: true });
      a.src = src;
      // start loading
      a.load();
    });

    let audio = null;
    for (const p of candidates) {
      try {
        audio = await tryLoad(p);
        audio.volume = 0;
        this.audio = audio;
        break;
      } catch (e) {
        // try next
      }
    }

    if (!this.audio) {
      // No user audio found — remain silent but mark started to avoid retries.
      console.warn("MusicEngine: no audio file found in common locations. Place your audio in public/ as /audio.mp3 or /music.mp3.");
      // keep started false so UI won't show playing state
      return;
    }
    // mark started once we have an audio element
    this.started = true;

    // Play (user gesture should have occurred when start() is called)
    try {
      await this.audio.play();
    } catch (e) {
      // autoplay might be blocked — rely on user to press the toggle
    }

    // fade in to the target volume
    this._fadeTo(this._targetVolume, this._fadeDuration);
    this.muted = false;
  }

  setMuted(muted) {
    this.muted = !!muted;
    if (!this.audio) return;
    if (this.muted) this._fadeTo(0, 600);
    else this._fadeTo(this._targetVolume, 600);
  }

  _fadeTo(target, durationMs = 1000) {
    if (!this.audio) return;
    if (this._fadeHandle) cancelAnimationFrame(this._fadeHandle);
    const start = performance.now();
    const from = this.audio.volume;
    const delta = target - from;
    const step = (t) => {
      const now = performance.now();
      const p = Math.min(1, (now - start) / durationMs);
      this.audio.volume = Math.max(0, Math.min(1, from + delta * p));
      if (p < 1) this._fadeHandle = requestAnimationFrame(step);
      else this._fadeHandle = null;
    };
    this._fadeHandle = requestAnimationFrame(step);
  }

  destroy() {
    if (this._fadeHandle) cancelAnimationFrame(this._fadeHandle);
    if (this.audio) {
      try { this.audio.pause(); } catch (e) {}
      this.audio = null;
    }
    this.started = false;
  }
}

export const music = new MusicEngine();
