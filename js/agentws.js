// ================================================================ MY PAGE: the agent's own results, attendance and forms
// An agent reads only their own place in the shared data (locked with their own key): a profile, one record per month and
// their forms, copied there by their supervisor and the WFM team. The agent fills in their part of a one-to-one (the places the
// supervisor left empty) and sends it to the supervisor; the supervisor sends it back with a final comment (accepted or
// rejected), and only then does the agent sign it on screen (drawn or typed) and email the signed PDF.
Object.assign(state, { me: null, meMonth: '', signForm: null });

/** after an agent signs in: their own place in the data, kept live */
function loadAgentData(db, pid) {
  state.db = db; state.rosterReady = true;
  langLoad();
  if (!pid) { state.me = { pid: '', prof: null, months: {}, forms: {}, sigs: {}, objs: {}, replies: {}, err: 'Your account is not linked to your name yet. Ask your supervisor.' }; renderAll(); return; }
  state.me = { pid, prof: null, months: {}, forms: {}, sigs: {}, objs: {}, replies: {}, loaded: 0, got: new Set() };
  const done = () => { state.me.loaded++; renderAll(); };
  const getProf = () => db.doc('agent/' + pid).get().then(s => { state.me.prof = s.exists ? s.data() : null; renderAll(); }, () => {});
  getProf(); setInterval(() => { if (!document.hidden) getProf(); }, 60000);
  const sub = (c, f) => { const got = () => state.me.got.add(f); try { db.collection(`agent/${pid}/${c}`).onSnapshot(sn => { const o = {}; sn.docs.forEach(d => { o[d.id] = d.data(); }); state.me[f] = o; got(); done(); }, () => { got(); done(); }); } catch (e) { got(); done(); } };
  sub('months', 'months'); sub('forms', 'forms'); sub('sign', 'sigs'); sub('obj', 'objs'); sub('reply', 'replies');
  try { db.doc('config/logo').get().then(s => { if (s.exists) { const d = s.data() || {}; if (typeof d.dataUrl === 'string' && d.dataUrl.startsWith('data:image/')) { state.logo = { dataUrl: d.dataUrl, w: d.w, h: d.h }; logoPx = null; } } }, () => {}); } catch (e) { /* the built-in logo */ }
}
function renderAll() { if (state.ws === 'me') renderWs(); else render(); if (state.signForm && !$('dSign').hidden) langApply(); }

