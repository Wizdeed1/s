// The meeting kit's papers: A4 PDFs on the Beyond One look (Poppins, the logo, titles in capitals with the words that matter in
// bold, the section in small capitals beside a black square, CONFIDENTIAL and the page number at the foot), and the follow-up email
// as an Outlook draft (.eml) carrying the leave-behind and the pilot proposal. The papers for the room (10, 11, 12) never name the
// admin's meeting tools; the presenter's papers (00 to 04) do.
// Usage: node tools/meeting/make_kit.cjs "final/Meeting kit"   (Playwright with Chromium)
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.resolve(process.argv[2] || path.join(ROOT, 'final', 'Meeting kit'));
fs.mkdirSync(OUT, { recursive: true });
const b64 = f => fs.readFileSync(f).toString('base64');
const font = w => `url(data:font/woff2;base64,${b64(path.join(ROOT, 'vendor', 'fonts', `poppins-latin-${w}-normal.woff2`))}) format('woff2')`;
const LOGO = 'data:image/png;base64,' + b64(path.join(ROOT, 'assets', 'brand', 'beyond-one-black.png'));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** a title as the template writes it: in capitals, the words between * * in bold */
const T = t => esc(t).toUpperCase().split('*').map((x, i) => (i % 2 ? `<b>${x}</b>` : x)).join('');
/** plain text with **bold** */
const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

