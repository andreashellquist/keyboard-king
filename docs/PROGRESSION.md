# Keyboard King — Progression & Reward Layer: Implementation Spec

> Planned by the `progression-designer` brief (`.claude/agents/progression-designer.md`).
>
> **Status:** Phases **1, 2 and 3 are built**. Phase 1 = silent
> instrumentation + storage v2. Phase 2 = result-screen "Dina framsteg"
> block, tier & nudge crown bonuses, `KKSfx.personalBest()`, menu crest
> chip. Phase 3 = one-time milestones (`rounds5/10/25/50/100`,
> `streak5/10`) as top-priority banners, and the crown sink — a Butik
> screen selling decorative avatar frames under the hard "affordable +
> one next goal" rule, frames applied to the selected avatar. The
> optional ~1-in-8 sparkle drop is **deliberately skipped** — free
> cosmetics undercut the sink and add farm/again incentives; revisit only
> if engagement data asks for it. Phase 4 not built. `?debug` logs each
> recorded round.
>
> **Open tuning question for reviewer sign-off:** tier crown bonuses cascade
> — a first round at 100 % first-try immediately pays every accuracy rung
> (5+10+18+30 = 63 crowns) and maxes the accuracy tier. This is deliberate (a
> gradual improver earns the same total across four rounds), but the
> front-loaded number is large; `kid-ux-reviewer` / `typing-pedagogy-expert`
> should confirm the amounts.
>
> **Localisation:** tier names are Swedish (see §3.1–3.2). The Phase 2+
> banner/status copy below is illustrative Swedish — finalise wording with
> `kid-ux-reviewer` when those surfaces are built. Established tone lives in
> `js/app.js` `PRAISE` and `KK_LEVELS`.

## Highest-impact change (do this first, everything else builds on it)

**Persist, per level, an accuracy-gated speed best (`bestCps`) and a best first-try streak (`bestStreak`).** Today the app remembers neither: `kkDefaultState()` (`js/storage.js:53-64`) has no time field of any kind, and `ROUND.streak` is created in `beginRound` (`js/app.js:191`), only ever incremented on a first-try item (`js/app.js:266`), reset to 0 on any miss (`js/app.js:247`), and discarded when `advance()` runs past the last item into `finishRound()` (`js/app.js:294`). No "faster / steadier than last time" reward can exist until the app has a last time to compare against. Phase 1 is pure instrumentation + storage; no reward is shown until Phase 2, so real bests accumulate before any child sees a number.

---

## 1. Instrumentation (Phase 1 — MUST)

### 1.1 What to capture

| Signal | Definition | Why this and not WPM on screen |
|---|---|---|
| `correctChars` | count of accepted keystrokes in the round (char-level for `text`, one per item for `char`) | raw count, cheap, exact |
| `msActive` | sum of inter-keystroke deltas **below `KK_IDLE_CAP_MS` (5000)** | pause-tolerant: a distracted 6-year-old who stares at the wall for 20s is not timed for those 20s (ADHD default user, `kid-ux-reviewer` constraint) |
| `cps` | `correctChars / (msActive/1000)`, computed once in `finishRound` | internal only — never rendered; converted to tiers |
| `firstTryRatio` | `tally.first / total` — already computed as `ratio` at `js/app.js:305` | drives accuracy tier + gates speed best |
| `bestStreakThisRound` | max value `ROUND.streak` reached during the round | the "consistency" signal; reuses the existing 🔥 chip mechanic (`js/app.js:355`) that currently evaporates |
| `itemTimes[]` | ms per completed item (first keystroke → `completeItem`) | stored transiently for Phase 4 smoothness; **not persisted** in Phase 1 |

Misses count toward `msActive` (fixing a miss is real work) but **not** toward `correctChars`. Combined with the accuracy floor below, mashing cannot buy a speed tier.

### 1.2 Exact edits