// ---------------------------------------------------------------- the page (in English or Arabic: T() gives the agent's language)
function renderMe() {
  if (!state.me && state.db && roleNow() === 'agent' && Auth.user()) loadAgentData(state.db, Auth.user().pid);   // signed in outside the shared folder, or just approved
  if (!state.lang && Auth.user()) langLoad();
  langApply();
  const M = state.me, body = $('meBody'), ar = langNow() === 'ar';
  const langBtn = `<button class="btn sm ghost langbtn" data-melang="${ar ? 'en' : 'ar'}" lang="${ar ? 'en' : 'ar'}" title="${ar ? 'Show my page in English' : 'اعرض صفحتي بالعربية'}">${ar ? 'English' : 'العربية'}</button>`;
  const eb = $('v-me').querySelector('.eyebrow'); if (eb) eb.textContent = T('My page');
  $('meSub').textContent = ar ? 'أداؤك وحضورك واجتماعاتك الفردية. تملأ هنا جزأك من نموذج الاجتماع الفردي وترسله إلى مشرفك، وتوقّع عليه عندما يرسل القرار النهائي، وتعترض إذا كان هناك ما ليس صحيحًا.' : 'Your performance, attendance and one-to-ones. You fill in your part of a one-to-one here and send it to your supervisor, sign it when they send the final, and object if something is not right.';
  if (!M) { $('meBar').innerHTML = `<div class="wsacts">${langBtn}</div>`; body.innerHTML = emptyCard(T('Loading your page…'), ''); return; }
  if (M.err) { $('meBar').innerHTML = `<div class="wsacts">${langBtn}</div>`; body.innerHTML = emptyCard(T('Almost there'), T(M.err)); return; }
  const P = M.prof || {}, months = Object.keys(M.months).sort();
  if (!months.includes(state.meMonth)) { const c = closeMonthNow(), last = months[months.length - 1] || '';   // the month being closed first, while it is not final
    state.meMonth = last > c && M.months[c] && M.months[c].status !== 'final' ? c : last; }
  const k = state.meMonth, rec = k ? M.months[k] : null, r = rec ? rec.row || {} : null, set = state.settings;
  $('h-me').textContent = P.name ? T("{first}'s page", { first: P.name.split(' ')[0] }) : T('My page');
  // the month box: the agent moves between their months here (arrows or the list), on every screen size
  const mi = months.indexOf(k), prevL = ar ? 'الشهر السابق' : 'Previous month', nextL = ar ? 'الشهر التالي' : 'Next month';
  $('meBar').innerHTML = `${months.length ? `<div class="monthbox" role="group" aria-label="${esc(T('Month'))}"><button type="button" class="btn sm icon mbstep" data-mestep="-1" aria-label="${esc(prevL)}" title="${esc(prevL)}"${mi <= 0 ? ' disabled' : ''}><svg width="16" height="16" aria-hidden="true"><use href="#i-chevl"/></svg></button><label class="mbsel"><span class="sr">${esc(T('Month'))}</span><svg width="15" height="15" aria-hidden="true"><use href="#i-day"/></svg><select class="cell" data-memonth aria-label="${esc(T('Month'))}">${months.slice().reverse().map(x => `<option value="${x}"${x === k ? ' selected' : ''}>${esc(ymLabelT(x))}${M.months[x].status === 'final' ? esc(T(' · final')) : ''}</option>`).join('')}</select></label><button type="button" class="btn sm icon mbstep" data-mestep="1" aria-label="${esc(nextL)}" title="${esc(nextL)}"${mi >= months.length - 1 ? ' disabled' : ''}><svg width="16" height="16" aria-hidden="true"><use href="#i-chevr"/></svg></button></div>` : ''}<div class="wsacts">${r && r.kpi ? `<button class="btn sm" data-mekpi><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>${esc(T('My KPI card (PDF)'))}</button>` : ''}${langBtn}</div>`;
  const prof = `<section class="card profile mecard"><div class="phead"><span class="av lg" aria-hidden="true"${avStyle(P.name || '')}>${esc(initials(P.name || '?'))}</span><div class="pwho"><b dir="auto">${esc(P.name || T('Your name'))}</b><span>${esc([P.brand, P.teamName || P.team].filter(Boolean).join(' · '))}</span></div></div>
    <div class="pfacts"><div><span>${esc(T('National ID'))}</span><b class="num">${esc(P.nid || '–')}</b></div><div><span>${esc(T('Brand'))}</span><b>${esc(P.brand || '–')}</b></div><div><span>${esc(T('Team'))}</span><b>${esc(P.team || '–')}</b></div><div><span>${esc(T('Supervisor'))}</span><b dir="auto">${esc(P.spvName || '–')}</b></div></div></section>`;
  if (!rec) { body.innerHTML = prof + emptyCard(T('Nothing here yet'), T('Your results show here once your supervisor or the WFM team shares the month with you.')); return; }
  const fin = rec.status === 'final', w = objWindow(rec, k), ob = w.open;
  const status = `<div class="wsstatus ${fin ? 'final' : 'draft'}"><span class="dot"></span><div><b>${esc(T(fin ? 'Final' : 'Draft'))}</b> · ${esc(fin ? T('{m} is final.', { m: ymLabelT(k) }) : T('{m}: the numbers can still change until the month is final.', { m: ymLabelT(k) }))} ${esc(T('Updated {when}', { when: agoT(rec.at) || fmtWhen(rec.at) }))}${rec.by ? esc(T(' by {who}', { who: rec.by })) : ''}.</div></div>`;
  const tile = (b, l, s, cls) => `<div class="tile ${cls || ''}"><span class="tl">${esc(l)}</span><b>${esc(b)}</b>${s ? `<span class="ts">${esc(s)}</span>` : ''}</div>`;
  const el = r.el || r._el, whyT = L => whyTr(L);
  const run = !!(rec.mtd && !fin);   // a month still running: its projection is in the card above
  const tiles = tile(pct(r.adh, 1), T('adherence'), T('target {t}', { t: pct(set.target, 0) }), r.adh != null && r.adh < set.target ? 'alert' : '') + (run ? '' : tile(pct1(r.fin), T('final % (KPI)'), r.kc || ''))
    + (run ? '' : fin ? tile(r.earned == null ? '–' : `${Math.round(r.earned).toLocaleString('en-US')} ${T('SR')}`, T('incentive'), el && !el.ok ? T('not eligible: {why}', { why: whyT(el.why) }) : '') : tile(el ? (el.ok ? T('Yes') : T('Not yet')) : '–', T('eligibility'), el && !el.ok ? whyT(el.why) : T('shown in full when the month is final')))
    + tile(mss(r.aht), T('AHT'), '') + tile(String(r.absent ?? '–'), T('absent days'), '') + tile(r.tardy == null ? '–' : String(Math.round(r.tardy)), T('tardy minutes'), '');
  let h = prof + status + safeHtml(mtdCardHtml, rec) + `<div class="tiles wstiles">${tiles}</div>`;
  if (r.kpi && r.kpi.length) h += `<div class="card"><h2>${esc(T('KPI results'))}${r.kc ? ' · ' + esc(r.kc) : ''}</h2><div class="tablewrap formtab"><table><thead><tr><th>${esc(T('KPI'))}</th><th class="r">${esc(T('Weight'))}</th><th>${esc(T('Target'))}</th><th class="r">${esc(T('Result'))}</th><th class="r">${esc(T('Ranking'))}</th>${ob ? '<th></th>' : ''}</tr></thead><tbody>${r.kpi.map(([n, wt, t, v, rk]) => `<tr><td>${esc(n)}</td><td class="r">${wt}%</td><td>${ltr(t)}</td><td class="r num">${ltr(v)}</td><td class="r">${rankChip(rk)}</td>${ob ? `<td class="r"><button class="linkbtn objlink" data-meobj="kpi|${esc(n)}">${esc(T('Object'))}</button></td>` : ''}</tr>`).join('')}<tr class="tot"><td>${esc(T('Final'))}</td><td></td><td></td><td class="r num">${pct1(r.fin)}</td><td class="r">${r.fr != null ? (+r.fr).toFixed(2) : '–'}</td>${ob ? '<td></td>' : ''}</tr></tbody></table></div>${r.ks != null ? `<p class="hint">${esc(T('Days attended {a} of {s} scheduled.', { a: r.ka ?? '–', s: r.ks }))}</p>` : ''}</div>`;
  if (r.hnd != null) h += `<div class="card"><h2>${esc(T('Performance'))}</h2><div class="pfgrid">${['ans', 'hnd', 'pAht', 'talk', 'hold', 'acw', 'heldR', 'xferR', 'out'].map(c => `<div><span>${esc(T(PFM[c][0]))}</span><b>${esc(PFM[c][1](pfVal(r, c)))}</b></div>`).join('')}</div></div>`;
  if (r.wfShift != null) h += `<div class="card"><h2>${esc(T('Shifts and exceptions'))}</h2><div class="pfgrid wfgrid"><div><span>${esc(T('Shifts'))}</span><b>${r.wfShift}</b></div><div class="${r.wfWorked < r.wfShift ? 'bad' : ''}"><span>${esc(T('Worked'))}</span><b>${r.wfWorked}</b></div><div class="${r.wfAbs ? 'bad' : ''}"><span>${esc(T('No sign-on'))}</span><b>${r.wfAbs}</b></div><div class="${r.wfLate ? 'bad' : ''}"><span>${esc(T('Late sign-ons'))}</span><b>${r.wfLate}</b><small>${hmin(r.wfLateMin)}</small></div><div class="${r.wfShort ? 'bad' : ''}"><span>${esc(T('Short of shift'))}</span><b>${r.wfShort}</b><small>${hmin(r.wfShortMin)}</small></div><div><span>${esc(T('Break changes'))}</span><b>${r.wfBrk}</b></div><div><span>${esc(T('Signed on'))}</span><b>${hmin(r.wfLogged)}</b></div><div class="${r.wfExc ? 'bad' : 'good'}"><span>${esc(T('Exceptions'))}</span><b>${r.wfExc}</b></div></div></div>`;
  if (r.q) { const Q = r.q, c = (l, v, d = 1, cls = '') => `<div class="${cls}"><span>${esc(T(l))}</span><b>${v == null ? '–' : pct(v, d)}</b></div>`; h += `<div class="card"><h2>${esc(T('Quality'))}</h2><div class="pfgrid">${c('Quality Observations', Q.qobs, 1, Q.qobs != null && Q.qobs < 0.95 ? 'bad' : '')}${c('Call QA', Q.callqa)}${c('Ticket QA', Q.ticketqa)}${c('CR', Q.cr, 0)}</div>${(Q.crit || []).length ? `<p class="hint">${esc(T('Critical errors: {list}', { list: Q.crit.map(x => x.type + (x.n > 1 ? ' ×' + x.n : '')).join(', ') }))}</p>` : `<p class="hint">${esc(T('No critical errors.'))}</p>`}<p class="hint">${esc(T("From the quality team's evaluation of {m}.", { m: ymLabelT(k) }))}</p></div>`; }
  if (r.inter && r.inter.calls) { const I = r.inter, pc = (a, b) => (b ? pct(a / b, 1) : '–'), c = (l, v, cls = '') => `<div class="${cls}"><span>${esc(T(l))}</span><b>${v}</b></div>`; h += `<div class="card"><h2>${esc(T('Calls'))}</h2><div class="pfgrid">${c('Handled calls', I.calls.toLocaleString('en-US'))}${c('Average duration', I.aht == null ? '–' : mss(I.aht))}${c('Calls under 10 seconds', pc(I.short, I.calls))}${c('You hung up', pc(I.agentDisc, I.calls))}${c('Call drops (connection)', I.drops, I.drops >= 5 ? 'bad' : '')}${c('Transferred', pc(I.xfer, I.calls))}${c('Customer called again within 3 days', pc(I.rep72, I.calls))}</div></div>`; }
  const ad = adOf(r), y = +k.slice(0, 4), m = +k.slice(5), ND = Core.daysIn(y, m), dn = d => `${dayNameT(y, m, d)} ${d} ${MONT(m)}`;
  const cellTag = ob ? 'button' : 'div';
  if (ad) h += `<div class="card"><h2>${esc(T('Daily adherence'))}</h2><div class="strip${ob ? ' pick' : ''}">${Array.from({ length: ND }, (_, i) => { const v = ad[i] ?? null; return `<${cellTag} class="${v == null ? 'na' : v < set.target ? 'low' : 'ok'}"${ob ? ` data-meobj="adh|${i + 1}" type="button"` : ''} title="${esc(dn(i + 1))}: ${v == null ? 'NA' : pct(v)}"><small>${i + 1}</small><b>${v == null ? 'NA' : v >= 0.99995 ? '100' : (v * 100).toFixed(2)}</b></${cellTag}>`; }).join('')}</div>${ob ? `<p class="hint">${esc(T('Select a day to object to it.'))}</p>` : ''}</div>`;
  if (r.d || r.dx) { const days = daysOfRow(r, ND); h += `<div class="card"><h2>${esc(T('Attendance'))}</h2><div class="astrip${ob ? ' pick' : ''}">${days.map((v, i) => `<${cellTag} class="${ATT_CLS(v)}"${ob ? ` data-meobj="att|${i + 1}" type="button"` : ''} title="${esc(dn(i + 1))}: ${esc(attWord(v))}"><small>${i + 1}</small><b>${esc(ATT_SHORT(v))}</b></${cellTag}>`).join('')}</div><p class="hint">${esc(T('Counted from your schedule and sign-ons, corrected by your supervisor where needed. Questions? Ask {spv}.', { spv: P.spvName || T('your supervisor') }))}${ob ? ' ' + esc(T('Select a day to object to it.')) : ''}</p></div>`; }
  // forms
  const F = Object.entries(M.forms).map(([id, f]) => ({ ...f, id })).filter(f => fkey(f) === k).sort((a, b) => String(a.kind).localeCompare(String(b.kind)));
  h += `<div class="card"><h2>${esc(T('One-to-ones · {m}', { m: ymLabelT(k) }))}</h2>${!meFormsReady() ? `<p class="subtle"><span class="spin" aria-hidden="true"></span> ${esc(T('Loading your page…'))}</p>` : F.length ? `<ul class="ilist">${F.map(f => {
    const st = meSigState(f), planned = f.status === 'planned', w = meFormWhere(f);
    const chip = st === 'signed' ? `<span class="sgn ok">${esc(T('Signed {when}', { when: fmtWhen(M.sigs[f.id].at) }))}</span>` : st === 'changed' ? `<span class="sgn warn">${esc(T('Changed since you signed: please sign again'))}</span>`
      : w === 'sign' ? `<span class="sgn todo">${esc(T('Final from your supervisor: sign it'))}</span>` : w === 'sent' ? `<span class="sgn">${esc(T('Sent {when}: waiting for your supervisor', { when: agoT(M.replies[f.id].at) }))}</span>`
        : `${planned && f.plannedAt ? `<span class="fst planned">${esc(T('Arranged for {d}', { d: fmtDateT(f.plannedAt) }))}</span> ` : ''}<span class="sgn todo">${esc(T('Your part to fill in'))}</span>`;
    const btn = st === 'signed' || w === 'sent' ? ['', 'Open'] : w === 'sign' || st === 'changed' ? [' primary', 'Read and sign'] : [' primary', 'Fill in'];
    return `<li><span class="nm">${esc(T(FORM_TITLE[f.kind] || 'Form'))}</span><span class="sg">${chip}${f.supervisor ? esc(T(' · with {spv}', { spv: f.supervisor })) : ''}${f.date && !planned ? ` · ${esc(fmtDateT(f.date))}` : ''}</span><span class="sp"></span><span class="acts"><button class="btn sm${btn[0]}" data-meform="${esc(f.id)}">${esc(T(btn[1]))}</button></span></li>`;
  }).join('')}</ul>` : `<p class="subtle">${esc(T('No one-to-one for this month yet.'))}</p>`}</div>`;
  h += safeHtml(meObjHtml, k, rec);
  body.innerHTML = h;
  reveal(body);
}
function meSigState(f) { const g = state.me && state.me.sigs[f.id]; if (!g) return 'none'; return g.hash && g.hash !== formHash(f) ? 'changed' : 'signed'; }
/** the forms, the signatures and the parts sent are all in (so a signed form never shows as one to fill in) */
const meFormsReady = () => { const M = state.me; return !M || !M.got || ['forms', 'sigs', 'replies'].every(x => M.got.has(x)); };
/** where the agent is with a form: 'fill' (their part to fill in), 'sent' (sent, waiting for the supervisor's final), 'sign' (the final came) */
function meFormWhere(f) { if (f.verdict) return 'sign'; return state.me && state.me.replies && state.me.replies[f.id] ? 'sent' : 'fill'; }

