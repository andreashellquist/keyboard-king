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
  'sol', 'is', 'os', 'ko', 'få', 'ny', 'bi', 'ål', 'ägg', 'apa',
  'hund', 'katt', 'bil', 'hus', 'bok', 'boll', 'fisk', 'get', 'gris', 'häst',
  'mus', 'orm', 'fågel', 'björn', 'lejon', 'mjölk', 'kaka', 'glass', 'saft', 'ost',
  'sova', 'leka', 'hoppa', 'springa', 'rita', 'sjunga', 'skratta', 'krona', 'kung', 'slott',
  'drake', 'riddare', 'magi', 'modig', 'glad', 'stjärna', 'måne', 'träd', 'blomma', 'vatten',
  'snäll', 'stark', 'snabb', 'fin', 'stor', 'liten',
];

const KK_SENTENCES = [
  'katten springer fort',
  'jag gillar kaka',
  'solen är varm',
  'vi leker spel',
  'hundar gillar att gräva',
  'kungar bär kronor',
  'vi skriver och har kul',
  'räven hoppar högt',
  'fåglar kan flyga',
  'hon läser en bok',
  'draken är snäll',
  'vi bygger ett slott',
  'min hund kan hoppa',
  'månen lyser klart',
  'vi har jättekul',
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
  { id: 'words', name: 'Ord', icon: '📝', tagline: 'Korta, snälla ord', pool: KK_WORDS, kind: 'text', masteryKey: 'words' },
  { id: 'sentences', name: 'Meningar', icon: '📜', tagline: 'Hela kungliga meningar', pool: KK_SENTENCES, kind: 'text', masteryKey: 'sentences' },
];

const KK_AVATARS = [
  { id: 'knight', icon: '🤴', label: 'Prins' },
  { id: 'princess', icon: '👸', label: 'Prinsessa' },
  { id: 'wizard', icon: '🧙', label: 'Trollkarl' },
  { id: 'elf', icon: '🧝', label: 'Alv' },
  { id: 'dragon', icon: '🐉', label: 'Drake' },
  { id: 'unicorn', icon: '🦄', label: 'Enhörning' },
];

const KK_ROUND_SIZE = 10;
