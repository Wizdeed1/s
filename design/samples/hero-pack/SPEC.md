# Cadence · the dashboard in the "hero pack" look (three samples)

## 0. Brief
Three self-contained samples of the **WFM manager's Dashboard** in the look of the team's reference picture (a Figma "Dashboard hero pack"). The look has:
- a dark frame;
- a navigation bar of pills;
- one big headline panel with month tabs set into its top-right corner and a glass card at the bottom right;
- a row of three cards.

Below them sits the working content: the month's numbers, the people who need attention, and the month-close steps.

- **Mood:** calm, dark, exact.
- **Signature:** the headline panel's picture is drawn from the month's own data. Each sample tries one:
  - **A, Graphite:** the month as a landscape, black and white;
  - **B, Beyond One:** the team as a mosaic in the brand's colours;
  - **C, Daylight:** the month's days as window blinds, light.

Only the panel's picture, the colour and the appearance change between the three. Everything else is the same.

**Data:** made up throughout:
- names are first name + initial, from `test/fixture.js`;
- September 2026, 164 agents, the same figures as the fixture's dashboard.

## 1. Stack & files
- `make.cjs` writes `A-graphite.html`, `B-beyond-one.html` and `C-daylight.html`. Each is one file, with no request of any kind.
- Fonts and logos are inline as base64. The pictures are inline SVG built from the data.
- No JavaScript: the entrance is CSS only.

## 2. Fonts
| Role | Family | Weights | Used on |
|---|---|---|---|
| Display | Archivo, width 125 % (OFL, `fonts/`) | 800 | the headline, the wordmark |
| UI and numbers | Poppins (OFL, `vendor/fonts/`) | 300 / 500 / 600 | everything else; numbers tabular |

## 3. Colour tokens
Dark, sampled from the picture:
- page `#1e1e1e`;
- frame `#111111`;
- panel `#242424`;
- pill `#3a3a3a`;
- tab `#2a2a2a`;
- ink `#fff`, with steps at 100 / 78 / 62 / 42 %;
- line `rgba(255,255,255,.08)`;
- good `#7fd1ae`, bad `#ff9a8f` (status only).

Daylight:
- page `#e6e4df`;
- frame `#f3f2ee`;
- panel `#fff`;
- pill `#e9e7e2`;
- ink `#121212`;
- good `#0b6e50`, bad `#c4141b`.

Beyond One adds the brand's mosaic colours (`--px1…px8` from `js/ui6/00_tokens.css`), only on:
- the mosaic;
- the team dots;
- the chart line.

## 4. Layout (desktop 1440 × 900)
- **Page and frame:** 14 px of page, then the frame (radius 30, padding 12, gaps 10).
- **First screen:** nav 64 px, then the headline panel (fills the rest, minimum 420), then the cards row (250 px).
- **Nav** (radius 20):
  - left: the Beyond One mark (30 px) and CADENCE (Archivo 125 % 800, 15 px, +.08em);
  - centre: the pages as links (13.5 px), the current one in a pill padded 9 × 18;
  - right:
    - Search, a 240 × 42 pill, with Ctrl K;
    - Refresh data and the bell, 42 px circles; the bell has a red count;
    - the avatar, 42 px, NB.
- **Headline panel** (radius 22):
  - **Notch:** the frame's colour, padding 0 0 10 10, two concave corners (radial-gradient squares of 22 px). It holds the month tabs Jul / Aug / Sep 2026: 44 px tall, padded 0 22, the current one white.
  - **Copy:** top-left at 9 % / 5 %, max-width 46 rem:
    - eyebrow: "Good afternoon, Noura · Thursday 12 November", 13 px at 72 %;
    - H1: SEPTEMBER, / ALMOST CLOSED., clamp(34 px, 4.2vw, 62 px), line-height .98;
    - sub: "3 of 5 steps done. Next: the final deduction and absences email, due Sunday 15 November.", 14.5 px at 78 %, max 31 rem;
    - CTA: Continue ▸, a white rectangle with a radius of 10, padded 12 × 20, 13.5 px 500;
    - a text link: See every step.
  - **Glass card**, bottom-right:
    - glass `rgba(28,28,28,.5)` with a blur of 16 px and a 1 px border at 14 %;
    - a 64 × 46 thumbnail;
    - "Latest import / Genesys exports, 6 files / Today, 09:40";
    - a white 48 × 64 arrow button.
  - **Micro-label**, bottom-left: what the picture shows, in 10.5 px capitals at +.16em and 55 %.
