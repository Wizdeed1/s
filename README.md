# MC Monthly Report Builder

The Member Care Workforce Management tool: one offline HTML file that turns the month's Genesys Cloud exports and the
supervisors' attendance sheets into the monthly report, the incentive data and everything that follows (KPI results,
one-to-ones, objections, the senior manager's review and final, the month close, the daily Member Care reports).

This repository holds the v33 source restored from *MC Monthly Report Builder.md* (Part 2), with the **Option A
(Daylight)** visual design built on top of it, following Apple's Human Interface Guidelines, now in **glass** (see below), and
the October 2026 additions below. Every calculation, output, email
template, role, permission and storage format is the same as v33 **by default**: the new counting settings start at what
v33 did (tests compare 10,000 synthetic people against the v33 code), and the only permissions added on request are that the
WFM analyst shares the Emails page with the WFM manager and that the WFM team (and admins) can export and import all the data.
The tool still sends nothing and makes no network request; opened as a file, the browser itself now refuses any web
address (see the security review below).

**The built file:** [`final/MC Monthly Report Builder.html`](final/MC%20Monthly%20Report%20Builder.html). Open it in
Microsoft Edge or Google Chrome; it goes in the common folder next to the **MC Data** folder, as before.

## Glass (glassmorphism)

Since 27 October 2026 the interface is frosted glass over a soft, still field of colour (`js/ui6/97_glass.css`, the last
layer, so the design underneath is unchanged and comes back by removing the file):

| Part | How it looks |
|---|---|
| The field | A few broad washes of the brand orange and the data colours (blue, violet, teal) under everything, in light and in dark. It never moves and is painted once, so scrolling stays smooth. |
| Panels | Cards, dashboard tiles, filter bars and the sign-in card are translucent (white in light, graphite in dark) and frost what is behind them, with a bright top edge where light catches the glass and a soft shadow. |
| No glass on glass | A panel inside a card, a drawer or a dialog is a light fill, not a second blur, so text stays sharp. Person tiles and nested boxes are translucent without a blur of their own (many on screen at once). |
| Floating parts | The sidebar is the heaviest glass, the toolbar and tab bar lighter; drawers, dialogs, menus and the hover previews are thicker glass with a stronger blur. Dialogs arrive as a material (their frost and size together) unless the system asks for less motion. |
| Tables | Sticky headers and first columns are nearly solid, so rows never show through a name or a figure. Separators blend into the glass; control edges stay solid. |
| Legibility | Secondary text is a step darker in light and lighter in dark than on solid panels; the main action stays solid orange. |
| System settings | *Reduce transparency* turns every surface solid and the field off; *Increase contrast* makes panels nearly solid with a defined edge; printing shows white panels and no field. |

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
| Build (now WFM team › Import, Review, Export) | The month's steps are tabs of the WFM team page (see the second round below). Import shows what the workbook needs, a **session-only import log** (D7) and the **saved uploads**. Review opens on a **Checks** tab (D5) with five filter tiles; each check expands to what happened, why it matters and what happens until you act, and decisions are made in place (Link… opens a side panel). Build readiness lists the three real blockers. **Build the Workbook** asks first (Cancel has the focus), shows honest progress, then says "Saved … at 09:21. Nothing was sent or uploaded." Email steps record "Copied" or "Downloaded" with the time; the tool still never sends. |
| Team | A filter bar (brand, team, supervisor, search) with removable chips, Clear all and a line saying what the filters affect; tabs that keep the filters (Agents, One-to-Ones, Attendance, Objections, Calls, Team KPIs, Waiting for approval); a sortable agents table with eligibility and one-to-one badges, 25 per page (D11); a row opens the agent's panel and Esc returns to the row. Team KPIs show only the scorecard's KPIs. |
| Results, Supervisors, WFM | Finalize goes through a dialog that says what locks. The Supervisors page has a local list of its sections. The WFM analytics measures are tiles; the one shown below is tinted. |
| Motion (D9) | Still for everyday work (*motion*: nothing moves on what is done many times a day; a page or tab rises in only the first time it is shown in a visit). The dashboard's numbers count up on the first load of a visit and its rings fill; a finished build has its moment; progress bars (the Supervisors card, the month close) grow from where they were last shown, and a redraw with the same numbers stays still. On a phone a drawer swipes away to the right and the More sheet down, from where the finger lets go and at its speed: a flick closes from anywhere, a slow pull past half closes, anything less goes back (GSAP, Apple's momentum projection). Scrolling is the browser's own. Reduced motion turns movement into 120 ms fades. |
| Kept from before | "Not one of your pages" for links to a page the role cannot use, a leave-page warning only while a file is read or a save is in flight (D14), and "Try again" on a failed save. |

