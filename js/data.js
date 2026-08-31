/**
 * Keyboard King — content data.
 *
 * Four levels, easiest to hardest. `letters` and `homerow` both write into
 * the same per-character mastery map (`mastery.keys`) — they are two views
 * onto one skill, not two separate trackers, so the keyboard map on the
 * Kingdom Map screen reflects practice from either level.
 */

const KK_HOMEROW = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];

const KK_ALL_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

const KK_WORDS = [
  'cat', 'dog', 'sun', 'hat', 'run', 'big', 'red', 'top', 'fun', 'map',
  'pen', 'cup', 'box', 'key', 'bee', 'ant', 'owl', 'fox', 'bat', 'pig',
  'log', 'jam', 'van', 'zip', 'mix', 'wow', 'kid', 'mom', 'dad', 'boy',
  'joy', 'wag', 'hug', 'sit', 'jump', 'play', 'book', 'frog', 'star',
  'moon', 'king', 'fish', 'milk', 'cake', 'bird', 'ball', 'tree', 'kite',
  'lion', 'crown', 'happy', 'brave', 'magic', 'castle', 'dragon', 'knight',
];

const KK_SENTENCES = [
  'the cat runs fast',
  'i like cake',
  'the sun is hot',
  'we play games',
  'dogs like to dig',
  'kings wear crowns',
  'type fast and have fun',
  'the fox jumps high',
  'birds can fly',
  'she reads a book',
  'the dragon is friendly',
  'we build a castle',
  'my dog can jump',
  'the moon is bright',
  'we are having fun',
];

/** Standard touch-typing finger chart, letters only. */
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
  p: { hand: 'right', finger: 'pinky' }, ';': { hand: 'right', finger: 'pinky' },
  ' ': { hand: 'either', finger: 'thumb' },
};

const KK_FINGER_LABEL = {
  pinky: 'pinky finger', ring: 'ring finger', middle: 'middle finger',
  index: 'pointer finger', thumb: 'thumb',
};

/** QWERTY rows for the on-screen keyboard + Kingdom Map, home row marked. */
const KK_KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
];

const KK_LEVELS = [
  { id: 'homerow', name: 'Home Row', icon: '🏠', tagline: 'Start on a s d f  j k l ;', pool: KK_HOMEROW, kind: 'char', masteryKey: 'keys' },
  { id: 'letters', name: 'All Letters', icon: '🔤', tagline: 'Every letter, a to z', pool: KK_ALL_LETTERS, kind: 'char', masteryKey: 'keys' },
  { id: 'words', name: 'Words', icon: '📝', tagline: 'Short, friendly words', pool: KK_WORDS, kind: 'text', masteryKey: 'words' },
  { id: 'sentences', name: 'Sentences', icon: '📜', tagline: 'Full royal decrees', pool: KK_SENTENCES, kind: 'text', masteryKey: 'sentences' },
];

const KK_AVATARS = [
  { id: 'knight', icon: '🤴', label: 'Knight' },
  { id: 'princess', icon: '👸', label: 'Royal' },
  { id: 'wizard', icon: '🧙', label: 'Wizard' },
  { id: 'elf', icon: '🧝', label: 'Ranger' },
  { id: 'dragon', icon: '🐉', label: 'Dragon' },
  { id: 'unicorn', icon: '🦄', label: 'Unicorn' },
];

const KK_ROUND_SIZE = 10;