// ---------------------------------------------------------------- reading, filling in and signing a form
let signUrl = '', pad = null;
async function openSign(id) {
  const M = state.me, f = M && M.forms[id]; if (!f) return;
  state.signForm = { ...f, id };
  langApply();
  $('h-sign').textContent = `${T(FORM_TITLE[f.kind] || 'Form')} · ${f.period || ''}`;
  $('signSub').textContent = f.supervisor ? (f.date && f.status !== 'planned' ? T('With {spv} on {d}', { spv: f.supervisor, d: fmtDateT(f.date) }) : T('With {spv}', { spv: f.supervisor })) : '';
  $('signBody').innerHTML = `<p class="subtle"><span class="spin" aria-hidden="true"></span> ${esc(T('Making the PDF…'))}</p>`;
  openDrawer('dSign');
  await renderSign();
}
async function renderSign() {
  const f = state.signForm; if (!f) return;
  const M = state.me, g = M.sigs[f.id], st = meSigState(f), signed = st === 'signed', fin = !!f.verdict, rp = M.replies[f.id] || null;
  const edit = !fin && !signed;   // the agent's part can be filled in (and sent again) until the supervisor sends the final
  let bytes = null; try { bytes = await formPdf(f); } catch (e) { bytes = null; }
  if (signUrl) URL.revokeObjectURL(signUrl);
  signUrl = bytes ? URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })) : '';
  const stmt = T(f.kind === 'final' ? Forms.STATEMENT : fin ? 'I have read this one-to-one form and my supervisor\'s final comment. My signature confirms that I received it; it does not necessarily mean that I agree.' : 'I have read this one-to-one form. My signature confirms that the discussion took place and that I received a copy; it does not necessarily mean that I agree.');
  const V = f.verdict, verdict = fin ? `<section class="sec verdictbox ${V.d === 'rejected' ? 'rej' : 'acc'}"><h3>${esc(T('Final from your supervisor'))}</h3><p><b>${esc(T(V.d === 'rejected' ? 'Rejected' : 'Accepted'))}</b> · ${esc(fmtWhen(V.at))}${V.byName ? ` · ${esc(V.byName)}` : ''}</p><p class="vc" dir="auto">${esc(V.comment || '').replace(/\n/g, '<br>')}</p></section>` : '';
  const intro = edit ? `<div class="banner info">${esc(T(rp ? 'You sent your part {when}. You can still change it and send it again until your supervisor sends the final.' : 'Fill in the empty places (your part), then send the form to your supervisor. They read it and send it back with their final comment; you sign it then.', { when: agoT(rp && rp.at) }))} ${esc(T('Write in English letters: the printed form cannot show Arabic.'))}</div>` : '';
  $('signBody').innerHTML = `${verdict}${intro}${formReadHtml(f, edit ? { edit: true, rp } : {})}${signUrl ? `<p class="hint"><a href="${signUrl}" target="_blank" rel="noopener">${esc(T('Open the form as a PDF'))}</a>${esc(T(', exactly as it is printed and signed.'))}</p>` : ''}
    ${!fin && !signed ? '' : signed ? `<section class="sec signed"><h3>${esc(T('You signed this form'))}</h3><p>${esc(fmtWhen(g.at))}${g.typed ? esc(T(' · typed name: {n}', { n: g.typed })) : ''}</p>${g.img ? `<img class="sigimg" src="${esc(g.img)}" alt="${esc(T('Your signature'))}">` : ''}${g.comment ? `<p class="hint">${esc(T('Your comment: {c}', { c: g.comment }))}</p>` : ''}</section>`
      : `<section class="sec"><h3>${esc(T(st === 'changed' ? 'The form changed after you signed it' : 'Sign the form'))}</h3>${st === 'changed' ? `<p class="hint">${esc(T('Your supervisor changed it after you signed. Read it again and sign the new version.'))}</p>` : ''}
      <div class="field"><span class="lbl">${esc(T('Your comment (optional)'))}</span><textarea id="sigComment" rows="2" dir="auto" placeholder="${esc(T('Anything you want to add to the form'))}"></textarea></div>
      <div class="field"><span class="lbl">${esc(T('Your signature'))}</span><div class="sigpad" dir="ltr"><canvas id="sigPad" aria-label="Signature pad: draw your signature with the mouse or your finger"></canvas><button type="button" class="btn sm ghost" id="sigClear">${esc(T('Clear'))}</button></div><small>${esc(T('Draw it with the mouse or your finger, or type your full name instead:'))}</small><input id="sigTyped" class="cell" placeholder="${esc(T('Your full name'))}" autocomplete="name" dir="auto"></div>
      <label class="check"><input type="checkbox" id="sigAgree"> ${esc(stmt)}</label></section>`}`;
  $('signFoot').innerHTML = signed ? `<span class="spacer"></span><button class="btn" id="sigPdf"><svg width="16" height="16" aria-hidden="true"><use href="#i-down"/></svg>${esc(T('Download the signed PDF'))}</button><button class="btn primary" id="sigMail"><svg width="16" height="16" aria-hidden="true"><use href="#i-mail"/></svg>${esc(T('Email it to me and my supervisor'))}</button>`
    : fin ? `<span class="spacer"></span><button class="btn primary" id="sigGo">${esc(T('Sign'))}</button>`
      : `<span class="hint sendnote">${esc(T('The signature comes after your supervisor\'s final.'))}</span><span class="spacer"></span><button class="btn primary" id="rpSend"><svg width="16" height="16" aria-hidden="true"><use href="#i-mail"/></svg>${esc(T(rp ? 'Send again' : 'Send to my supervisor'))}</button>`;
  if (fin && !signed) pad = sigPad($('sigPad'));
}
/** the form to read on screen (the PDF is one click away), with its labels in the agent's language; with o.edit, the places the
 *  supervisor left empty are the agent's to fill in (o.rp: what they sent before) */