- **Cards row**, columns 2fr 1fr 1fr:
  1. **Daily brand emails:** four fanned email previews on the left. On the right, "4 made today, / **ready to send**" and a slider pill (mail › › › check).
  2. **Adherence:** 92.7 % in 30 px, the ↗ disc, the line "164 agents, 0.4 pts better than August", and six monthly bars on stripes.
  3. **Team:** the avatar mosaic with three + spots (the three who need attention) and a white View pill.
- **Below:** "The month in numbers", six number tiles (3 × 2, radius 18), then two panels side by side:
  - Needs attention (4 people);
  - Month close (5 steps, 3 done).

## 5. Motion
| Element | From | Duration | Delay |
|---|---|---|---|
| Nav | fades from −10 px | .6 s | — |
| Picture | settles from scale 1.05 | 1.6 s | — |
| H1 lines | rise out of a mask | .8 s | .15 s + i × .1 |
| Sub, then CTA | fade and rise 14 px | — | .45 / .55 s |
| Cards | rise 18 px | — | .5 s + i × .08 |

- Easing is cubic-bezier(.22,1,.36,1). Everything is done by 1.3 s.
- Hovers take 200 ms.
- With reduced motion, nothing moves and the final state shows.

## 6. Phone (390 px)
- **Frame:** padding 8, radius 22.
- **Nav:** the mark, CADENCE, then search, the bell and the avatar. The page links move to a scrollable pill row under the nav.
- **Headline panel:** 470 px tall.
  - The tabs are short (Jul / Aug / Sep) and the notch stays.
  - The H1 is 30 px and starts under the notch.
  - The glass card is full width at the bottom.
- **Cards:** the emails card spans both columns; Adherence and Team sit side by side.
- **Number tiles:** 2 columns.
- **Tap targets:** 44 px or more.

## 7. Constraints & acceptance
- **No:**
  - photos, remote files or real names;
  - more than two font families;
  - status colours on anything that is not a status.
- **Acceptance, first desktop screen:**
  - the frame on #1e1e1e, the pill nav across the top;
  - the headline panel filling about 58 % of the height, with the drawn picture behind the two-line headline on the left;
  - the month tabs in the notch at the top right, the glass import card at the bottom right;
  - the three cards in one row underneath.

## 8. B · Glass (`make-glass.cjs` → `B-glass.html`)
Option B, made glassy and floating, with the motion of the team's reference reel (an admin dashboard: glass panels over floating glossy spheres). It has three screens you can move between; each is a real Cadence job:
- **Dashboard:** B's layout.
- **Emails:** the daily brand emails as a board: To check, Ready to send, Sent.
- **Team:** the agents table.

**Background:**
- six glossy spheres in Beyond One's colours (orange, blue, teal, cyan, silver, pink): radial-gradient highlight, inner shadow and a soft glow;
- `position: fixed` on a deep navy (#05070d), behind everything;
- each page gives them new places, and they glide there in 1.4 s;
- they drift slowly (11–20 s);
- with a mouse they follow the pointer a little, by depth.

**Glass (one material):**
- `rgba(13,18,29,.5)` with a 155° white sheen, `blur(28px) saturate(1.5)`;
- a 1 px gradient rim (masked pseudo-element), a deep soft shadow;
- a light that follows the pointer across the panel;
- panels lift 3 px on hover.

The headline panel keeps the notch: the glass is cut around the month tabs (`clip-path: path()`, measured in the page), with an SVG rim along the cut.

**Motion, as in the reel:**
| Moment | What moves |
|---|---|
| First visit | the spheres rise out of the dark; the nav drops in; the blocks come in one after another; the headline words come out of a blur; the team tiles light up in a wave; the numbers count up; the chart line draws itself; the ring and the bars fill |
| Page change | the old page fades up and blurs out (0.3 s); the spheres glide to the new page's places; the blue nav pill slides; the new title arrives word by word, then its blocks and rows (45–70 ms apart) |
| Clicks | a ripple where you click; tab underlines and the range thumb slide |
| Chart range (6M / 30D / 7D) | the line and the August line reshape from one range to the other (0.9 s) |
| Emails board | after 6 px of drag the card lifts as a ghost (scale 1.04, −2°, back-out); the lane under it is outlined in blue; on drop the card lands in the lane and a toast rises with Undo; arrow keys move a focused card too |

With reduced motion nothing moves, and every screen and the board still work.

**Checks (scripts in the scratchpad, not kept):**
- the drag test reads the ghost's transform while dragging: scale 1.04 at −2°;
- it checks that the Sent lane lights up, that the card lands there with the toast "Virgin Mobile · marked as sent", and that Undo puts it back;
- there are no page errors and no requests.
