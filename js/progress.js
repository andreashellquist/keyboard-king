/**
 * Keyboard King — progression: per-level speed/accuracy tiers and the
 * once-per-round recorder that ratchets personal bests.
 *
 * Load order: AFTER js/data.js (needs KK_SPEED_FLOOR) and BEFORE
 * js/storage.js (kkLoadState sanitises stored tiers with the tier
 * functions here). Nothing in this file renders anything — Phase 1
 * records silently; a later phase reads profile.stats to show it.
 *
 * See docs/PROGRESSION.md for the full design and the phase plan.
 */

/**
 * Speed tiers. The cutoff compares `bestCps / baselineCps` — the child's
 * own first clean round is the yardstick, so a slow improver climbs the
 * exact same ladder as a fast one (8→10 wpm and 20→25 wpm both = 1.25).
 * Index 0 just means "a baseline round exists".
 */
const KK_SPEED_TIERS = [
  { id: 'nykomling', name: 'Nykomling',     icon: '🐣', ratio: 0 },
  { id: 'startklar', name: 'Startklar',     icon: '👟', ratio: 1.10 },
  { id: 'kvick',     name: 'Kvick',         icon: '⚡', ratio: 1.25 },
  { id: 'vindsnabb', name: 'Vindsnabb',     icon: '🏃', ratio: 1.50 },
  { id: 'turbo',     name: 'Turbo',         icon: '🚀', ratio: 1.80 },
  { id: 'stjarna',   name: 'Världsstjärna', icon: '⭐', ratio: 2.20 },
];

/**
 * Accuracy tiers. The cutoff compares `bestFirstTry` (0–1). Every rung is
 * reachable with no speed requirement at all — framed as first-try
 * success, never as an error rate, never in red.
 */
const KK_ACC_TIERS = [
  { id: 'traffsaker', name: 'Träffsäker',    icon: '🎯', ratio: 0.50 },
  { id: 'skarpskytt', name: 'Skarpskytt',    icon: '⚽', ratio: 0.70 },
  { id: 'prickskytt', name: 'Prickskytt',    icon: '💎', ratio: 0.85 },
  { id: 'felfri',     name: 'Felfri teknik', icon: '🌟', ratio: 0.95 },
];

/**
 * Crown bonus for reaching each tier rung, index-aligned to the tier
 * arrays (docs/PROGRESSION.md §3.4). Paid once per rung, ever, per level.
 * Accuracy ≥ speed at every ordinal; top accuracy (30) > top speed (20).
 */
const KK_SPEED_TIER_CROWNS = [2, 4, 6, 10, 14, 20];
const KK_ACC_TIER_CROWNS = [5, 10, 18, 30];

/** Sum of `table[fromExclusive+1 .. toInclusive]`. */
function kkSumRungCrowns(table, fromExclusive, toInclusive) {
  let sum = 0;
  for (let i = Math.max(0, fromExclusive + 1); i <= toInclusive; i++) sum += table[i] || 0;
  return sum;
}

/**
 * One-time milestones (docs/PROGRESSION.md §3.5). Global, cross-level,
 * cross-session. Each pays once, ever — `profile.stats.milestonesPaid`
 * holds the ids already awarded.
 */
const KK_ROUND_MILESTONES = [
  { at: 5, id: 'rounds5', crowns: 5, label: '5 matcher spelade' },
  { at: 10, id: 'rounds10', crowns: 10, label: '10 matcher spelade' },
  { at: 25, id: 'rounds25', crowns: 15, label: '25 matcher spelade' },
  { at: 50, id: 'rounds50', crowns: 25, label: '50 matcher spelade' },
  { at: 100, id: 'rounds100', crowns: 40, label: '100 matcher spelade' },
];
// (§3.5 also lists a 20-streak milestone, but a round is KK_ROUND_SIZE = 10
//  items, so the reachable streak milestones are 5 and 10.)
const KK_STREAK_MILESTONES = [
  { at: 5, id: 'streak5', crowns: 5, label: '5 i rad utan miss' },
  { at: 10, id: 'streak10', crowns: 12, label: 'hela matchen felfritt' },
];

/** Highest tier index whose `ratio` cutoff `value` has reached, or -1 for
 *  "below the first rung". (Speed tier 0 has cutoff 0, so any qualifying
 *  round clears it; accuracy tier 0 needs 0.50 first-try.) */
function kkTierFromRatio(tiers, value) {
  let idx = -1;
  for (let i = 0; i < tiers.length; i++) {
    if (Number.isFinite(value) && value >= tiers[i].ratio) idx = i;
  }
  return idx;
}
function kkSpeedTierFromRatio(r) { return kkTierFromRatio(KK_SPEED_TIERS, r); }
function kkAccTierFromRatio(a) { return kkTierFromRatio(KK_ACC_TIERS, a); }

/**
 * "Steady hands" check (docs/PROGRESSION.md §5 Phase 4). Looks at the
 * per-character time of each item in the round; a low coefficient of
 * variation means an even rhythm rather than lurching. Text levels only —
 * char-level items complete in the same tick they start, so their times
 * carry no rhythm signal. Returns { steady, cv }.
 */
function kkRoundSmoothness(itemTimes, itemLengths, firstTryRatio) {
  const perChar = [];
  for (let i = 0; i < itemTimes.length; i++) {
    const len = Math.max(1, itemLengths[i] || 1);
    const t = itemTimes[i] / len;
    if (t > 25) perChar.push(t); // drop near-instant (char levels, fluke keys)
  }
  if (perChar.length < 6) return { steady: false, cv: null };
  const mean = perChar.reduce((a, b) => a + b, 0) / perChar.length;
  if (mean <= 0) return { steady: false, cv: null };
  const variance = perChar.reduce((a, b) => a + (b - mean) * (b - mean), 0) / perChar.length;
  const cv = Math.sqrt(variance) / mean;
  return { steady: cv < 0.45 && firstTryRatio >= 0.7, cv };
}