## October 2026 additions

| Area | What you see now |
|---|---|
| System names | **Match system names** (People) lists every Genesys name nobody matches, with the clear matches ticked: one click applies them all, the rest are picked from the registered system names (a list on every System name cell, no typing). Undo puts everything back. |
| Duplicate names | **Duplicates** finds people listed twice (one National ID or one Genesys name on two people, a system name that is someone else's name, the same name, two spellings of one name) and shows each group side by side; **Combine** keeps one person with every name they are known by, decided one by one or all the sure ones at once. The name shown everywhere is the system name. |
| How it is counted | The rules drawer has a **How it is counted** section (scheduled and late days, the absence penalty, the fewest days for the incentive, a KPI with no value, a value exactly on a band, ranking and Final % rounding, whole SR, the critical errors that stop the incentive); the pill says when a setting differs from the default. By default a percent KPI is rounded to a whole % before it is ranked (94.99% → 95%, half up as Excel shows it) and so is the Final %, as the old incentive files did; the days % is never rounded, because the old files pay with the exact days. Rules saved before this default follow it too, unless the senior manager picks "not rounded" again; final months keep their numbers. Every person's panel, and **How** beside each Final % in the results, shows **How this was counted**: each KPI's value, band, rank and points, the days, and the checks that decided eligibility. |
| One drop zone, Recognise files | **Build › Import** takes all the month's files in one drop: the Genesys exports and attendance sheets fill the month; the Final EVAL goes to Quality for its month, the KPI file to KPI results, the old Excel to Results › Reconcile, the incentive data of an open past month to the history. Anything that could do harm where it lands, or that needs a decision, opens **Recognise files**: what the file is and why (Sure, Likely, Not sure), its month (and when its name and content disagree), who in it is on the roster, and *Use it for …* the page that takes it. A drop anywhere on the other pages, Search › *Recognise a file* and *What is it?* on any rejected file open it too. It is worked out on the computer from the sheet names, columns, titles and dates (`js/recog_core.js`, in the parse worker): nothing is uploaded, and a choice is remembered by the shape of the columns only. |
| Reconcile with the old Excel | **Results › Reconcile with the old Excel** (it replaces the parallel run) takes up to three old files at once (the final result, the incentive data workbook, the deduction workbook) or the results table pasted from the email. Each file shows what it is and the month it holds (the deduction workbook named 2026-08 holds Sep 2026). Every person is lined up by national ID, then by name, and every difference is grouped by its cause (`js/recon.js`): no value in the tool, no scorecard for the team, an own incentive base, days taken off for absences (with the rules that fit and what the chosen one does to every absent person), days counted differently, a different Final % (with the KPIs that have no value), not eligible, other Genesys numbers, rounding. The senior manager or an admin fixes the cause (**Use these bases**, **Use this rule**) or takes the old value as a logged adjustment, each with Undo; the deduction workbook's typed-over Diff cells and the old workbook's slips are listed; everything exports to Excel. |
| Months in the job, absence penalty | **Who earns the incentive** has **Months in the job** (6 by default): the incentive starts with the sixth full month in the job; the month they joined counts only when they joined on the 1st (joined 1 Jan 2026: from Jun 2026; joined 18 Jan 2026, six months done on 18 Jun: from Jul 2026). It reads the **joining date** on the roster: a "Joining date" column in the roster file (18/01/2026, 2026-01-18, 18-Jan-2026 or an Excel date) or the person's page (Edit); the roster export has it. Without a joining date the rule is not checked, and Checks lists who has none. Results, How this was counted and the person's page say "joined 18 Apr 2026: earns from Oct 2026". 0 turns the rule off. The **absence penalty** (How it is counted) takes N days off the actual days for each Absent day, never for SL, AL or another leave: with 3 (Member Care's rule: one absent day costs 4 days in all), 22 scheduled and 1 absent gives 21 − 3 = 18 counted days. |
| Supervisors page | The top card shows only each supervisor and how many of their agents are finished; the month close steps fold away lower on the page (their deadlines are in the bell). |
| Quality | The Quality page is the quality team's Final EVAL template, one table per team: Call QA, Ticket QA / Empowerment Utilization, Call Reason & FCR Accuracy and the Final Score (their average until someone types it); CT has the Evaluation score. **Call QA is Quality Observations** in the scorecards, not the Final Score (CT, with no Call QA: the Final Score); months saved before count Call QA too while they are open, and a final month stays as it was finalized. **DRC-CSAT** is one box: the score typed once counts for every agent whose scorecard has it (Undo in the toast). The EVAL template downloads with IDs. |
| Agent page | A month box with back and forward arrows to see any month the agent has (English and Arabic). |
| Deadlines | No banner or strip on the pages: the bell (every role) holds the to-do list with what is late and due soon, and a late item shows once a day as a toast. |
| Emails | One **Emails** tab on the WFM page for the WFM manager and the WFM analysts: the four daily brand emails and the month's deduction and absences emails, all editable (Edit in the preview) and sent the same way (copied or opened in Outlook; the tool sends nothing). |
| How to use | A guide for each department (WFM analyst, WFM manager, senior manager, supervisor, quality, agent in English and Arabic, admin). |

## October 2026, second round

| Area | What you see now |
|---|---|
| WFM team | Build is no longer a page of its own. One **WFM team** page holds the month's build and the WFM pages as tabs in three groups: **This month** (Import, Review, Export, Emails), **Every day** (Daily, Report builder) and **Insight** (Analytics, Agents, Interactions). Each role sees its own tabs, each tab says what it needs (4/4 exports, checks to look at, built, emails to send), and Build Excel and the month sit in the header. The sidebar's WFM team opens on the tab last used there. |
| Emails | WFM team › Emails › **Monthly emails** is the one place for the month's emails: Deduction or Incentive, for review or final, from the **shared month** (with the supervisors' corrections) or from **this build** (the incentive always from the build, or a dropped workbook). The deduction and incentive emails use a card look close to the WFM team's own emails; **Classic look** brings back the plain email. |
| Vacation cover | The WFM manager ticks a WFM analyst who is on vacation and has the analysts' tabs and permissions (Import, Review, Export, Report builder, Settings) until it is unticked; an analyst ticks the WFM manager and has the manager's pages (Results, adding the interactions). The tick is shared, says who ticked it and since when, and is logged (`cover/now`); it counts only while that account is there with that role, and a stale tick can be cleared. The person on vacation sees "You are marked as on vacation" and an **I am back** button. |
| Saved uploads | Every Genesys export and supervisors' attendance sheet dropped on Import is kept as it was dropped, under the month of its own rows: in the data folder as locked files (`upmeta/`, `upfile/`), with the online page's data, or in this browser (IndexedDB). After a sign-out or a reload the latest month is back in Build by itself (not a month older than the one being closed: Build then starts empty for the new month). **Import › Saved uploads** lists them by month: load a month into Build, move a file to another month, replace it, delete it. A newer export replaces the saved copy of the same kind and month; another month's files stay saved. Taking a file out of Build deletes its saved copy (Undo brings it back). |
| Saved workbooks | Every build is kept as a locked copy with the shared data (`repmeta/`, `repfile/`): **Export › Saved workbooks** downloads the latest monthly workbook and incentive file of each month again, or deletes them. A plain copy in **MC Data › MC Reports**, to open in Excel from the folder, is off unless chosen in the build dialog, which says anyone who can open the shared folder (agents too) could open it. |
| No schedule | Someone the month's Schedule export has no day for, and with no attendance, is left out of every sheet of the monthly workbook and the incentive workbook (the Overview names them), of the months the tool saves, and of every Excel export; **Review › Checks** names them, and asks to check the names when the Schedule export has names nobody matches. The teams set up as having no Genesys data (the incentive's 100% adherence teams, CT by default) are never left out, and a month of leave counts as a schedule. **Settings › Leave out people with no schedule** (on by default) puts everyone back. The roster keeps everyone. |
| Attendance tab | Team › Attendance filters by department with chips (CC, SM, CT, QA…, several at once, each with its count) and hides the people with no schedule unless **Show the N people with no schedule** is ticked. |
| Dashboard | **Month close** shows the senior manager's five steps only (results on the agents' pages, the one-to-ones email, the review, finalizing, the final form), each with its state and due day. Recent activity is gone, and so is the Supervisors page's Changes by hand. |
| Manage accounts | Every account record in the data is listed, an old one with no username too; a search box and role chips with counts; **Edit** changes the name, username and email; access records left without an account, and account files that could not be read, are listed under **Records with no account** and can be removed. |
| Report builder | Resting the pointer on a brand box (Virgin Postpaid, Virgin Mobile, FRiENDi Mobile, FRiENDi Pay) shows its email small and whole beside it; the keyboard focus does too. |
| Look and motion | Every page and tab rises in the first time it is shown in a visit, as the dashboard does; every box answers the pointer (panels deepen their shadow, tiles rise 2 px). Fields have a blue focus ring and lists are readable in dark. Nothing moves with reduced motion. |