**`js/data.js`** (near `KK_ROUND_SIZE`, `js/data.js:104`):
```
const KK_IDLE_CAP_MS = 5000;   // inter-key gaps above this don't count as typing time
const KK_SPEED_FLOOR = 0.6;    // a round needs firstTryRatio >= this to update bestCps / baseline
```

**`js/app.js` `beginRound()`** (`js/app.js:183-199`) — add to the `ROUND` object literal:
```
msActive: 0,
lastKeyAt: 0,
correctChars: 0,
itemStartAt: 0,
itemTimes: [],
bestStreakThisRound: 0,
```

**`js/app.js` `handleKeydown()`** — after the key is resolved to non-null (`js/app.js:227`, before the `if (key === expected)` branch at `:232`):
```
const now = performance.now();
if (ROUND.lastKeyAt) {
  const d = now - ROUND.lastKeyAt;
  if (d <= KK_IDLE_CAP_MS) ROUND.msActive += d;
}
ROUND.lastKeyAt = now;
if (!ROUND.itemStartAt) ROUND.itemStartAt = now;
```
In the correct branch: `ROUND.correctChars++` on the `char` completion path (`js/app.js:233`) and on **each** accepted char of the `text` path (`js/app.js:236`, alongside `ROUND.typedIndex++`). Do **not** increment in the miss branch (`js/app.js:245-252`).

Use `performance.now()` (monotonic; immune to wall-clock changes), not `Date.now()`.

**`js/app.js` `completeItem()`** — right after `ROUND.streak++` (`js/app.js:266`):
```
if (ROUND.streak > ROUND.bestStreakThisRound) ROUND.bestStreakThisRound = ROUND.streak;
```
And at the top of the function body, once outcome is known:
```
ROUND.itemTimes.push(performance.now() - ROUND.itemStartAt);
ROUND.itemStartAt = 0;
```

**`js/app.js` `advance()`** — alongside `ROUND.missCount = 0` (`js/app.js:291`): `ROUND.itemStartAt = 0;` (defensive — think-time before the next item is not typing time).

**`js/app.js` `finishRound()`** (`js/app.js:302-320`) — after `crownsEarned` is computed (`:307`), before `PROFILE.crowns +=` (`:309`):
```
const secActive = Math.max(ROUND.msActive / 1000, 0.001);
const cps = ROUND.correctChars / secActive;
const deltas = kkRecordRound(PROFILE, levelId, {
  cps,
  firstTryRatio: ratio,
  bestStreak: ROUND.bestStreakThisRound,
  itemCount: total,
});
PROFILE.crowns += crownsEarned + deltas.bonusCrowns;
```
`saveProfile()` is already called at `js/app.js:314`. Pass `deltas` into `renderResult({...})` (`js/app.js:319`) for Phase 2; in Phase 1 it is computed and persisted but not displayed.

### 1.3 New file `js/progress.js`

Loaded in `index.html` after `js/mastery.js`, before `js/app.js` (`index.html:19-20`). Mirrors the one-concern-per-file split already used for `mastery.js` / `storage.js`.

Exports (globals, matching house style):
- `KK_SPEED_TIERS`, `KK_ACC_TIERS` — arrays, section 3.
- `kkSpeedTierFromRatio(r)` / `kkAccTierFromRatio(a)` → tier index.
- `kkRecordRound(profile, levelId, { cps, firstTryRatio, bestStreak, itemCount })` → mutates `profile.stats`, returns:
  ```
  {
    faster: bool,            // cps > previous lastCps, and both qualified
    newBestCps: bool,
    newBestFirstTry: bool,
    newBestStreak: bool,
    speedTierUp: int|0,      // new tier index if it rose this round, else 0
    accTierUp: int|0,
    milestonesHit: string[], // e.g. ['rounds10']
    bonusCrowns: int,        // tier + milestone + nudge crowns, section 3.4
    speedTierNow: int, accTierNow: int
  }
  ```

