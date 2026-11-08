# Cadence: UX strategy brief

November 2026. The approved look (colours, type, layout) is unchanged. What changed is how people move through the work.
No calculation, rule, saved format, email or permission changed. The new code is `js/ux.js` and `js/ui6/76_ux.css`,
with small changes to the page modules. Every interaction below is checked by `test/ux.cjs`; the other 36 browser suites
still pass.

## 1. The journeys, re-engineered

| Workflow | Before | Now |
|---|---|---|
| **Month close** (Supervisors, 8 steps) and **Quality** (6 steps) | Every step fully open, captions under each title, done steps as large as open ones. | **Vertical stepper.** Each step is one line: number or ✓, title, state, a short note, and its main action. A step's cards open only when it is **next**, or when they are its working data (who finished on Supervisors, the tables on Weekly commercial and Performance Review). A chevron or a click on the title opens or closes a step, and this browser remembers it. A **progress bar** above the steps shows how many are done, names the next one with **Go to step**, and has **Open all**. |
| **Quality KPI grid** (164 agents, about 800 boxes) | Every team's table stacked: a 4,700 px page. | **Team tabs** (Virgin · CC 70, Virgin · SM 22, …, All 164). A search still shows every match. 1,760 px. |
| **Typing values in a table** (Quality, Results adjustments, the supervisors' scorecard, Review › People) | Each value saved redrew the page and **lost the cursor**, so the next box had to be clicked. | **Spreadsheet keys.** Enter saves and goes down a row, Shift+Enter goes up, ↑ and ↓ move, Esc puts the value back. The cursor returns to the right box after every redraw. |
| **Results triage** (senior manager) | Search, team and supervisor only; one eligibility decision at a time. | **Show** filter with counts (Not eligible · 24, Decided by hand, Changed by hand, No earned SR, Below target), **row selection**, and a **bulk bar**: Eligible, Not eligible, By the rules, Copy names, Copy IDs. Each decision is still logged one by one, and there is **Undo**. |
| **Import** | Four large export cards, a drop zone with a paragraph of help, and several explanatory paragraphs. | A ready export is **one slim line** (file, counts, Ready, Replace and Remove). Once files are in, the drop zone is a **slim bar**. Every explanation is behind ⓘ. 2,329 → 1,764 px. |
| **Export** | Nine sheet-description cards and five "after you download" instructions, always open. | Both behind **disclosures** ("Sheets in the monthly report", "After you download · 5 tips"). 1,909 → 1,382 px. |
| **Review › People** | 176 people as cards: a 10,500 px page. | Opens as the **table** (the choice is remembered). 1,247 px. |
| **Long read-only lists** (e.g. Hidden from the reports, 128 lines) | Every line shown. | The first 10, then **Show all 128**. |

## 2. What moved off the main view

Everything that explains, as opposed to everything that tells a state, now sits behind a small **ⓘ next to the title it
belongs to**. Pointing at it shows the text; focusing it with the keyboard does too; a click pins it until Esc or a click
elsewhere. Screen readers hear the same text as the ⓘ's description.

- **Page leads** on every page (Results, Supervisors, Team, Quality, My page, WFM team and each of its tabs, Import, Review, Export).
- **Step captions** (what each step is for) and the captions under "To look things up" and "Set once".
- **Card captions**: chart and table descriptions (Trend, Distribution, Teams, By supervisor, Supervisor results, Every agent,
  Agents, Saved uploads, Import log, the KPI results helpers and others).
- **Import**: the drop zone's file rules, what each missing export must contain, the attendance and DRC-CSAT notes.
- **Export**: the sheet descriptions and the after-download tips (in disclosures).

**Stays on the page:** numbers, states and deadlines ("0 of 12 supervisors finished", "Based on 12 days", "Draft · saved
by…"), warnings, empty states and every action.

**Show guidance** (account menu, or Shift+H) puts every explanation back under its title for someone learning the tool.
It is remembered in this browser. **How to use** has a new "Work faster" section.

Prose on the main views across every role and page: **7,522 → 4,083 words (−46%)**.

## 3. New productivity features

- **Copy a table** (the copy button in a data card's header): the rows on screen with their headings, as a table Outlook
  and Excel paste as one, plus tab-separated text. On **Team**, Copy takes every agent the filters show, on every page,
  with National ID and supervisor.
- **Filter rows** (the search button on a long table that has no search of its own). The filter survives redraws, and Esc
  clears it.
- **Click a National ID to copy it** (Team rows, the agent's panel), without opening the row.
- **Paste a column from Excel** into the Quality grid. Every value is checked first and the paste is saved as **one** logged
  change ("Call QA pasted for 3 people"). A column with a word in it is refused.
- **Bulk eligibility and copy** on Results (above).
- **Keyboard**: ? lists the shortcuts. g then a letter opens a page (d Dashboard, w WFM team, i Import, e Export, q Quality,
  c Supervisors, t Team, r Results, m My page); [ and ] change the month; Ctrl+K or / searches; Shift+H toggles guidance.
  S and Z stay the presenter's spotlight and zoom.
- **The cursor survives redraws** (above), the main fix for anyone typing a month's values.

## 4. Deliberately kept

- **The one-to-one form stays on one page**, as asked for earlier (task: "One-to-one form on one page"), instead of
  becoming a multi-step modal.
- Calculations, rounding, eligibility, storage keys and formats, the workbooks and every email body (byte for byte), and
  who may see or do what.
- The only new things remembered are per-browser preferences, like the appearance: `mc-guide` (guidance) and
  `mc-ux-open:<step>` (a step opened or closed).

## 5. Measured effect (made-up data, 1440 × 900)

| Page | Words of prose | Page height |
|---|---|---|
| Quality (admin) | 273 → 14 | 4,712 → 1,760 px |
| Review › People | 40 → 23 | 10,499 → 1,247 px |
| Export | 331 → 116 | 1,909 → 1,382 px |
| Import | 543 → 251 | 2,329 → 1,764 px |
| Supervisors (month close) | 439 → 172 | 3,376 → 2,916 px (2,042 px with step 4 closed) |
| Results | 157 → 22 | 2,992 → 2,860 px |
| Team | 39 → 0 | 2,938 → 2,896 px |
| WFM team › Emails | 281 → 83 | 3,097 → 2,881 px |
| Every role, every page | 7,522 → 4,083 | 103,675 → 87,256 px |

## 6. Accessibility and safety

- Each ⓘ is a real button with a name ("About Results") and the explanation as its description. Esc closes it and returns
  focus. Motion follows the reduced-motion setting.
- Bulk decisions go through the same per-person function as before, so each one is logged, and Undo restores the previous
  decisions.
- The step toggles, filter boxes and bulk bars work with the keyboard. Nothing new is sent anywhere: the tool still makes no
  network request.