## October 2026, third round

| Area | What you see now |
|---|---|
| Deduction attachment | **Save attachment** on the deduction email gives *MC Monthly Deduction - Sep 2026.xlsx* with two sheets only, laid out like the old Monthly Deduction file, values only: **Attendance Report** (each person's day codes for the month, late days as Attend with the minutes under Tardy, then the counts: AL, SL, Paternity, Compassionate, EID / National Day, ML, Unpaid, Absent, Attend, scheduled and actual days) and **Monthly Deduction** (each day's Sched., Actual and Diff in minutes, Diff in red when above 0, and the Total). Months saved from now on keep each day's scheduled and actual minutes for it (`ds`, `da` on the month's deduction rows); a month saved before shows its total only, and the sheet says how many people that is. |
| Month close and Activity | The Supervisors page has no Month close card and no Activity box any more. The month close's due days stay as a settings card there (the senior manager sets them), each step's reminder is in the bell with **Mark done** (and Undo in the toast for a tick by mistake), and the dashboard keeps the senior manager's five steps. |
| WFM team › Data | A **Keep** group with one tab, **Data**, for the WFM manager, the WFM analysts and admins (`js/backup.js`): **Export all data** puts every record the tool keeps (the roster, the months, results, forms, rules, settings, emails and the rest; the kept files only if ticked) in one *.mcbak* file locked with a password chosen there (PBKDF2-SHA256, 250,000 rounds, AES-GCM). Accounts, passwords and keys are never in it. **Import data** opens such a file with its password, shows what is in it by kind, then writes every record back (the same records are replaced, nothing else is removed). |
| Attendance templates | For the departments whose supervisors take attendance by hand (**Settings › Attendance template for**: TS, MG, CT, QA, DE, WF by default), the tool makes one workbook a month for each supervisor (`js/atttpl.js`): **Attendance** has a row per exception only (Date, To for several days, Name from a list, ID filled in, Type from a list, Minutes late, Note), **Team** lists their people with their weekly days off (Fri, Sat unless changed), first and last day, and a hidden sheet names the month. Every day not written down counts as a working day; weekly days off count as OFF. **WFM team › Import › Attendance templates** downloads each supervisor's file for any month, or all as one .zip; a supervisor gets their own from **Team › Attendance › Get the template**. The filled file goes on Import like any attendance sheet; rows it cannot use (no date, another month, a name not on the Team sheet, a day written twice) are listed on the Import card. |
| CC and SM from Genesys | CC and SM need no attendance sheet: their days come from the Schedule and the Agent Status Timeline, as their supervisors already take it from Genesys (signed on: Attend, or the late minutes; no sign-on: Absent; a leave in the schedule: that leave; no shift: OFF). With templates or sheets dropped, the people they list are taken from them and everyone else from Genesys; only people of the template departments that nothing covers are called missing. Genesys shows a sick day as absent, so supervisors still correct SL on Team › Attendance. |
| Opening the shared data | Choosing MC Data now shows **Opening the shared data** with what it waits for and the seconds; after 10 seconds it says what usually holds it up (MC Data in OneDrive or SharePoint with its files not on the computer yet: *Always keep on this device*; a network drive). **Open the shared data** (the browser asks once per visit) shows **Allow the shared data** with where the browser's question is (a box at the top of the window, or an icon in the address bar) and *Choose a different folder* as a way out; an answer of no says so. A folder that does not answer in 20 seconds, a cancelled folder choice, a browser not allowed to open folders, and a data folder whose files cannot be read yet each say so with what to do, and the last is never offered to be set up again. Each file read gives up after 30 seconds, and other people's changes are looked for only after the sign-in, so a big folder no longer holds up the opening. |

