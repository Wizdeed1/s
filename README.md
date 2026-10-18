# MC Monthly Report Builder

The Member Care Workforce Management tool: one offline HTML file that turns the month's Genesys Cloud exports and the
supervisors' attendance sheets into the monthly report, the incentive data and everything that follows (KPI results,
one-to-ones, objections, the senior manager's review and final, the month close, the daily Member Care reports).

This repository holds the v33 source restored from *MC Monthly Report Builder.md* (Part 2), with the approved
**Option C** visual design built on top of it. Every calculation, rule, output, email template, role, permission and
storage format is unchanged from v33; only the interface changed.

**The built file:** [`final/MC Monthly Report Builder.html`](final/MC%20Monthly%20Report%20Builder.html). Open it in
Microsoft Edge or Google Chrome; it goes in the common folder next to the **MC Data** folder, as before.

## What Option C changed

| Area | What you see now |
|---|---|
| Navigation (D1) | A near-black sidebar with each role's pages; a 72 px icon rail below 1,280 px (remembered in this browser); a tab bar with four items and **More** on phones. |
| Header | One page title with the role beside it, Search (Ctrl K), the bell (builders), the **reporting period** on every page except Build (D13; a final month shows a lock and is read-only), a **theme menu for everyone** (D4, same `mc-theme` setting) and the account menu. |
| Dashboard (D2, D6) | The first page of the admin, WFM analyst, WFM manager and senior manager: greeting, quick actions for the role, six KPI cards (Agents, Adherence, AHT, Absent days, Deduction minutes, Final %) with the change against the month before in words and a six-month sparkline, a trend chart (measure, team or brand, legend toggles, table view, keyboard), Today, Needs attention, Month close, Recent activity and Data status. Built only from data the tool already had. |
| Build | Its own step bar with a steps-done ring. Import shows what the workbook needs and a **session-only import log** (D7). Review opens on a **Checks** tab (D5) with five filter tiles; each check expands to what happened, why it matters and what happens until you act, and decisions are made in place (Link… opens a side panel). Build readiness lists the three real blockers. **Build the workbook** asks first (Cancel has the focus), shows honest progress, then says "Saved … at 09:21. Nothing was sent or uploaded." Email steps record "Copied" or "Downloaded" with the time; the tool still never sends. |
| Team | A filter bar (brand, team, supervisor, search) with removable chips, Clear all and a line saying what the filters affect; tabs that keep the filters (Agents, One-to-ones, Attendance, Objections, Calls, Team KPIs, Waiting for approval); a sortable agents table with eligibility and one-to-one badges, 25 per page (D11); a row opens the agent's panel and Esc returns to the row. Team KPIs show only the scorecard's KPIs. |
| Results, Supervisors | Finalize goes through a dialog that says what locks. The Supervisors page has a local list of its sections. |
| Everywhere | Option C tokens (layered dark surfaces, orange only for the main action, the current place, step and progress; contrast-checked text), corners 4/6/10/14 px (D3), Poppins 600 titles and Inter with tabular figures, quieter status lines, "Not one of your pages" for links to a page the role cannot use, a leave-page warning only while a file is read or a save is in flight (D14), and "Try again" on a failed save. |
| Motion (D9) | Still for everyday work; three moments only: the dashboard's first load of a visit, a Build step change, a finished build. Reduced motion turns movement into 120 ms fades and stops the loops. |

## Building

```bash
cd js
python3 combine.py > ../out/combined_main.js && node --check ../out/combined_main.js     # the main script parses
bash assemble_standalone.sh "../final/MC Monthly Report Builder.html"                   # the common-folder file
bash assemble3.sh ../out/mc-report-builder.html                                         # the online page
```

Or from the top folder: `npm run build` (the same three steps into `out/mc.html`) and `npm test` (checks that need only Node;
GitHub Actions runs both on every push, see `.github/workflows/node.js.yml`).

`tools/build_fonts.py` rebuilds `js/fonts.css` (Inter and Poppins, SIL Open Font License) from `MC_INTER` and
`MC_POPPINS` (defaults: the system Inter and `tools/fontsrc/`). It needs `pip install fonttools brotli`.

### Parts the document described but did not print

The markdown printed every source file but left out encoded data. They are recreated here as follows; drop the
originals from your own project folder in their place to get them back byte for byte:

| File | Here | The original |
|---|---|---|
| `js/fonts.css` | Rebuilt by `tools/build_fonts.py` | Same faces and subset rules |
| `js/brand_src.html` | An empty block: no company logo is built in (the neutral WF mark shows; a logo can be chosen in Settings) | The Beyond One logos |
| `dt/templates.js` | The three daily email templates as printed, each omitted image replaced by a 1×1 placeholder | The templates with their logo images |
| `dt/logos.js`, `dt/seed.js` | Empty | The daily emails' logos and the report builder's history seed |

Because of the placeholder images, the four daily brand emails are not byte-identical to Member Care Report Builder 14
until the original `dt/templates.js` and `dt/logos.js` are put back.

## Tests

The visual tests use only synthetic people (first name and initial, made-up IDs, example.com addresses):

```bash
export NODE_PATH=$(npm root -g)                     # Playwright
node test/shots.cjs  "final/MC Monthly Report Builder.html" test/shots           # every role, both themes, desktop, laptop, tablet, phone
node test/exports.cjs /tmp/exports                                                # synthetic September 2026 Genesys exports
node test/buildflow.cjs "final/MC Monthly Report Builder.html" /tmp/exports test/shots   # Import → Checks → Link → Build → Email
node test/overlays.cjs "final/MC Monthly Report Builder.html" test/shots          # menus, search, More sheet, blocked page, sign-in
node test/motion.cjs "final/MC Monthly Report Builder.html" test/shots            # the dashboard moment, Team table speed
```

They load the page with `window.__NOLOCK__` and `window.__ROSTER__` (the existing test hooks) and `window.__mcUser`,
a test-only pretend person that `auth.js` honours only when there is no data store and sign-in is off.