function formReadHtml(f, o = {}) {
  const fin = f.kind === 'final', a = f.agent || {}, D = x => (x ? fmtDateT(x) : '–'), by = new Set(f.byAgent || []), rp = o.rp || null;
  const grid = [[T('Agent'), a.name], [T('National ID'), a.id || '–'], [T('Team'), a.teamName ? `${a.team} – ${a.teamName}` : a.team], [T('Brand'), a.brand], [T('Supervisor'), f.supervisor || '–'], [T(fin ? 'Date of this form' : 'Date of the one-to-one'), D(f.date)], [T('Period reviewed'), f.period || ''], ...(fin ? [[T('One-to-one held on'), D(f.heldOn)]] : []), [T('Reference'), f.ref || '']];
  const canFill = k => !!o.edit && (by.has(k) || !normSpace(f[k] || ''));
  const val = k => (rp && rp[k] != null ? rp[k] : by.has(k) ? f[k] || '' : '');
  const yours = `<span class="fromag">${esc(T('your part'))}</span>`;
  const box = (l, t, k) => (k && canFill(k)
    ? `<div class="rbox edit"><label for="rf-${k}">${esc(T(l))} ${yours}</label><textarea id="rf-${k}" data-rf="${k}" rows="${k === 'discussion' ? 4 : 3}" dir="auto">${esc(val(k))}</textarea></div>`
    : `<div class="rbox"><span>${esc(T(l))}${k && by.has(k) ? ` <span class="fromag">${esc(T('you wrote'))}</span>` : ''}</span><p dir="auto">${t ? esc(t).replace(/\n/g, '<br>') : '<i class="subtle">–</i>'}</p></div>`);
  const res = (f.results || []).filter(r => r && r.on !== false && (r.metric || r.result));
  let h = `<section class="sec fread"><div class="pfacts rgrid">${grid.map(([l, v]) => `<div><span>${esc(l)}</span><b dir="auto">${esc(v || '–')}</b></div>`).join('')}</div>`;
  if (!fin) h += `<p class="hint">${esc(T('Topics: {list}', { list: Forms.TOPICS.filter(([k]) => f.topics && f.topics[k]).map(([, l]) => T(l)).join(', ') || '–' }))}</p>`;
  h += `<h3>${esc(T('Results – {p}', { p: f.period || '' }))}</h3><div class="tablewrap formtab"><table><thead><tr><th>${esc(T('Metric'))}</th><th>${esc(T('Target'))}</th><th class="r">${esc(T('Result'))}</th><th>${esc(T('Status'))}</th></tr></thead><tbody>${res.map(r => `<tr><td>${esc(r.metric || '')}</td><td>${ltr(r.target || '')}</td><td class="r num"><b>${ltr(r.result || '')}</b></td><td>${esc(r.status || '')}</td></tr>`).join('') || `<tr><td colspan="4" class="empty">${esc(T('None.'))}</td></tr>`}</tbody></table></div>${(f.details || []).filter(Boolean).map(t => `<p class="hint">${esc(t)}</p>`).join('')}`;
  if (fin) {
    h += box('Summary of findings', f.findings) + box("Agent's explanation", f.agentComments, 'agentComments') + box('Outcome', T((Forms.OUTCOMES.find(x => x[0] === f.outcome) || [, ''])[1])) + box('Action plan', f.actionPlan) + box('Review date', D(f.reviewDate));
    if (f.consequence) h += `<p class="hint"><i>${esc(f.consequence)}</i></p>`;
  } else {
    const ag = new Set(f.agentRows || []), all = (f.actions || []).map((x, i) => ({ x, i })).filter(z => z.x && (z.x.action || z.x.owner || z.x.due));
    const shown = o.edit ? all.filter(z => !ag.has(z.i)) : all;   // while filling in: the supervisor's rows, then the agent's own rows to edit
    const mine = o.edit ? (rp ? rp.actions || [] : all.filter(z => ag.has(z.i)).map(z => z.x)).map(x => ({ ...x })) : [];
    if (o.edit) while (mine.length < 2) mine.push({});
    const row = (x, i) => `<tr class="edrow"><td><input class="cell" data-ra="${i}" data-k="action" value="${esc(x.action || '')}" dir="auto" aria-label="${esc(T('Action'))} ${i + 1}"></td><td><input class="cell" data-ra="${i}" data-k="owner" value="${esc(x.owner || '')}" dir="auto" aria-label="${esc(T('Owner'))} ${i + 1}"></td><td><input class="cell" type="date" data-ra="${i}" data-k="due" value="${esc(x.due || '')}" aria-label="${esc(T('Due date'))} ${i + 1}"></td></tr>`;
    const dateBox = canFill('reviewDate') ? `<div class="rbox edit"><label for="rf-reviewDate">${esc(T('Next review date'))} ${yours}</label><input type="date" id="rf-reviewDate" class="cell" data-rf="reviewDate" value="${esc(val('reviewDate'))}"></div>` : box('Next review date', D(f.reviewDate), 'reviewDate');
    h += safeHtml(fuReadHtml, f) + box('What was discussed', f.discussion, 'discussion') + box('Root cause', f.rootCause, 'rootCause') + box("Agent's comments", f.agentComments, 'agentComments')
      + `<h3>${esc(T('Agreed actions'))}${o.edit ? ' ' + yours : ''}</h3><div class="tablewrap formtab"><table><thead><tr><th>${esc(T('Action'))}</th><th>${esc(T('Owner'))}</th><th>${esc(T('Due date'))}</th></tr></thead><tbody>${shown.map(z => `<tr><td dir="auto">${esc(z.x.action || '')}${ag.has(z.i) ? ` <span class="fromag">${esc(T('you wrote'))}</span>` : ''}</td><td>${esc(z.x.owner || '')}</td><td>${esc(D(z.x.due))}</td></tr>`).join('')}${mine.map(row).join('')}${!shown.length && !mine.length ? `<tr><td colspan="3" class="empty">${esc(T('None.'))}</td></tr>` : ''}</tbody></table></div>${o.edit ? `<button type="button" class="linkbtn" data-raadd>${esc(T('Add a row'))}</button>` : ''}` + dateBox;
  }
  return h + '</section>';
}
/** the agent's part, sent to the supervisor (it goes into the form when the supervisor opens it) */
async function sendReply() {
  const f = state.signForm, M = state.me; if (!f || !M || !state.db || f.verdict) return;
  const body = { formId: f.id, k: fkey(f), kind: f.kind, at: new Date().toISOString(), name: (M.prof && M.prof.name) || f.agent.name };
  const B = $('signBody');
  for (const k of AGENT_TXT[f.kind] || []) { const el = B.querySelector(`[data-rf="${k}"]`); if (el) body[k] = String(el.value || '').trim().slice(0, 4000); }
  if (f.kind === '1to1') {
    const rows = new Map(); B.querySelectorAll('[data-ra]').forEach(el => { const i = +el.dataset.ra, r = rows.get(i) || {}; r[el.dataset.k] = el.value; rows.set(i, r); });
    body.actions = [...rows.values()].map(r => ({ action: normSpace(r.action || '').slice(0, 300), owner: normSpace(r.owner || '').slice(0, 80), due: r.due || '' })).filter(r => r.action || r.owner || r.due).slice(0, 8);
  }
  const txt = [...(AGENT_TXT[f.kind] || []).filter(k => k !== 'reviewDate').map(k => body[k] || ''), ...(body.actions || []).flatMap(x => [x.action, x.owner])];
  if (!txt.some(x => normSpace(x)) && !body.reviewDate) { toast(T('Fill in at least one place before you send it.')); const el = B.querySelector('[data-rf]'); if (el) el.focus(); return; }
  if (txt.some(x => x && Forms.hasOdd(x))) { toast(T('Write in English letters: the printed form cannot show Arabic.')); return; }
  const btn = $('rpSend'); if (btn) btn.disabled = true;
  try { await state.db.doc(`agent/${M.pid}/reply/${f.id}`).set(body); M.replies[f.id] = body; toast(T('Sent to your supervisor. You sign the form when they send it back with their final comment.')); }
  catch (e) { toast(T('Not sent ({e}). Try again.', { e: (e && e.code) || 'error' })); if (btn) btn.disabled = false; return; }
  await renderSign(); renderAll();
}
/** a small drawing pad: pointer strokes on a canvas, sharp on any screen */
function sigPad(cv) {
  const box = cv.getBoundingClientRect(), r = Math.max(1, Math.min(3, window.devicePixelRatio || 1)), W = Math.max(260, Math.round(box.width || 460)), H = 130;
  cv.width = W * r; cv.height = H * r; cv.style.height = H + 'px';
  const g = cv.getContext('2d'); g.scale(r, r); g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1b2a5c';
  let down = false, last = null, inked = false;
  const at = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * (W / b.width), (e.clientY - b.top) * (H / b.height)]; };
  cv.addEventListener('pointerdown', e => { down = true; last = at(e); cv.setPointerCapture(e.pointerId); g.beginPath(); g.arc(last[0], last[1], 1.1, 0, 7); g.fillStyle = g.strokeStyle; g.fill(); inked = true; e.preventDefault(); });
  cv.addEventListener('pointermove', e => { if (!down) return; const p = at(e); g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p; inked = true; e.preventDefault(); });
  const up = () => { down = false; last = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.style.touchAction = 'none';
  return { inked: () => inked, clear() { g.clearRect(0, 0, W, H); inked = false; }, png: () => { const o = document.createElement('canvas'); o.width = Math.min(600, W * r); o.height = Math.round(o.width * H / W); o.getContext('2d').drawImage(cv, 0, 0, o.width, o.height); return o.toDataURL('image/png'); } };
}
async function signNow() {
  const f = state.signForm, M = state.me; if (!f || !M || !state.db || !f.verdict) return;   // the signature comes after the supervisor's final
  const typed = normSpace($('sigTyped').value), drawn = pad && pad.inked();
  if (!drawn && typed.length < 3) { toast(T('Draw your signature, or type your full name.')); return; }
  if (!$('sigAgree').checked) { toast(T('Tick the box to confirm you read the form.')); $('sigAgree').focus(); return; }
  if (typed && Forms.hasOdd(typed) && !drawn) { toast(T('Type your name in English letters (the PDF font cannot show this one), or draw your signature.')); return; }
  const body = { formId: f.id, k: fkey(f), kind: f.kind, at: new Date().toISOString(), name: (M.prof && M.prof.name) || f.agent.name, typed: drawn ? '' : typed, img: drawn ? pad.png() : '', comment: normSpace($('sigComment').value).slice(0, 600), agree: true, hash: formHash(f) };
  $('sigGo').disabled = true;
  try { await state.db.doc(`agent/${M.pid}/sign/${f.id}`).set(body); M.sigs[f.id] = body; toast(T('Signed. You can now download it or email it.')); }
  catch (e) { toast(T('Could not save your signature ({e}). Try again.', { e: (e && e.code) || 'error' })); $('sigGo').disabled = false; return; }
  await renderSign(); renderAll();
}
async function mailSigned() {
  const f = state.signForm, M = state.me; if (!f || !M) return;
  const P = M.prof || {}, me = P.email ? `${P.name} <${P.email}>` : '', spv = P.spvEmail ? `${P.spvName} <${P.spvEmail}>` : '';
  if (!me && !spv) toast('There is no email for you or your supervisor in the roster yet: add the recipients in Outlook.');
  try {
    const bytes = await formPdf(f), first = String(P.spvName || '').split(' ')[0] || 'Team Leader';
    const html = mP(`Dear ${esc(first)},`) + mP(`Please find attached my signed ${f.kind === 'final' ? 'final form' : 'one-to-one form'} for <b>${esc(f.period || '')}</b>, signed in the MC tool on ${esc(fmtWhen(M.sigs[f.id].at))}.`) + mP('Best regards,');
    await saveEml(`Signed ${f.kind === 'final' ? 'final form' : 'one-to-one'} - ${f.period}`, { to: [me].filter(Boolean), cc: [spv].filter(Boolean), subject: `Signed ${f.kind === 'final' ? 'final form' : 'one-to-one'} | ${P.name || f.agent.name} | ${f.period}`, html, files: [{ name: formFile(f).replace(/\.pdf$/, ' - signed.pdf'), bytes, type: 'application/pdf' }] });
  } catch (e) { toast('Could not make the email: ' + (e && e.message ? e.message : e)); }
}
/** the signature that goes on a form's PDF: only when the agent signed this very version */
function sigForPdf(f) {
  if (!f) return null;
  const g = (state.me && state.me.sigs && state.me.sigs[f.id]) || (state.sigs && state.sigs.get(f.id)) || null;
  if (!g || (g.hash && g.hash !== formHash(f))) return null;
  return g;
}
async function sigPixels(g) {
  let img = null;
  if (g.img && /^data:image\/png;base64,/.test(g.img)) {
    try {
      const im = await loadImg(g.img), w = im.naturalWidth, h = im.naturalHeight, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const c = cv.getContext('2d'); c.drawImage(im, 0, 0); const px = c.getImageData(0, 0, w, h).data, rgbA = new Uint8Array(w * h * 3), al = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) { rgbA[i * 3] = px[i * 4]; rgbA[i * 3 + 1] = px[i * 4 + 1]; rgbA[i * 3 + 2] = px[i * 4 + 2]; al[i] = px[i * 4 + 3]; }
      img = { w, h, rgb: rgbA, alpha: al };
    } catch (e) { img = null; }
  }
  const d = new Date(g.at);
  return { img, typed: img ? '' : g.typed || g.name || '', date: isNaN(d) ? '' : `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`, when: fmtWhen(g.at), ref: (g.hash || '').slice(0, 8), comment: g.comment || '' };
}
/** the agent's KPI card as a PDF */
async function meKpiPdf() {
  const M = state.me, k = state.meMonth, rec = M && M.months[k], r = rec && rec.row, P = (M && M.prof) || {}; if (!r || !r.kpi) return;
  const card = { agent: { name: P.name || r.n, id: P.nid || r.id || '', team: P.team || '', teamName: P.teamName || '', brand: P.brand || '' }, scorecard: r.kc || '',
    rows: r.kpi.map(([name, w, target, result, rank]) => ({ name, weight: `${w}%`, target, result, rank })),
    sum: { finalRank: r.fr != null ? (+r.fr).toFixed(2) : '–', finalPct: pct1(r.fin), sched: r.ks ?? '–', actual: r.ka ?? '–', daysPct: r.ks ? pct1(r.ka / r.ks) : '–', target: rec.status === 'final' ? r.kt ?? '–' : '–', earned: rec.status === 'final' ? r.earned ?? '–' : 'when final', missing: '', comment: '' } };
  try { const bytes = await Forms.kpiCards([card], { period: ymLabel(k), logo: await logoPixels() }); await save(`KPI card - ${normSpace(card.agent.name).replace(/[\\/:*?"<>|]/g, '')} - ${ymLabel(k)}.pdf`, new Blob([bytes], { type: 'application/pdf' })); }
  catch (e) { toast('Could not make the PDF: ' + (e && e.message ? e.message : e)); }
}

