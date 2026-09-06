/**
 * Lightweight confetti burst — fixed overlay, aria-hidden, skipped entirely
 * under prefers-reduced-motion. Mirrors math-champions' Confetti.jsx.
 */

const KKConfetti = (() => {
  const COLORS = ['#ffe234', '#ffa500', '#3fae5c', '#8fd6a6', '#c8f0d4', '#fff'];
  let layer = null;

  function ensureLayer() {
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'confetti-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    return layer;
  }

  function burst(count = 60) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ensureLayer();
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('span');
      const left = Math.random() * 100;
      const dur = 1.6 + Math.random() * 1.2;
      const delay = Math.random() * 0.4;
      const size = 6 + Math.random() * 6;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      piece.style.cssText =
        `position:absolute;top:-20px;left:${left}%;width:${size}px;height:${size * 0.6}px;` +
        `background:${color};border-radius:2px;` +
        `animation:confettiFall ${dur}s ease-in ${delay}s forwards;`;
      frag.appendChild(piece);
      setTimeout(() => piece.remove(), (dur + delay) * 1000 + 100);
    }
    el.appendChild(frag);
  }

  return { burst };
})();
