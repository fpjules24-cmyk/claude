'use strict';
// Donjons & Tractions — effets sonores 8-bit (WebAudio, aucun fichier)
(function (DT) {
  let ctx = null, master = null, musicGain = null, musicTimer = null, noiseBuf = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.35; musicGain.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { ctx = null; return false; }
  }
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function tone(freq, t0, dur, type = 'square', vol = 0.6, slide = 0, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(t0, dur, vol = 0.5, hp = 800) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }
  const SFX = {
    click: (t) => tone(NOTE(84), t, 0.04, 'square', 0.25),
    tap: (t) => tone(NOTE(88 + Math.floor(Math.random() * 5)), t, 0.05, 'square', 0.2),
    coin: (t) => { tone(NOTE(88), t, 0.06, 'square', 0.4); tone(NOTE(95), t + 0.06, 0.14, 'square', 0.4); },
    buy: (t) => { [72, 76, 79].forEach((n, i) => tone(NOTE(n), t + i * 0.05, 0.08, 'square', 0.35)); },
    skill: (t) => { [67, 71, 74, 79, 83].forEach((n, i) => tone(NOTE(n), t + i * 0.07, 0.14, 'square', 0.4)); tone(NOTE(55), t, 0.4, 'triangle', 0.6); },
    lvl: (t) => { [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(NOTE(n), t + i * 0.06, 0.12, 'square', 0.35)); },
    ach: (t) => { [84, 88, 91, 96].forEach((n, i) => tone(NOTE(n), t + i * 0.05, 0.1, 'triangle', 0.5)); },
    hit: (t) => { noise(t, 0.08, 0.5, 1200); tone(NOTE(45), t, 0.08, 'square', 0.4, 0.5); },
    crit: (t) => { noise(t, 0.14, 0.7, 600); tone(NOTE(76), t, 0.12, 'square', 0.4, 0.4); },
    hurt: (t) => { tone(NOTE(52), t, 0.16, 'sawtooth', 0.4, 0.5); },
    heal: (t) => { [72, 79, 84].forEach((n, i) => tone(NOTE(n), t + i * 0.06, 0.12, 'triangle', 0.5)); },
    shield: (t) => { tone(NOTE(60), t, 0.25, 'triangle', 0.6, 2); },
    win: (t) => { [72, 72, 72, 76, 79, 84].forEach((n, i) => tone(NOTE(n), t + [0, 0.1, 0.2, 0.3, 0.45, 0.6][i], 0.14, 'square', 0.4)); tone(NOTE(48), t, 0.8, 'triangle', 0.6); },
    lose: (t) => { [67, 63, 60, 55].forEach((n, i) => tone(NOTE(n), t + i * 0.16, 0.2, 'square', 0.35)); },
    beep: (t) => tone(NOTE(81), t, 0.12, 'square', 0.45),
    go: (t) => { tone(NOTE(88), t, 0.25, 'square', 0.5); },
    chest: (t) => { noise(t, 0.1, 0.3, 2000); [76, 80, 83, 88, 92].forEach((n, i) => tone(NOTE(n), t + 0.1 + i * 0.05, 0.1, 'triangle', 0.5)); },
    error: (t) => { tone(NOTE(48), t, 0.12, 'square', 0.35); tone(NOTE(45), t + 0.12, 0.16, 'square', 0.35); },
  };

  function play(name) {
    if (!DT.S || !DT.S.settings.sound) return;
    if (!init() || !SFX[name]) return;
    try { SFX[name](ctx.currentTime + 0.01); } catch (e) { /* ignore */ }
  }

  // Petite boucle chiptune (désactivée par défaut)
  const BASS = [45, 45, 52, 45, 43, 43, 50, 43, 41, 41, 48, 41, 40, 40, 47, 40];
  const LEAD = [69, 72, 76, 72, 67, 71, 74, 71, 65, 69, 72, 69, 64, 68, 71, 76];
  let step = 0;
  function musicOn(on) {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (!on || !DT.S.settings.sound) return;
    if (!init()) return;
    const beat = 0.2;
    musicTimer = setInterval(() => {
      if (!ctx || document.hidden) return;
      const t = ctx.currentTime + 0.05;
      const i = step % 16;
      tone(NOTE(BASS[i]), t, beat * 0.9, 'triangle', 0.5, 0, musicGain);
      if (step % 2 === 0) tone(NOTE(LEAD[(step / 2) % 16 | 0] + (Math.floor(step / 32) % 2 ? 12 : 0)), t, beat * 1.6, 'square', 0.12, 0, musicGain);
      if (i % 4 === 2) { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = noiseBuf; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.connect(g); g.connect(musicGain); s.start(t); s.stop(t + 0.06); }
      step++;
    }, 200);
  }

  DT.A = { init, play, musicOn };
})(window.DT);
