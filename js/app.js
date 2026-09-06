/**
 * Keyboard King — app shell: screens, round state machine, event wiring.
 * No framework, no build step — plain DOM strings + delegated listeners.
 */

const PRAISE = ['Bra jobbat!', 'Toppen!', 'Du fixade det!', 'Snyggt skrivet!', 'Super!', 'Kungligt!', 'Vad bra!'];

let PROFILE = kkLoadState();
let ROUND = null; // transient round state, see startRound()
let SCREEN = 'menu';
const STORAGE_OK = kkStorageWorks();

const appEl = document.getElementById('app');

function saveProfile() { kkSaveState(PROFILE); }

function levelById(id) { return KK_LEVELS.find((l) => l.id === id); }
function levelIndex(id) { return KK_LEVELS.findIndex((l) => l.id === id); }

function masteryMapFor(level) { return PROFILE.mastery[level.masteryKey]; }

function starsMarkup(n, max = 3) {
  let s = '';
  for (let i = 0; i < max; i++) s += i < n ? '⭐' : '☆';
  return s;
}

/* ───────────────────────── MENU ───────────────────────── */

function renderMenu() {
  SCREEN = 'menu';
  ROUND = null;
  appEl.innerHTML = `
    <h1 class="title">⌨️👑 Tangentbordskungen</h1>
    <p class="subtitle">Träna på att skriva – bli kung över tangentbordet!</p>
    ${STORAGE_OK ? '' : `
      <p class="save-warn" role="status">
        ⚠️ Det går inte att spara här. Öppna spelet från en webbadress
        (http/https), inte en fil, så att dina kronor sparas.
      </p>`}

    <div class="avatar-row" role="group" aria-label="Välj din figur">
      ${KK_AVATARS.map((a) => `
        <button class="avatar-btn ${a.id === PROFILE.avatar ? 'selected' : ''}" data-avatar="${a.id}" aria-pressed="${a.id === PROFILE.avatar}">
          <span aria-hidden="true">${a.icon}</span>
          <span class="avatar-label">${a.label}</span>
        </button>`).join('')}
    </div>

    <div class="stats-pill">
      <span>👑 <b>${PROFILE.crowns}</b> kronor</span>
    </div>

    <button class="btn btn-gold" id="btn-play">Spela</button>
    <div class="menu-links">
      <button class="link-btn" id="btn-fingers">✋ Fingerguide</button>
      <button class="link-btn" id="btn-map">🗺️ Kungarikeskarta</button>
      <button class="icon-btn" id="btn-mute" aria-pressed="${PROFILE.muted}" aria-label="${PROFILE.muted ? 'Sätt på ljud' : 'Stäng av ljud'}">${PROFILE.muted ? '🔇' : '🔊'}</button>
    </div>
    <button class="link-btn tiny" id="btn-reset">Nollställ framsteg</button>
  `;

  appEl.querySelectorAll('[data-avatar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      PROFILE.avatar = btn.dataset.avatar;
      saveProfile();
      renderMenu();
    });
  });
  document.getElementById('btn-play').addEventListener('click', renderLevels);
  document.getElementById('btn-fingers').addEventListener('click', () => renderFingerGuide());
  document.getElementById('btn-map').addEventListener('click', renderMap);
  document.getElementById('btn-mute').addEventListener('click', () => {
    PROFILE.muted = !PROFILE.muted;
    KKSfx.setMuted(PROFILE.muted);
    saveProfile();
    renderMenu();
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (window.confirm('Nollställa alla framsteg? Det går inte att ångra.')) {
      PROFILE = kkDefaultState();
      saveProfile();
      renderMenu();
    }
  });
}

/* ───────────────────────── LEVEL SELECT ───────────────────────── */