## October 2026, fourth round

| Area | What you see now |
|---|---|
| Attendance templates | One template per **department** (TS, MG, CT, QA, DE, WF as set in Settings), split by supervisor only when a department's people have more than one supervisor in the roster: *Attendance - Oct 2026 - TS.xlsx*. Each looks like the tool's other workbooks (the title and the logo in row 1, a line under it, navy headings, yellow cells to fill, printed one page wide) and opens on a **How to fill** sheet: the steps, examples (a late day, an absence, a leave from a date to a date, a day off), what each type is for, and what turns a cell amber or red (Late without minutes, a To date before the Date, minutes on a day that is not Late). Every cell to fill shows a tip when chosen. A leave over several days keeps the person's weekly days off as days off. **Every supervisor** gets their department's template from Team › Attendance › Get the template or Search (every department's when their account is not linked to agents yet; none when their team comes from Genesys). |
| One-to-one form | The PDF fits on **one A4 page**: the same parts (details, results, follow-up, discussion with the root cause and the agent's comments side by side, actions, the supervisor's final, signatures), tighter; a form with very long writing shrinks a little, and only one that still does not fit runs on to a second page, so nothing is cut. The final form is as it was. |
| No IDs in the email attachments | The deduction email's workbook has no ID column (Name, Team and Dep first). The incentive email's workbook is Build's without the ID column (Build's own export keeps it); a dropped incentive workbook is attached with its ID columns emptied. The email bodies are as before. |
| Still reading | After the sign-in a pill under the toolbar says **Reading the shared data… N files** until the first read is in, **Putting Oct 2026 back in Build** while the saved uploads are opened, and **Reading 3 files…** while dropped files are read; the dashboard, Team and Supervisors pages say they are still reading instead of "No months yet". |
| Stakeholder deck | **final/MC Monthly Report Builder - Overview.pptx**: 16 slides for the stakeholders and the management team, one story: the month end before, the tool (the dashboard with its parts pointed out), a month in four steps (import, the checks, attendance, every bonus explained, the emails), every role, the coaching loop, daily reporting, privacy, how it is tested, what changes for Member Care and how to start. In the tool's look (its greys, white cards and orange; dark slides to open, for the emails, for privacy and to close), with close-ups of the tool large enough to read, a fade between slides and every part rising in, one after another; speaker notes on every slide. The screenshots are made from the synthetic test data; `bash tools/deck/build.sh` makes the deck again from the current build. |

