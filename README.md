# MC Monthly Report Builder

The Member Care Workforce Management tool: one offline HTML file that turns the month's Genesys Cloud exports and the
supervisors' attendance sheets into the monthly report, the incentive data and everything that follows (KPI results,
one-to-ones, objections, the senior manager's review and final, the month close, the daily Member Care reports).

This repository holds the v33 source restored from *MC Monthly Report Builder.md* (Part 2), with the **Option A
(Daylight)** visual design built on top of it, following Apple's Human Interface Guidelines, and the October 2026 additions
below. Every calculation, output, email
template, role, permission and storage format is the same as v33 **by default**: the new counting settings start at what
v33 did (tests compare 10,000 synthetic people against the v33 code), and the only permission added on request is that the
WFM analyst shares the Emails page with the WFM manager. The tool still sends nothing and makes no network request.

**The built file:** [`final/MC Monthly Report Builder.html`](final/MC%20Monthly%20Report%20Builder.html). Open it in
Microsoft Edge or Google Chrome; it goes in the common folder next to the **MC Data** folder, as before.

## The design: Option A, by Apple's guidelines

Option A was chosen from three samples and built by the rules of Apple's Human Interface Guidelines (as the
[apple-design-skill](https://github.com/dickwu/apple-design-skill) reviews them). What changed, and the guideline behind it:

| Area | What you see now |
|---|---|
| Look | Light: the system grey background, white cards with 16 px corners and a soft shadow, Apple's status colours (green, orange, red, blue) for good, warning, bad and information. Orange is kept for the main action, the current place and progress; text is contrast-checked (small text close to 7:1). Titles and numbers use **Geist**, body text the system font (San Francisco on a Mac or iPhone, Geist elsewhere). |
| Appearance | **System**, **Light** or **Dark**, chosen in the account menu (everyone, on a computer and on a phone), in Settings (the people who build the month) or with Search ("dark", "light", "theme"). System, the first choice, follows the computer and changes with it. The choice is kept in this browser (the `mc-theme` setting, as before) and applied before the first paint (`js/theme_boot.html`). Apple's guidelines prefer no setting of an app's own (*dark-mode*); it is offered because it was asked for. Increased contrast and reduced transparency in the system are followed. |
| Navigation (D1) | A frosted sidebar with each role's pages in the role's own order, icons in orange, Search at its top; a 72 px icon rail below 1,280 px (remembered in this browser). On a phone: a tab bar with every page when there are five or fewer (only the admin, with seven, gets **More**), no tab bar for a role with one page (the agent, the supervisor, the quality team), and How to use and Settings in the account menu (*tab-bars*: no overflow tab when everything fits). |
| Toolbar | Frosted; the page's large title moves into it as the page scrolls under it. The bell, the **reporting period** on every page except Build (D13; a final month shows a lock and is read-only), How to use, Settings and the account menu; on a phone the account and period menus open as sheets from the bottom. |
| Words | Buttons, menus, tabs, segmented controls, sidebar items and column headings use **title-style capitalization** ("Build the Month") on screen (`js/caps.js`); the emails, forms, files, toasts and the one-to-one forms keep their words exactly. |
| Controls | Grey-filled buttons and one orange filled main action; segmented controls with a white thumb for tabs and choices; pop-up buttons with the system's double chevron; fields with a 3.5 px orange focus ring; capsule chips. |
| Tables | Alternating rows instead of lines between rows (*lists-and-tables*), headings that stay on top. |
| Materials | Blur only on the layer that floats over the content: the sidebar, the toolbar, the tab bar, menus, popovers and the toast; the content itself is solid (*materials*). |
| Dashboard (D2, D6) | The first page of the admin, WFM analyst, WFM manager and senior manager: greeting, quick actions for the role, six KPI cards three to a row (Agents, Adherence, AHT, Absent days, Deduction minutes, Final %) with the change against the month before as a chip and a six-month sparkline, **Month close** with the senior manager's five steps only (a ring for how many are done, each step's state and due day, what is yours next), the trend chart (measure, team or brand, legend toggles, table view, keyboard), what needs attention, the lowest adherence and data status. Built only from data the tool already had. |
| Build | Its own step bar with a steps-done ring. Import shows what the workbook needs and a **session-only import log** (D7). Review opens on a **Checks** tab (D5) with five filter tiles; each check expands to what happened, why it matters and what happens until you act, and decisions are made in place (Link… opens a side panel). Build readiness lists the three real blockers. **Build the Workbook** asks first (Cancel has the focus), shows honest progress, then says "Saved … at 09:21. Nothing was sent or uploaded." Email steps record "Copied" or "Downloaded" with the time; the tool still never sends. |
| Team | A filter bar (brand, team, supervisor, search) with removable chips, Clear all and a line saying what the filters affect; tabs that keep the filters (Agents, One-to-Ones, Attendance, Objections, Calls, Team KPIs, Waiting for approval); a sortable agents table with eligibility and one-to-one badges, 25 per page (D11); a row opens the agent's panel and Esc returns to the row. Team KPIs show only the scorecard's KPIs. |
| Results, Supervisors, WFM | Finalize goes through a dialog that says what locks. The Supervisors page has a local list of its sections. The WFM analytics measures are tiles; the one shown below is tinted. |
| Motion (D9) | Still for everyday work (*motion*: nothing moves on what is done many times a day; changing page or step is immediate). The dashboard's numbers count up on the first load of a visit and its rings fill; a finished build has its moment; progress bars (the Supervisors card, the month close) grow from where they were last shown, and a redraw with the same numbers stays still. On a phone a drawer swipes away to the right and the More sheet down, from where the finger lets go and at its speed: a flick closes from anywhere, a slow pull past half closes, anything less goes back (GSAP, Apple's momentum projection). Scrolling is the browser's own. Reduced motion turns movement into 120 ms fades. |
| Kept from before | "Not one of your pages" for links to a page the role cannot use, a leave-page warning only while a file is read or a save is in flight (D14), and "Try again" on a failed save. |

