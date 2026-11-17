# MiniPad

A home app for an **iPad mini 2 on iOS 12.5.8**: one Home Screen icon that opens 23 tools.
It is plain HTML, CSS and JavaScript written for Safari 12. That means ES2017 only, touch events,
`webkitAudioContext` and no flex `gap`. It works offline after the first visit, and everything you
add stays on the iPad.

| Group | Tools |
|---|---|
| Around the house | Dashboard (clock, weather, to-dos) · Kitchen (timers, recipes, cook mode that reads aloud) · Family board (shopping, chores, notes, optional sync) · Call family (photo buttons for FaceTime) · Night clock |
| Learning | Kids' corner (counting, ABC, memory, times tables, spelling, reading) · Flashcards (spaced repetition, spoken words) · Draw & colour |
| Games & music | Sudoku · Word search · Chess (against the iPad, or two players) · Piano (learn-a-song lights, recorder) · Drum pad with beat maker · Soundboard · Sleep sounds |
| Everyday tools | Teleprompter · Focus timer · Habits · Medicines (on-screen reminders) · Notebook · Ask Claude |
| Help | iPad tips (old app versions, Screen Time, Guided Access, space, speed, jailbreak notes) · Settings (theme, clock, units, backup) |

## Put it on the iPad

1. Deploy the `minipad` folder (see below) and open its address in **Safari** on the iPad.
2. Tap **Share › Add to Home Screen › Add**.
3. Open MiniPad from the new icon. It runs full screen and keeps working without Wi-Fi.

## Deploy on Vercel

Either ask Claude to deploy it once Vercel access is approved, or do it yourself:
**vercel.com › Add New › Project**, import this repository, set **Root Directory** to `minipad`,
and deploy. No build step is needed. Share the production address (`<project>.vercel.app`),
because preview addresses ask for a Vercel login.

### Optional online features

These live in `api/` and only work after you add settings in **Project › Settings › Environment Variables**.
Redeploy after any change.

| Setting | What it does |
|---|---|
| `APP_PASSCODE` | A passcode you make up. Type the same one in MiniPad › Settings on the iPad. Every online feature needs it. |
| `ANTHROPIC_API_KEY` | Turns on **Ask Claude**. Make a key at console.anthropic.com (paid per use). The key stays on the server and never reaches the iPad. |
| `MINIPAD_CLAUDE_MODEL` | Optional. The default is `claude-opus-5-5`. |
| `MINIPAD_CLAUDE_EFFORT` | Optional: `low` (the default, quick replies), `medium` or `high`. |
| Blob store | **Storage › Create › Blob** with private access, connected to this project. It adds `BLOB_READ_WRITE_TOKEN` and turns on family-board sync and online backup. |

Ask Claude uses the server-side refusal fallback (`fallbacks: "default"`). If the model declines a
request on policy grounds, the API retries it on a fallback model inside the same call.

Weather comes from Open-Meteo, which needs no key. The iPad asks Open-Meteo directly and falls back
to `api/weather` if that fails.

## Privacy

Lists, notes, recipes, contacts, drawings and settings are kept in the iPad's local storage.
Removing the Home Screen icon deletes them, so use **Settings › Make a backup**. Only these things
leave the iPad:

- Ask Claude messages, sent to Anthropic through your server.
- The family board, when sync is on.
- The online backup.
- The place name used for weather.

## Tests

From this folder:

```bash
npm install
npm install --no-save acorn
node test/stamp.cjs
node test/compat.cjs
node test/chess.test.cjs
node test/api.test.cjs
node test/smoke.cjs
```

- `stamp.cjs` refreshes the offline file list and version in `sw.js`. Run it after every change.
- `compat.cjs` checks the Safari 12 rules: ES2017 syntax, no newer web APIs or CSS, and no emoji newer than Emoji 11.
- `chess.test.cjs` checks the chess rules against the standard perft counts.
- `api.test.cjs` exercises the server functions against a local stand-in for the Claude API.
- `smoke.cjs` opens every page in Chromium at iPad mini size and clicks through the main actions. It needs Playwright.
