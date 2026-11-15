# Cadence in the "hero pack" look

The look the WFM team pointed to (November 2026): a Figma "Dashboard hero pack" shot. Samples of the WFM manager's Dashboard in it are in `design/samples/hero-pack/`:
- `SPEC.md`, the spec;
- `make.cjs`, which writes the pages;
- A, Graphite;
- B, Beyond One;
- C, Daylight.

This file is the reference for building it into the tool.

## Tokens
Dark, sampled from the picture's pixels:
| Token | Value | Use |
|---|---|---|
| page | `#1e1e1e` | around the frame |
| frame | `#111111` | the frame, the gaps between panels, the notch |
| panel | `#242424` | nav, cards, tiles |
| pill | `#3a3a3a` | the current nav link, search, round buttons |
| tab | `#2a2a2a` | the month tabs |
| ink | `#fff` at 100 / 78 / 62 / 44 / 30 % | text hierarchy, by opacity, not by new colours |
| line | `rgba(255,255,255,.08)` | dividers |
| good / bad | `#7fd1ae` / `#ff9a8f` on 12 % fills | status chips only |

Light (Daylight):
- page `#e6e4df`, frame `#f3f2ee`, panel `#fff`, pill `#e9e7e2`;
- ink `#121212`;
- good `#0b6e50`, bad `#c4141b`.

Beyond One adds the mosaic colours (`--px1…px8`, lifted for dark pages), only in the picture, the team dots and the chart line.

## Type
- **Display:** Archivo at width 125 %, weight 800, in capitals.
  - It is OFL; the woff2 is `archivo-latin-wdth-normal.woff2`, 90 KB, and can be subset.
  - Used on the headline (clamp(34px, 4.2vw, 62px), line-height .98) and the CADENCE wordmark (15 px, +.08em).
- **UI:** Poppins (already in `vendor/fonts`), 300 / 500 / 600.
  - Body text 13–14.5 px; labels 11 px in capitals at +.14em.
  - Numbers 500, tabular.

## Anatomy
- **Frame:** 14 px of page, radius 30, padding 12, gaps 10 (8 on phones).
- **Nav**, 64 px, radius 20:
  - the Beyond One mark and CADENCE on the left;
  - the role's pages as links in the middle, the current one in a pill;
  - on the right: Search (Ctrl K), Refresh data, the bell with its count, and the avatar.
- **Headline panel:** radius 22, fills the first screen down to the cards row.
  - **Notch:** the frame's colour in the top-right corner, padding 0 0 10 10, two concave corners (22 px squares with `radial-gradient(circle at 0 100%, transparent 21.5px, frame 22px)`). It holds the page's main switch: months on the Dashboard, brands on Emails, tabs elsewhere.
  - **Copy, top-left:**
    - eyebrow (greeting · date);
    - a two-line headline that says the state of the month;
    - one plain sentence with the next step and its due date;
    - one white action (Continue ▸) and one text link.
  - **Glass card, bottom-right:** the latest import or the next deadline, with a white arrow button.
  - **Picture:** drawn from the page's data, with a left scrim behind the copy and a micro-label saying what the picture shows.
- **Three cards** (2fr 1fr 1fr, 250 px):
  - the job of the day (daily brand emails);
  - one number with its trend (adherence);
  - the people (the team, with the ones who need attention marked).
- **Below the first screen:** the page's working content in the same panels:
  - number tiles with sparklines, 3 × 2;
  - the lists (Needs attention, Month close).

## Phone
- The page links move to a scrollable pill row under the nav.
- Search becomes a round button.
- The headline panel is 500 px tall, with a top-down scrim.
- The glass card runs the full width.
- The emails card spans both columns; the other two sit side by side.
- The number tiles are in 2 columns.

## Motion
- Easing is cubic-bezier(.22,1,.36,1) throughout:
  - the nav drops in;
  - the picture settles from scale 1.05 over 1.6 s;
  - the headline lines rise out of a mask;
  - the copy and the cards rise with an 80 ms stagger.
- Everything is done by 1.3 s, once a visit.
- Hovers take 200 ms. The red tiles of the Beyond One mosaic pulse slowly.
- With reduced motion, nothing moves.

## In the tool
The tool keeps its own:
- data, roles, pages and words;
- Light / Dark / System;
- keyboard and focus;
- the no-network rule.

What changes:
- the left sidebar becomes the top nav (the phone tab bar becomes the pill row);
- every page gets the frame and panel materials;
- each workspace's first screen gets a headline panel when it has a state to say (Dashboard, the month's build, Emails);
- Archivo goes into `vendor/fonts` with its OFL.

## Glass layer (B · Glass, the team's choice of November 2026)
The WFM team picked B and asked for it glassy, with everything floating over the background and the motion of their reference reel. The sample is `design/samples/hero-pack/B-glass.html`, and section 8 of SPEC.md has the details.

**Background (the sample):** six glossy spheres in the brand colours, fixed behind the page, gliding to each page's places.
**Background (the tool):** the team then asked for a clean background. The tool's ground is one still wash of colour (near-white
with a little blue in Light, a deep navy in Dark) with nothing drawn on it; a panel that stays in its place has nothing to blur,
so only what floats over the page as it scrolls (the bar, menus, drawers, dialogs, sticky bars) blurs what is behind it.

**Material:** one glass (blur 28 px, saturate 1.5, translucent navy, 1 px gradient rim, pointer light) on every panel. The headline panel's notch is a `clip-path: path()` measured in the page.

**Colour:**
- blue (#2384e8) for the current page and the main action of a page;
- white for the headline panel's action.

**Motion:** GSAP (already in `vendor/`):
- page change: the nav pill slides, the new page's panels float up in turn and its title comes out of a blur (the sample also blurs the old page out and glides the spheres);
- the headline words come out of a blur;
- count-ups, a chart that draws itself and reshapes between ranges;
- drag and drop with a lifted, tilted ghost and a toast with Undo;
- a ripple where you click.

With reduced motion nothing moves.

**Cost:** `backdrop-filter` on many large panels is the heaviest part; the tool keeps it for what floats over scrolling content and offers "Less transparency" (account menu): solid panels, no blur, kept in the browser and applied before the first paint (`data-glass="solid"`).

**In the tool (15 November 2026):** `js/ui6/00_tokens.css` (the values, Light and Dark), `js/ui6/98_glass.css` (the last layer: the ground, the material, the floating top bar, the Dashboard's headline panel with its notch, the Emails board, the arrivals), `js/glass.js` (the bar's pill and its tight/compact states, Less transparency, the pointer light, the ripple), `js/dash.js` (the headline panel), `js/motion.js` (every arrival), `js/rbx.js` (the board and its drag). Tests: `test/glass.cjs`, `test/mailboard.cjs`, `test/motion.cjs`.