const CSS = `
@font-face { font-family: P; font-weight: 300; src: ${font(300)}; } @font-face { font-family: P; font-weight: 500; src: ${font(500)}; }
@font-face { font-family: P; font-weight: 600; src: ${font(600)}; } @font-face { font-family: P; font-weight: 700; src: ${font(700)}; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: P, Arial, sans-serif; font-weight: 300; font-size: 9.4pt; line-height: 1.45; color: #080808; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pg { padding: 0 15mm; position: relative; }
.top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7mm; }
.top img { height: 8.5mm; display: block; }
.tag { font: 500 6.4pt/1 P; letter-spacing: .18em; text-transform: uppercase; display: flex; align-items: center; gap: 7px; color: #262626; }
.tag::after { content: ""; width: 7px; height: 7px; background: #080808; }
h1 { font: 300 21pt/1.08 P; letter-spacing: -.005em; margin-bottom: 2.6mm; }
h1 b { font-weight: 700; }
.lead { font-size: 10.2pt; color: #3f3f46; max-width: 165mm; margin-bottom: 5mm; }
h2 { font: 600 6.8pt/1 P; letter-spacing: .18em; text-transform: uppercase; color: #0b65a3; margin: 5.5mm 0 2.2mm; display: flex; align-items: center; gap: 7px; break-after: avoid; }
h2::before { content: ""; width: 6px; height: 6px; background: #0d76bd; }
p + p { margin-top: 1.6mm; }
b { font-weight: 600; }
ul.check, ul.plain, ol.steps { list-style: none; }
ul.check li { position: relative; padding: 1.5mm 0 1.5mm 7mm; border-top: 1px solid #e4e4e7; break-inside: avoid; }
ul.check li:first-child { border-top: 0; }
ul.check li::before { content: ""; position: absolute; left: 0; top: 2.2mm; width: 3.3mm; height: 3.3mm; border: 1.2px solid #080808; }
ul.plain li { position: relative; padding: 1.1mm 0 1.1mm 4.5mm; break-inside: avoid; }
ul.plain li::before { content: ""; position: absolute; left: 0; top: 2.75mm; width: 1.7mm; height: 1.7mm; background: #0d76bd; }
ol.steps { counter-reset: s; }
ol.steps li { counter-increment: s; position: relative; padding: 1.6mm 0 1.6mm 9mm; break-inside: avoid; }
ol.steps li::before { content: counter(s); position: absolute; left: 0; top: 1.4mm; width: 6mm; height: 6mm; background: #080808; color: #fff; font: 600 8pt/6mm P; text-align: center; }
ol.steps li.blue::before { background: #0d76bd; }
table { width: 100%; border-collapse: collapse; font-size: 8.4pt; line-height: 1.4; }
thead { display: table-header-group; }
th { background: #080808; color: #fff; font: 600 6.5pt/1.3 P; letter-spacing: .12em; text-transform: uppercase; text-align: left; padding: 2mm 2.4mm; }
th.hot { background: #0d76bd; }
td { padding: 2mm 2.4mm; border-bottom: 1px solid #e4e4e7; vertical-align: top; }
tr { break-inside: avoid; }
td.k { font-weight: 600; white-space: nowrap; }
td.t { font-variant-numeric: tabular-nums; white-space: nowrap; color: #0b65a3; font-weight: 600; }
.muted { color: #595959; }
.small { font-size: 7.8pt; }
.box { background: #f4f4f5; padding: 3.6mm 4mm; break-inside: avoid; }
.box.blue { background: #0d76bd; color: #fff; } .box.ink { background: #080808; color: #fff; }
.box h3 { font: 600 9.6pt/1.25 P; margin-bottom: 1mm; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; } .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3.5mm; } .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }
.big { font: 700 17pt/1.05 P; display: block; margin-bottom: .8mm; }
.kbd { display: inline-block; min-width: 5mm; padding: 0 1.4mm; border: 1px solid #a1a1aa; border-bottom-width: 2px; font: 600 7.6pt/1.5 P; text-align: center; background: #fff; color: #080808; }
.q { break-inside: avoid; padding: 1.8mm 0; border-top: 1px solid #e4e4e7; }
.q:first-of-type { border-top: 0; }
.q b.qq { display: block; font-weight: 600; margin-bottom: .5mm; }
.px { position: absolute; }
.flow { display: grid; grid-template-columns: 1fr 9mm 1.25fr 9mm 1fr; align-items: center; margin: 2mm 0 1mm; }
.flow .node { border: 1.2px solid #080808; padding: 3mm; min-height: 25mm; display: flex; flex-direction: column; justify-content: center; }
.flow .node b { display: block; font-size: 9pt; margin-bottom: .6mm; }
.flow .node.mid { background: #080808; color: #fff; border-color: #080808; }
.flow .node.mid .muted { color: #d4d4d8; }
.flow .arr { text-align: center; font: 600 13pt/1 P; color: #0d76bd; }
.nonet { display: flex; align-items: center; gap: 3mm; margin-top: 2.5mm; padding: 2.4mm 3mm; border: 1.2px dashed #ed1c24; color: #b91c1c; font-size: 8.4pt; }
.nonet b { color: #b91c1c; }
.foot { margin-top: 4mm; font-size: 7.6pt; color: #595959; }
.blank { display: inline-block; min-width: 26mm; border-bottom: 1px solid #080808; }
.pb { break-before: page; }
table.tight { font-size: 7.9pt; line-height: 1.35; } table.tight td { padding: 1.35mm 2.2mm; } table.tight th { padding: 1.6mm 2.2mm; }
table.tighter { font-size: 7.6pt; line-height: 1.3; } table.tighter td { padding: 1mm 2.2mm; }
`;
const PIX = [['#ED1C24', 0, 0, 3], ['#F6ADCC', 6, 4, 2], ['#0D76BD', 10, 0, 2], ['#9693C8', 4, 8, 2], ['#ED7D31', 13, 6, 2]];
const pixels = (right, top) => PIX.map(([c, x, y, s]) => `<i class="px" style="right:${right + x}mm; top:${top + y}mm; width:${s}mm; height:${s}mm; background:${c}"></i>`).join('');
function doc(tag, title, lead, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="pg">
    <div class="top"><img src="${LOGO}" alt="Beyond One"><span class="tag">${esc(tag)}</span></div>
    <h1>${T(title)}</h1>${lead ? `<p class="lead">${md(lead)}</p>` : ''}${body}</div></body></html>`;
}
const footer = who => `<div style="font-family: Arial, sans-serif; font-size: 6.5px; letter-spacing: 1.3px; color: #595959; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between;"><span>CONFIDENTIAL · ${who}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;

// ================================================================================================ 00 start here
const KIT = [
  ['Before', '01', 'Meeting-room checklist', 'The room, the screen and the files tried the day before, and what to do when something fails.', '01 Meeting-room checklist.pdf'],
  ['Before', '02', 'Who is in the room', 'Each person\'s worry, the sentence that answers it, and the screen that proves it.', '02 Who is in the room.pdf'],
  ['Before', '03', 'Demo run sheet', 'Twenty minutes, minute by minute: what to click, what to say, and the way round each failure.', '03 Demo run sheet.pdf'],
  ['Before', '04', 'Hard questions', 'Twenty-two questions managers ask, each with a short and true answer.', '04 Hard questions.pdf'],
  ['During', '05', 'Demo file', 'The tool on a made-up month: opens on any computer, no folder, no sign-in, nothing saved; every page, every role, View as and the Showcase.', '05 MC Monthly Report Builder - Demo.html'],
  ['During', '06', 'Live drop pack', 'The month\'s four Genesys exports, made up, to drop on Import in front of the room.', '06 Live drop pack (made-up, Sep 2026)'],
  ['During', '07', 'Spotlight and zoom', 'S lights the part you are talking about, Z enlarges where you point, + and - change the size, Esc takes them off.', 'In the tool (admin only)'],
  ['During', '08', 'What it gives back', 'The room types its own hours; the Showcase turns them into hours and working days back a year.', 'Showcase (admin only)'],
  ['During', '09', 'Backup video', 'A month in the tool in under two minutes, with captions, for a room where nothing works.', '09 Backup demo video.mp4'],
  ['After', '10', 'Leave-behind', 'One page: what it is, what each role gets, how the data stays private, how to start.', '10 Leave-behind.pdf'],
  ['After', '11', 'IT and security note', 'One page for IT: what runs where, what is encrypted, the review, and the limits.', '11 IT and security.pdf'],
  ['After', '12', 'The ask and the follow-up', 'A pilot proposal with its success measures, and the email that sends it the same day.', '12 Pilot proposal.pdf · 12 Follow-up email.eml'],
];
const start = doc('Presenter only', 'Your meeting kit: *twelve weapons*', 'Everything to win the meeting, in the order you use it. The papers for the room (10 to 12) and the deck never name the admin\'s tools: the Showcase, View as, the spotlight and the calculator stay a surprise until you use them.',
  `<table class="tight"><thead><tr><th style="width:15mm">When</th><th style="width:8mm">#</th><th style="width:36mm">Weapon</th><th>What it does for you</th><th style="width:44mm">Where</th></tr></thead><tbody>
    ${KIT.map(([w, n, h, t, f]) => `<tr><td class="muted">${w}</td><td class="t">${n}</td><td class="k">${esc(h)}</td><td>${esc(t)}</td><td class="small">${esc(f)}</td></tr>`).join('')}</tbody></table>
  <h2>Four rules</h2>
  <div class="grid4">
    <div class="box"><h3>Keep them hidden</h3><p class="small">Nothing in the deck, the leave-behind or the email names your tools. Open them when the moment comes.</p></div>
    <div class="box"><h3>Show made-up people</h3><p class="small">Use the demo file whenever the room is wider than the people who may see the data.</p></div>
    <div class="box"><h3>Let them say the number</h3><p class="small">Ask the room for its hours and type them (08). A number they gave is a number they believe.</p></div>
    <div class="box blue"><h3>End with the ask</h3><p class="small">Close on the pilot (12) and a date for the decision. Send the email the same day.</p></div>
  </div>`);

// ================================================================================================ 01 checklist
const checklist = doc('Presenter only', 'Meeting-room *checklist*', 'Ten minutes in the room the day before saves the meeting. Tick each line on the computer you will present from.',
  `<div class="grid2"><div>
    <h2>The day before</h2>
    <ul class="check">
      <li>Copy the kit to the desktop: the deck, the <b>demo file</b>, the <b>live drop pack</b> and the <b>backup video</b>. Nothing in the kit holds real data.</li>
      <li>Open the demo file in Edge or Chrome: it opens on the dashboard with no folder and no sign-in. <b>F5 starts it afresh</b>, so try anything.</li>
      <li>Press <span class="kbd">F11</span> for full screen and look at it on the projector. <span class="kbd">Ctrl</span>+<span class="kbd">0</span> puts the browser zoom back to 100%.</li>
      <li>Keep <b>Light</b> (the demo opens light): dark pages look grey on most projectors.</li>
      <li>Try the keys once: <span class="kbd">S</span> spotlight, <span class="kbd">Z</span> zoom, <span class="kbd">+</span> <span class="kbd">-</span> size, <span class="kbd">Esc</span> off. In the Showcase: Present, <span class="kbd">→</span> <span class="kbd">←</span>, <span class="kbd">N</span> notes, <span class="kbd">Esc</span>.</li>
      <li>Drop the live drop pack on WFM team › Import once, then press F5 to start clean.</li>
      <li>Play the backup video for five seconds on that computer.</li>
      <li>If you will show the real tool too: open it from the common folder, sign in as admin, open the Showcase. If the room's computer cannot reach MC Data, use the demo file only.</li>
      <li>Charger, the HDMI or USB-C adapter, and a clicker (the arrow keys work in the deck and in Present).</li>
    </ul></div><div>
    <h2>30 minutes before</h2>
    <ul class="check">
      <li>Turn on <b>Do not disturb</b> in Windows and in Teams; close Outlook so no reminder pops up on the screen.</li>
      <li>Close the other browser tabs and hide the bookmarks bar (<span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">B</span>).</li>
      <li>Open, in this order: the deck on slide 1, the demo file on the dashboard, the video paused at the start.</li>
      <li><span class="kbd">Alt</span>+<span class="kbd">Tab</span> moves between the deck and the browser: try it once.</li>
      <li>With two screens, PowerPoint's Presenter view shows you the speaker notes.</li>
    </ul>
    <h2>5 minutes before</h2>
    <ul class="check">
      <li>The deck in Slide Show from slide 1 (<span class="kbd">F5</span>). <span class="kbd">B</span> blacks the screen when you want the room's eyes.</li>
      <li>Your phone on silent.</li>
      <li>Your first sentence: <b>"Member Care's month end, in one place."</b></li>
    </ul>
    <h2>When something goes wrong</h2>
    <table><tbody>
      <tr><td class="k">Nothing on the projector</td><td><span class="kbd">Win</span>+<span class="kbd">P</span>, then Duplicate.</td></tr>
      <tr><td class="k">The real tool waits on MC Data</td><td>Switch to the demo file: it needs no folder.</td></tr>
      <tr><td class="k">The browser asks about a folder</td><td>Choose Allow (a box at the top, or an icon in the address bar).</td></tr>
      <tr><td class="k">A page is too small to read</td><td><span class="kbd">Z</span> zooms where you point; <span class="kbd">Ctrl</span>+<span class="kbd">+</span> enlarges the page.</td></tr>
      <tr><td class="k">Anything else</td><td>Play the backup video and talk over it. Keep going.</td></tr>
    </tbody></table>
  </div></div>`);

// ================================================================================================ 02 who is in the room
const WHO = [
  ['Head of Member Care', 'The month closed on time, no surprises, no escalations about money.', 'Nothing goes out until the checks are decided, and every bonus explains itself.', 'Review › Checks, then How this was counted for one agent.', 'Who answers if a number is wrong? The senior manager finalizes, and every change is logged with a name and a time.'],
  ['Senior manager', 'Control of the rules and the final say.', 'You keep the rules, and nothing is final until you finalize it.', 'The month close on the Supervisors page; the scorecards in Settings.', 'Can I change a rule? Yes; the change is logged and the month counts with it.'],
  ['WFM manager', 'The emails right and on time; the analytics.', 'The emails are written and checked in the tool; you send them from Outlook.', 'Emails: deduction, absences, incentive, and the four daily brand emails.', 'Does it send by itself? Never. It prepares drafts; people send.'],
  ['WFM analysts', 'Less copy and paste, fewer late nights at month end.', 'One drop for the whole month; each file is recognised by what is inside it.', 'Import with the live drop pack (06).', 'What if a file is new? It is read by its columns, not its name; anything unclear is asked about.'],
  ['Supervisors', 'Less time on attendance; one-to-ones that are quick to prepare.', 'Exceptions only: late, absent, leave and days off. Every other day counts as worked.', 'View as a supervisor: their own team; the one-to-one on one page.', 'Do we fill a sheet every day? No: one template a month, exceptions only.'],
  ['Quality team', 'Scores entered once and used everywhere.', 'The Final EVAL goes in once and feeds every scorecard that needs it.', 'The Quality page, every name matched.', 'And DRC-CSAT? One number for the month, typed once.'],
  ['HR', 'Privacy, fairness and records.', 'No National IDs in attachments; each person sees only what their role allows; every change logged.', 'View as an agent: their own page only, the ID hidden.', 'Where is the data? In MC Data, encrypted; no web service.'],
  ['IT and security', 'Installs, network, where the data lives, who can read it.', 'Nothing to install, no server, no network calls; the shared files are encrypted.', 'The IT and security note (11).', 'Who can read the files? Only accounts made in the tool (AES-256).'],
  ['Finance or payroll', 'Amounts that are right and can be traced.', 'Every amount has its working: each KPI, band, ranking, point and day.', 'How this was counted; Results › Reconcile against any workbook.', 'Can we audit a month? Yes: the final month is locked and its log kept.'],
];
const who = doc('Presenter only', 'Who is *in the room*', 'Write the names in before the meeting. For each person: what they worry about, the one sentence to say, what to show, and the question they are likely to ask.',
  `<table class="tight"><thead><tr><th style="width:30mm">Who</th><th style="width:26mm">Name</th><th style="width:44mm">Cares about</th><th style="width:56mm">Say</th><th style="width:48mm">Show</th><th>They may ask, and the answer</th></tr></thead><tbody>
    ${WHO.map(([w, c, s, sh, q]) => `<tr><td class="k">${esc(w)}</td><td><span class="blank"></span></td><td class="muted">${esc(c)}</td><td><b>"${esc(s)}"</b></td><td>${esc(sh)}</td><td class="small">${esc(q)}</td></tr>`).join('')}</tbody></table>
  <p class="foot">Seat yourself where you see the screen and the faces. When someone frowns, ask what worries them: the answer is usually on this page.</p>`);

// ================================================================================================ 03 run sheet
const RUN = [
  ['0:00', 'Open', 'Deck, slide 1.', 'Member Care\'s month end, in one place.', '–'],
  ['0:30', 'The product, the job', 'Slides 2 to 4.', 'Ten files, seven roles, one deadline. One file runs the whole month.', '–'],
  ['3:00', 'Four steps', 'Slide 5.', 'Import, Review, Export, Emails: each step says what it still needs.', '–'],
  ['4:00', 'Go live', 'Alt+Tab to the demo file; F11.', 'Let me show you. These are made-up people, so nobody\'s data is on the screen.', 'Browser closed: double-click the demo file.'],
  ['4:30', 'One drop', 'WFM team › Import; drag in the four files of the live drop pack.', 'Every file of the month in one drop, each recognised by its columns.', 'The drop fails: the month is already in the demo; go to Review.'],
  ['6:00', 'Checked first', 'Review › Checks; open one Please check line.', 'Nothing is built until every blocking check is decided.', 'Skip to How.'],
  ['7:30', 'Every bonus explained', 'Results › How next to one final %; Z on the KPI table.', '94.96% counts as 95%, the same for everyone. Every point has its working.', 'Panel empty: choose another person.'],
  ['9:00', 'Emails', 'WFM team › Emails; open the deduction email preview.', 'The tool writes; people send. No National IDs in the attachments.', 'Skip; say it.'],
  ['10:00', 'Every role', 'Showcase › Every role: View on a supervisor, then an agent (English, then Arabic).', 'Each role sees only its own page; IDs are hidden while I show you.', 'Slow: Back to Admin and go on.'],
  ['12:30', 'What it gives back', 'Showcase › What it gives back. Ask the room for people and hours; type them.', 'These are your numbers, not mine.', 'Nobody answers: give one role\'s hours yourself.'],
  ['14:00', 'Trust', 'Back to the deck: slides 14 and 15.', '0 web requests, AES-256, 36 browser test suites before every change.', '–'],
  ['15:00', 'The ask', 'Slide 17, then the pilot proposal (12).', 'We start with the next close. Can we decide by [date]?', '–'],
  ['16:00', 'Questions', 'Hard questions (04) on the table.', 'Good question: I will send the answer with the follow-up email.', '–'],
];
const run = doc('Presenter only', 'Demo *run sheet*', 'Twenty minutes: the story on the deck, the proof in the tool, the ask on the deck. The last column is the way round each failure.',
  `<table class="tight tighter"><thead><tr><th style="width:12mm">Time</th><th style="width:31mm">Beat</th><th style="width:68mm">Do</th><th style="width:104mm">Say</th><th>If it fails</th></tr></thead><tbody>
    ${RUN.map(([t, b, d, s, f]) => `<tr><td class="t">${t}</td><td class="k">${esc(b)}</td><td>${esc(d)}</td><td><b>"${esc(s)}"</b></td><td class="small muted">${esc(f)}</td></tr>`).join('')}</tbody></table>
  <div class="grid3" style="margin-top:3mm">
    <div class="box"><h3>Keys</h3><p class="small"><b>Deck:</b> F5 start · → next · B black · 17 then Enter jumps to slide 17 · Esc.<br><b>Showcase:</b> Present · → ← · Home End · N notes · Esc.<br><b>Anywhere (admin):</b> S spotlight · Z zoom · + - size · Esc off.<br><b>Browser:</b> F11 full screen · Ctrl+0 zoom 100% · Alt+Tab.</p></div>
    <div class="box"><h3>The three moments that win the room</h3><p class="small">1. Every file read in one drop.<br>2. One agent's bonus explained, point by point.<br>3. The room's own hours turned into days back a year.</p></div>
    <div class="box blue"><h3>Ten minutes only?</h3><p class="small">Slide 2, then Import, How this was counted, View as an agent, and slide 17. Leave the rest for questions.</p></div>
  </div>`);

// ================================================================================================ 04 hard questions
const QA = [
  ['Accuracy', [
    ['How do we know the numbers are right?', 'Every counting rule runs over 10,000 made-up people with known results before any change ships. Results › Reconcile lines the tool up against any workbook, such as last month\'s final result, and gives the reason for each difference.'],
    ['Where do the KPIs come from?', 'The tool works them out itself: adherence, AHT, days under target and tardiness from the Genesys exports and the attendance; Quality Observations, FCR and Empowerment from the quality team\'s Final EVAL; DRC-CSAT is one number for the month; the month\'s figures, such as Service Level, are typed once. No KPI file is needed.'],
    ['Why does 94.96% count as 95%?', 'Percent KPIs are rounded to a whole percent before they are ranked, the same for everyone. It is a setting, and How this was counted shows it for every person.'],
    ['What if a number is wrong after the emails went out?', 'The checks run before anything is built, so most mistakes never reach an email. After that, the deduction email page takes corrections into the month\'s attendance, the month is built again, and every change is logged with a name and a time.'],
    ['Who decides the rules?', 'The senior manager: the scorecards, the bases and who is eligible. Every change is logged, and a month is final only when the senior manager finalizes it.'],
  ]],
  ['Privacy and security', [
    ['Where is the data kept?', 'In the MC Data folder in the common folder, as encrypted files, one per record. Nothing goes to the internet: opened as a file, the page tells the browser to refuse every web address.'],
    ['Who can read it?', 'Only accounts made in the tool, and each person sees only what their role allows: an agent only their own page, a supervisor only their team. Each agent\'s records are locked with that agent\'s own key.'],
    ['What if someone copies the folder?', 'They get encrypted files (AES-256). Without a tool account they cannot read them; the account files hold only scrambled passwords and locked keys.'],
    ['Do National IDs leave the tool?', 'Not in emails: the incentive and deduction attachments have no ID column. On screen, IDs are hidden when the admin shows another role\'s page.'],
    ['Was it reviewed for security?', 'Yes: a security review of the whole tool, every finding fixed and covered by tests. Passwords use PBKDF2 with 600,000 rounds; records use AES-GCM-256.'],
  ]],
  ['Continuity', [
    ['What if the file is deleted or breaks?', 'The tool is one HTML file and the data is separate, in MC Data. Put a copy of the file back and everything is there. Backups (.mcbak) are locked with their own password.'],
    ['What if the WFM analyst is on leave?', 'Vacation cover is built in: the WFM manager can take over the analyst\'s steps.'],
    ['What if the person who built it leaves?', 'Its source, its tests and a written guide to every part are kept together, and every change is tested in a browser before it ships.'],
    ['Does it need a server or IT to run?', 'No server and nothing to install: Edge or Chrome opens it from the common folder.'],
  ]],
  ['Access and IT', [
    ['Can we use it on phones?', 'Not yet: phones cannot open the shared folder. The plan: MC Data in SharePoint so every laptop opens it from anywhere, then a Microsoft 365 connection for phones.'],
    ['Can we use it from home?', 'Yes, on a laptop that reaches MC Data. With MC Data in SharePoint and synced by OneDrive, from anywhere, with no VPN.'],
    ['What does IT need to do?', 'Nothing to install. If a company setting stops the browser opening folders, IT allows it for this file. Keep the HTML read-only for everyone but its owner.'],
    ['Can it connect to Genesys directly?', 'Not today, and on purpose: it makes no network calls. The four exports are dropped in once a month, which takes a minute.'],
  ]],
  ['Effort and rollout', [
    ['How long to start?', 'One month close: the HTML next to MC Data, an account for each person, and the admin gives the roles.'],
    ['How much training?', 'Each page has How to use. We plan fifteen minutes per role.'],
    ['What does it cost?', 'Nothing to buy or install: it runs in the browser people already have.'],
    ['What changes for supervisors?', 'Attendance: only the exceptions (late, absent, leave, days off). One-to-ones are filled from the numbers on one page, and objections are answered in the tool.'],
  ]],
];
const hard = doc('Presenter only', 'Hard *questions*', 'Twenty-two questions managers ask, each with a short answer that is true today. Read the answer, then stop talking.',
  `<div class="grid2">${[QA.slice(0, 2), QA.slice(2)].map(col => `<div>${col.map(([g, L]) => `<h2>${esc(g)}</h2>${L.map(([q, a]) => `<div class="q"><b class="qq">${esc(q)}</b>${esc(a)}</div>`).join('')}`).join('')}</div>`).join('')}</div>
  <div class="box ink" style="margin-top:5mm"><p><b>When you do not know:</b> "Good question. I will check and send the answer with the follow-up email." Then write it down where they can see you do it.</p></div>`);

// ================================================================================================ 10 leave-behind (for the room)
const leave = doc('Member Care · WFM team', 'MC Monthly Report *Builder*', '**Member Care\'s month end, in one place.** One offline file turns the month\'s Genesys exports into the monthly workbook, the incentive data, the emails and the one-to-ones.',
  `${pixels(15, 30)}
  <div class="grid3">
    <div class="box blue"><h3>Checked before it is built</h3><p class="small">Nothing goes out until the checks are decided.</p></div>
    <div class="box ink"><h3>Every bonus explains itself</h3><p class="small">Each KPI, band, ranking and point, for every person.</p></div>
    <div class="box ink"><h3>A page for every role</h3><p class="small">Seven roles on one set of data, in English or Arabic.</p></div>
  </div>
  <h2>A month in four steps</h2>
  <div class="grid4">${[['1 Import', 'Drop every file of the month at once; each is recognised by what is inside.'], ['2 Review', 'The checks list what needs a decision before anything is built.'], ['3 Export', 'The monthly workbook and the incentive data, built in one click.'], ['4 Emails', 'Deduction, absence and incentive emails, ready to send from Outlook.']].map(([h, t]) => `<div class="box"><h3>${esc(h)}</h3><p class="small">${esc(t)}</p></div>`).join('')}</div>
  <div class="grid2" style="margin-top:1mm"><div>
    <h2>Every role</h2>
    <table><tbody>${[['WFM analyst', 'Builds the month and the daily emails'], ['WFM manager', 'Sends the emails; sees the analytics'], ['Senior manager', 'Keeps the rules; finalizes the month'], ['Supervisor', 'The team, attendance (exceptions only), one-to-ones'], ['Quality team', 'The Final EVAL, entered once'], ['Agent', 'Own results, in English or Arabic'], ['Admin', 'Accounts and roles for everyone']].map(([r, t]) => `<tr><td class="k">${r}</td><td>${t}</td></tr>`).join('')}</tbody></table>
  </div><div>
    <h2>Private by design</h2>
    <ul class="plain">
      <li><b>0 web requests.</b> Opened as a file, the browser itself refuses every web address.</li>
      <li><b>AES-256.</b> The shared data is encrypted; only accounts made in the tool can read it.</li>
      <li><b>No National IDs</b> in email attachments.</li>
      <li><b>By role.</b> An agent sees only their own page; a supervisor, only their team.</li>
      <li><b>Logged.</b> Results, rules and roles: who changed what, and when.</li>
    </ul>
    <h2>How we start</h2>
    <ol class="steps"><li class="blue">Put the HTML in the common folder, next to MC Data.</li><li>Open it in Edge or Chrome on a computer: nothing to install.</li><li>Everyone makes an account; the admin gives each person their role.</li></ol>
  </div></div>
  <p class="foot">The KPIs are worked out in the tool. Tested before every change: 10,000 made-up people through every counting rule and 36 browser test suites.</p>`);

// ================================================================================================ 11 IT and security (for the room)
const it = doc('For IT and information security', 'MC Monthly Report Builder: *IT and security*', 'One HTML file (about 4 MB), opened in Edge or Chrome from the common folder. No installation, no server, no add-ins, no network calls.',
  `<h2>Where the data goes</h2>
  <div class="flow">
    <div class="node"><b>The month's files</b><span class="muted small">Genesys exports, attendance templates, the IDs file, the quality Final EVAL</span></div>
    <div class="arr">→</div>
    <div class="node mid"><b>The HTML in the browser, on the person's computer</b><span class="muted small">Reads, checks and counts here. Nothing is uploaded.</span></div>
    <div class="arr">↔</div>
    <div class="node"><b>MC Data folder</b><span class="muted small">In the common folder: one encrypted file per record</span></div>
  </div>
  <div class="flow" style="grid-template-columns: 1fr 9mm 1.25fr 9mm 1fr;"><div></div><div></div><div class="arr" style="text-align:center">↓</div><div></div><div></div></div>
  <div class="flow"><div></div><div></div><div class="node"><b>Excel workbooks and Outlook drafts (.eml)</b><span class="muted small">Saved by the person; emails are sent by people, from Outlook. No National IDs in attachments.</span></div><div></div><div></div></div>
  <div class="nonet"><b>No web.</b> Opened as a file, the page's own rule (a Content Security Policy) makes the browser refuse every web address: only what is inside the file can be used.</div>
  <h2>Controls</h2>
  <table><tbody>
    <tr><td class="k">Storage</td><td>One file per record, AES-GCM-256 with a new IV each time. Staff records use the team's data key; each agent's records use that agent's own key.</td></tr>
    <tr><td class="k">Accounts</td><td>Made in the tool by the admin. Passwords: PBKDF2-SHA256, 600,000 rounds, 16-byte salts. Keys: RSA-OAEP 2048. Account files hold only scrambled passwords and locked keys.</td></tr>
    <tr><td class="k">Access</td><td>Seven roles; each person sees only what the role allows. Every change to results, rules and roles is logged with a name and a time.</td></tr>
    <tr><td class="k">Email</td><td>Never sent by the tool: drafts only. Header injection is guarded; attachments carry no National IDs.</td></tr>
    <tr><td class="k">Files out</td><td>CSV cells that begin with = + - or @ are written as text, so Excel never runs them.</td></tr>
    <tr><td class="k">Backups</td><td>.mcbak files locked with their own password (PBKDF2, 600,000 rounds); a backup cannot replace accounts or keys.</td></tr>
    <tr><td class="k">Code</td><td>No npm packages in the page; the two bundled libraries are pinned by SHA-256 and checked by the tests. Text from files is escaped on every page.</td></tr>
    <tr><td class="k">Testing</td><td>Unit tests and 36 browser test suites run before every change; a security review was done and every finding fixed with a test.</td></tr>
  </tbody></table>
  <div class="grid2" style="margin-top:2mm"><div>
    <h2>Known limits, said plainly</h2>
    <ul class="plain small">
      <li>Staff share one data key, and it is not rotated.</li>
      <li>Whoever can replace the HTML controls the sessions that open it: keep it read-only for everyone but its owner.</li>
      <li>Admins should use long passphrases; backup passwords are kept apart from sign-in passwords.</li>
    </ul></div><div>
    <h2>What we ask of IT</h2>
    <ul class="plain small">
      <li>Nothing to install.</li>
      <li>If a policy stops Edge or Chrome opening folders, allow it for this file.</li>
      <li>Later, for phones and work from anywhere: a SharePoint library for MC Data, then a Microsoft 365 connection.</li>
    </ul></div></div>`);

// ================================================================================================ 12 pilot proposal (for the room)
const DAYS = [['Day 2', '2 Dec', 'Month built from the Genesys exports', 'WFM analysts'], ['Day 3', '3 Dec', 'Final EVAL in, every name linked', 'Quality team'], ['Day 5', '5 Dec', 'Results on the agents\' pages; the "one-to-ones are ready" email', 'Senior manager'], ['Day 8', '8 Dec', 'Agents\' objections answered', 'Supervisors'], ['Day 9', '9 Dec', 'One-to-ones held; results for review sent to the VP', 'Supervisors, senior manager'], ['Day 10', '10 Dec', 'Month finalized; the final result form and the deduction and absences email', 'Senior manager, WFM manager']];
const pilot = doc('Proposal', 'The ask: *the November close*', '**Run the November 2026 close in the MC Monthly Report Builder**, with the team\'s usual checks beside it, then decide whether it becomes the way Member Care closes every month.',
  `<h2>The close, step by step (December 2026)</h2>
  <table><thead><tr><th style="width:16mm">Due</th><th style="width:16mm">Date</th><th>Step</th><th style="width:48mm">Who</th></tr></thead><tbody>
    ${DAYS.map(([d, dt, s, w]) => `<tr><td class="t">${d}</td><td class="muted">${dt}</td><td>${esc(s)}</td><td class="muted">${esc(w)}</td></tr>`).join('')}</tbody></table>
  <div class="grid2"><div>
    <h2>How we will know it worked</h2>
    <table><thead><tr><th>Measure</th><th style="width:22mm" class="hot">Target</th></tr></thead><tbody>
      <tr><td>The month built and checked by day 2</td><td>Yes</td></tr>
      <tr><td>Differences from the usual workbook left unexplained in Reconcile</td><td>0</td></tr>
      <tr><td>Emails corrected after they were sent</td><td>0</td></tr>
      <tr><td>Objections answered by day 8</td><td>All</td></tr>
      <tr><td>Hours the WFM team spends on the close</td><td><span class="blank" style="min-width:14mm"></span> h</td></tr>
    </tbody></table>
  </div><div>
    <h2>What it needs</h2>
    <ul class="plain">
      <li>An account for each person by <span class="blank"></span>.</li>
      <li>A fifteen-minute walk-through for each role.</li>
      <li>The HTML in the common folder, read-only for everyone but its owner.</li>
      <li>Nothing from IT, unless the browser is stopped from opening folders.</li>
    </ul>
    <h2>Risks, and the answer</h2>
    <table><tbody>
      <tr><td class="k">A number differs</td><td>Reconcile shows why, line by line.</td></tr>
      <tr><td class="k">Someone is on leave</td><td>Vacation cover is built in.</td></tr>
      <tr><td class="k">A computer cannot open MC Data</td><td>The screen says what to do; IT allows folders for the file.</td></tr>
    </tbody></table>
  </div></div>
  <div class="box ink" style="margin-top:4mm"><p><b>Decision:</b> Go / Not yet &nbsp;·&nbsp; on <span class="blank" style="border-color:#fff"></span> &nbsp;·&nbsp; by <span class="blank" style="border-color:#fff; min-width:40mm"></span></p></div>`);

// ================================================================================================ the follow-up email (Outlook draft)
const MAIL = `Hello all,

Thank you for your time today. A short summary of what we saw:

- One file runs Member Care's month end: the Genesys exports become the monthly workbook, the incentive data, the emails and the one-to-ones. The KPIs are worked out in the tool.
- Nothing is built until every blocking check is decided, and every bonus shows how it was counted.
- Each role has its own page, and National IDs never leave the tool in an email.

The ask: run the November 2026 close in the tool, with our usual checks beside it, and decide on [date] whether it becomes the way we close every month. The one-page proposal is attached.

Next steps:
1. An account for each person by [date].
2. A fifteen-minute walk-through for each role in the week of [date].
3. The November close in the tool; the results reviewed together on [date].

Attached: the one-page overview and the pilot proposal.

Best regards,
[Your name]
Member Care - WFM team
`;
function eml(attach) {
  const B = 'mc-kit-' + Buffer.from('meeting').toString('hex'), crlf = s => s.replace(/\r?\n/g, '\r\n');
  const parts = [`--${B}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${crlf(MAIL)}`];
  for (const [name, file] of attach) parts.push(`--${B}\r\nContent-Type: application/pdf; name="${name}"\r\nContent-Disposition: attachment; filename="${name}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${fs.readFileSync(file).toString('base64').replace(/.{76}/g, '$&\r\n')}`);
  return `MIME-Version: 1.0\r\nX-Unsent: 1\r\nTo: \r\nSubject: MC Monthly Report Builder: summary and next steps\r\nContent-Type: multipart/mixed; boundary="${B}"\r\n\r\n${parts.join('\r\n')}\r\n--${B}--\r\n`;
}

(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  const DOCS = [['00 Start here.pdf', start, false, 'PRESENTER ONLY'], ['01 Meeting-room checklist.pdf', checklist, false, 'PRESENTER ONLY'], ['02 Who is in the room.pdf', who, true, 'PRESENTER ONLY'],
    ['03 Demo run sheet.pdf', run, true, 'PRESENTER ONLY'], ['04 Hard questions.pdf', hard, false, 'PRESENTER ONLY'], ['10 Leave-behind.pdf', leave, false, 'MEMBER CARE'], ['11 IT and security.pdf', it, false, 'MEMBER CARE'], ['12 Pilot proposal.pdf', pilot, false, 'MEMBER CARE']];
  for (const [name, html, landscape, who2] of DOCS) {
    await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
    await p.pdf({ path: path.join(OUT, name), format: 'A4', landscape, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer(who2), margin: { top: '12mm', bottom: '13mm', left: '0', right: '0' } });
    console.log('✓', name);
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, '12 Follow-up email.eml'), eml([['MC Monthly Report Builder - One page.pdf', path.join(OUT, '10 Leave-behind.pdf')], ['MC Monthly Report Builder - Pilot proposal.pdf', path.join(OUT, '12 Pilot proposal.pdf')]]));
  console.log('✓ 12 Follow-up email.eml');
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