`kkRecordRound` logic:
1. `st = profile.stats.perLevel[levelId]`.
2. `st.roundsPlayed++`, `profile.stats.roundsTotal++`, `profile.stats.itemsTotal += itemCount`.
3. `const qualifies = firstTryRatio >= KK_SPEED_FLOOR;`
4. If `qualifies`:
   - if `st.baselineCps === 0` → `st.baselineCps = cps` (frozen forever).
   - `faster = st.lastCps > 0 && cps > st.lastCps`.
   - `st.lastCps = cps`.
   - if `cps > st.bestCps` → `st.bestCps = cps`, `newBestCps = true`.
5. If `firstTryRatio > st.bestFirstTry` → `st.bestFirstTry = firstTryRatio`, `newBestFirstTry = true`.
6. If `bestStreak > st.bestStreak` → `st.bestStreak = bestStreak`, `newBestStreak = true`.
7. `if (bestStreak > profile.stats.bestStreakEver) profile.stats.bestStreakEver = bestStreak;`
8. Tier ratchet (never decreases):
   ```
   const sTier = st.baselineCps ? kkSpeedTierFromRatio(st.bestCps / st.baselineCps) : 0;
   if (sTier > st.speedTier) { speedTierUp = sTier; st.speedTier = sTier; }
   const aTier = kkAccTierFromRatio(st.bestFirstTry);
   if (aTier > st.accTier) { accTierUp = aTier; st.accTier = aTier; }
   ```
9. Milestones (one-time, guarded by `profile.stats.milestonesPaid`): section 3.5.
10. `bonusCrowns` = sum of tier bonuses for `speedTierUp` / `accTierUp` + milestone crowns + "personal best nudge" crowns (section 3.4).

All writes are `max` / append / monotonic. `st.lastCps` is the **only** field that can fall, and it feeds nothing but the soft `faster` line (no penalty when false).

---

## 2. Improvement detection (Phase 1 storage / Phase 2 display)

- **Speed** is measured **relative to the child's own first qualifying round** on that level (`baselineCps`, frozen). Ratio `r = bestCps / baselineCps`. A kid going 8→10 WPM gets `r = 1.25` — the same rung as a kid going 20→25 WPM. There is no absolute WPM anywhere in the tier math, so the slow improver climbs the identical ladder.
- **First-try accuracy** best is absolute (`bestFirstTry`, 0–1) because a higher first-try rate is unambiguously better regardless of starting point, and accuracy tiers are reachable with zero speed requirement.
- **"Faster than last time"** = `deltas.faster` (this round's `cps` beat the previous *qualifying* round's `cps`). A non-qualifying (sloppy) round never updates `lastCps` and never shows the faster/slower line — a bad round neither helps nor hurts this signal.
- **"Your best"** = `deltas.newBestCps` / `newBestFirstTry` / `newBestStreak`.
- Baseline-round noise (a distracted first round → inflated later ratios) is left uncorrected on purpose: it only ever makes tiers *easier*, never harder. Progress only goes up.

---

## 3. Reward surfaces

### 3.1 Speed tiers (per level) — `KK_SPEED_TIERS`

Cutoff is `r = bestCps / baselineCps`. Names as shipped in `js/progress.js`.

| idx | id | name (SV) | icon | `ratio` cutoff | meaning |
|---|---|---|---|---|---|
| 0 | `igang`   | Igång         | 🐣 | first qualifying round done (baseline set) | — |
| 1 | `spira`   | Spira         | 🌱 | 1.10 | 10% faster than your own start |
| 2 | `faril`   | Fjärilsfart   | 🦋 | 1.25 | |
| 3 | `tassar`  | Snabba tassar | 🐇 | 1.50 | |
| 4 | `vind`    | Vindsnabb     | 🦅 | 1.80 | |
| 5 | `kunglig` | Kunglig fart  | 👑 | 2.20 | |

### 3.2 Accuracy tiers (per level) — `KK_ACC_TIERS`

