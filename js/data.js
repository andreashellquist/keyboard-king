/**
 * Keyboard King — content data.
 *
 * Everything here assumes a Swedish (SWE) physical keyboard: the home row
 * is a s d f  j k l ö, and å ä ö sit under the right pinky.
 *
 * Four levels, easiest to hardest. `letters` and `homerow` both write into
 * the same per-character mastery map (`mastery.keys`) — they are two views
 * onto one skill, not two separate trackers, so the keyboard map on the
 * Kingdom Map screen reflects practice from either level.
 */

const KK_HOMEROW = ['a', 's', 'd', 'f', 'j', 'k', 'l', 'ö'];

const KK_ALL_LETTERS = 'abcdefghijklmnopqrstuvwxyzåäö'.split('');

const KK_WORDS = [
  'boll', 'mål', 'lag', 'spel', 'plan', 'pass', 'nick', 'cup', 'byte', 'skott',
  'hörna', 'straff', 'match', 'seger', 'tröja', 'kanon', 'domare', 'anfall', 'försvar', 'publik',
  'löpa', 'sparka', 'passa', 'nicka', 'rädda', 'jubla', 'träna', 'vinna', 'spela', 'dribbla',
  'snabb', 'stark', 'taggad', 'sugen', 'glad', 'läktare', 'spelare', 'huvudet', 'gräset', 'planen',
  'frispark', 'inkast', 'omgång', 'poäng', 'final', 'pokal', 'tackling', 'lagkapten',
];

const KK_SENTENCES = [
  'vi vann matchen',
  'han gjorde mål',
  'bollen rullar fort',
  'laget tränar hårt',
  'domaren blåser av',
  'hon sparkar en hörna',
  'vi spelar final idag',
  'målvakten räddar bollen',
  'publiken jublar högt',
  'jag passar bollen till dig',
  'spelaren springer snabbt',
  'kaptenen lyfter pokalen',
  'tröjan är blå och gul',
  'alla springer mot mål',
  'vi ligger under med ett mål',
];

/** Swedish (SWE) touch-typing finger chart. å ä ö and - are right pinky. */
const KK_FINGER_MAP = {
  q: { hand: 'left', finger: 'pinky' }, a: { hand: 'left', finger: 'pinky' }, z: { hand: 'left', finger: 'pinky' },
  w: { hand: 'left', finger: 'ring' }, s: { hand: 'left', finger: 'ring' }, x: { hand: 'left', finger: 'ring' },
  e: { hand: 'left', finger: 'middle' }, d: { hand: 'left', finger: 'middle' }, c: { hand: 'left', finger: 'middle' },
  r: { hand: 'left', finger: 'index' }, f: { hand: 'left', finger: 'index' }, v: { hand: 'left', finger: 'index' },
  t: { hand: 'left', finger: 'index' }, g: { hand: 'left', finger: 'index' }, b: { hand: 'left', finger: 'index' },
  y: { hand: 'right', finger: 'index' }, h: { hand: 'right', finger: 'index' }, n: { hand: 'right', finger: 'index' },
  u: { hand: 'right', finger: 'index' }, j: { hand: 'right', finger: 'index' }, m: { hand: 'right', finger: 'index' },
  i: { hand: 'right', finger: 'middle' }, k: { hand: 'right', finger: 'middle' }, ',': { hand: 'right', finger: 'middle' },
  o: { hand: 'right', finger: 'ring' }, l: { hand: 'right', finger: 'ring' }, '.': { hand: 'right', finger: 'ring' },
  p: { hand: 'right', finger: 'pinky' },
  'å': { hand: 'right', finger: 'pinky' }, 'ä': { hand: 'right', finger: 'pinky' },
  'ö': { hand: 'right', finger: 'pinky' }, '-': { hand: 'right', finger: 'pinky' },
  ' ': { hand: 'either', finger: 'thumb' },
};

const KK_FINGER_LABEL = {
  pinky: 'lillfingret', ring: 'ringfingret', middle: 'långfingret',
  index: 'pekfingret', thumb: 'tummen',
};

/** Swedish (SWE) keyboard rows for the on-screen keyboard + Kingdom Map, home row marked. */
const KK_KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'å'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-'],
];

/**
 * Home-row resting positions, left to right, for the finger guide screen.
 * The F and J bumps are the anchors a touch typist finds without looking.
 */
const KK_HOME_BASE = [
  { key: 'a', hand: 'left', finger: 'pinky' },
  { key: 's', hand: 'left', finger: 'ring' },
  { key: 'd', hand: 'left', finger: 'middle' },
  { key: 'f', hand: 'left', finger: 'index', bump: true },
  { key: 'j', hand: 'right', finger: 'index', bump: true },
  { key: 'k', hand: 'right', finger: 'middle' },
  { key: 'l', hand: 'right', finger: 'ring' },
  { key: 'ö', hand: 'right', finger: 'pinky' },
];

const KK_LEVELS = [
  { id: 'homerow', name: 'Hemraden', icon: '🏠', tagline: 'Börja på a s d f  j k l ö', pool: KK_HOMEROW, kind: 'char', masteryKey: 'keys' },
  { id: 'letters', name: 'Alla bokstäver', icon: '🔤', tagline: 'Alla bokstäver, a till ö', pool: KK_ALL_LETTERS, kind: 'char', masteryKey: 'keys' },
  { id: 'words', name: 'Ord', icon: '📝', tagline: 'Korta, lätta ord', pool: KK_WORDS, kind: 'text', masteryKey: 'words' },
  { id: 'sentences', name: 'Meningar', icon: '📣', tagline: 'Hela matchreferat', pool: KK_SENTENCES, kind: 'text', masteryKey: 'sentences' },
];

const KK_AVATARS = [
  { id: 'striker',  icon: '⚽', label: 'Anfallare' },
  { id: 'keeper',   icon: '🧤', label: 'Målvakt' },
  { id: 'mid',      icon: '🏃', label: 'Mittfältare' },
  { id: 'defender', icon: '🛡️', label: 'Back' },
  { id: 'dribbler', icon: '👟', label: 'Dribbler' },
  { id: 'captain',  icon: '🏆', label: 'Kapten' },
];

const KK_ROUND_SIZE = 10;

/**
 * Points sink (docs/PROGRESSION.md §3.8). Purely decorative player frames,
 * cheapest first. `css` is a class added to the avatar wrapper. Owning one
 * is permanent; equipping is free; nothing here ever gates content.
 */
const KK_COSMETICS = [
  { id: 'guld',     label: 'Guldram',     price: 20,  css: 'kkf-guld' },
  { id: 'stjarnor', label: 'Stjärnglans', price: 40,  css: 'kkf-stjarnor' },
  { id: 'lagfarg',  label: 'Lagfärger',   price: 70,  css: 'kkf-regnbage' },
  { id: 'form',     label: 'I form',      price: 110, css: 'kkf-eld' },
  { id: 'iskyla',   label: 'Iskyla',      price: 160, css: 'kkf-kristall' },
  { id: 'pokal',    label: 'Pokal',       price: 220, css: 'kkf-pokal' },
];

/* Progression tuning (see docs/PROGRESSION.md). */
const KK_IDLE_CAP_MS = 5000;  // inter-key gaps longer than this don't count as typing time
const KK_SPEED_FLOOR = 0.6;   // a round needs firstTryRatio >= this to set/beat a speed best
