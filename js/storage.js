/**
 * Guarded localStorage persistence — every read is sanitised, not just
 * migrated ones, so a corrupt or hand-edited value can only ever fall back
 * to a safe default. See math-champions/src/game/storage.js for the sibling
 * version of this pattern (that project's `parseInt(raw)` with no guard bug
 * is exactly what this guards against).
 */

const KK_STORAGE_KEY = 'kk_state';
const KK_STORAGE_VERSION = 2;

/**
 * True only if localStorage actually round-trips. It doesn't under the
 * `file://` origin in several browsers, in private windows, or when site
 * data is blocked — in all of those a played round would silently vanish
 * on reload, so the menu shows a "progress won't be saved" note instead.
 */
function kkStorageWorks() {
  try {
    const probe = '__kk_probe__';
    localStorage.setItem(probe, '1');
    const ok = localStorage.getItem(probe) === '1';
    localStorage.removeItem(probe);
    return ok;
  } catch {
    return false;
  }
}

function kkClampBox(n) {
  n = Number(n);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

function kkClampCount(n) {
  n = Number(n);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function kkClampRatio01(n) {
  n = Number(n);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(1, n);
}

// Chars per second. 50 cps ≈ 600 wpm — a hard ceiling against corrupt saves,
// not a real target.
function kkClampCps(n) {
  n = Number(n);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(50, n);
}

function kkDefaultLevelStat() {
  return {
    baselineCps: 0, bestCps: 0, lastCps: 0,
    bestFirstTry: 0, bestStreak: 0, roundsPlayed: 0,
    speedTier: -1, accTier: -1,          // highest tier rung reached (-1 = none)
    speedTierPaid: -1, accTierPaid: -1,  // highest rung whose crown bonus is paid
  };
}

// -1..maxIdx. Absent in a stored record (pre-Phase-2 save) → fall back to
// the current tier, so upgrading never dumps retroactive crown bonuses.
function kkClampTierIdx(raw, fallback, maxIdx) {
  if (raw == null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return -1;
  return Math.max(-1, Math.min(maxIdx, Math.round(n)));
}

/**
 * Sanitise one per-level stat record. Tiers only ever ratchet up: a stored
 * tier is kept, and re-derived from the (clamped) bests in case a cutoff
 * was retuned downward — never demoted.
 */
function kkSanitizeLevelStat(raw) {
  if (!raw || typeof raw !== 'object') return kkDefaultLevelStat();

  let baselineCps = kkClampCps(raw.baselineCps);
  const bestCps = kkClampCps(raw.bestCps);
  if (bestCps > 0 && baselineCps === 0) baselineCps = bestCps; // never divide by zero later
  const bestFirstTry = kkClampRatio01(raw.bestFirstTry);

  let speedTier = kkClampTierIdx(raw.speedTier, -1, KK_SPEED_TIERS.length - 1);
  let accTier = kkClampTierIdx(raw.accTier, -1, KK_ACC_TIERS.length - 1);
  // Tiers only ever ratchet up — re-derive from the (clamped) bests in case
  // a cutoff was retuned downward, but never demote a stored tier.
  if (baselineCps > 0) speedTier = Math.max(speedTier, kkSpeedTierFromRatio(bestCps / baselineCps));
  accTier = Math.max(accTier, kkAccTierFromRatio(bestFirstTry));

  let speedTierPaid = kkClampTierIdx(raw.speedTierPaid, speedTier, KK_SPEED_TIERS.length - 1);
  let accTierPaid = kkClampTierIdx(raw.accTierPaid, accTier, KK_ACC_TIERS.length - 1);
  speedTierPaid = Math.min(speedTierPaid, speedTier); // can't have paid a rung not yet reached
  accTierPaid = Math.min(accTierPaid, accTier);

  return {
    baselineCps,
    bestCps,
    lastCps: kkClampCps(raw.lastCps),
    bestFirstTry,
    bestStreak: Math.min(KK_ROUND_SIZE, kkClampCount(raw.bestStreak)),
    roundsPlayed: kkClampCount(raw.roundsPlayed),
    speedTier,
    accTier,
    speedTierPaid,
    accTierPaid,
  };
}

function kkSanitizeMasteryMap(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of Object.keys(raw)) {
    const entry = raw[key];
    if (!entry || typeof entry !== 'object') continue;
    out[key] = { box: kkClampBox(entry.box), seen: kkClampCount(entry.seen) };
  }
  return out;
}

function kkDefaultState() {
  return {
    v: KK_STORAGE_VERSION,
    crowns: 0,
    avatar: 'striker',
    muted: false,
    seenFingerGuide: false,
    unlocked: ['homerow'],
    bestStars: { homerow: 0, letters: 0, words: 0, sentences: 0 },
    mastery: { keys: {}, words: {}, sentences: {} },
    stats: {
      perLevel: {
        homerow: kkDefaultLevelStat(), letters: kkDefaultLevelStat(),
        words: kkDefaultLevelStat(), sentences: kkDefaultLevelStat(),
      },
      roundsTotal: 0, itemsTotal: 0, bestStreakEver: 0,
      milestonesPaid: [],
      keyTimes: {}, // char -> fastest clean reaction time in ms (Kingdom Map)
    },
    cosmetics: { owned: [], equipped: null }, // ships empty; used from Phase 3
  };
}

function kkLoadState() {
  const fallback = kkDefaultState();
  let raw;
  try {
    raw = JSON.parse(localStorage.getItem(KK_STORAGE_KEY) || 'null');
  } catch {
    return fallback;
  }
  if (!raw || typeof raw !== 'object') return fallback;

  const knownLevelIds = KK_LEVELS.map((l) => l.id);
  const unlocked = Array.isArray(raw.unlocked)
    ? raw.unlocked.filter((id) => knownLevelIds.includes(id))
    : [];
  if (!unlocked.includes('homerow')) unlocked.unshift('homerow');

  const bestStars = {};
  for (const id of knownLevelIds) {
    const v = raw.bestStars && raw.bestStars[id];
    bestStars[id] = Math.max(0, Math.min(3, Math.round(Number(v) || 0)));
  }

  const knownAvatarIds = KK_AVATARS.map((a) => a.id);

  const rawStats = (raw.stats && typeof raw.stats === 'object') ? raw.stats : {};
  const stats = {
    perLevel: {},
    roundsTotal: kkClampCount(rawStats.roundsTotal),
    itemsTotal: kkClampCount(rawStats.itemsTotal),
    bestStreakEver: Math.min(KK_ROUND_SIZE, kkClampCount(rawStats.bestStreakEver)),
    milestonesPaid: Array.isArray(rawStats.milestonesPaid)
      ? [...new Set(rawStats.milestonesPaid.filter((x) => typeof x === 'string'))]
      : [],
    keyTimes: {},
  };
  for (const id of knownLevelIds) {
    stats.perLevel[id] = kkSanitizeLevelStat(rawStats.perLevel && rawStats.perLevel[id]);
  }
  if (rawStats.keyTimes && typeof rawStats.keyTimes === 'object') {
    for (const k of Object.keys(rawStats.keyTimes)) {
      const ms = Number(rawStats.keyTimes[k]);
      if (Number.isFinite(ms) && ms >= 1 && ms <= 60000) stats.keyTimes[k] = Math.round(ms);
    }
  }

  const knownCosmeticIds = (typeof KK_COSMETICS !== 'undefined') ? KK_COSMETICS.map((c) => c.id) : [];
  const rawCos = (raw.cosmetics && typeof raw.cosmetics === 'object') ? raw.cosmetics : {};
  const owned = Array.isArray(rawCos.owned)
    ? [...new Set(rawCos.owned.filter((x) => knownCosmeticIds.includes(x)))]
    : [];
  const cosmetics = { owned, equipped: owned.includes(rawCos.equipped) ? rawCos.equipped : null };

  return {
    v: KK_STORAGE_VERSION,
    crowns: kkClampCount(raw.crowns),
    avatar: knownAvatarIds.includes(raw.avatar) ? raw.avatar : fallback.avatar,
    muted: raw.muted === true,
    seenFingerGuide: raw.seenFingerGuide === true,
    unlocked,
    bestStars,
    mastery: {
      keys: kkSanitizeMasteryMap(raw.mastery && raw.mastery.keys),
      words: kkSanitizeMasteryMap(raw.mastery && raw.mastery.words),
      sentences: kkSanitizeMasteryMap(raw.mastery && raw.mastery.sentences),
    },
    stats,
    cosmetics,
  };
}

function kkSaveState(state) {
  try {
    localStorage.setItem(KK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — progress just won't persist this session */
  }
}