## October 2026, security review

The review followed a security skill adapted for this project from **Claude Code Cybersecurity Skills** by **Riyan Pratama
(Masriyan / sudo3rs)** (MIT; <https://github.com/Masriyan/Claude-Code-CyberSecurity-Skill>). The adapted skill is in
`.claude/skills/mc-security-review/`, with the original LICENSE and NOTICE; it is a modified version, not the author's
release. Every finding was first shown on the build before the fix, with synthetic data, then fixed, and its test stays.

| Area | What changed |
|---|---|
| Accounts in the shared folder | **Fixed (high).** The account files in MC Data are plain files that anyone with the folder can write. A file saying `"builtIn": true` was believed: the next time an admin signed in, the tool gave that account the team's data key and the admin role by itself, and the Accounts list showed it as built in (cannot be changed). Now "built in" comes only from the team copy's own settings, never from the file. The team copy's built-in admins are now the real admins (the roles in the staff-only directory). Before, it took the role written in the account file, so a planted `"role": "admin"` became a built-in admin of the next team copy and the real admins were left out. |
| Backups | The .mcbak file is locked with 600 000 rounds (as the sign-in; OWASP's figure for PBKDF2-SHA256) instead of 250 000. The tool reads the count from the file, so backups made before still open, and a made-up count is refused. A backup made with this version needs this version or a later one to open. |
| CSV files | The roster export and the daily exceptions: a cell whose text starts with `=`, `+`, `-` or `@` gets a leading `'`, so Excel shows it as text instead of running it as a formula. Every other cell is as before. |
| Outlook drafts | A line break in an address or a file name can no longer start a header of its own. The addresses were already cleaned before; this guards the place that writes the headers. |
| No network | Opened as a file, the page tells the browser to refuse any web address: only what is inside the file (`data:` and `blob:`) can be used, so not even a mistake or planted text could send data out. Every page was checked for every role: nothing the tool itself does is refused. The online page keeps its host's rules. |
| Supply chain | The vendored GSAP is pinned by its SHA-256 (`npm test` fails if the file changes and the README does not); the CI workflow's token can only read. |
| Checked, nothing to fix | **Text from files and from people** is escaped on every page, in the previews and in the email bodies; a test plants HTML in every name and opens every page as every role. **Encryption:** passwords use PBKDF2-SHA256 at 600 000 rounds with 16-byte salts, records use AES-GCM-256 with a new IV each time, keys use RSA-OAEP 2048. **Limits:** a backup cannot replace accounts or keys, and record names cannot leave the data folder. |

**For the people who run it:**
- Keep the HTML in the common folder read-only for everyone but its owner: whoever can replace the file controls every
  session that signs in with it.
- Admins should use long passphrases.
- Keep backup passwords apart from sign-in passwords.

Some risks stay open by design, and the skill lists each one with what would close it:
- Staff share one data key.
- The data key is never rotated.
- Accounts moved from a browser's own storage are trusted on their first key.
- Reopening someone's access trusts the key in their account file.

## October 2026, brands' history on the daily emails page

| Area | What you see now |
|---|---|
| Brands' history | **WFM team › Emails › Daily brand emails** has a **Brands' history** box under the report day. It says what the shared history holds (for example *months Jan 2024 – Aug 2026 · days 1 Sep – 21 Oct 2026*, who saved it last and when). **Export history** saves it as `member-care-history-<day>.json`, the same file Report builder › Export backup and the stand-alone builder make. **Import history** reads such a file and shows it first: per brand, the months and days it would add, those already the same, and those with other numbers here, plus anything it leaves out (parts that are not one of the four brand emails, rows without a date or numbers). Nothing is written until **Import into the tool**. It then adds the months and days the tool does not have. Where both have a day or a month, the tool keeps its own numbers unless **Use the file's numbers** is ticked. A month with no data (every figure empty) comes in as it is, so the tables show it as –. The emails already made keep the history they were made with; the next ones, the Daily page and Search use the new one. |
| Report Builder page | **Import history** also takes the stand-alone **Member Care Report Builder** page itself (its `.html`): the history built into it (`window.HISTORY_SEED`) is read like a history file, shown first and then added. So is a page dropped on Recognise files. The Report builder's History card now has the same Brands' history box: its old **Import backup** replaced the shared history with whatever JSON it was given, without reading it first. A web page with no history in it is refused. Days the stand-alone page added after it was made live in that browser: there, **Export history** gives the file to import. |
| Daily brand emails arriving | A report day's four emails that arrive while the page is open now show by themselves. Since the two email pages became one, they waited on a grey placeholder until something was clicked. |

## October 2026, the Weekly Commercial Presentation

**WFM team › Weekly** (a group of its own, *Every week*) makes the Member Care Performance Review that goes to the weekly commercial
meeting, for the WFM analysts, the WFM manager and admins (`js/weekly.js`, the tab; `js/weekly_core.js`, the week, the deck and the
workbook, pure). The week is **Sunday to Saturday** and the deck is dated the Sunday after (18–24 Oct 2026: 25 Oct 2026); the tab opens
on the last whole week, with arrows to the weeks before and after.

| Step | Where it comes from |
|---|---|
| 1 Calls | The **Brands' history** the daily brand emails keep: each brand's days from the 1st to the Saturday (the daily chart), the month to date as the average day (the service level box), this year's closed months (the monthly chart; a month the history has only days for is their average, as on the daily emails), and last month's service level (FRiENDi Pay's third box, its label following the month: *Service level — Sep '26*). A day missing in the history is named, with the way to it (Report builder). |
| 2 Top call reasons | The **ESKA Call Center History** export from the 1st of the month to the Saturday (.xls, or saved as .xlsx), all brands in one file or one file a brand, chosen or dropped on the tab (known by its *Call Center History* title row, or by its Service and Sub Service columns; a long export that ESKA runs on into Sheet2, Sheet3… with no title or heading row is read whole; what each dropped file was taken as stays under the drop zone). Counted as the daily emails count them (`Engine.sliceHistory`, `Engine.topReasons`): Virgin Mobile (its Postpaid calls too), FRiENDi Mobile and FRiENDi Pay, the brand's calls of the 7 days; **Virgin Postpaid month to date** (the 1st of the Saturday's month to the Saturday), Virgin's calls of every Postpaid service (*Postpaid*, *Postpaid - الخطوط المفوترة*, *Post-Paid Customer*…), as on the deck the team sends (the 25 Oct 2026 deck's 1,716 Postpaid calls, Billing Details 682, are 1–17 Oct counted this way). The top 5 Sub Services, each as a % of all of them; the reasons left out (queues, Waiting Customer's Reply, New Complaint, Open Ticket… the daily emails' list, and TKT Created) still count in the total, FRiENDi Pay lists Follow Up. The list is in the tab (*Reasons left out of the top 5*) and can be changed; only each reason's count is kept (no customer's row), so a changed list counts again without the export. An export that starts after the 1st is named in the checks (Postpaid's month would be short). |
| 3 Complaints | The figures as they are sent: pasted (the email's table or the workbook's block, by tab, two spaces or `|`), read per brand (complaints logged, resolved on time, still open, the top 5 drivers with their %; where the drivers have a *Total* and a *Percentage* column, the percentage) and shown in a form to check and correct before they are used. |
| 4 Virgin Postpaid tickets | The week's **ESKA tickets export** (not the Call Center History: the one with a Category and a Sub Category for each ticket; known by its *Tickets Report* title row, or by those column names with a date), dropped on the tab, picked as the WFM team filters the export and counted as the daily Postpaid email counts them (`Engine.sliceTickets`: Category Billing, End service or Migration; not a FRiENDi type; not Final Prepaid Deactivation nor The number not removed from CITC / SEMATI; like sub categories merged: Final Postpaid Deactivation into Final Switch Postpaid Deactivation, From Pre to new postpaid plans into From Pre to Switch postpaid plans, Post-To-Pre into From Switch postpaid plans to Pre): all of them and the top 5 (a tie for the 5th: the first in the export, the others named); or typed (the % is out of the total). The note says how many tickets of every brand the export has for the week (18–24 Oct 2026: 71 Postpaid of 1,732; a PivotTable made on the filtered sheet counts all 1,732, as Excel's pivots ignore the sheet's filters). |
| 5 Outages | One running list (date, outage, brand, description); the slide shows the Saturday's month and the two before, with the count and the number of brands. It starts with the 15 outages of the 25 Oct 2026 deck (once, `weekly/settings` › `outStart`), and an earlier deck dropped on the tab (or *Bring in an earlier deck's outages…*) adds the outages of its Outages table that the list does not have yet. |
| 6 Check and send | What to fix or look at (a day missing, no export, a figure missing, drivers over 100%, the week not over yet…), then: **Download the deck (.pptx)**, **Fill the KPI workbook…** and **Email with the deck (.eml)** (to Rasha Mugaddam, cc Essam AlZahrani by default, both editable and kept; the tool sends nothing). |

