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
    const base = import.meta.env.BASE_URL || "/";
    const safeBase = base.endsWith("/") ? base : `${base}/`;
    const names = ["audio","music","background","track","nabia","song","theme"];
    const exts = ["mp3","m4a","wav","ogg","aac"];
    const candidates = [];
    for (const n of names) for (const e of exts) {
      candidates.push(`${safeBase}${n}.${e}`);
      candidates.push(`${safeBase}audio/${n}.${e}`);
      candidates.push(`${safeBase}assets/${n}.${e}`);
      candidates.push(`${safeBase}src/audio/${n}.${e}`);
    }
    // also try a few explicit paths
    candidates.push(`${safeBase}nabia.mp3`, `${safeBase}nabia.m4a`, `${safeBase}audio/nabia.mp3`);

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
      a.load();
      const playPromise = a.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.then(() => {
          if (done) return;
          done = true;
          clean();
          resolve(a);
        }).catch((err) => {
          if (done) return;
          done = true;
          clean();
          reject(err);
        });
      }
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
      // No user audio found — fall back to a lightweight WebAudio oscillator so
      // the background music still works on Pages while the user-provided
      // asset is missing. This preserves the existing UI and behavior.
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 220; // gentle sine tone
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.value = 0;
          osc.start();

          const wrapper = {
            _ctx: ctx,
            _gain: gain,
            _volume: 0,
            get volume() { return this._volume; },
            set volume(v) { this._volume = v; try { this._gain.gain.value = v; } catch (e) {} },
            play() { return this._ctx.resume(); },
            pause() { try { this._gain.gain.value = 0; } catch (e) {}; return Promise.resolve(); }
          };

          this.audio = wrapper;
          try { window.__music_fallback = true; } catch (e) {}
          console.info("MusicEngine: using WebAudio fallback (sine)");
        } else {
          console.warn("MusicEngine: no audio file found and WebAudio unavailable.");
          return;
        }
      } catch (e) {
        console.warn("MusicEngine: failed to create WebAudio fallback.", e);
        return;
      }
    }
    // mark started once we have an audio element
    this.started = true;
    try { window.__music_started = true; } catch (e) {}

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