## October 2026 additions

| Area | What you see now |
|---|---|
| System names | **Match system names** (People) lists every Genesys name nobody matches, with the clear matches ticked: one click applies them all, the rest are picked from the registered system names (a list on every System name cell, no typing). Undo puts everything back. |
| Duplicate names | **Duplicates** finds people listed twice (one National ID or one Genesys name on two people, a system name that is someone else's name, the same name, two spellings of one name) and shows each group side by side; **Combine** keeps one person with every name they are known by, decided one by one or all the sure ones at once. The name shown everywhere is the system name. |
| How it is counted | The rules drawer has a **How it is counted** section (scheduled and late days, the absence penalty, the fewest days for the incentive, a KPI with no value, a value exactly on a band, ranking and Final % rounding, whole SR, the critical errors that stop the incentive); every setting starts at what the tool always did and the pill says when one is changed. Every person's panel, and **How** beside each Final % in the results, shows **How this was counted**: each KPI's value, band, rank and points, the days, and the checks that decided eligibility. |
| One drop zone, Recognise files | **Build › Import** takes all the month's files in one drop: the Genesys exports and attendance sheets fill the month; the Final EVAL goes to Quality for its month, the KPI file to KPI results, the old Excel to Results › Reconcile, the incentive data of an open past month to the history. Anything that could do harm where it lands, or that needs a decision, opens **Recognise files**: what the file is and why (Sure, Likely, Not sure), its month (and when its name and content disagree), who in it is on the roster, and *Use it for …* the page that takes it. A drop anywhere on the other pages, Search › *Recognise a file* and *What is it?* on any rejected file open it too. It is worked out on the computer from the sheet names, columns, titles and dates (`js/recog_core.js`, in the parse worker): nothing is uploaded, and a choice is remembered by the shape of the columns only. |
| Reconcile with the old Excel | **Results › Reconcile with the old Excel** (it replaces the parallel run) takes up to three old files at once (the final result, the incentive data workbook, the deduction workbook) or the results table pasted from the email. Each file shows what it is and the month it holds (the deduction workbook named 2026-08 holds Sep 2026). Every person is lined up by national ID, then by name, and every difference is grouped by its cause (`js/recon.js`): no value in the tool, no scorecard for the team, an own incentive base, days taken off for absences (with the rules that fit and what the chosen one does to every absent person), days counted differently, a different Final % (with the KPIs that have no value), not eligible, other Genesys numbers, rounding. The senior manager or an admin fixes the cause (**Use these bases**, **Use this rule**) or takes the old value as a logged adjustment, each with Undo; the deduction workbook's typed-over Diff cells and the old workbook's slips are listed; everything exports to Excel. |
| Supervisors page | The top card shows only each supervisor and how many of their agents are finished; the month close steps fold away lower on the page (their deadlines are in the bell). |
| Quality | The Quality page is the quality team's Final EVAL template, one table per team: Call QA, Ticket QA / Empowerment Utilization, Call Reason & FCR Accuracy and the Final Score (their average until someone types it); CT has the Evaluation score. **DRC-CSAT** is one box: the score typed once counts for every agent whose scorecard has it (Undo in the toast). The EVAL template downloads with IDs. |
| Agent page | A month box with back and forward arrows to see any month the agent has (English and Arabic). |
| Deadlines | No banner or strip on the pages: the bell (every role) holds the to-do list with what is late and due soon, and a late item shows once a day as a toast. |
| Emails | One **Emails** tab on the WFM page for the WFM manager and the WFM analysts: the four daily brand emails and the month's deduction and absences emails, all editable (Edit in the preview) and sent the same way (copied or opened in Outlook; the tool sends nothing). |
| How to use | A guide for each department (WFM analyst, WFM manager, senior manager, supervisor, quality, agent in English and Arabic, admin). |

GSAP 3.15.0 is built into the file from `vendor/` (see `vendor/README.md` for the licence), and Geist from `js/fonts.css`, so
the page still works offline.

## Building

```bash
cd js
python3 combine.py > ../out/combined_main.js && node --check ../out/combined_main.js     # the main script parses
bash assemble_standalone.sh "../final/MC Monthly Report Builder.html"                   # the common-folder file
bash assemble3.sh ../out/mc-report-builder.html                                         # the online page
```

Or from the top folder: `npm run build` (the same three steps into `out/mc.html`) and `npm test` (checks that need only Node;
GitHub Actions runs both on every push, see `.github/workflows/node.js.yml`).

`tools/build_fonts.py` rebuilds `js/fonts.css` from `tools/fontsrc/geist-latin.woff2` (Geist, the latin subset as Google Fonts
serves it, SIL Open Font License 1.1 in `tools/fontsrc/GEIST-OFL.txt`). It needs only Python.

### Parts the document described but did not print

The markdown printed every source file but left out encoded data. They are recreated here as follows; drop the
originals from your own project folder in their place to get them back byte for byte:

| File | Here | The original |
|---|---|---|
| `js/fonts.css` | Geist, rebuilt by `tools/build_fonts.py` (Option A) | Inter and Poppins |
| `js/brand_src.html` | An empty block: no company logo is built in (the neutral WF mark shows; a logo can be chosen in Settings) | The Beyond One logos |
| `dt/templates.js` | The three daily email templates as printed, each omitted image replaced by a 1×1 placeholder | The templates with their logo images |
| `dt/logos.js`, `dt/seed.js` | Empty | The daily emails' logos and the report builder's history seed |

Because of the placeholder images, the four daily brand emails are not byte-identical to Member Care Report Builder 14
until the original `dt/templates.js` and `dt/logos.js` are put back.

## Tests

The visual tests use only synthetic people (first name and initial, made-up IDs, example.com addresses):

```bash
export NODE_PATH=$(npm root -g)                     # Playwright
node test/shots.cjs  "final/MC Monthly Report Builder.html" test/shots           # every role, light and dark (as the system is set), desktop, laptop, tablet, phone
node test/exports.cjs /tmp/exports                                                # synthetic September 2026 Genesys exports
node test/buildflow.cjs "final/MC Monthly Report Builder.html" /tmp/exports test/shots   # Import → Checks → Link → Build → Email
node test/overlays.cjs "final/MC Monthly Report Builder.html" test/shots          # menus, search, More sheet, blocked page, sign-in
node test/motion.cjs "final/MC Monthly Report Builder.html" test/shots            # the dashboard moment, KPI rows level, Supervisors bars, the More sheet swipe, Team table speed
node test/quality.cjs "final/MC Monthly Report Builder.html" test/shots           # Final EVAL template, DRC-CSAT box, scorecards
node test/signin.cjs "final/MC Monthly Report Builder.html" test/shots            # sign-in, lock and unlock
node test/agent.cjs "final/MC Monthly Report Builder.html" test/shots             # the agent's page and its month box, English and Arabic
node test/recon.cjs "final/MC Monthly Report Builder.html" test/shots             # Results › Reconcile on synthetic old workbooks (test/oldbooks.cjs)
node test/recog.cjs "final/MC Monthly Report Builder.html" /tmp/exports test/shots   # nine files in one drop, the Recognise files panel
node test/caps.cjs "final/MC Monthly Report Builder.html"                         # title-style capitalization on buttons, menus, tabs and headings
node test/theme.cjs "final/MC Monthly Report Builder.html" test/shots             # the appearance: System, Light, Dark, kept and applied before the first paint
npm test                                                                          # unit checks, the counting rules against v33 (test/ref), the reconcile engine, the recogniser
```

They load the page with `window.__NOLOCK__` and `window.__ROSTER__` (the existing test hooks) and `window.__mcUser`,
a test-only pretend person that `auth.js` honours only when there is no data store and sign-in is off.