function renderLevels() {
  SCREEN = 'levels';
  const cards = KK_LEVELS.map((level, i) => {
    const unlocked = PROFILE.unlocked.includes(level.id);
    const stars = PROFILE.bestStars[level.id] || 0;
    const prevName = i > 0 ? KK_LEVELS[i - 1].name : '';
    return `
      <button class="level-card ${unlocked ? '' : 'locked'}" data-level="${level.id}" ${unlocked ? '' : 'disabled'}>
        <span class="level-icon" aria-hidden="true">${level.icon}</span>
        <span class="level-name">${level.name}</span>
        <span class="level-tagline">${level.tagline}</span>
        ${unlocked
          ? `<span class="level-stars">${stars ? starsMarkup(stars) : ' '}</span>`
          : `<span class="level-lock-msg">🔒 Klara ${prevName} först</span>`}
      </button>`;
  }).join('');

  appEl.innerHTML = `
    <h1 class="title">Välj ett kungarike</h1>
    <p class="subtitle">Välj var du vill träna idag</p>
    <div class="level-grid">${cards}</div>
    <button class="link-btn" id="btn-back">← Tillbaka</button>
  `;

  appEl.querySelectorAll('[data-level]:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => startRound(btn.dataset.level));
  });
  document.getElementById('btn-back').addEventListener('click', renderMenu);
}

/* ───────────────────────── FINGER GUIDE ───────────────────────── */

/**
 * How to place your hands before you type a single key. Reachable any time
 * from the menu, and shown once automatically before the first Home Row
 * round (`onContinue` is the "now start the round" callback in that case).
 */
function renderFingerGuide(onContinue) {
  SCREEN = 'fingerguide';
  ROUND = null;

  const shortFinger = { pinky: 'lill<wbr>finger', ring: 'ring<wbr>finger', middle: 'lång<wbr>finger', index: 'pek<wbr>finger' };
  const keyCells = KK_HOME_BASE.map((p, i) => `
    <div class="fg-key ${p.bump ? 'bump' : ''} ${i === 4 ? 'split' : ''}">
      <span class="fg-cap">${p.key === 'ö' ? 'Ö' : p.key.toUpperCase()}</span>
      <span class="fg-finger">${shortFinger[p.finger]}</span>
    </div>`).join('');

  appEl.innerHTML = `
    <h1 class="title">✋ Fingrarnas hemmaplan</h1>
    <p class="subtitle">Här bor dina fingrar. Kom alltid tillbaka hit.</p>

    <div class="fg-hands">
      <div class="fg-hand-labels">
        <span>Vänster hand</span>
        <span>Höger hand</span>
      </div>
      <div class="fg-row">${keyCells}</div>
    </div>
    <p class="fg-thumbs">Båda tummarna vilar på <b>mellanslag</b> 👍</p>

    <ul class="fg-tips">
      <li>Känn den lilla kanten på <b>F</b> och <b>J</b> – så hittar du hem utan att titta.</li>
      <li>Böj fingrarna mjukt, som när du håller en liten boll.</li>
      <li>Sträck dig efter en tangent långt bort, och låt fingret falla rakt tillbaka till sin hemtangent.</li>
      <li>Försök att inte kika på tangentbordet – låt fingrarna komma ihåg.</li>
    </ul>

    <button class="btn btn-gold" id="fg-go">${onContinue ? 'Börja skriva →' : 'Okej!'}</button>
  `;

  document.getElementById('fg-go').addEventListener('click', onContinue || renderMenu);
}

/* ───────────────────────── GAME ROUND ───────────────────────── */

function startRound(levelId) {
  // First time into Home Row: teach the hand position before any typing.
  if (levelId === 'homerow' && !PROFILE.seenFingerGuide) {
    renderFingerGuide(() => {
      PROFILE.seenFingerGuide = true;
      saveProfile();
      beginRound(levelId);
    });
    return;
  }
  beginRound(levelId);
}

function beginRound(levelId) {
  const level = levelById(levelId);
  const masteryMap = masteryMapFor(level);
  const items = kkComposeRound(level.pool, masteryMap, KK_ROUND_SIZE);
  ROUND = {
    levelId,
    level,
    items,
    index: 0,
    typedIndex: 0,
    missCount: 0,
    dotStates: items.map(() => 'pending'),
    streak: 0,
    tally: { first: 0, retry: 0, struggle: 0 },
    touchedItems: [],
    feedback: null,
    hint: null,
    shakeToken: 0,
    pendingAdvance: false,
    advanceTimer: null,
    // Progression instrumentation (silent — see docs/PROGRESSION.md Phase 1).
    msActive: 0,
    lastKeyAt: 0,
    correctChars: 0,
    itemStartAt: 0,
    itemTimes: [],
    bestStreakThisRound: 0,
  };
  KKSfx.unlock();
  SCREEN = 'game';
  renderGame();
}

function currentItem() { return ROUND.items[ROUND.index]; }
function expectedChar() {
  const item = currentItem();
  return ROUND.level.kind === 'char' ? item : item[ROUND.typedIndex];
}

