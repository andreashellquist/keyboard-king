/**
 * A small per-item Leitner ladder (6 boxes, 0–5), one instance shared by
 * `homerow` and `letters` (both write into `mastery.keys`) and one each for
 * `words` and `sentences`. Difficulty is per-item, not global — the same
 * idea as math-champions/src/game/mastery.js, scaled down: no latency gate,
 * no strand-opening logic, just "what needs another look."
 *
 * Promotion rule, deliberately generous: a correct answer always promotes
 * or holds, it never costs the child anything. Only a genuinely struggled
 * item (several misses in one attempt) steps back a box — and even that
 * floors at 0, never punished further.
 */

function kkMasteryEntry(map, key) {
  return map[key] || { box: 0, seen: 0 };
}

/** outcome: 'first' (correct first try), 'retry' (correct after 1 miss), 'struggle' (2+ misses) */
function kkUpdateMastery(map, key, outcome) {
  const cur = kkMasteryEntry(map, key);
  let box = cur.box;
  if (outcome === 'first') box = Math.min(5, box + 1);
  else if (outcome === 'retry') box = Math.min(5, box); // holds
  else box = Math.max(0, box - 1);
  map[key] = { box, seen: cur.seen + 1 };
}

/**
 * Builds a round of `count` items from `pool`, weighted toward the lowest
 * mastery boxes (spaced-repetition flavour) while keeping some variety.
 */
function kkComposeRound(pool, masteryMap, count) {
  const scored = pool.map((item) => ({
    item,
    box: kkMasteryEntry(masteryMap, item).box,
    r: Math.random(),
  }));
  scored.sort((a, b) => a.box - b.box || a.r - b.r);
  const needPractice = scored.slice(0, Math.ceil(count * 0.7));
  const rest = scored.slice(Math.ceil(count * 0.7));
  let chosen = needPractice.concat(rest).slice(0, Math.min(count, scored.length));
  // A pool smaller than the round size (home row's 8 keys, for a 10-item
  // round) fills the rest by cycling the same need-weighted order rather
  // than shrinking the round — a beginner still gets a full-length round.
  let cursor = 0;
  while (chosen.length < count) {
    chosen.push(scored[cursor % scored.length]);
    cursor++;
  }
  // shuffle so "needs practice" items aren't all front-loaded
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }
  return chosen.map((c) => c.item);
}