**The deck** is made from the design of the deck the WFM team sends (`wk/deck-template.pptx`, built into the page by `js/make_wk.py`):
the seven slides as they are, with the week's numbers, tables (a row per item, the frame as tall as its rows), dates and chart
points written in (`Weekly.deck`). The template carries no week's numbers, reasons, outages or dates, and no chart is linked to a
workbook on anyone's computer: `python3 -I tools/weekly/make_template.py <a sent deck.pptx>` makes it again from a newer design (the
shape names it fills are listed there and in `weekly_core.js`). Rebuilt from the 25 Oct 2026 workbook, it gives the deck that was
sent that day (VM 90%, FRiENDi 88%, FRiENDi Pay 88%, Postpaid 96%, 15 outages), slide for slide.

**The KPI workbook** (BeyondOne_MC_KPIs) is filled at its own cells and comes back as a copy named for the deck's day (`Weekly.fillWorkbook`):
Weekly Data (each brand's days of the month, last month's days emptied; the MTD rows; the closed months it lists; the three Top Call
Reasons tables with their totals, found from their % formulas; the three complaint blocks) and Postpaid Data (its days, its Top 5
Call Reasons, its Top 5 TKT). Formulas, styles, charts and the other sheets are kept, and Excel counts everything again on opening.
A closed month the workbook has no row for is named, not written somewhere else (add the row in Excel for its own monthly charts).

