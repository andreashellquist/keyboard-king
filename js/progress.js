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
  { id: 'igang',   name: 'Igång',         icon: '🐣', ratio: 0 },
  { id: 'spira',   name: 'Spira',         icon: '🌱', ratio: 1.10 },
  { id: 'faril',   name: 'Fjärilsfart',   icon: '🦋', ratio: 1.25 },
  { id: 'tassar',  name: 'Snabba tassar', icon: '🐇', ratio: 1.50 },
  { id: 'vind',    name: 'Vindsnabb',     icon: '🦅', ratio: 1.80 },
  { id: 'kunglig', name: 'Kunglig fart',  icon: '👑', ratio: 2.20 },
];

/**
 * Accuracy tiers. The cutoff compares `bestFirstTry` (0–1). Every rung is
 * reachable with no speed requirement at all — framed as first-try
 * success, never as an error rate, never in red.
 */
const KK_ACC_TIERS = [
  { id: 'spar',   name: 'På rätt spår',    icon: '✋', ratio: 0.50 },
  { id: 'blick',  name: 'Skarp blick',     icon: '🎯', ratio: 0.70 },
  { id: 'rena',   name: 'Rena tangenter',  icon: '💎', ratio: 0.85 },
  { id: 'felfri', name: 'Felfritt anslag', icon: '🌟', ratio: 0.95 },
];

/** Highest tier index whose `ratio` cutoff `value` has reached. */
function kkTierFromRatio(tiers, value) {
  let idx = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (Number.isFinite(value) && value >= tiers[i].ratio) idx = i;
  }
  return idx;
}
function kkSpeedTierFromRatio(r) { return kkTierFromRatio(KK_SPEED_TIERS, r); }
function kkAccTierFromRatio(a) { return kkTierFromRatio(KK_ACC_TIERS, a); }

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
    speedTierUp: 0,
    accTierUp: 0,
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

  const sTier = st.baselineCps > 0 ? kkSpeedTierFromRatio(st.bestCps / st.baselineCps) : 0;
  if (sTier > st.speedTier) { out.speedTierUp = sTier; st.speedTier = sTier; }
  const aTier = kkAccTierFromRatio(st.bestFirstTry);
  if (aTier > st.accTier) { out.accTierUp = aTier; st.accTier = aTier; }

  out.speedTierNow = st.speedTier;
  out.accTierNow = st.accTier;

  // Milestones (§3.5) and tier crown bonuses (§3.4) are Phase 2/3 — left
  // unpaid here on purpose so this phase changes nothing a child can see.
  return out;
}