Cutoff is `bestFirstTry`. Framed as first-try success, never error %, never red (`typing-pedagogy-expert` + `kid-ux-reviewer` constraints). Names as shipped in `js/progress.js`.

| idx | id | name (SV) | icon | cutoff |
|---|---|---|---|---|
| 0 | `spar`   | På rätt spår    | ✋ | 0.50 |
| 1 | `blick`  | Skarp blick     | 🎯 | 0.70 |
| 2 | `rena`   | Rena tangenter  | 💎 | 0.85 |
| 3 | `felfri` | Felfritt anslag | 🌟 | 0.95 |

Four rungs reachable by accuracy alone with no speed gate.

### 3.3 Result screen — new "Your Progress" block

Inserted in `renderResult` (`js/app.js:394-438`), **above** the existing practice block (`js/app.js:422-426`), **below** stars + crowns (`js/app.js:419-420`, unchanged). Render only the lines that are true, in this priority order, max 3 lines shown:

1. **Personal-best banner** (`newBestCps || newBestFirstTry || newBestStreak`): gold card.
   - `newBestFirstTry`: "Nytt rekord! Din renaste runda på Ord hittills 💎" (accuracy wins the slot if two fire).
   - `newBestCps`: "Nytt rekord! Snabbare än någonsin på Ord 🌱"
   - `newBestStreak`: "Nytt rekord: {n} i rad utan miss 🔥"
2. **Tier-up banner** (`speedTierUp || accTierUp`): "Du nådde {tier.name} {tier.icon} på {level.name}!" — accuracy tier-up shown first if both.
3. **"Faster than last time"** (`faster && !newBestCps`): "Lite snabbare än förra gången 🌱" — soft, gold, no number.
4. **Pace ribbon** — always shown: a bar that **only fills**, `width` = `clamp(0.04, progressToNextTier, 1) * 100%`. Label "På väg mot {nextTier.name} {nextTier.icon}". At top tier: "Kunglig fart 👑 — du flyger!" and a full, static bar. No empty-state colour, no deficit, never depletes.

If nothing was beaten and no tier rose: show only the pace ribbon + a calm status line ("Ord-fart: Snabba tassar 🐇 — fortsätt så!"). **Never** "du blev inte bättre", never a slower-than-last-time line.

Colours: `--gold` (`styles.css:13`), `#7fd4a0` green (`styles.css:263`), white. New CSS goes in the RESULTS section (`styles.css:481-507`). Bar fill transition gated behind `--motion` (`styles.css:16-18`); banners appear without slide animation when `--motion:0`.

Sound: one new `KKSfx.personalBest()` in `js/sfx.js` — reuse the `streak()` envelope (`js/sfx.js:49`), two rising triangle tones, `gainPeak` 0.14. Plays once with the block if any of lines 1–2 fired. `roundDone` (`js/sfx.js:44`) and confetti (`js/app.js:317`) are unchanged.

### 3.4 Crown bonuses (deterministic, paid once per rung)

| Speed tier reached | +crowns | Accuracy tier reached | +crowns |
|---|---|---|---|
| Igång | 2 | På rätt spår | 5 |
| Spira | 4 | Skarp blick | 10 |
| Fjärilsfart | 6 | Rena tangenter | 18 |
| Snabba tassar | 10 | Felfritt anslag | 30 |
| Vindsnabb | 14 | | |
| Kunglig fart | 20 | | |

Per-rung, accuracy ≥ speed at every ordinal, and the top accuracy bonus (30) > top speed bonus (20).

Personal-best "nudge" crowns when a best is beaten but no new tier: `newBestCps` → +1, `newBestFirstTry` → +2, `newBestStreak` → +1. Accuracy nudge > speed nudge.

The existing per-round formula `tally.first*2 + tally.retry*1 + tally.struggle*1` (`js/app.js:307`) is **unchanged** — first-try already pays double a mashed retry.

### 3.5 Milestones (global, cross-level, cross-session)