Shared records: `weekly/w_<Sunday>` (the week: the counts, the complaint figures, the tickets), `weekly/outages`, `weekly/settings`
(the reasons left out, To and Cc); they are in **Export all data** like every other record.

Tests: `node test/weekly_unit.cjs` (in `npm test`: the week, the calls, the reasons against the engine, the pasted figures, the
outages, the checks, the deck read back, the workbook read back, the template's emptiness) and `node test/weekly.cjs out/mc.html outDir`
(the tab in the browser as the WFM analyst, the manager and the senior manager, with the downloads read back and text that looks like
HTML kept as text), on synthetic data only (`test/weekly_fixture.cjs`).

GSAP 3.15.0 is built into the file from `vendor/` (see `vendor/README.md` for the licence), and Geist from `js/fonts.css`, so
the page still works offline.

## Building

```bash
cd js
python3 combine.py > ../out/combined_main.js && node --check ../out/combined_main.js     # the main script parses
bash assemble_standalone.sh "../final/MC Monthly Report Builder.html"                   # the common-folder file
bash assemble3.sh ../out/mc-report-builder.html                                         # the online page
```

Both pages carry the Weekly Commercial Presentation's design (`wk/deck-template.pptx`) through `js/make_wk.py`.

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
node test/wfmteam.cjs "final/MC Monthly Report Builder.html" test/shots           # the WFM team page and its tabs per role, the vacation cover, the month close, the removed boxes
node test/uploads.cjs "final/MC Monthly Report Builder.html" /tmp/exports test/shots   # saved uploads: kept, back after a reload, moved, deleted, Undo
node test/folder.cjs "final/MC Monthly Report Builder.html" /tmp/exports test/shots    # the shared data folder end to end (a browser-kept folder): locked uploads, MC Reports, sign in again
node test/accounts.cjs "final/MC Monthly Report Builder.html" test/shots          # Manage accounts in the data folder: every record, search, roles, Edit, records with no account
node test/nosched.cjs "final/MC Monthly Report Builder.html" /tmp/exports test/shots   # no schedule: the model, the workbook, the setting, the Attendance tab's chips
node test/peek.cjs "final/MC Monthly Report Builder.html" test/shots              # the brand box's email preview on hover and focus
node test/rounding.cjs "final/MC Monthly Report Builder.html" test/shots /tmp/exports   # 94.99% counts as 95%, How this was counted, the rules' rounding, the exact days %, the Build month's KPI tab
node test/attflow.cjs "final/MC Monthly Report Builder.html" /tmp/exports test/shots    # attendance templates out and back, CC and SM from Genesys, the two-sheet attachment, no Month close card
node test/datafolder.cjs "final/MC Monthly Report Builder.html" test/shots           # a cancelled, slow, silent or unreadable data folder, allowing it again; WFM team › Data export and import; the reading pill
node test/xss.cjs "final/MC Monthly Report Builder.html" test/shots               # HTML planted in every name: nothing runs on any page, preview or email; Outlook headers; CSV formulas; the no-network rule
node test/trust.cjs "final/MC Monthly Report Builder.html" test/shots             # accounts planted in the shared folder ("builtIn", "role") get no key, no role and no place in a team copy
node test/tenure.cjs "final/MC Monthly Report Builder.html" test/shots           # months in the job (joined 18 Jan: from Jul), roster import and Edit of the joining date, the absence penalty of 4 days per Absent day
node test/dailyhist.cjs "final/MC Monthly Report Builder.html" test/shots         # Emails › Daily brand emails: emails arriving show by themselves; Brands' history export, import (read first, keep or replace), refusals
bash tools/deck/build.sh /tmp/mc-deck                                              # the stakeholder deck from the current build (synthetic data; needs LibreOffice and pptxgenjs)
npm test                                                                          # unit checks, the counting rules against v33 (test/ref), the reconcile engine, the recogniser, the attendance template, the emails' workbooks, the one-page one-to-one, the supply chain (GSAP's SHA-256, no npm code, the CI token, no web address in the page)
```

They load the page with `window.__NOLOCK__` and `window.__ROSTER__` (the existing test hooks) and `window.__mcUser`,
a test-only pretend person that `auth.js` honours only when there is no data store and sign-in is off.