const KK_HAND_LABEL = { left: 'vänstra', right: 'högra', either: '' };

function buildHint(ch) {
  const info = KK_FINGER_MAP[ch];
  if (!info) return null;
  if (ch === ' ') return 'Tryck på mellanslag med tummen! 👍';
  const label = KK_FINGER_LABEL[info.finger];
  return `Prova med det ${KK_HAND_LABEL[info.hand]} ${label}! 👉`;
}

function handleKeydown(e) {
  if (SCREEN !== 'game' || !ROUND) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (ROUND.pendingAdvance) return; // ignore keystrokes while celebrating

  let key = null;
  if (e.key === ' ' || e.key === 'Spacebar') key = ' ';
  else if (e.key.length === 1) key = e.key.toLowerCase();
  else return;

  if (key === ' ') e.preventDefault();

  // Silent timing capture (docs/PROGRESSION.md Phase 1): sum inter-key gaps,
  // dropping any pause longer than KK_IDLE_CAP_MS so a distracted child is
  // never effectively rushed. Nothing here renders.
  const now = performance.now();
  if (ROUND.lastKeyAt) {
    const gap = now - ROUND.lastKeyAt;
    if (gap <= KK_IDLE_CAP_MS) ROUND.msActive += gap;
  }
  ROUND.lastKeyAt = now;
  if (!ROUND.itemStartAt) ROUND.itemStartAt = now;

  const expected = expectedChar();
  if (key === expected) {
    if (ROUND.level.kind === 'char') {
      ROUND.correctChars++;
      completeItem();
    } else {
      ROUND.correctChars++;
      ROUND.typedIndex++;
      if (ROUND.typedIndex >= currentItem().length) {
        completeItem();
      } else {
        KKSfx.tick();
        ROUND.hint = null;
        renderGame();
      }
    }
  } else {
    ROUND.missCount++;
    ROUND.streak = 0;
    ROUND.shakeToken++;
    ROUND.hint = buildHint(expected);
    KKSfx.miss();
    renderGame();
  }
}

function completeItem() {
  const item = currentItem();
  const outcome = ROUND.missCount === 0 ? 'first' : ROUND.missCount <= 2 ? 'retry' : 'struggle';
  const masteryMap = masteryMapFor(ROUND.level);
  kkUpdateMastery(masteryMap, item, outcome);
  ROUND.touchedItems.push({ item, box: masteryMap[item].box, outcome });
  ROUND.tally[outcome]++;
  ROUND.dotStates[ROUND.index] = outcome === 'first' ? 'first' : 'retry';

  if (ROUND.itemStartAt) ROUND.itemTimes.push(performance.now() - ROUND.itemStartAt);
  ROUND.itemStartAt = 0;

  if (outcome === 'first') {
    ROUND.streak++;
    if (ROUND.streak > ROUND.bestStreakThisRound) ROUND.bestStreakThisRound = ROUND.streak;
    KKSfx.correct();
    if (ROUND.streak === 3 || ROUND.streak === 5 || ROUND.streak >= 8) {
      KKSfx.streak();
      KKConfetti.burst(24);
    }
    ROUND.feedback = { text: PRAISE[Math.floor(Math.random() * PRAISE.length)], cls: 'first' };
  } else {
    ROUND.streak = 0;
    KKSfx.correctRetry();
    ROUND.feedback = { text: 'Bra rättat!', cls: 'retry' };
  }
  ROUND.hint = null;
  ROUND.pendingAdvance = true;
  renderGame();

  const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 350 : 650;
  ROUND.advanceTimer = setTimeout(advance, delay);
}

function advance() {
  clearTimeout(ROUND.advanceTimer);
  ROUND.advanceTimer = null;
  ROUND.pendingAdvance = false;
  ROUND.index++;
  ROUND.typedIndex = 0;
  ROUND.missCount = 0;
  ROUND.itemStartAt = 0; // think-time before the next item is not typing time
  ROUND.feedback = null;
  ROUND.hint = null;
  if (ROUND.index >= ROUND.items.length) finishRound();
  else renderGame();
}

function skipAdvance() {
  if (ROUND && ROUND.pendingAdvance) advance();
}