Guarded by `profile.stats.milestonesPaid` (string ids, append-only). Deterministic, one-time, additive.

| Trigger | id | +crowns |
|---|---|---|
| `roundsTotal` reaches 5 / 10 / 25 / 50 / 100 | `rounds5`… | 5 / 10 / 15 / 25 / 40 |
| `bestStreakEver` reaches 5 / 10 / 20 | `streak5`… | 5 / 12 / 25 |

Shown as line 1-priority banners in the Progress block ("Milstolpe! 50 rundor spelade 🏅 +25 👑").

### 3.6 Menu badge

`stats-pill` (`js/app.js:50-52`, `styles.css:166-179`) gains a single "highest crest" chip: the top `speedTier` icon across all levels, e.g. `🐇 Snabba tassar`. Tapping it is not required (decorative). No per-level clutter on the menu.

### 3.7 Reward schedule — deterministic vs variable

- **Deterministic** for every skill-linked reward: beating a best, reaching a tier, crossing a milestone. Children this age, ADHD as default (`kid-ux-reviewer`), need a predictable contingency — "I did better → I got the thing." Variable-ratio schedules on *skill gains* feel arbitrary and risk learned helplessness; they are not used.
- **Variable / surprise** only for pure flavour that is never a metric: which `PRAISE` string (`js/app.js:6, 271`), confetti colour (`js/confetti.js:7`). Phase 3 may add a ~1-in-8 cosmetic "sparkle" drop after *any* completed round — non-stacking, non-farmable because it's decorative and gated to "not already owned".
- **Frequency:** every round already ends on praise + stars + crowns (`js/app.js:397-401, 419-420`) — unchanged. For an improving beginner (3 chances per round: `bestCps`, `bestFirstTry`, `bestStreak`) expect a personal-best line roughly every 2nd round in weeks 1–2, a tier-up every 3–6 rounds, both tapering naturally as the child plateaus. No artificial scarcity, no daily-login pressure, no streak that breaks between sessions.

### 3.8 Crown sink (Phase 3 — SHOULD)

Crowns currently buy nothing — all six `KK_AVATARS` are free from the start (`js/data.js:95-102`). Add `KK_COSMETICS` in `js/data.js`: 5–6 purely decorative avatar accessories / frames, prices 20 / 40 / 70 / 110 / 160 / 220. Purchases are permanent (`cosmetics.owned`), never spent involuntarily, never gate content, never required. **Shop rule (hard):** the shop screen shows only items the child can already afford **plus exactly one** next-goal item with a fill-only progress bar toward its price. It never shows a wall of unaffordable prices — a child can never be shown a thing they cannot eventually get, and can never end a session unable to afford what they were shown.

---

## 4. Constraint check (one line each)

- **Progress only goes up:** `bestCps`, `bestFirstTry`, `bestStreak`, `speedTier`, `accTier`, `roundsTotal`, `bestStreakEver`, milestone/tier crowns are all `max` / append / monotonic in `kkRecordRound`; the only field that can fall is `lastCps`, which drives only the optional "a little faster" line and carries no penalty when false.
- **No red:** every new banner, the pace ribbon, and the menu crest use `--gold` / `#7fd4a0` / white only (`styles.css:13, 263`); a non-improving round shows a calm status line and a fill-only bar, never a deficit or failure colour.
- **No core timer:** timing is captured silently as `performance.now()` deltas inside `handleKeydown`; nothing counts down, nothing time-related renders during a round, and `msActive` drops idle gaps over 5000ms so a distracted child is never effectively rushed — the derived WPM never leaves `js/progress.js`.
- **Accuracy never pays less than speed:** `bestCps` only updates when `firstTryRatio >= 0.6`, so no speed tier is reachable by mashing; per-rung the accuracy crown bonus ≥ the speed bonus and the top accuracy bonus (30) beats the top speed bonus (20); the per-round formula (`js/app.js:307`) still pays first-try double.
- **Personal-best only:** every comparison is `st.*` vs this round on the same profile; baseline is the child's own first qualifying round; no leaderboard, no seeded "average child", no rival avatar, no peer data of any kind.
- **Safe for the slow 6-year-old (8 WPM after two weeks):** speed tiers are ratio-to-own-baseline, so 8→10 WPM earns *Spira* exactly as 20→25 WPM does; there is no absolute WPM floor and no "below X" state; the first qualifying round always earns *Igång* + crowns; a round that beats nothing still ends on praise + stars + crowns as it does today; leaving mid-round via `btn-exit` (`js/app.js:386-389`) still records and forfeits nothing because nothing is written until `finishRound`.

