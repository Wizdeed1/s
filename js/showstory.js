// ================================================================ SHOW STORY: the Showcase's story, told around the core idea: the bonus
// One story for two places: the admin's Showcase in the tool (showcase.js: today's figures, View for every role) and the stand-alone
// Showcase file (tools/showcase/: made-up only, no data). It tells how Cadence counts every bonus. One made-up Member Care Champion,
// Lina A., is counted by the tool's own engine (Kpi.score) with the champion's scorecard and the month's rules, so every number on the
// page is the one the tool would pay her; Try it lets the room move her numbers and watch the ranks, the gates and the bonus follow.
// Nothing here reads or writes any data. env gives what differs between the two places:
//   { esc, card, cfg, elig, base, cards (how many scorecards), people (the roster's size, or null), strip: [text], month: label,
//     live: () => html (the tool only), roleAct: role => html (View; the tool only), fig: (name, label) => html }
const ShowStory = (() => {
  // ---------------------------------------------------------------- the made-up champion and her month
  const EX = { name: 'Lina A.', init: 'LA', brand: 'Virgin', team: 'CC', sched: 22, att: 20, abs: 1, mon: 14, crit: false,
    v: { csat: 88, qobs: 92, aht: 158, emp: 87, fcr: 96, adh: 93, tardy: 8 } };
  const FROM = { adh: 'Genesys', aht: 'Genesys', adhUnder: 'Genesys', tardy: 'Attendance', team: 'Their team', file: 'Quality' };
  // a KPI's slider: its range and step in the units the room reads (percent, seconds, minutes)
  const RANGE = { pct: [50, 100, 0.5], sec: [120, 240, 1], min: [0, 40, 1], days: [0, 10, 1], num: [50, 130, 1] };
  const GUESS = { pct: 90, sec: 160, min: 10, days: 3, num: 90 };
  const nf = n => Number(n).toLocaleString('en-US');
  const pctT = (p, dp = 0) => (p == null ? '–' : `${(Math.round(p * 100 * 10 ** dp) / 10 ** dp).toLocaleString('en-US')}%`);
  const shown = (k, v) => (v == null ? '–' : k.unit === 'pct' ? `${(Math.round(v * 10) / 10).toLocaleString('en-US')}%` : k.unit === 'sec' ? `${nf(v)} s` : k.unit === 'min' ? `${nf(v)} min` : nf(v));
  const head = (E, eyebrow, title, lead) => `<div class="shhead shrise"><div class="eyebrow">${E(eyebrow)}</div><h2>${title}</h2>${lead ? `<p class="shlead">${lead}</p>` : ''}</div>`;
  // ---------------------------------------------------------------- the count, by the tool's engine
  /** the room's numbers for a scorecard: the champion's own, or a likely value for a KPI her card does not have */
  const startVals = card => Object.fromEntries(card.kpis.map(k => [k.id, EX.v[k.id] != null ? EX.v[k.id] : GUESS[k.unit] ?? 90]));
  /** x: { v: {kpi id: value in the room's units}, att, abs, mon, crit } -> the engine's result, the gates and the bonus */
  function count(env, x) {
    const vals = { file: {} };
    for (const k of env.card.kpis) { const raw = x.v[k.id], v = raw == null ? null : k.unit === 'pct' ? raw / 100 : raw; if (k.src === 'file') vals.file[k.id] = v; else vals[k.src] = v; }
    const abs = Math.min(x.abs, Math.max(0, EX.sched - x.att)), res = Kpi.score(env.card, vals, { sched: EX.sched, attended: x.att, absent: abs, runs: abs > 0 ? 1 : 0 }, env.base, env.cfg);
    const E = env.elig, byCount = env.cfg.eligDays === 'counted', days = byCount ? res.actual : res.attended;
    const gates = [
      { ok: res.finalPct != null && res.finalPct >= E.minFinal - 1e-9, t: `A final of ${pctT(E.minFinal)} or more`, now: `final ${pctT(res.finalPct)}` },
      { ok: !x.crit, t: 'No attitude critical error', now: x.crit ? 'an attitude critical error' : 'none' },
      { ok: days != null && days >= E.minDays, t: `At least ${E.minDays} days ${byCount ? 'counted' : 'attended'}`, now: `${days ?? 0} days` },
      ...(E.minMonths > 0 ? [{ ok: x.mon >= E.minMonths, t: `${E.minMonths} months in the job`, now: `${x.mon} months` }] : []),
    ];
    const ok = gates.every(g => g.ok);
    return { res, gates, ok, earned: ok ? res.earned || 0 : 0, abs };
  }
  const money = env => (env.cfg.money === 'floor' ? 'rounded down' : env.cfg.money === 'ceil' ? 'rounded up' : 'rounded');
  const formula = (env, c) => `${nf(env.base)} SR × ${pctT(c.res.daysPct)} × ${pctT(c.res.finalPct)}`;
  // ---------------------------------------------------------------- the parts drawn from the count
  /** the ticket in the hero: the champion's month, its bonus counting up as it comes into view */
  function ticketHtml(env, c) {
    const E = env.esc, r = c.res;
    return `<div class="shticket shrise" role="group" aria-label="A made-up bonus, counted by Cadence">
      <div class="shtk-top"><span class="shtk-av" aria-hidden="true">${EX.init}</span><div><b>${E(EX.name)}</b><span>${E(env.card.title || 'Member Care Champion')} · ${EX.brand} · made-up</span></div><span class="shtk-mo">${E(env.month)}</span></div>
      <ul class="shtk-lines">
        <li><span>Final</span><b data-count="${Math.round((r.finalPct || 0) * 100)}" data-suffix="%">${pctT(r.finalPct)}</b><small>${E(String(r.finalRank))} of 5 on ${env.card.kpis.length} KPIs</small></li>
        <li><span>Days</span><b>${EX.att} of ${EX.sched}</b><small>${pctT(r.daysPct)} of the month</small></li>
        <li><span>Base</span><b>${nf(env.base)} SR</b><small>the brand's bonus base</small></li>
      </ul>
      <div class="shtk-total"><span>Bonus earned</span><b><span data-count="${c.earned}">${nf(c.earned)}</span> SR</b></div>
      <p class="shtk-gates">${c.gates.map(g => `<span class="${g.ok ? 'ok' : 'no'}">${g.ok ? '✓' : '✗'} ${E(g.t.replace(/^A final/, 'Final'))}</span>`).join('')}</p></div>`;
  }
  /** the five steps, each with the champion's own numbers */
  function stepsHtml(env, c) {
    const E = env.esc, K = env.card.kpis, rows = c.res.rows, adh = rows.find(x => x.k.id === 'adh') || rows[0], ak = adh.k;
    const ladder = [5, 4, 3, 2].map((rk, i) => ({ rk, b: ak.bands[i] })).filter(x => x.b != null && x.b !== '');
    const tone = r => (r == null ? 'r0' : `r${r}`);
    const chips = rows.slice(0, 5).map(x => `<span class="shchip"><b>${E(shown(x.k, x.k.unit === 'pct' && x.v != null ? x.v * 100 : x.v))}</b> ${E(x.k.name)}<i>${E(x.k.src === 'file' ? FROM.file : FROM[x.k.src] || '')}</i></span>`).join('');
    const days = Array.from({ length: EX.sched }, (_, i) => `<i class="${i < EX.att ? 'a' : i < EX.att + c.abs ? 'x' : 'l'}"></i>`).join('');
    return `<ol class="shflow shrise">
      <li class="shfstep"><span class="shn">1</span><b>The month's numbers</b><p>From Genesys, the attendance and the quality scores, matched to each person by National ID, then by name.</p><div class="shfx shchips">${chips}<span class="shchip more">+${Math.max(0, rows.length - 5)} more</span></div></li>
      <li class="shfstep"><span class="shn">2</span><b>Each KPI ranked 1 to 5</b><p>Against its bands: ${E(ak.name)} ${E(shown(ak, adh.v * 100))} ranks ${adh.r}.</p><div class="shfx shladder">${ladder.map(x => `<span class="${x.rk === adh.r ? 'on' : ''}"><b class="shrk ${tone(x.rk)}">${x.rk}</b>${E(Kpi.bandOf(ak, x.rk, env.cfg.edge))}</span>`).join('')}</div></li>
      <li class="shfstep"><span class="shn">3</span><b>Weighted into the final</b><p>Each rank times its weight: ${E(String(c.res.finalRank))} of 5 makes a final of ${pctT(c.res.finalPct)}.</p><div class="shfx shweights" role="img" aria-label="The weights of the ${K.length} KPIs, each in the colour of its rank">${rows.map(x => `<i class="${tone(x.r)}" style="flex-grow:${x.w}" title="${E(x.k.name)}: rank ${x.r ?? '–'}, weight ${pctT(x.w)}"><b>${x.r ?? '–'}</b></i>`).join('')}</div></li>
      <li class="shfstep"><span class="shn">4</span><b>The days that count</b><p>Days attended against days scheduled: ${EX.att} of ${EX.sched} is ${pctT(c.res.daysPct)}.</p><div class="shfx shdays" role="img" aria-label="${EX.att} days attended, ${c.abs} absent, of ${EX.sched} scheduled">${days}</div></li>
      <li class="shfstep"><span class="shn">5</span><b>The gates</b><p>Who earns it, as the month's rules say.</p><div class="shfx shgatelist">${c.gates.map(g => `<span class="${g.ok ? 'ok' : 'no'}">${g.ok ? '✓' : '✗'} ${E(g.t)}</span>`).join('')}</div></li>
    </ol>
    <div class="shresult shrise"><span>Bonus earned</span><b>${E(formula(env, c))} = ${nf(c.earned)} SR</b><small>base × days × final, ${money(env)} to the riyal</small></div>`;
  }
  // ---------------------------------------------------------------- Try it
  let tryX = null;
  const tryReset = env => { tryX = { v: startVals(env.card), att: EX.att, abs: EX.abs, mon: EX.mon, crit: EX.crit }; };
  function tryInHtml(env) {
    const E = env.esc, x = tryX;
    const row = k => { const [lo, hi, st] = RANGE[k.unit] || RANGE.num; return `<tr><th scope="row">${E(k.name)}<small>${E(k.src === 'file' ? FROM.file : FROM[k.src] || '')}</small></th><td class="w">${pctT(k.weight)}</td>
      <td class="v"><input type="range" min="${lo}" max="${hi}" step="${st}" value="${x.v[k.id]}" data-tk="${E(k.id)}" aria-label="${E(k.name)}"><output data-tv="${E(k.id)}">${E(shown(k, x.v[k.id]))}</output></td><td class="rkc"><b class="shrk" data-tr="${E(k.id)}">–</b></td></tr>`; };
    return `<table class="shtry-tab"><thead><tr><th scope="col">KPI</th><th scope="col">Weight</th><th scope="col">${E(EX.name)}'s number</th><th scope="col">Rank</th></tr></thead><tbody>${env.card.kpis.map(row).join('')}</tbody></table>
      <div class="shtry-days">
        <label><span>Days attended</span><input type="range" min="0" max="${EX.sched}" step="1" value="${x.att}" data-td="att"><output data-tdv="att">${x.att} of ${EX.sched}</output></label>
        <label><span>Absent days</span><input type="range" min="0" max="${EX.sched - x.att}" step="1" value="${x.abs}" data-td="abs"><output data-tdv="abs">${x.abs}</output></label>
        <label><span>Months in the job</span><input type="range" min="0" max="36" step="1" value="${x.mon}" data-td="mon"><output data-tdv="mon">${x.mon}</output></label>
        <label class="check"><input type="checkbox" data-td="crit"${x.crit ? ' checked' : ''}> An attitude critical error this month</label>
      </div>
      <button type="button" class="btn sm ghost" data-tryreset>Back to ${E(EX.name)}'s month</button>`;
  }
  function tryOutHtml(env, c) {
    const E = env.esc, r = c.res;
    return `<div class="shtry-final"><span>Final</span><b>${pctT(r.finalPct)}</b><small>${r.finalRank == null ? 'no rank yet' : `${E(String(r.finalRank))} of 5`}</small></div>
      <div class="shtry-final"><span>Days</span><b>${pctT(r.daysPct)}</b><small>${r.actual ?? 0} of ${EX.sched} counted</small></div>
      <ul class="shtry-gates">${c.gates.map(g => `<li class="${g.ok ? 'ok' : 'no'}"><span aria-hidden="true">${g.ok ? '✓' : '✗'}</span>${E(g.t)}<small>${E(g.now)}</small></li>`).join('')}</ul>
      <div class="shtry-earned${c.ok ? '' : ' no'}"><span>${c.ok ? 'Bonus earned' : 'No bonus this month'}</span><b><span data-tryearned>${nf(c.earned)}</span> SR</b>
        <small>${c.ok ? `${E(formula(env, c))}, ${money(env)}` : E(`Stopped by: ${c.gates.filter(g => !g.ok).map(g => g.t.charAt(0).toLowerCase() + g.t.slice(1)).join(', ')}`)}</small></div>`;
  }
  /** after a change: the ranks, the outputs and the bonus follow; the bonus counts from where it was to where it is */
  function tryUpdate(root, env, from) {
    const c = count(env, tryX), out = root.querySelector('[data-tryout]'); if (!out) return;
    c.res.rows.forEach(x => { const b = root.querySelector(`[data-tr="${CSS.escape(x.k.id)}"]`); if (b) { b.textContent = x.r ?? '–'; b.className = `shrk r${x.r ?? 0}`; b.title = x.r == null ? '' : Kpi.bandOf(x.k, x.r, env.cfg.edge); } });
    out.innerHTML = tryOutHtml(env, c);
    const e = out.querySelector('[data-tryearned]'); if (e && from != null && from !== c.earned) countUp(e, from, c.earned, 450);
    return c;
  }
  // ---------------------------------------------------------------- the receipt, in English or Arabic
  const AR = { title: 'كيف احتُسب الحافز', kpi: 'المؤشر', value: 'القيمة', rank: 'التصنيف', weight: 'الوزن', of5: 'من 5', final: 'النسبة النهائية', days: 'أيام الحضور', ofDays: (a, s) => `${a} من ${s} يومًا`,
    base: 'أساس الحافز', gates: 'الاستحقاق', earned: 'الحافز المستحق', sr: 'ريال', made: 'مثال افتراضي', months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    g: ['النسبة النهائية {p} أو أكثر', 'لا توجد مخالفة سلوكية جسيمة', '{d} أيام حضور على الأقل', '{m} أشهر في الوظيفة'] };
  function receiptHtml(env, c, lang) {
    const E = env.esc, ar = lang === 'ar', r = c.res, E2 = env.elig;
    const mo = ar ? env.month.replace(/^([A-Za-z]+)/, m => AR.months[['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(m)] || m) : env.month;
    // the gates as HTML: in Arabic each number keeps its own direction (80% stays 80%, not %80)
    const n = x => `<bdi>${E(String(x))}</bdi>`;
    const g = ar ? [AR.g[0].replace('{p}', n(pctT(E2.minFinal))), AR.g[1], AR.g[2].replace('{d}', n(E2.minDays)), ...(E2.minMonths > 0 ? [AR.g[3].replace('{m}', n(E2.minMonths))] : [])] : c.gates.map(x => E(x.t));
    return `<div class="shrc-head"><b>${ar ? AR.title : 'How the bonus was counted'}</b><span><bdi>${E(EX.name)}</bdi> · ${E(mo)} · ${ar ? AR.made : 'made-up'}</span></div>
      <table class="shrc-tab"><thead><tr><th scope="col">${ar ? AR.kpi : 'KPI'}</th><th scope="col">${ar ? AR.value : 'Value'}</th><th scope="col">${ar ? AR.rank : 'Rank'}</th><th scope="col">${ar ? AR.weight : 'Weight'}</th></tr></thead>
      <tbody>${r.rows.map(x => `<tr><th scope="row"><bdi>${E(x.k.name)}</bdi></th><td><bdi>${E(shown(x.k, x.k.unit === 'pct' && x.v != null ? x.v * 100 : x.v))}</bdi></td><td><b class="shrk r${x.r ?? 0}">${x.r ?? '–'}</b> <small>${ar ? AR.of5 : 'of 5'}</small></td><td><bdi>${pctT(x.w)}</bdi></td></tr>`).join('')}</tbody></table>
      <dl class="shrc-sum">
        <div><dt>${ar ? AR.final : 'Final'}</dt><dd><bdi>${pctT(r.finalPct)}</bdi> <small>(<bdi>${E(String(r.finalRank))}</bdi> ${ar ? AR.of5 : 'of 5'})</small></dd></div>
        <div><dt>${ar ? AR.days : 'Days attended'}</dt><dd>${ar ? AR.ofDays(EX.att, EX.sched) : `${EX.att} of ${EX.sched}`} <small>(<bdi>${pctT(r.daysPct)}</bdi>)</small></dd></div>
        <div><dt>${ar ? AR.base : 'Base'}</dt><dd><bdi>${nf(env.base)}</bdi> ${ar ? AR.sr : 'SR'}</dd></div>
        <div class="gates"><dt>${ar ? AR.gates : 'Eligible'}</dt><dd>${g.map((t, i) => `<span class="${c.gates[i] && c.gates[i].ok ? 'ok' : 'no'}">${c.gates[i] && c.gates[i].ok ? '✓' : '✗'} ${t}</span>`).join('')}</dd></div>
        <div class="total"><dt>${ar ? AR.earned : 'Bonus earned'}</dt><dd><b><bdi>${nf(c.earned)}</bdi> ${ar ? AR.sr : 'SR'}</b> <small dir="ltr">${E(formula(env, c))}</small></dd></div>
      </dl>`;
  }
  // ---------------------------------------------------------------- the sections, in the order they are told (with the speaker notes)
  const ROLES = [
    ['user', 'WFM analyst', 'Builds the month every bonus is counted from, with every check done before it counts.', 'i-up'],
    ['wfm', 'WFM manager', 'Sends the month\'s numbers for review and sees every trend behind them.', 'i-chart'],
    ['senior', 'Senior manager', 'Reviews every result and finalizes the month\'s bonuses.', 'i-clock'],
    ['spv', 'Supervisor', 'Confirms the team\'s attendance and coaches from each agent\'s own numbers.', 'i-team'],
    ['quality', 'Quality team', 'Enters the quality scores once; they count the same in every bonus.', 'i-star'],
    ['agent', 'Agent', 'Sees their bonus and exactly how it was counted, and can question it, in English or Arabic.', 'i-user'],
  ];
  function sections(env) {
    const E = env.esc, c = count(env, { v: startVals(env.card), att: EX.att, abs: EX.abs, mon: EX.mon, crit: EX.crit }), fig = env.fig || (() => '');
    if (!tryX) tryReset(env);
    const S = [
      { id: 'hero', name: 'Cadence', notes: `Cadence is one idea: every Member Care bonus, counted right. It counts each person's bonus from the month's own numbers, with one set of rules for everyone, checks every number before it counts, and explains the result to the person it pays. Here is ${EX.name}, a made-up champion: ${pctT(c.res.finalPct)} final, ${EX.att} of ${EX.sched} days, ${nf(c.earned)} riyals, counted by the tool itself.`,
        html: `<div class="shhero"><div class="shherotext shrise"><span class="bologo on-light shlogo" aria-hidden="true"></span><div class="eyebrow">Cadence · Member Care's bonus</div>
          <h2 class="shbig">Every bonus, <b>counted right.</b></h2>
          <p class="shlead">Cadence counts every Member Care bonus from the month's own numbers: one set of rules for everyone, checked before it counts, and explained to the person it pays.</p>
          <div class="shcta"><button type="button" class="btn primary" data-showpresent>Present</button><button type="button" class="btn" data-showgo="try">Try a bonus</button></div>
          <ul class="shstrip" id="showStrip">${(env.strip || []).map(x => `<li>${E(x)}</li>`).join('')}</ul></div>${ticketHtml(env, c)}</div>` },
      { id: 'before', name: 'The challenge', notes: `A bonus touches pay, so it has to be right. Before, it was counted by hand: ${env.cards} scorecards, up to ${env.card.kpis.length} KPIs each with its own bands and weight, numbers from more than ten places joined person by person. A slip showed up on a payslip, and every question meant opening the spreadsheets again.`,
        html: `${head(E, 'The challenge', 'A bonus used to be counted <b>by hand.</b>', '')}
          <div class="shnums shrise"><div><b>${E(String(env.cards))}</b><span>scorecards: one for each department and role</span></div><div><b>${env.card.kpis.length}</b><span>KPIs on a champion's scorecard, each with its own bands and weight</span></div><div class="hot"><b>10+</b><span>sources behind every bonus: Genesys, attendance, quality, the KPI file</span></div></div>
          <div class="shcards three shrise">${[['Joined by hand', 'Adherence, AHT, attendance and quality came from different files and were matched person by person.'], ['Found on the payslip', 'A slip in a formula or a name showed up after the bonus was paid, not before.'], ['Hard to explain', 'A question about a bonus meant opening the spreadsheets again to work it out.']].map(([b, t]) => `<div class="shcard"><b>${b}</b><p>${t}</p></div>`).join('')}</div>` },
      { id: 'count', name: 'How a bonus is counted', notes: `Every bonus is counted the same way, in five steps. The month's numbers come in and are matched to each person. Each KPI is ranked from 1 to 5 against its bands. The ranks are weighted into the final. The days attended count against the days scheduled. Then the gates. ${EX.name}: ${E(String(c.res.finalRank))} of 5 is ${pctT(c.res.finalPct)}; ${EX.att} of ${EX.sched} days; ${nf(env.base)} riyals times ${pctT(c.res.daysPct)} times ${pctT(c.res.finalPct)} is ${nf(c.earned)}. The senior manager sets the rules once a month, and a change never touches a month that is closed.`,
        html: `${head(E, 'How a bonus is counted', 'Five steps, <b>the same for everyone.</b>', `One formula for every person, with the rules the senior manager sets for the month; a change never touches a month that is closed. Here is ${E(EX.name)}, a made-up champion, counted by the tool itself.`)}${stepsHtml(env, c)}` },
      { id: 'try', name: 'Try it', notes: `This is ${EX.name}'s scorecard, counted live by the same engine. Ask the room for a number: lower the adherence, add late minutes, an absence or an attitude error, and every rank, the final, the gates and the bonus follow at once. Back to her month puts it back.`,
        html: `${head(E, 'Try it', 'Move a number, <b>watch the bonus follow.</b>', `${E(EX.name)}'s scorecard, ranked by the same engine that counts the month. Change any number: every rank, the final, the gates and the bonus follow at once.`)}
          <div class="shtry shrise" data-try><div class="shtry-in" data-tryin>${tryInHtml(env)}</div><div class="shtry-out" aria-live="polite" data-tryout></div></div>` },
      { id: 'checks', name: 'Checked before it counts', notes: 'No bonus is paid on a guess. Every row finds its person by National ID, then by name, and anyone it cannot place is listed. A missing KPI is flagged and counted by the month\'s written rule. Two attendance files that disagree are shown side by side to choose, and every correction keeps who and when. The senior manager reviews every result and finalizes the month. And it was tested with a hundred people working at the same time on one shared folder: every change reached everyone else, none was lost, and there was not one error.',
        html: `${head(E, 'Checked before it counts', 'No bonus is paid <b>on a guess.</b>', 'Before a result counts, the tool settles every question it can, and names the ones only a person can answer.')}
          <div class="shchecks shrise"><div class="shcards two">${[['Every person matched', 'Each row finds its person by National ID, then by name; anyone it cannot place is listed, never guessed.'], ['Nothing missing in silence', 'A KPI with no value is flagged, and the final follows the month\'s written rule for it.'], ['Attendance settled', 'Two files that disagree on a day are shown side by side to choose; every correction keeps who and when.'], ['Reviewed, then final', 'The senior manager reviews every result and finalizes the month; after that only they can change it.']].map(([b, t], i) => `<div class="shcard"><span class="shno">0${i + 1}</span><b>${b}</b><p>${t}</p></div>`).join('')}</div>
            <div class="shproof"><b>100</b><span>people using Cadence at the same time, tested: every change reached everyone, none lost</span>${fig('sieve', 'Sieves over a pan: every number settled before it counts')}</div></div>` },
      { id: 'explain', name: 'Every bonus explained', notes: `Every result carries how it was counted. This is what the agent sees on their own page: each KPI with its value, rank and weight, the final, the days, the base, the gates and the bonus. Press Arabic: the same lines in Arabic. A question about pay is answered in a click, and the supervisor and the senior manager see the same lines.`,
        html: `${head(E, 'Every bonus explained', 'A question about a bonus, <b>answered in a click.</b>', 'Every result carries how it was counted. The agent sees it on their own page, in English or Arabic; their supervisor and the senior manager see the same lines.')}
          <div class="shexplain shrise"><div class="seg shlang" role="group" aria-label="Language"><button type="button" data-shlang="en" aria-pressed="true">English</button><button type="button" data-shlang="ar" aria-pressed="false" lang="ar">العربية</button></div>
            <div class="shrcpt" data-rcpt dir="ltr" lang="en">${receiptHtml(env, c, 'en')}</div></div>` },
      { id: 'roles', name: 'Every role', notes: env.roleAct ? 'Every role plays its part in the bonus, on its own page, seeing only what is theirs. Press View on a role to open its page live, on today\'s data. It is a preview: nothing is saved while you view, and Back to Admin returns here.' : 'Every role plays its part in the bonus, on its own page, seeing only what is theirs: the analysts build the month, quality enters the scores once, the supervisors confirm attendance, the senior manager finalizes, and every agent sees how their own bonus was counted.',
        html: `${head(E, 'Every role', 'Every role <b>plays its part.</b>', env.roleAct ? 'Press View to open that page live, on today\'s data, exactly as its role sees it. Nothing is saved and National IDs are hidden while you view; Back to Admin returns here.' : 'Each role has its own page in Cadence and sees only what is theirs.')}
          <div class="shroles shrise">${ROLES.map(([r, name, part, ico]) => `<div class="shrole"><div class="shrtop"><span class="shrico" aria-hidden="true"><svg><use href="#${ico}"/></svg></span><b>${E(name)}</b></div><p class="now"><span>Their part</span>${E(part)}</p>${env.roleAct ? env.roleAct(r) : ''}</div>`).join('')}
            ${env.roleAct ? '<div class="shrole admin"><div class="shrtop"><span class="shrico" aria-hidden="true"><svg><use href="#i-lock"/></svg></span><b>Admin</b></div><p class="now"><span>Their part</span>Accounts and roles, vacation cover, and this Showcase.</p><div class="shract"><span class="pill info">You are here</span></div></div>' : ''}
            ${fig('hub', 'A hub and its tiles: one set of data, a page for every role')}</div>` },
      ...(env.live ? [{ id: 'live', name: 'This month', notes: 'This is this month\'s bonus, straight from the shared data: how many people were scored, how many earn a bonus, the average final and the bonuses in riyals. Totals only, never a name.',
        html: `${head(E, 'This month', 'This month\'s bonus, <b>at a glance.</b>', 'Straight from the shared data: totals only, never a name.')}<div id="showLive">${env.live()}</div>` }] : []),
      { id: 'trust', name: 'Trust', notes: 'A bonus is pay, the most sensitive data Member Care has. It stays on our own computers, encrypted, and only accounts made in the tool can read it. Nothing is sent anywhere. National IDs never leave the tool in an email. Every change to results, rules and roles keeps who and when.',
        html: `${head(E, 'Trust', 'Pay data <b>stays ours.</b>', '')}
          <div class="shtrust shrise"><div class="shtiles">${[['0', 'web requests', 'Nothing is sent anywhere: the data stays on our own computers.'], ['AES-256', 'encrypted shared data', 'Only accounts made in the tool can read the shared data.'], ['No IDs', 'in email attachments', 'National IDs never leave the tool in an email.'], ['Logged', 'every change', 'Results, rules and roles: who changed what, and when.'], ['Offline', 'nothing to install', 'One tool the whole team opens; it works without the internet.']].map(([b, s, t], i) => `<div class="shtile${i ? '' : ' on'}"><b>${b}</b><span>${s}</span><p>${t}</p></div>`).join('')}</div>
            ${fig('vault', 'A vault door: the shared data, encrypted')}</div>` },
      { id: 'start', name: 'What\'s next', notes: 'Three steps: count the next month\'s bonus in Cadence, with the old spreadsheet beside it for one month to compare every result; measure what it gives back, hours, corrections and questions about pay; then make it how Member Care pays, every month.',
        html: `<div class="shend"><div class="shendtext">${head(E, 'What\'s next', 'Ready for <b>the next bonus.</b>', '')}
          <ol class="shgo shrise">${[['Count the next month\'s bonus in Cadence', 'With the old spreadsheet beside it for one month, to compare every result.'], ['Measure what it gives back', 'Hours, corrections and questions about pay, against the month before.'], ['Make it how we pay', 'Every month, every role, one set of rules.']].map(([h, t], i) => `<li><span class="shn">${i + 1}</span><div><b>${h}</b><p>${t}</p></div></li>`).join('')}</ol>
          <p class="shthanks shrise">Thank <b>you.</b></p></div>${fig('laptop', 'A laptop, its lid opening: the next bonus')}</div>` },
    ];
    return S;
  }
  // ---------------------------------------------------------------- what moves, and what the room changes
  const RM = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  /** a number counting from a to b (the bonus, the final), once; at once with reduced motion */
  function countUp(el, a, b, ms = 900) {
    if (RM() || !(ms > 0)) { el.textContent = nf(b); return; }
    const t0 = performance.now(), step = t => { const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); el.textContent = nf(Math.round(a + (b - a) * e)); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  /** a section that came into view: its numbers count up, once */
  function arrive(sec) {
    if (!sec || sec.dataset.counted) return; sec.dataset.counted = '1';
    sec.querySelectorAll('[data-count]').forEach(el => { const b = +el.dataset.count, suf = el.dataset.suffix || ''; if (!Number.isFinite(b)) return; if (suf) { if (RM()) return; const t0 = performance.now(), step = t => { const p = Math.min(1, (t - t0) / 900); el.textContent = `${Math.round(b * (1 - Math.pow(1 - p, 3)))}${suf}`; if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); } else countUp(el, 0, b); });
  }
  /** the room's changes, on the page that holds the story (once): Try it and the receipt's language */
  function bind(root, env) {
    if (!root || root.dataset.storyBound) return; root.dataset.storyBound = '1';
    root.addEventListener('input', e => {
      const t = e.target;
      if (t.matches('[data-tk]')) { tryX.v[t.dataset.tk] = +t.value; const k = env.card.kpis.find(q => q.id === t.dataset.tk), o = root.querySelector(`[data-tv="${CSS.escape(t.dataset.tk)}"]`); if (o && k) o.textContent = shown(k, +t.value); tryUpdate(root, env, lastEarned(root)); return; }
      if (t.matches('[data-td]')) {
        const f = t.dataset.td;
        if (f === 'crit') tryX.crit = t.checked; else tryX[f] = +t.value;
        if (f === 'att') { const a = root.querySelector('[data-td="abs"]'); tryX.abs = Math.min(tryX.abs, EX.sched - tryX.att); if (a) { a.max = String(EX.sched - tryX.att); a.value = String(tryX.abs); } }
        const set = (k, v) => { const o = root.querySelector(`[data-tdv="${k}"]`); if (o) o.textContent = v; };
        set('att', `${tryX.att} of ${EX.sched}`); set('abs', String(tryX.abs)); set('mon', String(tryX.mon));
        tryUpdate(root, env, lastEarned(root)); return;
      }
    });
    root.addEventListener('change', e => { if (e.target.matches('[data-td="crit"]')) { tryX.crit = e.target.checked; tryUpdate(root, env, lastEarned(root)); } });
    root.addEventListener('click', e => {
      if (e.target.closest('[data-tryreset]')) { const from = lastEarned(root); tryReset(env); const box = root.querySelector('[data-tryin]'); if (box) box.innerHTML = tryInHtml(env); tryUpdate(root, env, from); return; }
      const l = e.target.closest('[data-shlang]');
      if (l) { const lang = l.dataset.shlang, box = root.querySelector('[data-rcpt]'); if (!box) return; root.querySelectorAll('[data-shlang]').forEach(b => b.setAttribute('aria-pressed', String(b === l))); box.dir = lang === 'ar' ? 'rtl' : 'ltr'; box.lang = lang; box.innerHTML = receiptHtml(env, count(env, { v: startVals(env.card), att: EX.att, abs: EX.abs, mon: EX.mon, crit: EX.crit }), lang); return; }
    });
  }
  const lastEarned = root => { const e = root.querySelector('[data-tryearned]'); const n = e ? +String(e.textContent).replace(/[^\d.-]/g, '') : NaN; return Number.isFinite(n) ? n : null; };
  /** draw (or draw again) the parts that follow the room: Try it's ranks and outputs */
  function paint(root, env) { if (root.querySelector('[data-tryout]')) tryUpdate(root, env, null); }
  return { sections, bind, paint, arrive, count, EX, ROLES };
})();
if (typeof module !== 'undefined') module.exports = ShowStory;