/**
 * How full the speed pace-ribbon should be and what it points at, from a
 * per-level stat record. The bar only ever fills; at the top tier it is
 * full and static.
 */
function kkSpeedPace(st) {
  const tiers = KK_SPEED_TIERS;
  const idx = Math.max(0, Math.min(tiers.length - 1, st.speedTier));
  const cur = tiers[idx];
  const atTop = idx >= tiers.length - 1;
  const next = atTop ? null : tiers[idx + 1];

  let fill = 0.04;
  if (atTop) {
    fill = 1;
  } else if (st.baselineCps > 0 && st.bestCps > 0) {
    const r = st.bestCps / st.baselineCps;
    const lo = idx === 0 ? 1.0 : cur.ratio; // tier 0's floor is "no improvement yet"
    const hi = next.ratio;
    fill = hi > lo ? (r - lo) / (hi - lo) : 0.04;
  }
  fill = Math.max(0.04, Math.min(1, fill));
  return { idx, cur, next, atTop, fill };
}

/**
 * Record one finished round into `profile.stats`. Every write is monotonic
 * (max / append / count-up) except `lastCps`, which only feeds the soft
 * "a little faster than last time" line and never carries a penalty.
 *
 * `cps` = correct chars per second of *active* typing time. A round only
 * updates the speed best when `firstTryRatio >= KK_SPEED_FLOOR`, so a
 * mashed round can never buy a speed tier.
 *
 * Returns what changed this round. Phase 1 ignores the return value;
 * milestone + crown-bonus fields are stubbed for Phase 2/3.
 */
function kkRecordRound(profile, levelId, { cps, firstTryRatio, bestStreak, itemCount }) {
  const s = profile.stats;
  const st = s.perLevel[levelId] || (s.perLevel[levelId] = kkDefaultLevelStat());

  st.roundsPlayed += 1;
  s.roundsTotal += 1;
  s.itemsTotal += Number(itemCount) || 0;

  const out = {
    faster: false,
    newBestCps: false,
    newBestFirstTry: false,
    newBestStreak: false,
    speedRungReached: -1, // tier idx newly reached + paid this round, or -1
    accRungReached: -1,
    speedBonus: 0,        // crowns paid for speed rung(s) crossed this round
    accBonus: 0,
    milestonesHit: [],
    bonusCrowns: 0,
    speedTierNow: st.speedTier,
    accTierNow: st.accTier,
  };

  // 50 cps ≈ 600 wpm — a sanity ceiling matching storage's clamp, so the
  // saved value is never something a load would have to correct.
  if (Number.isFinite(cps) && cps > 50) cps = 50;

  const qualifies = firstTryRatio >= KK_SPEED_FLOOR && Number.isFinite(cps) && cps > 0;
  if (qualifies) {
    if (st.baselineCps === 0) st.baselineCps = cps;
    out.faster = st.lastCps > 0 && cps > st.lastCps;
    st.lastCps = cps;
    if (cps > st.bestCps) { st.bestCps = cps; out.newBestCps = true; }
  }

  if (firstTryRatio > st.bestFirstTry) { st.bestFirstTry = firstTryRatio; out.newBestFirstTry = true; }
  if (bestStreak > st.bestStreak) { st.bestStreak = bestStreak; out.newBestStreak = true; }
  if (bestStreak > s.bestStreakEver) s.bestStreakEver = bestStreak;

  const sTier = st.baselineCps > 0 ? kkSpeedTierFromRatio(st.bestCps / st.baselineCps) : -1;
  if (sTier > st.speedTier) st.speedTier = sTier;
  const aTier = kkAccTierFromRatio(st.bestFirstTry);
  if (aTier > st.accTier) st.accTier = aTier;

  out.speedTierNow = st.speedTier;
  out.accTierNow = st.accTier;

  // Crown bonuses (§3.4). Tier bonuses pay each newly-crossed rung once —
  // st.speedTierPaid / st.accTierPaid only ratchet up, so a rung can never
  // pay twice even across many rounds.
  let bonus = 0;
  if (sTier > st.speedTierPaid) {
    out.speedBonus = kkSumRungCrowns(KK_SPEED_TIER_CROWNS, st.speedTierPaid, sTier);
    out.speedRungReached = sTier;
    st.speedTierPaid = sTier;
    bonus += out.speedBonus;
  }
  if (aTier > st.accTierPaid) {
    out.accBonus = kkSumRungCrowns(KK_ACC_TIER_CROWNS, st.accTierPaid, aTier);
    out.accRungReached = aTier;
    st.accTierPaid = aTier;
    bonus += out.accBonus;
  }
  // Personal-best "nudge" crowns — only when the matching tier did not rise.
  if (out.newBestCps && out.speedRungReached < 0) bonus += 1;
  if (out.newBestFirstTry && out.accRungReached < 0) bonus += 2;
  if (out.newBestStreak) bonus += 1;

  // One-time milestones (§3.5). Append-only ledger, paid once ever.
  const paid = s.milestonesPaid;
  const checkMilestones = (list, value) => {
    for (const m of list) {
      if (value >= m.at && !paid.includes(m.id)) {
        paid.push(m.id);
        bonus += m.crowns;
        out.milestonesHit.push({ id: m.id, label: m.label, crowns: m.crowns });
      }
    }
  };
  checkMilestones(KK_ROUND_MILESTONES, s.roundsTotal);
  checkMilestones(KK_STREAK_MILESTONES, s.bestStreakEver);

  out.bonusCrowns = bonus;
  return out;
}