---

## 5. Phased build order

### Phase 1 — Instrumentation + silent recording  **(BUILT ✅)**
- Shipped: `ROUND` timing fields + capture in `handleKeydown` / `completeItem` / `advance` / `finishRound`; `js/progress.js` (`kkRecordRound`, `KK_SPEED_TIERS` / `KK_ACC_TIERS`, `kkSpeedTierFromRatio` / `kkAccTierFromRatio`); `js/storage.js` v2 (`kkDefaultLevelStat`, `kkClampRatio01`, `kkClampCps`, `kkSanitizeLevelStat`, `stats` + `cosmetics` in default + load); `KK_IDLE_CAP_MS` / `KK_SPEED_FLOOR` in `js/data.js`; `<script src="js/progress.js">` between `data.js` and `storage.js` in `index.html`. No user-visible change; `?debug` logs each recorded round.
- Verified: fresh profile → `v:2`, empty `stats`; a played round writes `baselineCps` / `bestCps` / `bestFirstTry` / `bestStreak` / tiers / `roundsTotal`; a v1 save migrates with every crown, star, unlock and mastery box intact and no timing back-filled; no bonus crowns paid; `cps` clamped at the write point.
- **Still owed — reviewer sign-off (retroactive, before Phase 2 builds on it):** `typing-pedagogy-expert` (is CPS + first-try-ratio + best-streak the right skill signal; is the 0.6 floor correct; does gating speed on accuracy adequately prevent hunt-and-peck being rewarded as "fast") **and** `kid-ux-reviewer` (5000ms idle cap value; confirm no data is written on `btn-exit`).

