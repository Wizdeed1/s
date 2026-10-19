// Title-style capitalization on screen (js/caps.js): Apple's rules for buttons, menus, tabs and column headings; words with a
// capital, a digit or a dot stay as written; hints, counts and the one-to-one form's table keep their words; a label that
// changes later is capitalized too. Usage: node test/caps.cjs page.html
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0] = process.argv.slice(2);
const CASES = [
  ['Build the month', 'Build the Month'], ['Sign in', 'Sign In'], ['Sign in with your account', 'Sign In with Your Account'],
  ['One-to-ones', 'One-to-Ones'], ['one-to-one form', 'One-to-One Form'], ['Follow-up', 'Follow-Up'], ['Re-run the checks', 'Re-run the Checks'],
  ['Tardy min', 'Tardy min'], ['Download .eml', 'Download .eml'], ['Copy for Outlook', 'Copy for Outlook'], ['Step 2: choose the file', 'Step 2: Choose the File'],
  ['Call QA / ticket QA', 'Call QA / Ticket QA'], ['What it is for', 'What It Is For'], ['Set up', 'Set Up'], ['Open in Excel', 'Open in Excel'],
  ['Email it to me and my supervisor', 'Email It to Me and My Supervisor'], ["Update the agents' pages", "Update the Agents' Pages"], ['Agents 176', 'Agents 176'],
  ['Recognise another file…', 'Recognise Another File…'], ['Bands: rank 5, 4, 3, 2', 'Bands: Rank 5, 4, 3, 2'], ['Weight %', 'Weight %'],
  ['example.com address', 'example.com Address'], ['Read in Arabic', 'Read in Arabic'], ['فتح الملف', 'فتح الملف'],
];
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u0', name: 'Sara K.', username: 'sara.k', role: 'admin' }; }, [fixture]);
  await p.goto('file://' + path.resolve(page0));
  await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady, null, { timeout: 15000 });
  const got = await p.evaluate(async C => {
    const box = document.createElement('div'); document.body.append(box);
    box.innerHTML = C.map(([s], i) => `<button class="btn" id="tc${i}">${s.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</button>`).join('')
      + '<button class="btn" id="tcx">save <span class="cnt">3 new</span></button><table><thead><tr><th id="tcth">days under target</th></tr></thead></table>'
      + '<div id="dForm"><table><thead><tr><th id="tcf">Due date</th></tr></thead></table></div><button class="btn" id="tcy"><small>for review</small>open it</button>'
      + '<label class="sw" id="tcsw"><input type="checkbox"> show the hidden people</label>';
    await new Promise(r => setTimeout(r, 30));
    const out = C.map((c, i) => document.getElementById('tc' + i).textContent);
    document.getElementById('tc0').textContent = 'show the rest'; await new Promise(r => setTimeout(r, 30));
    out.push(...['tcx', 'tcth', 'tcf', 'tcy', 'tcsw', 'tc0'].map(id => document.getElementById(id).textContent.trim()));
    return out;
  }, CASES);
  const want = [...CASES.map(c => c[1]), 'Save 3 new', 'Days Under Target', 'Due date', 'for reviewOpen It', 'show the hidden people', 'Show the Rest'];
  let bad = 0; want.forEach((w, i) => { if (got[i] !== w) { bad++; console.log('✗', JSON.stringify(got[i]), 'want', JSON.stringify(w)); } });
  console.log(bad ? `${bad} of ${want.length} wrong` : `✓ all ${want.length} labels`);
  console.log(errs.length ? errs.join('\n') : 'no errors');
  if (bad || errs.length) process.exitCode = 1;
  await b.close();
})();