function finishRound() {
  const { tally, levelId } = ROUND;
  const total = ROUND.items.length;
  const ratio = tally.first / total;
  const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
  const crownsEarned = tally.first * 2 + tally.retry * 1 + tally.struggle * 1;

  PROFILE.crowns += crownsEarned;
  PROFILE.bestStars[levelId] = Math.max(PROFILE.bestStars[levelId] || 0, stars);
  const idx = levelIndex(levelId);
  const next = KK_LEVELS[idx + 1];
  if (next && !PROFILE.unlocked.includes(next.id)) PROFILE.unlocked.push(next.id);

  // Silent progression recording (docs/PROGRESSION.md Phase 1): personal
  // bests + tiers are written to PROFILE.stats but nothing is shown and no
  // bonus crowns are paid yet — that arrives with the result-screen surfaces.
  const secActive = Math.max(ROUND.msActive / 1000, 0.001);
  const cps = ROUND.correctChars / secActive;
  const progressDelta = kkRecordRound(PROFILE, levelId, {
    cps,
    firstTryRatio: ratio,
    bestStreak: ROUND.bestStreakThisRound,
    itemCount: total,
  });
  if (/[?&]debug\b/.test(location.search)) {
    console.log('[kk] round recorded', { cps: cps.toFixed(2), ratio: ratio.toFixed(2), progressDelta, stats: PROFILE.stats.perLevel[levelId] });
  }

  saveProfile();

  KKSfx.roundDone(stars - 1);
  KKConfetti.burst(stars >= 2 ? 90 : 50);

  renderResult({ stars, crownsEarned, levelId, next: next && PROFILE.unlocked.includes(next.id) ? next : null });
}

function renderGame() {
  const level = ROUND.level;
  const item = currentItem();
  const expected = expectedChar();

  const dots = ROUND.dotStates.map((st, i) => {
    const cls = ['rdot', st !== 'pending' ? st : '', i === ROUND.index ? 'current' : ''].filter(Boolean).join(' ');
    return `<span class="${cls}"></span>`;
  }).join('');

  let promptInner;
  if (level.kind === 'char') {
    promptInner = `<div class="prompt-char">${item === ' ' ? '␣' : item}</div>`;
  } else {
    promptInner = `<div class="prompt-text">${item.split('').map((ch, i) => {
      const cls = i < ROUND.typedIndex ? 'done' : i === ROUND.typedIndex ? 'next' : '';
      const displayCh = ch === ' ' ? '&nbsp;' : ch;
      return `<span class="ch ${cls}${ch === ' ' ? ' sp' : ''}">${displayCh}</span>`;
    }).join('')}</div>`;
  }
  const promptHtml = `<div class="prompt-box">${promptInner}</div>`;

  const kbdRows = KK_KEYBOARD_ROWS.map((row) => `
    <div class="kbd-row">
      ${row.map((k) => `<span class="kbd-key ${KK_HOMEROW.includes(k) ? 'home' : ''} ${k === expected ? 'next' : ''}">${k}</span>`).join('')}
    </div>`).join('');
  const spaceRow = level.kind === 'text'
    ? `<div class="kbd-row"><span class="kbd-key ${expected === ' ' ? 'next' : ''}" style="width:min(50vw,240px)">mellanslag</span></div>`
    : '';

  appEl.innerHTML = `
    <div class="top-row">
      <button class="link-btn tiny" id="btn-exit">← Meny</button>
      <span class="streak-chip">🔥 ${ROUND.streak} i rad</span>
    </div>
    <div class="round-bar">
      <span>${level.icon} ${level.name}</span>
      <div class="round-dots" aria-hidden="true">${dots}</div>
    </div>

    <div class="stage" id="stage">
      ${promptHtml}
      ${ROUND.pendingAdvance ? '<p class="skip-hint">tryck för att fortsätta</p>' : ''}
    </div>

    <div class="hint-slot">
      ${ROUND.hint ? `<div class="hint-card">${ROUND.hint}</div>` : ''}
    </div>

    <p class="feedback ${ROUND.feedback ? ROUND.feedback.cls : ''}" aria-live="polite">${ROUND.feedback ? ROUND.feedback.text : ' '}</p>

    <div class="kbd" aria-hidden="true">
      ${kbdRows}
      ${spaceRow}
    </div>
  `;

  const stageEl = document.getElementById('stage');
  if (ROUND.shakeToken) {
    stageEl.classList.add('shake');
    setTimeout(() => stageEl.classList.remove('shake'), 300);
  }
  stageEl.addEventListener('click', skipAdvance);

  document.getElementById('btn-exit').addEventListener('click', () => {
    if (ROUND && ROUND.advanceTimer) clearTimeout(ROUND.advanceTimer);
    renderLevels();
  });
}

