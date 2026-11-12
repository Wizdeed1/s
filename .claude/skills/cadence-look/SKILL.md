---
name: cadence-look
description: Design and restyle Cadence (the offline Member Care WFM tool in this repository) to a gallery-grade bar. The workflow writes a precise spec, builds it, then screenshots the result and fixes it, while keeping the tool's rules (one offline HTML file, no network, bundled fonts, synthetic data, Light and Dark). Use it when restyling Cadence or one of its pages, making design samples or mockups of the tool, matching a reference picture, or judging how a page looks. Adapted for this project from MotionSites Web Builder (MIT); see NOTICE.
---

# Cadence look

Average-looking screens have three causes:
- a vague plan;
- nothing real to look at;
- nobody checking the result.

This workflow fixes all three for Cadence. Follow every step, every time.

Cadence's rules come first:
- **One file, offline.** The tool is one HTML file and makes no network request.
  - `npm test` fails on any web address the page would load.
  - No CDN, no Google Fonts and no remote image or video.
  - Fonts and libraries live in `vendor/`, each with its licence, and the build puts them inline.
- **Real people's data stays out.** Samples, tests and screenshots use synthetic data only: first name + initial, masked IDs, example.com.
- **Both appearances work.** Every screen works in Light and Dark (Settings › Appearance) and on a phone.
- **Calm motion.** Motion respects reduced motion. Things done many times a day do not animate.
- **No company look in Artifacts.** A page with a company's name or look (Beyond One, Virgin Mobile, FRiENDi) goes to the user as a file, not as a published page.

## Workflow

### 1. Read the brief and decide
Settle these five things in one short message, then proceed:
- **Who and where:** the role, the page, and what that person does first on it.
- **Mood:** three words, e.g. "calm, dark, exact".
- **Signature:** the one idea the screen is remembered for (see `references/techniques/INDEX.md`).
- **Output:** samples (self-contained HTML in `design/samples/<name>/`) or the tool itself (`js/ui6/*.css`, `js/ui3_body.html` and the page's JS).
- **Scope:** one page, or the whole shell.

Only ask when you cannot go on without the answer.

### 2. Look first
- **The reference:** the user's picture, if they gave one. Sample its colours from the pixels, and match its type by setting specimens side by side.
- **The page as it is now:** shoot it with `scripts/shoot.cjs` on `out/mc.html`. That is the "before".
- **The rules:** read `references/craft.md` for type, colour, space, motion and copy, and pick 2–4 techniques from `references/techniques/INDEX.md`.
- **This project's look:** read `references/hero-pack.md`, the design the WFM team chose.

### 3. Media
Use the first of these that you have:
1. **The user's own assets:**
   - `assets/brand` holds the Beyond One logos, including the moving mark.
   - Photos only if the user gives them and may use them. Make them JPEG or WebP and put them inline; keep each under ~250 KB.
2. **Visuals drawn from the page's own numbers.** SVG or canvas from the data the page already has: a month as a landscape, the team as a mosaic, a big numeral. Cadence's best visuals are its data.
3. **Type-led.** Big display type, one soft light falloff and grain.

Never use a remote URL, a stock photo fetched at run time, or a grey placeholder box.

### 4. Write the spec
Use `references/spec-template.md`, at its level of detail. Also cover:
- the states: empty (no month yet), loading, error, and a long name;
- every role that sees the screen;
- tokens for both Light and Dark;
- the phone layout at 390 px;
- keyboard and focus;
- the real copy, in the tool's plain words (no "seamless", "empower" or "leverage").

### 5. Build
- **Samples:** one HTML file each, with fonts inline as base64 woff2 and no external file.
- **The tool:**
  - tokens go in `js/ui6/00_tokens.css`, components in their numbered CSS files, markup in `js/ui3_body.html`;
  - build with `npm run build`; the final file comes from `cd js && bash assemble_standalone.sh "../final/Cadence.html"`.
- **Fonts:**
  - come from npm (`npm pack @fontsource/<font>` or `@fontsource-variable/<font>`);
  - only OFL or similar licences;
  - copy the woff2 and the licence into `vendor/fonts/`, and subset when the file is large.
- **Libraries:**
  - GSAP is already in `vendor/` and is the only motion library;
  - a new library goes in `vendor/`, with its SHA-256 recorded in `vendor/README.md` (`test/supply.cjs` checks it);
  - technique recipes that load three.js or hls.js from a CDN are out unless the library is bundled.
- **Markup:**
  - semantic HTML, visible focus, tap targets of 44 px or more;
  - `font-variant-numeric: tabular-nums` on numbers that change;
  - `prefers-reduced-motion` respected;
  - nothing stays hidden if a script fails.

### 6. Look and fix (mandatory)
Run `node .claude/skills/cadence-look/scripts/shoot.cjs <page.html> <outDir> [--full] [--light]`.

It saves screenshots at three sizes, plus an early frame and a reduced-motion frame:
- desktop, 1440×900;
- laptop, 1280×800;
- phone, 390×844.

It also prints a QA report:
- console errors;
- **any request that is not file:, data: or blob:** (the no-network rule);
- horizontal overflow;
- fonts loaded;
- unreadable small text.

Then:
1. Open the PNGs and look at them.
2. Score them with `references/review.md`.
3. Fix the three weakest points with values, not adjectives, and shoot again.
4. Stop at an average of 8+ with nothing under 7, or after 3 rounds.

Changes to the tool itself also need the tool's own checks: `npm test` and the browser suites in the README's test list.

### 7. Deliver
- Send the screenshots and files with SendUserFile:
  - desktop first;
  - a phone view when the page is used on phones.
- Give 2–3 lines per option: the signature, the choices, and what to swap (for example, "your own photo can replace the drawn landscape").
- When there are options, name them, recommend one, and say what choosing it changes in the tool.
- Commit samples and skill changes on the session branch. Never commit anything made from real files.

## Files
- `references/hero-pack.md`: Cadence's look (tokens, anatomy, components), from the team's reference picture.
- `references/craft.md`: the taste rules with numbers (MIT, from MotionSites).
- `references/spec-template.md`: the spec skeleton (MIT, from MotionSites).
- `references/review.md`: the screenshot rubric, adapted for Cadence's screens.
- `references/techniques/`: 58 recipes with working code (MIT, from MotionSites). Each one's CDN libraries must be bundled first or left out.
- `scripts/shoot.cjs`: screenshots plus a QA report with the no-network check (Node, Playwright).
