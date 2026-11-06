# MC Monthly Report Builder

The Member Care Workforce Management tool: one offline HTML file that turns the month's Genesys Cloud exports and the
supervisors' attendance sheets into the monthly report, the incentive data and everything that follows (KPI results,
one-to-ones, objections, the senior manager's review and final, the month close, the daily Member Care reports).

This repository holds the v33 source restored from *MC Monthly Report Builder.md* (Part 2), with the **Option A**
layout built on top of it (following Apple's Human Interface Guidelines), now in the **Beyond One** brand (see below), and
the October and November 2026 additions below. Every calculation, output, email
template, role, permission and storage format is the same as v33 **by default**: the new counting settings start at what
v33 did (tests compare 10,000 synthetic people against the v33 code), and the only permissions added on request are that the
WFM analyst shares the Emails page with the WFM manager, that the WFM team (and admins) can export and import all the data, and
that the admin can view every role's interface (a preview that saves nothing) and has the Showcase page.
The tool still sends nothing and makes no network request; opened as a file, the browser itself now refuses any web
address (see the security review below).

**The built file:** [`final/MC Monthly Report Builder.html`](final/MC%20Monthly%20Report%20Builder.html). Open it in
Microsoft Edge or Google Chrome; it goes in the common folder next to the **MC Data** folder, as before.

## Beyond One (November 2026)

Since 6 November 2026 the tool, and every deck it makes, wears the **Beyond One** brand: the *Beyond One - Template*
PowerPoint the team's decks are made with, and the company's logos. Only the look changed. Every ID, class, data field,
workflow, calculation, email, workbook, permission and storage format is as it was. The glass layer is gone
(`js/ui6/97_glass.css` removed); the look is `js/ui6/00_tokens.css` (colours, type, spacing) and `js/ui6/98_beyond.css`
(the last layer).

**The idea.** People open this tool every working day, so it should feel like the company's own and stay calm, exact and
quick to read. The template gives it a black and white base, one blue for what can be done, and the logo's pixel squares as
the only ornament. Numbers come first and decoration last.

| Part | How it looks |
|---|---|
| Colour | The template's theme: ink 080808 and white, its blue 0D76BD for links, focus, selection and the current place, and its pixel colours (red, pink, lavender, orange, teal, teal blue) for the series of the charts and as small squares. The brands keep their own colours where a brand is named. Every text colour is at least 4.5:1 on its background in light and in dark, secondary text about 7:1. |
| Type | **Poppins**, the template's typeface (built in from `vendor/fonts`, SIL Open Font License 1.1), for headings, the greeting, KPI figures and the small-capital labels; **Geist** for text and tables, as before. The greeting is light with the name in bold, as the template writes its titles. |
| Navigation | A black sidebar in light and in dark with the white Beyond One logo at its top (the mark alone on the icon rail); the current page has a blue edge. The top bar is solid, with a hairline under it. |
| Surfaces | White cards with a hairline and 12 px corners on a light grey page (in dark, near-black cards on black). No blur, no glow, almost no shadow. Sections are marked by small capitals with a blue square before them. |
| Controls | White buttons with a border and one main action in black (white in dark); a 3 px blue focus ring on every field and control; square chips and pills; buttons press in a little; table rows tint on hover. |
| Sign-in | On a computer, the template's title slide: a black panel with the logo and the pixel squares beside the sign-in card. |
| Report builder | Each brand box carries its brand's logo (Virgin Mobile, FRiENDi mobile, FRiENDi pay), and each brand's tab has a pixel of its colour. |
| System settings | Reduced motion, Windows contrast themes (forced colours) and printing are handled; the toolbar colour follows the page (`theme-color`). |

**The decks.** The Weekly commercial presentation, the MC performance Review and the stakeholder overview are made on the
template (`js/bodeck.js`, the kit the tool's decks share). The cover is the template's title slide: the black panel with the
logo, the title in a box of colour among the pixel squares. Every other slide has the logo at the top left, the deck's name (or
the slide's section) in small capitals beside a black square at the top right, and CONFIDENTIAL and the slide's number at the
foot. Titles are in capitals with the last word bold, key numbers sit in a flat box of colour, tables have a black heading and
charts are flat in the template's colours. The official logos of Beyond One, Virgin Mobile, FRiENDi mobile and FRiENDi pay are
built in (`assets/brand`, turned into `js/bologos.js` and `js/ui6/05_brand.css` by `python3 js/make_brand.py`).

**Left as they were, on purpose.** The emails (their templates byte for byte), the Excel workbooks and the KPI cards keep
their look, and the tool's logo setting (`js/brand_src.html`, Settings › Logo) stays empty, so none of those outputs change.
The Beyond One logo can go into the workbooks too, on request.

## View as and the Showcase (November 2026)

The admin can open every role's interface, and has a page that tells the tool's story in a meeting.

| Part | What it does |
|---|---|
| View as (admin only) | Account menu › **View as another role…**, or **View** on a Showcase role card: the WFM analyst's, the WFM manager's, the senior manager's, a chosen supervisor's (their own team), the quality team's or a chosen agent's own page, on the shared data, exactly as that role sees it. A black banner on every page says whose interface it is, with **Switch** and **Back to Admin**; Back to Admin returns to the page it started from. |
| A preview | Nothing is saved while viewing. The data store refuses every write (`store.js`, and the browser's own store), `queueWrite` keeps nothing to try again, and the admin is told when something was not saved. If anything was refused, Back to Admin reads the watched data again and offers Reload. The account menu, the account checks and every record of who did what stay the admin's own (`auth.js`: the pages see the role chosen, the account does not change). Before a preview starts, the admin's own saves are let finish. |
| Showcase (admin only) | **Showcase** in the admin's navigation (`js/showcase.js`): the tool's story in nine sections, built on a messaging framework: the main message, the challenge (10+ files, 7 roles, 1 deadline), the answer as a value proposition with the month's four steps, five key messages with their proof, a page for every role (before and now, with View), today's figures (the dashboard's cards and a few counts from the shared data: totals only, never a name), trust, what changes, and how to start. **Present** shows it full screen, one section at a time: ← and →, Home and End, **N** for the speaker notes, Esc to end. A role's View opens that interface live, out of the presentation. Other roles do not have the page; a link to `#/show` says it is not one of theirs. |
| Line figures | The Showcase's animated line figures (an app in layers, a tray of files, sieves for the checks, lines snapping square for the workbook, a relay for the emails, a hub for the roles, a vault, a laptop) are [hairline](https://www.npmjs.com/package/@lucasmarkes/hairline) 0.5.1 (MIT), built into the file from `vendor/hairline.js`, its SHA-256 checked by `npm test` like GSAP's. They are drawn only while the Showcase is open, answer the pointer, and keep still with reduced motion. |
| How it was written | The brand skill's messaging framework gave the structure; the copy follows plain-language rules (no slogans, numbers that can be checked); hairline gave the figures; Beyond One's look and Poppins carry over from the rest of the tool. |

## The design: Option A, by Apple's guidelines

The layout, navigation, words and behaviour below still hold. The colours, type and surfaces are now Beyond One's (above),
so where the table says orange, grey fills or frosted, read the blue, white and black of Beyond One.

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
| Every department's incentive | The scorecards follow the September 2026 incentive file for every department: CC, SM, CT, the QA and WF specialists, **TS** (Tele Sales: Quality Observations, Customer Feedback / Wrap-up Code, Utilization, Contact Rate, days under target; base 1000 SR), **DE** (Digital Experience champion) and **OP** (SPVs / leaders: Team Performance, Service Level, AHT, Quality of Work, Staff Satisfaction MC; base 1600 SR for Virgin, 1000 SR for FRiENDi), plus a card of their own for one role: **OP-DIG** (Digital Manager), **CT-SPV**, **CT-CCM** (Complaint and Control Manager), **CT-SGM** (Complaint Management & Service Governance Senior Manager), **QA-MGR**, **WF-MGR** and **DE-MGR**. A role's card is set on the person's page (Edit › Scorecard) or with a "Scorecard" column in the roster file (the card's key or its name). **Team Performance** is the average final % of the people the person supervises (the roster's Supervisor column), counted once their team is. **Month figures** (Review › KPI results): one number per brand, typed once a month, for the KPIs that rank a figure of the whole floor (Service Level, Floor QoS / Empowerment, AHT, Resources Adherence, Utilization, Digital resolution time, Complaints resolution time); a card ranks All brands (the all-brands figure, or the brands' average) or, for the QA specialists, the person's own brand. **Typed by hand**: a value for one person that is in no file (Staff Satisfaction, Digital projects, CST compliance…) wins over every source; NA means the KPI does not apply that month and ranks 5, as the file has it (How it is counted can leave it out instead). AHT and other seconds KPIs are ranked on whole seconds (150.29 s as 150, 159.97 s as 160), as the file shows them. A card can have its own base per brand (Scorecards › Base for this scorecard); the order is the person's own base for the rules' months, their own base on the roster, the card's base, the brand's. Rules saved before keep their cards and get the new ones; the QA and WF cards take the month figures. |
| Quality | The Quality page is the quality team's Final EVAL template, one table per team: Call QA, Ticket QA / Empowerment Utilization, Call Reason & FCR Accuracy and the Final Score (their average until someone types it); CT has the Evaluation score. **Call QA is Quality Observations** in the scorecards, not the Final Score (CT, with no Call QA: the Final Score); months saved before count Call QA too while they are open, and a final month stays as it was finalized. **DRC-CSAT** is one box: the score typed once counts for every agent whose scorecard has it (Undo in the toast). The EVAL template downloads with IDs. |
| Agent page | A month box with back and forward arrows to see any month the agent has (English and Arabic). |
| Deadlines | No banner or strip on the pages: the bell (every role) holds the to-do list with what is late and due soon, and a late item shows once a day as a toast. |
| Emails | One **Emails** tab on the WFM page for the WFM manager and the WFM analysts: the four daily brand emails and the month's deduction and absences emails, all editable (Edit in the preview) and sent the same way (copied or opened in Outlook; the tool sends nothing). |
| How to use | A guide for each department (WFM analyst, WFM manager, senior manager, supervisor, quality, agent in English and Arabic, admin). |

## October 2026, second round

| Area | What you see now |
|---|---|
| WFM team | Build is no longer a page of its own. One **WFM team** page holds the month's build and the WFM pages as tabs in three groups: **This month** (Import, Review, Export, Emails), **Every day** (Daily, Report builder) and **Insight** (Analytics, Agents, Interactions). Each role sees its own tabs, each tab says what it needs (4/4 exports, checks to look at, built, emails to send), and Build Excel and the month sit in the header. The sidebar's WFM team opens on the tab last used there. |
| Emails | WFM team › Emails › **Deduction and absences** is the WFM team's place for the month's deduction email, for review or final, from the **shared month** (with the supervisors' corrections) or from **this build** (or a dropped workbook). The **incentive email** is the senior manager's: **Supervisors › Incentive email** (a tab of the Supervisors page, and steps 1 and 8 of its month close), for review with its deadline and then final, to the champions. The final has its usual body: what changed since the review is shown to the sender to check, never in the email. Its attachment is the incentive file the WFM analysts build (WFM team › Export › Build incentive file): each build is kept with the shared data (Saved workbooks), so the month's newest file shows on the senior manager's page by itself; an edited file can be dropped there instead, and the recogniser sends a dropped incentive data workbook there. The review copy is kept per month to compare the final with, and the month close's steps say when each was copied or downloaded and by whom. Both emails use a card look close to the WFM team's own emails; **Classic look** brings back the plain email. |
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
| No IDs in the email attachments | The deduction email's workbook has no ID column (Name, Team and Dep first). The incentive email's workbook is the saved incentive file (or Build's) without the ID column (Build's own export keeps it); a dropped incentive workbook is attached with its ID columns emptied. The email bodies are as before. |
| Still reading | After the sign-in a pill under the toolbar says **Reading the shared data… N files** until the first read is in, **Putting Oct 2026 back in Build** while the saved uploads are opened, and **Reading 3 files…** while dropped files are read; the dashboard, Team and Supervisors pages say they are still reading instead of "No months yet". |
| Stakeholder deck | **final/MC Monthly Report Builder - Overview.pptx**: 16 slides for the stakeholders and the management team, one story: the month end before, the tool (the dashboard with its parts pointed out), a month in four steps (import, the checks, attendance, every bonus explained, the emails), every role, the coaching loop, daily reporting, privacy, how it is tested, what changes for Member Care and how to start. On the Beyond One template (its title slide as the cover; the logo, the section in small capitals, CONFIDENTIAL and the number on every other slide; titles in capitals; flat boxes in its colours; dark slides for the emails, for privacy and to close), with close-ups of the tool large enough to read, a fade between slides and every part rising in, one after another; speaker notes on every slide. The screenshots are made from the synthetic test data; `bash tools/deck/build.sh` makes the deck again from the current build. |

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

## October 2026, every page in the order the month is done

Every role's pages read in the order the work is done, the most urgent first, instead of a list of cards:

| Area | What you see now |
|---|---|
| Steps | A page that holds a month's work shows it as **numbered steps** down a line: each step has its title, what it is for, its button and its own cards, says when it is done (a tick, with when and by whom) and marks the **next** one. What is there to look things up, and what is set once, come after the steps under small headings. Due dates stay in the bell. |
| Supervisors (senior manager) | **Month close** is eight steps: 1 the incentive data for review, 2 the results on the agents' pages, 3 the one-to-one deadline and "One-to-ones are ready", 4 who finished and the objections (with the deadline reminder), 5 the results for review with the incentive list, 6 Finalize on Results, 7 the final result form (only the people on the incentive list who earned it: an earned SR of 0 or none is left off, and the page says how many), 8 the final incentive data. Then **To look things up** (the supervisors' results) and **Set once** (the scorecard, the email addresses, the due days). The page's list of sections starts with the numbered steps. |
| Quality | Six steps: the EVAL template with IDs, the Final EVAL (the drop zone), the names to link, the DRC-CSAT (when a scorecard has it), the check of the quality KPIs, the accepted objections to fix. |
| Results | The month's tiles and every agent first, then **By team and by supervisor**, then **Tools** (Reconcile with the old Excel, the changes by hand). |
| Numbered tabs | WFM team's month is **1 Import, 2 Review, 3 Export, 4 Emails**; a supervisor's Team is **1 Attendance, 2 Objections, 3 One-to-ones** (then Finish my team). Review's tabs follow the work: Checks, Issues, People, KPI results, Preview, History. Import groups its cards: 1 the four Genesys exports, 2 attendance, 3 IDs and KPI inputs. |
| Sidebar | Each role's pages in the month's order: the admin's WFM team, Quality, Supervisors, Team, Results; the senior manager's Supervisors, Team, Results, WFM team; the WFM analyst's WFM team before Team. The dashboard's quick actions follow the same order. |
| Dashboard | By priority: the month's numbers with the month close, then **Needs attention** and the lowest adherence, then the trend and the data status (on a phone too). |
| Agent page | A one-to-one waiting for the agent (their part to fill in, or the final to sign) comes straight after the month's status; otherwise after their results. |
| Incentive email | The final is the old body again, with no list of changes. What changed since the review shows only on the sender's page, under the email, to check before sending. |

Nothing that is counted or stored changed, and the only email that changed is the final incentive email, back to its old body. `test/steps.cjs` checks the order of every role's pages.

## November 2026, the CT team's incentive workbook

The CT team keeps its month in its own workbook (*CT - Incentive - October.xlsb*): a date over a block of columns for each day (TKT, hours, other, hours, %, Comment, Attendance), one row per agent, a legend of the codes and a list of National IDs, names, brands and departments. **WFM team › Import** now reads it (`Core.parseDayBlocks`):

| Part | What the tool does with it |
|---|---|
| Attendance | Each CT agent's day codes come from the Attendance column of each day's block (Attend, OFF, AL, SL, Exam, Absent, Unpaid…), matched to the roster by the National IDs in the workbook's own list (its ID column holds staff numbers). The file shows on the Attendance card like any attendance sheet: *used CT (6 people)*. |
| Utilization | Each day's % is (hours on tickets + hours on other tasks) ÷ 7, and the month's Utilization is their average, as the workbook's own formula has it. It is kept for the month (`ksrc/<month>` with the shared data) and counts in the CT scorecard's Utilization where the KPI file has no value; the KPI file's value wins, a value typed by hand wins over both. The Attendance card says, for example, *Utilization for 6 people*; Remove takes the days and the Utilization away, Undo brings both back. |
| Not the IDs file | Its list of IDs no longer makes the recogniser call it the HR IDs file (which would have replaced the IDs file): it is a supervisor's attendance sheet, sure, for the month of its dates. |

## November 2026, Smart-Link's attendance file

Smart-Link, the third party, takes the month's attendance of FRiENDi's agents in its own workbook. **WFM team › Export › Smart-Link attendance** now builds it (`Writer2.smartLink`): *Smart-Link Attendance -Sep 2026.xlsx*, one sheet named *SmartLink-Attendance Sep-2026*, laid out as Smart-Link's file:

| Part | What is in it |
|---|---|
| Who | Smart-Link's own list of its agents: **Set Smart-Link's list from its file** takes the ID and Name of every agent in one of Smart-Link's files (with its Team and Dep), and the file then holds exactly those agents, in that order, labelled as Smart-Link labels them, whatever their brand in the roster (its SM agents and two on Virgin are on Smart-Link's list). An agent on the list with no attendance in the month keeps an empty row, and the card names them. The list is kept with the shared data (`config/smartlink`), and Undo puts the previous one back. Without a list: the FRiENDi and FRiENDi Pay brands. |
| Columns | Row 2: ID (the National ID, as Smart-Link's file has it), Name, Team (the brand), Dep, every day of the month, then Tardy, AL leave, SL leaves, Exam, National Day, EID, Unpaid, Absent, Attend, Scheduled days and Actual days. |
| Days | Each day's code; a late day is Attend. Tardy is the month's late minutes: the minutes of the late days, or, when an attendance sheet gave them as one Tardy total, that total as the month keeps it (also after a supervisor corrects a day; the deduction email's workbook takes it the same way). The days come from the shared month, with the supervisors' corrections, or from Build while the month is not saved yet. |
| Formulas | Smart-Link's own: COUNTIF over the days for each code, Scheduled days the leaves, absences and attended days added up, Actual days what is left once the leaves and absences are taken off. Each formula carries its value. |
| Look | The navy headings with Actual days in red, AL green, SL yellow, Absent red, OFF grey, National Day green, ID and Name frozen with the headings, a filter on the table, and an ID written twice coloured. |

The file is downloaded and kept in Saved workbooks (*Smart-Link attendance*); the tool sends nothing, so it goes to Smart-Link from Outlook as before.

## November 2026, the deduction email's Absenteeism table

In the card look, the Absenteeism table (ID, Name, Total Absent and a column for each day someone was absent) no longer squeezes into the 600pt email: Outlook broke "Absent" over two lines and names over three or four. Every column now has a fixed width (the ID and Name as wide as the longest one, each day 36pt), no cell wraps (names keep their spaces as non-breaking ones), the cells are compact and carry their colour as `bgcolor` too, so Outlook shades the whole cell. When the table is wider than the email, the email widens with it (a month with 30 days of absences scrolls sideways). The classic look and the plain text are as they were.

## November 2026, the Weekly Commercial Presentation

Every week the WFM team sends the VP the *Weekly Commercial Presentation* (Member Care Performance Review), a 7-slide PowerPoint. **WFM team › Weekly commercial** (in *Every week*, for the WFM manager and the analysts) now makes it in four steps, and the email with it:

| Step | What it does |
|---|---|
| 1 The month in the brands' history | The service level and the trends come from the history the daily brand emails keep, by themselves: the month up to the day before the presentation. Month to date: calls presented and handled a day on average, the service level the average of the days (as the daily emails show it). The monthly trend: this year's months (at least six) from the history's monthly rows, a month with only days worked out from them, then MTD. A brand with days missing says which. |
| 2 Drop the month's exports | The month-to-date **Call history** and **Tickets** exports from Crystal (.xls), and FRiENDi Pay's tickets sheet (.xlsx or .csv), read in the browser and not kept. Call history: the top 5 call reasons of each brand (the reasons the daily emails leave out stay out; FRiENDi Pay keeps Follow Up). Tickets: complaints logged, closed tickets resolved on time (closed within **72 hours** by default, set in Settings), tickets still open (Open and Pending) and the top 5 complaint drivers (Virgin without "Other"); Postpaid's tickets as the daily email counts them. FRiENDi Pay's complaints come from its tickets sheet when the export has none (still open then shows "–"). |
| 3 Outages | A list the team keeps in the shared data (`config/outages`): date, outage and issue, the brands it hit and a description, typed in once or pasted from Excel. The deck shows the month and the two before (a second slide past 17). |
| 4 The deck and the email | What each slide shows, then **Download deck** (*Beyond_One_Member_Care_Review - 25 Oct 2026.pptx*) and **Email with the deck**: an Outlook draft (.eml) to the VP, the final result form's contact in copy (from the senior manager's contacts, or typed in Settings), subject *Weekly Commercial Presentation*, the body as before, the deck attached. The tool sends nothing. |

The slides follow the deck the team sent, on the Beyond One template (see Beyond One above): the template's title slide as the cover, with the presenter and their job title (Settings), Performance Insights for Virgin Mobile, FRiENDi Mobile and FRiENDi Pay in their colours (the service level, three tiles, the daily and monthly trends as columns with the service level as a line, the top call reasons and complaint drivers; FRiENDi Pay's third tile is last month's service level), Postpaid Insights, Outages Insights and Thank You. Each chart is a real PowerPoint chart with its data in an embedded workbook (Edit Data works). A number the files do not give shows "–". The logos are the official ones built in (Beyond One's, and each brand's on its slide). `js/pptx.js` writes the PowerPoint (no library), `js/bodeck.js` gives it the template's look, `js/wcdeck.js` the numbers and the slides, `js/weekly.js` the page.

## November 2026, corrections after the deduction email

After the deduction email for review, champions and supervisors send corrections ("kindly update the leave records below": a table with Name, Team, Dep and a column per day, like 27-Oct with *SL leaves*). **WFM team › Emails › Deduction and absences** now has a **Corrections after the review** box above the email:

| Way in | What the tool does |
|---|---|
| Paste the table from the email (or from Excel) | Read at once, with the cells apart (the email's HTML when the clipboard has it). |
| Drop the email (.msg or .eml) or a sheet (.xlsx, .csv) | The table in it read; a picture is refused with what to do instead (copy the table, or drop the email). |
| Type, one a line | *set Nawaf as absent on 10 Oct*, *Sara K. SL 27-29 Oct*, *Omar late 20 min on 5 Oct*, *clear Nawaf 10 Oct*: a day, a range (27-29 Oct, 27 Oct to 2 Nov) or a list (27, 28 and 31 Oct); Absent, Attend, OFF, AL, SL, any leave, late minutes, or clear (the correction taken away). |
| Paste the exceptions as the supervisors list them | A day, the name (with the approver and the reason after it) and what it was, with no header row: *Oct-22 · Name Approver-excuse · Excuse*, *11-oct · Name Approver-pc loading for 2 min · Pc loading*, *Thu 22-Oct · Name · 4:00 PM - 4:30 PM*; or with a header (Date, Name, Exception, Minutes). A line written out among the rows (*Thu 22-Oct Name 4:00 PM - 4:30 PM Approver 30mins*) and typed lines (*Omar PC loading 5 min on 11 Oct*) work too; a day may carry its weekday. |

**Exceptions** (an excuse, PC loading, a system, network or login issue, a meeting, training, coaching, a permission, or a time like *4:00 PM - 4:30 PM*) excuse the day: its lateness (a late day becomes Attend) and its minutes off the conformance deduction: the time window's minutes, the minutes written ("for 2 min", "1min only", "1 hour"), or the whole day when none is given (an excuse). They are kept on the day as `{ x: 1, exc, why }`, so the day otherwise stays as the data has it. **Leaves** change the month's attendance (the Attendance Report, *MC Monthly Attendance*), and a day corrected to a leave, OFF or a holiday is not a working day, so its deduction goes too (its Diff becomes 0). Every sheet follows: the month's row (deduction, conformance and each day's Actual), the deduction email's totals and its list of what changed, the email's workbook (Attendance Report; Monthly Deduction with the Actual and Diff excused and the exceptions in Review Notes), the monthly workbook's Deduction sheet (the excused Diff typed over, so it shows yellow, with Review Notes), the Build page's deduction and daily adherence export, the Attendance tab (its tooltip names the exception) and the agent's page.

Each person is matched to the month's people by ID, or by name (the email's full name against the roster's shorter one, a first name when only one person in the month has it); when two people fit, the box asks which. Each day shows now → new; a day already so, an OFF day inside a typed range and a final month's days are not ticked. **Apply** makes them the month's attendance corrections (`att/<month>/edits/<person>`, the same records as a supervisor's, marked `src: 'update'` with who and when), so the month's row, the deduction workbook, the final email's list of what changed and the agent's page follow; Undo takes them back, and the list of corrections made from here has Remove. `js/updparse.js` reads (no page code), `js/attupd.js` is the box.

## November 2026, the Member Care Performance Review

The Control and Complaint team sends the *MC performance Review* email: tables by month of Rebooking TKTs (Virgin, FRiENDi), Network Issues TKTs (No Network, Weak Coverage, MNP - Port In, Inbound, Outbound), Web + App TKTs, Social Media issue TKTs (Postpaid, Prepaid) and Vnet Complaints, each ending with the month to date ("Nov to 3"). **WFM team › Performance Review** (in *Every week*, after Weekly commercial) makes the team's *MC performance Review* deck from it, slide for slide as the team's own:

| Slide | From |
|---|---|
| Cover; Virgin Mobile, FRiENDi Mobile, Postpaid | The brands' history (as Weekly commercial); the Top Call Reasons, the complaints and tickets and the Top Complaint Drivers from the month's Call history and Tickets exports (Crystal, .xls) dropped in step 2 or on Weekly commercial (read in the browser, not kept; without them those places show –, and step 2 says which export is missing); on the Beyond One template: Poppins, the brands' colours (Virgin E10A0A, FRiENDi 1E9AA3, Postpaid 0D76BD), the service level in a flat box, *Weekly Commercial Presentation* over them, *Monthly Trend*. |
| Complaints Insights | The email: Web + App, Network (this year) and Social media, 3-D shaded columns in framed charts, *MC Service Level Stabilization* over it. |
| Complaints Insights (Rebooking) | *Booking Code Reactivations by Day* (requests by brand, the average time to close in hours and minutes) from the MC KPIs workbook; *by Month* from the email. |
| OTP Calls, Final termination calls | The numbers of the team's old deck (or the MC KPIs workbook), kept as they are, completed with the Call history export (the raw call reasons): the OTP calls of the two months to the last day, day by day, with two trend lines; this year's final termination calls by month with a dotted trend. Without any of them the slide is left out. |
| Thank you | |

The **MC KPIs workbook** is the one the team's charts are linked to (*BeyondOne_MC_KPIs*): its *Reactivate the Booking code* and *OTP & Termination* sheets are read by their headings (Virgin, Friendi, Avg Time to Close; OTP Count; Final termination Count). **Logos**: the official Beyond One and brand logos are built into both decks. A deck (.pptx) dropped here still has its pictures kept (`config/decklogos`, as PNG, shown on the page with Remove), but the built-in logos are used in their place. Drop the email (.msg, .eml or its text), the workbook and a deck in the same box; the page lists what it read. **Email with the deck**: the Outlook draft to the VP (the Weekly commercial settings), subject *MC Performance Review*, the deck attached. A table the deck does not know gets a *More Insights* slide; Vnet is read but, as in the team's deck, not on a slide.

**OTP and final termination calls** come from the **Call history export** from Crystal (*Call Center History Report*, .xls: the raw call reasons), dropped in step 3 (or with the email). The tool counts, by day, the **OTP calls** (a Service or Sub Service that names OTP: *OTP is not received*, *App OTP isn't Received*) and the **final termination calls** (Type *Virgin Final Deactivation* and *FRiENDi Final Deactivation*), and keeps only those counts for everyone (`config/calldays`, the latest 800 days), so the exports dropped over the weeks fill the two months and the year: a day dropped again keeps its fuller export, and the page names the days of the two months still missing. *What counts* chooses every channel (calls, WhatsApp, email, social media; the default) or calls only (Contact Type CALL), and every Final Deactivation contact (the default) or only the terminations done (Sub Service *Termination Done*); each day is kept counted every way, so a change needs no new drop. **The old deck's numbers stay as they are.** Drop the team's last *MC performance Review* deck (.pptx) once, and the values its *OTP Count* and *Final termination Count* charts keep (the OTP calls by day, the final termination calls by month; Excel dates or labels) are kept for everyone with the Call history's days (`config/calldays`), as are the MC KPIs workbook's. On the slide they are shown as they are: the Call history only adds the days after them, and completes the month they have only part of (the deck's month to its last day, then the Call history's days after it). A day in two decks takes the newer number, a month the one that covers more of it; a deck the tool made is read for its logos only. The page names the days the slide still lacks (*No data yet for …*). *Clear* empties everything kept (with Undo).

`js/prdeck.js` reads the tables, the workbook, the Call history and a deck's logos and makes the slides (with WcDeck's, now in the template's exact layout), `js/perfrev.js` is the page, `js/pptx.js` gained 3-D columns, shaded fills, chart frames and titles, axis titles, round marks, trend lines, see-through squares and shadows; `test/msgfile.cjs` writes made-up .msg files for the tests.

GSAP 3.15.0 is built into the file from `vendor/` (see `vendor/README.md` for the licence), Geist from `js/fonts.css`, and Poppins
and the Beyond One logos from `js/ui6/05_brand.css` (Poppins from `vendor/fonts`, SIL Open Font License 1.1 in
`vendor/fonts/Poppins-OFL.txt`), so the page still works offline.

## Skills in this repo

Claude Code loads these from `.claude/skills/` in every session on this repository:

- `mc-security-review`: the security review above.
- `claude-council`: a four-agent council (Believer, Skeptic, Investor, Judge) that stress-tests an idea and rules BUILD,
  FIX FIRST or KILL. It keeps every verdict in `council/council.md` and each session in `council/sessions/`.

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

`python3 js/make_brand.py` rebuilds `js/ui6/05_brand.css` (Poppins and the logos for the pages) and `js/bologos.js` (the logos
for the decks) from `assets/brand` and `vendor/fonts`. Run it after changing a logo; `npm run build` then picks both up.

### Parts the document described but did not print

The markdown printed every source file but left out encoded data. They are recreated here as follows; drop the
originals from your own project folder in their place to get them back byte for byte:

| File | Here | The original |
|---|---|---|
| `js/fonts.css` | Geist, rebuilt by `tools/build_fonts.py` (Option A) | Inter and Poppins |
| `js/brand_src.html` | An empty block: no logo is built into the workbooks and KPI cards (one can be chosen in Settings); the pages and decks show the Beyond One logos from `assets/brand` instead | The Beyond One logos |
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
node test/depts.cjs "final/MC Monthly Report Builder.html" test/shots exportsDir  # every department: the SPVs' card (Team Performance, month figures, typed by hand, its own base), a role's card from the person's page, NA ranks 5, Review › KPI results boxes, the card's base
node test/dailyhist.cjs "final/MC Monthly Report Builder.html" test/shots         # Emails › Daily brand emails: emails arriving show by themselves; Brands' history export, import (read first, keep or replace), refusals
node test/incmail.cjs "final/MC Monthly Report Builder.html" test/shots exportsDir   # Supervisors › Incentive email: the analysts' saved incentive file, review and final (the old body; what changed is the sender's to see); the final result form with only those who earned it
node test/steps.cjs "final/MC Monthly Report Builder.html" test/shots            # every page in the month's order: the sidebar, the numbered steps (Supervisors, Quality), the dashboard's priority, the agent's waiting one-to-one first
node test/ctflow.cjs "final/MC Monthly Report Builder.html" /tmp/exports test/shots   # the CT team's incentive workbook on Import: its days, its Utilization in the CT scorecard (the KPI file wins), never the IDs file, Remove and Undo
node test/smartlink.cjs "final/MC Monthly Report Builder.html" /tmp/exports test/shots   # Export › Smart-Link attendance: FRiENDi and FRiENDi Pay only, Smart-Link's sheet and formulas, a late day as Attend with its minutes, the shared month's corrections, Saved workbooks
node test/absgrid.cjs "final/MC Monthly Report Builder.html" test/shots           # the deduction email's Absenteeism table: every cell on one line at any window width, fixed widths, the email as wide as the table
node test/weekly.cjs "final/MC Monthly Report Builder.html" test/shots           # WFM team › Weekly commercial: the month from the history, the sheet read (another file refused, a drop read once), the exports' numbers, outages typed, pasted and undone, settings, the deck and the email to the VP, another day, the shared settings and outages, the senior manager without the tab, phone width
node test/attupd.cjs "final/MC Monthly Report Builder.html" test/shots           # Emails › Deduction and absences › Corrections after the review: a champion's table pasted, typed lines (choose between two people, a range's OFF day, clear), exceptions as the supervisors list them (the deduction, the email and its workbook follow), Apply, Undo, Remove, an .eml chosen and dropped, a picture refused, a final month, text as text, the senior manager without the box
node test/perfrev.cjs "final/MC Monthly Report Builder.html" test/shots          # WFM team › Performance Review: a made-up .msg chosen and one dropped, its tables listed, the deck and the email to the VP, a made-up Call history (.xlsx, and an .xls) counted and kept with the shared days, what counts, Clear and Undo, a pasted text, a picture refused, the senior manager without the tab, phone width
node test/viewas.cjs "final/MC Monthly Report Builder.html" test/shots           # the admin's View as (every role, a supervisor's team, an agent's page, nothing saved while viewing) and the Showcase (sections, figures, Present)
bash tools/deck/build.sh /tmp/mc-deck                                              # the stakeholder deck from the current build (synthetic data; needs LibreOffice and pptxgenjs)
npm test                                                                          # unit checks, the counting rules against v33 (test/ref), the reconcile engine, the recogniser, the attendance template, the CT incentive workbook, Smart-Link's attendance file, the weekly presentation's numbers and PowerPoint, the corrections read after the deduction email, the performance review's tables and deck, the emails' workbooks, the one-page one-to-one, the supply chain (GSAP's SHA-256, no npm code, the CI token, no web address in the page)
```

They load the page with `window.__NOLOCK__` and `window.__ROSTER__` (the existing test hooks) and `window.__mcUser`,
a test-only pretend person that `auth.js` honours only when there is no data store and sign-in is off.