/* ───────────────────────── RESULT ───────────────────────── */

function renderResult({ stars, crownsEarned, levelId, next }) {
  SCREEN = 'result';
  const level = levelById(levelId);
  const msg = stars === 3
    ? 'Felfritt! Du är en riktig tangentbordskung.'
    : stars === 2
      ? 'Bra runda – lite mer träning så blir det perfekt.'
      : 'Bra kämpat! Varje runda gör dig bättre.';

  // Only items that actually needed a retry this round — a flawless round
  // shouldn't come with a "but here's what's still wrong" list.
  const troubleByItem = new Map();
  for (const t of ROUND.touchedItems) {
    if (t.outcome === 'first') continue;
    const existing = troubleByItem.get(t.item);
    if (!existing || t.box < existing.box) troubleByItem.set(t.item, t);
  }
  const practice = [...troubleByItem.values()]
    .sort((a, b) => a.box - b.box)
    .slice(0, 3)
    .map((t) => t.item);

  appEl.innerHTML = `
    <div class="result-card">
      <p class="result-title">${level.icon} ${level.name} klar!</p>
      <p class="result-stars">${starsMarkup(stars)}</p>
      <p class="result-crowns">+${crownsEarned} 👑</p>
      <p class="result-msg">${msg}</p>
      ${practice.length ? `
        <div class="practice-block">
          <p class="practice-label">Fortsätt träna på:</p>
          <ul class="practice-list">${practice.map((p) => `<li>${p}</li>`).join('')}</ul>
        </div>` : ''}
      <div class="result-btns">
        <button class="btn btn-gold" id="btn-again">Spela igen</button>
        ${next ? `<button class="btn btn-white" id="btn-next">${next.icon} ${next.name}</button>` : ''}
      </div>
      <button class="link-btn tiny" id="btn-menu" style="margin-top:12px">Till menyn</button>
    </div>
  `;

  document.getElementById('btn-again').addEventListener('click', () => startRound(levelId));
  if (next) document.getElementById('btn-next').addEventListener('click', () => startRound(next.id));
  document.getElementById('btn-menu').addEventListener('click', renderMenu);
}

/* ───────────────────────── KINGDOM MAP ───────────────────────── */

function renderMap() {
  SCREEN = 'map';
  const keys = PROFILE.mastery.keys;

  const rows = KK_KEYBOARD_ROWS.map((row) => `
    <div class="map-key-row">
      ${row.map((k) => {
        const box = (keys[k] && keys[k].box) || 0;
        return `<button class="map-cell" data-key="${k}" data-box="${box}">${k}</button>`;
      }).join('')}
    </div>`).join('');

  appEl.innerHTML = `
    <h1 class="title">🗺️ Kungarikeskarta</h1>
    <p class="subtitle">Alla tangenter du tränat på, som lyser starkare ju mer du kan.</p>
    <div id="map-info-slot"></div>
    ${rows}
    <div class="map-legend">
      <span><i style="background:rgba(255,255,255,.12)"></i>Oövad</span>
      <span><i style="background:#6a5aa0"></i>På gång</span>
      <span><i style="background:#cbb8ec"></i>Stabil</span>
      <span><i style="background:#ffe234"></i>Bemästrad</span>
    </div>
    <button class="link-btn" id="btn-back">← Tillbaka</button>
  `;

  const infoSlot = document.getElementById('map-info-slot');
  appEl.querySelectorAll('.map-cell').forEach((btn) => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.key;
      const entry = keys[k] || { box: 0, seen: 0 };
      infoSlot.innerHTML = `
        <div class="map-info">
          Tangent "${k === ' ' ? 'mellanslag' : k.toUpperCase()}" – tränad ${entry.seen} gång${entry.seen === 1 ? '' : 'er'}, nivå ${entry.box}/5
        </div>`;
    });
  });
  document.getElementById('btn-back').addEventListener('click', renderMenu);
}

/* ───────────────────────── INIT ───────────────────────── */

KKSfx.setMuted(PROFILE.muted);
window.addEventListener('keydown', handleKeydown);
renderMenu();
