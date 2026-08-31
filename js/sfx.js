/**
 * Synthesised WebAudio sound effects — no asset files, same approach as
 * math-champions/src/audio/sfx.js. A miss is a soft neutral blip, never a
 * buzzer: nothing here is designed to feel bad.
 */

const KKSfx = (() => {
  let ctx = null;
  let muted = false;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type = 'sine', gainPeak = 0.18) {
    const c = ensureCtx();
    if (!c || muted) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, c.currentTime + start);
    gain.gain.linearRampToValueAtTime(gainPeak, c.currentTime + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + dur + 0.02);
  }

  return {
    setMuted(v) { muted = v; },
    unlock() { ensureCtx(); },
    tick() { tone(720, 0, 0.05, 'square', 0.06); },
    correct() { tone(660, 0, 0.09, 'triangle', 0.15); tone(880, 0.05, 0.12, 'triangle', 0.15); },
    correctRetry() { tone(560, 0, 0.11, 'triangle', 0.13); },
    miss() { tone(320, 0, 0.09, 'sine', 0.08); },
    roundDone(stars) {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const count = Math.max(1, stars + 1);
      for (let i = 0; i < count; i++) tone(notes[Math.min(i, notes.length - 1)], i * 0.11, 0.18, 'triangle', 0.16);
    },
    streak() { tone(988, 0, 0.08, 'triangle', 0.14); tone(1318.5, 0.06, 0.1, 'triangle', 0.14); },
  };
})();