// ---------------------------------------------------------------- events
$('meBar').addEventListener('change', e => { if (e.target.matches('[data-memonth]')) { state.meMonth = e.target.value; renderWs(); } });
$('meBar').addEventListener('click', e => {
  const b = e.target.closest('[data-mestep]'); if (!b || !state.me) return;
  const L = Object.keys(state.me.months).sort(), i = L.indexOf(state.meMonth) + +b.dataset.mestep; if (i < 0 || i >= L.length) return;
  state.meMonth = L[i]; renderWs();
  const nb = $('meBar').querySelector(`[data-mestep="${b.dataset.mestep}"]`); if (nb && !nb.disabled) nb.focus(); else { const s = $('meBar').querySelector('[data-memonth]'); if (s) s.focus(); }
});
$('meBar').addEventListener('click', e => { if (e.target.closest('[data-mekpi]')) meKpiPdf(); });
$('meBody').addEventListener('click', e => { const b = e.target.closest('[data-meform]'); if (b) openSign(b.dataset.meform); });
$('dSign').addEventListener('click', e => {
  if (e.target.closest('#sigClear')) { if (pad) pad.clear(); return; }
  if (e.target.closest('#sigGo')) { signNow(); return; }
  if (e.target.closest('#rpSend')) { sendReply(); return; }
  if (e.target.closest('[data-raadd]')) {   // one more row of actions
    const tb = $('signBody').querySelector('tr.edrow') ? $('signBody').querySelector('tr.edrow').parentElement : null; if (!tb) return;
    const n = tb.querySelectorAll('tr.edrow').length; if (n >= 8) return;
    tb.insertAdjacentHTML('beforeend', `<tr class="edrow"><td><input class="cell" data-ra="${n}" data-k="action" dir="auto" aria-label="${esc(T('Action'))} ${n + 1}"></td><td><input class="cell" data-ra="${n}" data-k="owner" dir="auto" aria-label="${esc(T('Owner'))} ${n + 1}"></td><td><input class="cell" type="date" data-ra="${n}" data-k="due" aria-label="${esc(T('Due date'))} ${n + 1}"></td></tr>`);
    tb.querySelector(`[data-ra="${n}"][data-k="action"]`).focus(); return;
  }
  if (e.target.closest('#sigPdf')) { const f = state.signForm; if (f) downloadForm(f); return; }
  if (e.target.closest('#sigMail')) mailSigned();
});
