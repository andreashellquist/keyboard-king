/**
 * Guarded localStorage persistence — every read is sanitised, not just
 * migrated ones, so a corrupt or hand-edited value can only ever fall back
 * to a safe default. See math-champions/src/game/storage.js for the sibling
 * version of this pattern (that project's `parseInt(raw)` with no guard bug
 * is exactly what this guards against).
 */

const KK_STORAGE_KEY = 'kk_state';
const KK_STORAGE_VERSION = 1;

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
    avatar: 'knight',
    muted: false,
    unlocked: ['homerow'],
    bestStars: { homerow: 0, letters: 0, words: 0, sentences: 0 },
    mastery: { keys: {}, words: {}, sentences: {} },
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

  return {
    v: KK_STORAGE_VERSION,
    crowns: kkClampCount(raw.crowns),
    avatar: knownAvatarIds.includes(raw.avatar) ? raw.avatar : fallback.avatar,
    muted: raw.muted === true,
    unlocked,
    bestStars,
    mastery: {
      keys: kkSanitizeMasteryMap(raw.mastery && raw.mastery.keys),
      words: kkSanitizeMasteryMap(raw.mastery && raw.mastery.words),
      sentences: kkSanitizeMasteryMap(raw.mastery && raw.mastery.sentences),
    },
  };
}

function kkSaveState(state) {
  try {
    localStorage.setItem(KK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — progress just won't persist this session */
  }
}