### Phase 2 — Result-screen reward surfaces  **(BUILT ✅)**
- Shipped: `kkProgressBlockHtml` in `js/app.js` renders "Dina framsteg" between the result message and the practice list — up to two priority banners (personal-best → tier-up → faster-than-last) over a speed pace-ribbon that only fills (`kkSpeedPace` in `js/progress.js`); when nothing was beaten, one calm status line + the ribbon. `kkRecordRound` now pays tier crown bonuses (`KK_SPEED_TIER_CROWNS` / `KK_ACC_TIER_CROWNS`, once per rung via `speedTierPaid` / `accTierPaid`) plus personal-best nudge crowns; `finishRound` adds them to the round total and the "+N 👑" headline. `KKSfx.personalBest()` (three rising tones) on any personal-best or tier-up. Menu `stats-pill` gains a `.crest-chip` with the highest speed tier across levels once a baseline exists. CSS in `styles.css` PROGRESS BLOCK section; `.pb-banner` / `.pace-fill` disabled under `prefers-reduced-motion`.
- Verified headless: two rounds on a fresh profile → banners render, ribbon fills to the right fraction, crown total matches the base + cascaded rung bonuses + nudges, crest chip shows "🐇 Snabba tassar", no console errors, v1/v2 saves still migrate.
- **Still owed — reviewer sign-off:** `kid-ux-reviewer` (≤3 lines, wording, motion, bar-only-fills, cascade crown amounts) **and** `typing-pedagogy-expert` (tier names/cutoffs don't imply speed over technique; accuracy copy leads; "faster" line never shows alongside a low first-try round).

### Phase 3 — Milestones + crown sink  **(BUILT ✅)**
- Shipped: `KK_ROUND_MILESTONES` (5/10/25/50/100 rounds → 5/10/15/25/40 👑) and `KK_STREAK_MILESTONES` (5, 10 in a row → 5/12 👑; the §3.5 "20" is unreachable with a 10-item round) in `js/progress.js`; `kkRecordRound` awards each once via the `milestonesPaid` ledger and returns `milestonesHit`, which `kkProgressBlockHtml` renders as top-priority `.pb-banner.milestone` lines. `KK_COSMETICS` (6 avatar frames, 20–220 crowns) in `js/data.js`; `renderShop` (menu → 🎁 Butik) shows the owned/equip row, every currently-affordable frame, and **exactly one** next-goal frame with a fill-only bar — nothing dearer is shown. Buying deducts crowns (never below 0), auto-equips, plays `KKSfx.personalBest()`. `equippedFrameCss()` puts the frame on the selected avatar button; `styles.css` SHOP + AVATAR FRAMES section. The optional 1-in-8 sparkle drop is **skipped** — free cosmetics undercut the sink.
- Verified headless: 5 perfect rounds → `milestonesPaid` = `["streak5","streak10","rounds5"]`; shop at 95 crowns shows Guldram(owned) + Stjärnglans/Regnbåge(buy) + Eldkrans(goal, "15 kronor kvar"), Kristall/Krona hidden; buying Guldram: 20 crowns spent, owned+equipped, frame class on the menu avatar; no console errors.
- **Still owed — reviewer sign-off:** `kid-ux-reviewer` (shop can't create a want-can't-afford state; milestone banner load) **and** `typing-pedagogy-expert` (frames never touch round composition or content).

### Phase 4 — Consistency polish + Kingdom Map integration  **(NICE)**
- Ships: within-round "steady hands" smoothness reward from `ROUND.itemTimes`; per-key fastest-clean time on the Kingdom Map cell popover (`renderMap`, `js/app.js:442-480`); optional opt-in "Time Trial" surface — a separate screen, never the default path, never gates content.
- Depends on: Phase 1 (`itemTimes`; persist a per-key/-item time map here, not before).
- **Sign-off before merge:** `kid-ux-reviewer` + `typing-pedagogy-expert` (Time Trial isolation and labelling) **and** `progression-designer`.

---

## 6. Storage: shape, sanitisation, migration (`js/storage.js`)

Bump `KK_STORAGE_VERSION` to `2` (`js/storage.js:10`).

### 6.1 Added to `kkDefaultState()` (`js/storage.js:53-64`)
```
stats: {
  perLevel: {
    homerow: kkDefaultLevelStat(), letters: kkDefaultLevelStat(),
    words: kkDefaultLevelStat(),   sentences: kkDefaultLevelStat(),
  },
  roundsTotal: 0, itemsTotal: 0, bestStreakEver: 0,
  milestonesPaid: [],
},
cosmetics: { owned: [], equipped: null },   // ships empty in Phase 1, used in Phase 3
```
```
function kkDefaultLevelStat() {
  return { baselineCps: 0, bestCps: 0, lastCps: 0, bestFirstTry: 0,
           bestStreak: 0, roundsPlayed: 0, speedTier: 0, accTier: 0 };
}
```

### 6.2 Added sanitisers
```
function kkClampRatio01(n){ n = Number(n); if (!Number.isFinite(n) || n < 0) return 0; return Math.min(1, n); }
function kkClampCps(n){ n = Number(n); if (!Number.isFinite(n) || n < 0) return 0; return Math.min(50, n); } // ~600 WPM hard ceiling vs corruption

function kkSanitizeLevelStat(raw){
  const d = kkDefaultLevelStat();
  if (!raw || typeof raw !== 'object') return d;
  let baselineCps = kkClampCps(raw.baselineCps);
  let bestCps     = kkClampCps(raw.bestCps);
  if (bestCps > 0 && baselineCps === 0) baselineCps = bestCps;   // never divide by zero in tier math
  const bestFirstTry = kkClampRatio01(raw.bestFirstTry);
  let speedTier = Math.max(0, Math.min(KK_SPEED_TIERS.length - 1, kkClampCount(raw.speedTier)));
  let accTier   = Math.max(0, Math.min(KK_ACC_TIERS.length - 1,   kkClampCount(raw.accTier)));
  // ratchet: a retuned-down cutoff may promote, never demote a stored tier
  if (baselineCps > 0) speedTier = Math.max(speedTier, kkSpeedTierFromRatio(bestCps / baselineCps));
  accTier = Math.max(accTier, kkAccTierFromRatio(bestFirstTry));
  return {
    baselineCps, bestCps,
    lastCps: kkClampCps(raw.lastCps),
    bestFirstTry,
    bestStreak: Math.min(KK_ROUND_SIZE, kkClampCount(raw.bestStreak)),
    roundsPlayed: kkClampCount(raw.roundsPlayed),
    speedTier, accTier,
  };
}
```
`kkSpeedTierFromRatio` / `kkAccTierFromRatio` come from `js/progress.js`, which must load **before** `js/storage.js`. The current order is `data → storage → sfx → confetti → mastery → app` (`index.html:15-20`). Move `js/progress.js` to load **immediately after `js/data.js` and before `js/storage.js`**, since `kkLoadState()` now calls tier functions and reads `KK_SPEED_TIERS`. `js/storage.js` already depends on `KK_LEVELS` / `KK_AVATARS` from `js/data.js` at load (`js/storage.js:76, 88`), so this is the same pattern.

### 6.3 In `kkLoadState()` (`js/storage.js:66-104`)
After the `mastery` block, build `stats` with the same defensive per-known-id iteration used for `bestStars` (`js/storage.js:82-86`):
```
const stats = {
  perLevel: {},
  roundsTotal: kkClampCount(raw.stats && raw.stats.roundsTotal),
  itemsTotal:  kkClampCount(raw.stats && raw.stats.itemsTotal),
  bestStreakEver: Math.min(KK_ROUND_SIZE, kkClampCount(raw.stats && raw.stats.bestStreakEver)),
  milestonesPaid: Array.isArray(raw.stats && raw.stats.milestonesPaid)
    ? [...new Set(raw.stats.milestonesPaid.filter((x) => typeof x === 'string'))]
    : [],
};
for (const id of knownLevelIds) {
  stats.perLevel[id] = kkSanitizeLevelStat(raw.stats && raw.stats.perLevel && raw.stats.perLevel[id]);
}
const knownCosmeticIds = (typeof KK_COSMETICS !== 'undefined' ? KK_COSMETICS.map((c) => c.id) : []);
const owned = Array.isArray(raw.cosmetics && raw.cosmetics.owned)
  ? raw.cosmetics.owned.filter((x) => knownCosmeticIds.includes(x)) : [];
const cosmetics = { owned, equipped: owned.includes(raw.cosmetics && raw.cosmetics.equipped) ? raw.cosmetics.equipped : null };
```
Add `stats` and `cosmetics` to the returned object (`js/storage.js:90-103`); set `v: 2`.

### 6.4 Migration for existing (v1) profiles
No explicit migration branch. The file's design — every read is fully sanitised, not just migrated ones (`js/storage.js:1-7`) — means a v1 save simply lacks `stats` / `cosmetics`, and the sanitiser produces all-default values. **No data is lost; no timing is back-filled** because it was never recorded. The only code is the version bump, the new sanitiser calls, and the script-order change. A v1 child keeps every crown, star, unlock and mastery box, and starts accumulating bests from their next round.

---

## Critical files
- `js/app.js`
- `js/storage.js`
- `js/progress.js`  *(new)*
- `js/data.js`
- `styles.css`
