# ⌨️👑 Keyboard King

A typing-practice game for kids, in the same spirit as
[Math Champions](https://github.com/andreashellquist/math-champions): a
dark-gradient, gold-accent, big-tap-target arcade with no red, no
punishing timers, and progress that only ever goes up. Here the "pitch" is
a keyboard kingdom instead of a football pitch, and the fact ladder is one
key, word or sentence at a time instead of an arithmetic fact.

Built for a **Swedish (SWE) keyboard**: the home row is `a s d f  j k l ö`
and `å ä ö` sit under the right pinky.

Zero build step — plain HTML/CSS/JS. Open `index.html` in a browser, or
serve the folder with any static file server (recommended, since some
browsers restrict `localStorage` under the `file://` origin):

```bash
npx serve .
# or
python3 -m http.server 8080
```

## How it plays

1. **Home Row** (`a s d f  j k l ö`) — the foundation every touch-typing
   course starts with.
2. **All Letters** — the full alphabet plus `å ä ö`, shuffled each round.
3. **Words** — short, kid-friendly words.
4. **Sentences** — short, fun full sentences.

Before the very first Home Row round (and any time from the **Finger
Guide** link on the menu) a **Hand Home Base** screen shows which finger
rests on which key — left pinky→`a` … right pinky→`ö`, both thumbs on
space — plus the "find the F and J bumps without looking" habit. It's the
one bit of explicit technique instruction; everything after that is
practice.

Levels unlock in order; finishing a round (any score) unlocks the next one
— nothing is ever locked permanently, and nothing earned is ever taken
away. Ten prompts per round. A miss just asks for another try, with a
gentle finger hint (`js/data.js` → `KK_FINGER_MAP`, the Swedish
touch-typing chart) — no red, no penalty, no timer in core practice.

Mastery is tracked per key/word/sentence with a small 6-box ladder
(`js/mastery.js`), the same "difficulty is per-fact, not global" idea as
Math Champions' Leitner system, scaled down. The **Kingdom Map** screen
shows every practiced key on the real keyboard layout, coloured by
mastery — the typing equivalent of Math Champions' mastery-map "turf you've
grown."

## Project structure

```
index.html
styles.css
js/
├── data.js       content: levels, word/sentence lists, finger chart, avatars
├── storage.js    guarded, sanitised localStorage persistence
├── sfx.js        synthesised WebAudio sound effects — no asset files
├── confetti.js   lightweight confetti burst, skips under reduced-motion
├── mastery.js    per-item Leitner ladder + round composition
└── app.js        screens, round state machine, event wiring
```

## Deployment

Hosted on **Azure Static Web Apps** (Free tier):
<https://jolly-island-0c8de6a0f.6.azurestaticapps.net>

Every push to `main` triggers `.github/workflows/azure-static-web-apps.yml`,
which uploads the repo root as-is (no build step). Pull requests get their
own staging environment, torn down on close. `staticwebapp.config.json`
handles navigation fallback and basic headers.

Azure resources: resource group `keyboard-king-rg`, static web app
`keyboard-king`. The Actions workflow authenticates with the
`AZURE_STATIC_WEB_APPS_API_TOKEN` repo secret (the app's deployment token,
from `az staticwebapp secrets list`).

## Accessibility

Real keyboard input drives the whole game (the on-screen keyboard is a
visual aid, not a click target). `prefers-reduced-motion` disables shake,
confetti and the pulsing next-key highlight while keeping every state
change that carries meaning. Focus-visible gets a 4px gold outline. No red
anywhere — a miss is neutral grey, a retry-success is soft green, only a
first-try success is gold.

## Standing reviewers

`.claude/agents/typing-pedagogy-expert.md` and
`.claude/agents/kid-ux-reviewer.md` — consult before adding content or
changing round/reward/timing logic; sibling agents to Math Champions'
`adhd-expert.md`.
