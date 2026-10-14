
/* Turns parsed files + history into the report model the renderer consumes. */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined';
  const E = isNode ? require('./engine.js').Engine : window.Engine;
  const R = isNode ? require('./render.js').Render : window.Render;

  const THEMES = {
    friendi: { ink: '#013a37', accent: '#48c2c9', onAccent: '#013a37', soft: '#9fdde1', muted: '#6c6a68',
               todayBg: '#48c2c9', todayColor: '#013a37', todayBorder: null, todayWord: 'turquoise' },
    fpay:    { ink: '#013a37', accent: '#48c2c9', onAccent: '#013a37', soft: '#9fdde1', muted: '#6c6a68',
               todayBg: '#48c2c9', todayColor: '#013a37', todayBorder: null, todayWord: 'turquoise' },
    virgin:  { ink: '#201e1d', accent: '#e10a0a', onAccent: '#ffffff', soft: '#fbe0dd', muted: '#6f6c6a',
               todayBg: '#fbe0dd', todayColor: '#201e1d', todayBorder: '4px solid #e10a0a', todayWord: 'red' },
    postpaid:{ ink: '#201e1d', accent: '#e10a0a', onAccent: '#ffffff', soft: '#fbe0dd', muted: '#6f6c6a',
               todayBg: '#fbe0dd', todayColor: '#201e1d', todayBorder: '4px solid #e10a0a', todayWord: 'red' }
  };

  const REPORTS = {
    virgin:   { key: 'virgin',   name: 'Virgin Mobile',  legal: 'Beyond One', eyebrow: 'MEMBER CARE · VIRGIN MOBILE',
                signature: 'Workforce Management Department', channels: ['facebook','twitter','whatsapp','email'],
                channelLabels: { facebook: 'FB', twitter: 'TW', whatsapp: 'WA', email: 'Email' },
                asaRule: 'all', q85: true, logoKey: 'virgin', nvTotalRow: 'MTD', ticketSkip: ['Other'],
                signatureFrom: 'Workforce Management Department', monthFormat: 'Mon-YY' },
    friendi:  { key: 'friendi',  name: 'FRiENDi Mobile', legal: 'Beyond One',
                signature: 'Workforce Management Department', channels: ['facebook','email'],
                channelLabels: { facebook: 'Facebook', email: 'Email' },
                asaRule: 'facebook', q85: true, logoKey: 'friendi', nvTotalRow: 'MTD',
                signatureFrom: 'Workforce Management Department', monthFormat: 'YY-Mon' },
    // FRiENDi Pay has its own template now (taken from the 13 Sep design): email presented /
    // handled, five call reasons, and tickets by category + subcategory
    fpay:     { key: 'fpay',     name: 'FRiENDi Pay',    legal: 'Beyond One',
                signature: 'Workforce Management Department', channels: ['email'],
                channelLabels: { email: 'Email' },
                asaRule: 'total', q85: false, logoKey: 'fpay', noAbPct: true, emailPH: true,
                nvTotalRow: 'Total', reasonsLimit: 5, keepReasons: ['Follow Up'], noGroups: true,
                slFootnote: true, reportDayWord: 'The report date is',
                signatureFrom: 'Workforce Management Department', monthFormat: 'YY-Mon' },
    postpaid: { key: 'postpaid', name: 'Virgin Postpaid', legal: 'Beyond One', eyebrow: 'MEMBER CARE · VIRGIN POSTPAID',
                signature: 'Workforce Management Department', channels: [],   // no Inbound Non-Voice section
                asaRule: 'all', q85: false, logoKey: 'virgin', postpaid: true, ticketTop: 10,
                titleBrandFrom: 'Virgin Mobile', titleBrand: 'Virgin Postpaid',
                signatureFrom: 'Workforce Management Department', monthFormat: 'Mon-YY' },
    /* The MC Leaders ticket summary: not a brand report at all — no calls, no history, no
       template to fill. It reads the EXECUTIVE TKTs dashboard and draws itself. */
    leaders:  { key: 'leaders', name: 'MC Leaders', kind: 'leaders', legal: 'Beyond One',
                eyebrow: 'MEMBER CARE · MC LEADERS', team: 'MC Leaders',
                signature: 'Workforce Management Department', channels: [] },
    /* The Daily WFM & Performance Review (Dia'a Banjar's WFM builder, carried in as a tab):
       Virgin, FRiENDi and FRiENDi Pay side by side, from the agent-level Genesys exports. */
    wfm:      { key: 'wfm', name: 'WFM Daily Review', kind: 'wfm', channels: [] }
  };

  const SEED_NOTES = {
    'Check Data Usage': 'Customer asks about his data usage',
    'Add/delete Package': 'Add or delete package',
    'SIM Status': 'SIM status',
    'CVM Offers': 'CVM offers',
    'Terminated Number': 'Terminated number',
    'Disputes/Deduction': 'Customer asks about his balance deduction',
    'Backing out from Final Termination': 'Backing out from final termination',
    'OTP is not received': 'OTP is not received',
    'Internet Settings': 'Customer requests internet settings',
    'Contact Channels': 'Contact channels',
    'Renew Now': 'Customer asks to renew now',
    'Virgin Website- موقع فيرجن': 'Virgin website',
    'Add Package - إضافة باقة': 'Add a new package',
    'Internet Settings - اعدادات الإنترنت': 'Customer requests internet setting',
    'Recharge/Payment Methods - طريقة الشحن': 'Customer asks about recharge methods',
    'SIM Validity - صلاحية الشريحة': 'Customer asking about SIM validity',
    'Add a Booster': 'Add a booster',
    'Plan Status': 'Plan status',
    'Clear Plans': 'Customer asks to clear his plans'
  };

  /* Reason descriptions from the team's own call-reason lists (Virgin and FRiENDi), keyed by the
     Sub Service exactly as the call-history export prints it. They win over SEED_NOTES for that
     brand; anything typed in "Reason descriptions" wins over both. Postpaid reads Virgin's. */
  const BRAND_NOTES = {
    virgin: {
      "ID update - تحديث بيانات الرقم": "The Customer Asking to ID Update",
      "Asking About FRiENDi - استفسار عن فريندي": "Asking About Friendi",
      "SIM Validity - صلاحية الشريحة": "The Customer Asking About Sim Validity",
      "Digital Plans": "Customer Asks About Digital Plans",
      "Internet Settings - اعدادات الإنترنت": "Customer Request Internet Setting",
      "Bundle/Plan Usage - استهلاك الإنترنت": "Customer Ask About His Internet Usage",
      "Clear Plans": "Customer Asks To Clear His Plans",
      "Recharge/Payment Methods - طريقة الشحن": "Customer Ask About Recharge Methods",
      "Add Package - إضافة باقة": "Add A New Package",
      "How to Activate a Plan": "How to Activate a Plan",
      "How to Renew the Plan": "How To Renew The Plan",
      "Numbers Under ID - الارقام تحت الهوية": "Customer Ask About Numbers Under ID",
      "Plan Status": "Customer Ask About Plan Status",
      "Renew Now": "Customer Asks to Renew Now",
      "Data Bundles - باقات الإنترنت": "Customer Asks About Data Bundles",
      "Billing Details-تفاصيل الفاتورة": "Inquiring about Billing Details",
      "Virgin App - تطبيق فيرجن": "Virgin App",
      "Reason Behind Line Disconnection-اسباب فصل الخط": "Reason Behind Line Disconnection",
      "SIM Swap - تغيير الشريحة/بدل فاقد": "SIM Swap",
      "SMS Center Number- رقم مركز الرسائل": "SMS Center Number",
      "Virgin Website- موقع فيرجن": "Virgin Website"
    },
    friendi: {
      "How to Recharge": "How To Recharge",
      "How to Top-up": "How To Recharge",
      "Recharge Methods": "How To Recharge",
      "SIM Activation": "Ask To Activate His Line",
      "New Activation": "Ask To Activate His Line",
      "Internet Settings": "Customer Request Internet Setting",
      "ID Verification": "Customer Ask How To Send Id Copy",
      "Change Agent Spoken Language": "Ask To Change The Spoken Language",
      "USSD Issue": "How To Use Ussd",
      "Bonus on Top-up": "Customer Ask About The Recharge Bonus",
      "SIM Validity": "Customer Ask About The Sim Validity",
      "Change Messaging Language": "Ask To Change The Messaging Language",
      "Check Data Usage": "Customer Ask About His Data(Mb) Usage",
      "Balance Inquiry": "Customer Ask About His Balance",
      "How to Activate Bundle": "How To Subscribe To Internet Bundled",
      "Can't Connect to the Internet": "Customer Ask Why His Internet Not Working",
      "Internet Speed": "Customer Ask Why His Internet Not Working",
      "Loacal Credit Transfer": "Customer Ask How To Transfer Credit",
      "Local Credit Transfer": "Customer Ask How To Transfer Credit",
      "International Credit Transfer": "Customer Ask How To Transfer Credit",
      "Int. Credit Transfer": "Customer Ask How To Transfer Credit",
      "Fraud": "Customers Complaining About Receiving Fraud Calls",
      "Numbers Under ID": "Customer Ask About His Numbers Under His ID",
      "Disputes/Deduction": "Customer Ask About His Balance Deduction",
      "Qanawat SMS Service Deduction": "Customer Ask About His Balance Deduction",
      "PAYG": "Customer Ask Why His Data Deducted",
      "SIM Status": "Customer Asks About SIM Status",
      "Data Bundles": "General Inquiries About Data Bundles"
    }
  };
  function seedNotes(key) {
    return Object.assign({}, SEED_NOTES, BRAND_NOTES[key === 'postpaid' ? 'virgin' : key] || {});
  }
  // exact key first, then the same key with apostrophes / spaces / case flattened
  function noteFor(notes, reason) {
    if (notes[reason] !== undefined && notes[reason] !== '') return notes[reason];
    const flat = s => String(s).replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
    const want = flat(reason);
    for (const k in notes) if (notes[k] && flat(k) === want) return notes[k];
    return '';
  }

  /* How each raw export value is printed in the mail. Anything not listed prints raw. */
  const SEED_LABELS = {
    // call reasons
    'Add/delete Package': 'Add / Delete Package',
    'Disputes/Deduction': 'Disputes / Deduction',
    'Backing out from Final Termination': 'Backing Out from Final Termination',
    'OTP is not received': 'OTP Not Received',
    'Virgin Website- موقع فيرجن': 'Virgin Website — موقع فيرجن',
    'Add Package - إضافة باقة': 'Add Package — إضافة باقة',
    'Internet Settings - اعدادات الإنترنت': 'Internet Settings — اعدادات الإنترنت',
    'Recharge/Payment Methods - طريقة الشحن': 'Recharge / Payment Methods — طريقة الشحن',
    'SIM Validity - صلاحية الشريحة': 'SIM Validity — صلاحية الشريحة',
    // ticket categories
    'Reactivate the Booking code': 'Reactivate the booking code',
    'Wrong info/action': 'Wrong info / action',
    'Weak Coverage': 'Weak coverage',
    'No Network': 'No network',
    // FRiENDi Pay call reasons and ticket subcategories
    'FRiENDi/Virgin Inquiry': 'FRiENDi / Virgin Inquiry',
    "Can't Add a Card that's been Already Used": "Can't add a card that's been already used",
    "Can't Add a Card that’s been Already Used": "Can't add a card that's been already used",
    'MoneyGram- Transaction on Hold': 'MoneyGram — transaction on hold',
    // owning groups
    'Member Care Complaint Management': 'Member Care Complaint Mgmt',
    'Technical-Activation': 'Technical — Activation',
    'Technical-Network&Product': 'Technical — Network & Product',
    'Technical-Plan Management': 'Technical Plan Management'
  };
  function printed(raw, labels) {
    const map = labels || SEED_LABELS;
    return map[raw] !== undefined ? map[raw] : raw;
  }

  function upsert(list, row) {
    const i = list.findIndex(x => x.date === row.date);
    if (i >= 0) list[i] = Object.assign({}, list[i], row); else list.push(row);
    list.sort((a, b) => a.date < b.date ? -1 : 1);
    return list;
  }

  function sameMonth(dateStr, ref) { return dateStr.slice(0, 7) === ref.slice(0, 7); }

  /* Monthly rows for the table: what history holds, plus any month that has closed
     since — voice months average their days, non-voice months add them up. */
  function monthlyRows(section, date, mode, fields) {
    const stored = (section && section.monthly ? section.monthly.slice() : []);
    const have = {};
    stored.forEach(r => { have[r.date] = true; });
    const currentMonth = date.slice(0, 7) + '-01';
    const byMonth = {};
    (section && section.daily ? section.daily : []).forEach(r => {
      const mk = r.date.slice(0, 7) + '-01';
      if (mk >= currentMonth) return;                 // this month has not closed yet
      (byMonth[mk] = byMonth[mk] || []).push(r);
    });
    Object.keys(byMonth).forEach(mk => {
      if (have[mk]) return;
      const rows = byMonth[mk], out = { date: mk };
      fields.forEach(f => {
        const vals = rows.map(r => r[f]).filter(v => v !== null && v !== undefined && !isNaN(v));
        if (!vals.length) { out[f] = null; return; }
        const sum = vals.reduce((a, b) => a + b, 0);
        // volumes roll up as totals on the non-voice table, as daily averages on voice
        out[f] = (mode === 'sum' && f !== 'asa') ? sum : sum / vals.length;
      });
      stored.push(out);
    });
    stored.sort((a, b) => a.date < b.date ? -1 : 1);
    const closed = stored.filter(r => r.date < currentMonth);
    const thisYear = closed.filter(r => r.date.slice(0, 4) === date.slice(0, 4));
    return thisYear.length ? thisYear : closed.slice(-8);   // January falls back to last year
  }


  /* A report period: one day on normal days, Thursday → Saturday on Sundays. */
  function makePeriod(start, end) {
    if (!start || start > end) start = end;
    const days = E.dateRange(start, end);
    return { start: start, end: end, days: days, multi: days.length > 1 };
  }

  /* Totals for a set of daily rows — the KPI strip of a multi-day report. */
  function periodAgg(rows) {
    if (rows.length === 1) return Object.assign({}, rows[0]);
    const has = v => v !== null && v !== undefined && !isNaN(v);
    const sum = f => { let s = 0, n = 0; rows.forEach(r => { if (has(r[f])) { s += r[f]; n++; } }); return n ? s : null; };
    const wavg = (f, wf) => {
      let s = 0, w = 0;
      rows.forEach(r => { if (has(r[f]) && has(r[wf]) && r[wf] > 0) { s += r[f] * r[wf]; w += r[wf]; } });
      return w ? s / w : E.mean(rows.map(r => r[f]));
    };
    const presented = sum('presented'), handled = sum('handled'), abandoned = sum('abandoned');
    const totalPresented = sum('totalPresented');
    return {
      presented: presented, handled: handled, abandoned: abandoned,
      ansPct: presented ? handled / presented : null,
      abPct: presented ? abandoned / presented : null,
      sl: wavg('sl', 'presented'), aht: wavg('aht', 'handled'), asa: wavg('asa', 'handled'),
      q85: wavg('q85', 'presented'),
      totalPresented: totalPresented, ppPct: totalPresented ? presented / totalPresented : null
    };
  }

  /* Build one report model. `data` carries the period's computed values, `hist` the stored history. */
  function buildReport(key, periodOrDate, data, hist, opts) {
    opts = opts || {};
    const period = typeof periodOrDate === 'string' ? makePeriod(periodOrDate, periodOrDate) : periodOrDate;
    const date = period.end, multi = period.multi;
    const cfg = REPORTS[key], t = THEMES[key];
    const notes = Object.assign(seedNotes(key), opts.notes || {});
    const labels = Object.assign({}, SEED_LABELS, opts.labels || {});
    const days = data.days || {};
    const monthStart = date.slice(0, 7) + '-01';
    // the daily block is the end month to date — plus any report day that falls in the month before
    const inBlock = d => d <= date && (d >= monthStart || d >= period.start);

    let voiceDaily = (hist.voice && hist.voice.daily ? hist.voice.daily.slice() : []).filter(r => inBlock(r.date));
    period.days.forEach(d => { voiceDaily = upsert(voiceDaily, Object.assign({ date: d }, (days[d] && days[d].voice) || {})); });
    const VOICE_FIELDS = ['presented','handled','ansPct','abandoned','abPct','sl','aht','asa','q85','totalPresented','ppPct'];
    const voiceMonthly = monthlyRows(hist.voice, date, 'avg', VOICE_FIELDS);

    const avgFields = ['presented','handled','ansPct','abandoned','abPct','sl','aht','asa','q85','totalPresented','ppPct'];
    const avg = E.averageRow(voiceDaily.filter(r => r.date >= monthStart), avgFields);   // month to date

    let nvDaily = [];
    if (cfg.channels.length) {
      nvDaily = (hist.nonvoice && hist.nonvoice.daily ? hist.nonvoice.daily.slice() : []).filter(r => inBlock(r.date));
      period.days.forEach(d => { nvDaily = upsert(nvDaily, Object.assign({ date: d }, (days[d] && days[d].nonvoice) || {})); });
    }
    const NV_FIELDS = cfg.emailPH ? ['presented','handled','asa'] : cfg.channels.concat(['asa']);
    const nvMonthly = cfg.channels.length ? monthlyRows(hist.nonvoice, date, 'sum', NV_FIELDS) : [];

    const monthName = R.FULL[+date.slice(5, 7) - 1];
    const sections = [];
    const fInt = E.fmtInt, fPct = E.fmtPct, fDur = E.fmtDur;
    const inPeriod = d => period.days.indexOf(d) >= 0;
    const periodWords = R.dayWords(period.start, period.end);          // "Thursday to Saturday"
    const periodShort = R.dayShort(period.start, period.end);          // "Thu–Sat"

    /* 01 — voice */
    const vcols = [{ label: 'Date' }];
    if (cfg.postpaid) {
      vcols.push({ label: 'Virgin total' }, { label: 'Presented', strong: true }, { label: 'Postpaid %', strong: true });
    } else {
      vcols.push({ label: 'Presented' });
    }
    vcols.push({ label: 'Handled' }, { label: 'Ans %', strong: true });
    vcols.push({ label: 'Aband.' });
    if (!cfg.noAbPct) vcols.push({ label: 'Ab %' });
    vcols.push({ label: 'SL', strong: true }, { label: 'AHT', muted: true }, { label: 'ASA', muted: true });
    if (cfg.q85) vcols.push({ label: '85% Q', muted: true });

    function voiceCells(r, label) {
      const out = [label];
      if (cfg.postpaid) out.push(fInt(r.totalPresented), fInt(r.presented), fPct(r.ppPct));
      else out.push(fInt(r.presented));
      out.push(fInt(r.handled), fPct(r.ansPct), fInt(r.abandoned));
      if (!cfg.noAbPct) out.push(fPct(r.abPct));
      out.push(fPct(r.sl), fDur(r.aht), fDur(r.asa));
      if (cfg.q85) out.push(fDur(r.q85));
      return out;
    }
    const vGroups = [];
    if (voiceMonthly.length) vGroups.push({ label: 'Monthly', rows: voiceMonthly.map(r => ({ cells: voiceCells(r, R.monthLabel(r.date, cfg.monthFormat)) })) });
    vGroups.push({
      label: monthName + ' — daily',
      rows: voiceDaily.map(r => ({ cells: voiceCells(r, R.dayLabel(r.date)), today: inPeriod(r.date) }))
        .concat([{ cells: voiceCells(avg, 'Average'), total: true }])
    });
    const markWord = multi ? periodWords + ' are' : (cfg.reportDayWord || 'Today is');
    sections.push({
      number: '01', title: 'Inbound Voice — SLA', kind: 'metric', cols: vcols, groups: vGroups,
      subtitle: 'Monthly performance, then ' + monthName + ' day by day. ' + markWord + ' marked in ' + t.todayWord + '.',
      footnote: 'AHT — average handling time · ' + (cfg.slFootnote ? 'SL — service level · ' : '') + 'ASA — average speed of answer' +
        (cfg.q85 ? ' · 85% Q — average 85% queue time' : '')
    });

    /* 02 — non-voice */
    let mtd = {};
    if (cfg.channels.length) {
      const ncols = [{ label: 'Date' }];
      if (cfg.emailPH) ncols.push({ label: 'Presented' }, { label: 'Handled' });
      else cfg.channels.forEach(ch => ncols.push({ label: cfg.channelLabels[ch] }));
      ncols.push({ label: 'ASA', muted: true });

      function nvCells(r, label) {
        const out = [label];
        if (cfg.emailPH) out.push(fInt(r.presented), fInt(r.handled));
        else cfg.channels.forEach(ch => out.push(r[ch] === null || r[ch] === undefined ? 'NA' : fInt(r[ch])));
        out.push(fDur(r.asa));
        return out;
      }
      const nvMonth = nvDaily.filter(r => r.date >= monthStart);
      if (cfg.emailPH) {
        mtd.presented = nvMonth.reduce((a, r) => a + (r.presented || 0), 0);
        mtd.handled = nvMonth.reduce((a, r) => a + (r.handled || 0), 0);
      } else cfg.channels.forEach(ch => { mtd[ch] = nvMonth.reduce((a, r) => a + (r[ch] || 0), 0); });
      mtd.asa = E.mean(nvMonth.map(r => r.asa));

      const nGroups = [];
      if (nvMonthly.length) nGroups.push({ label: 'Monthly', rows: nvMonthly.map(r => ({ cells: nvCells(r, R.monthLabel(r.date, cfg.monthFormat)) })) });
      nGroups.push({
        label: monthName + ' — daily',
        rows: nvDaily.map(r => ({ cells: nvCells(r, R.dayLabel(r.date)), today: inPeriod(r.date) }))
          .concat(cfg.nvTotalRow ? [{ cells: nvCells(mtd, cfg.nvTotalRow), total: true }] : [])
      });
      const FULLNAME = { facebook: 'Facebook', twitter: 'Twitter', whatsapp: 'WhatsApp', email: 'Email' };
      const bandItems = [];
      let bandLabel = monthName + ' to date — total contacts';
      if (cfg.emailPH) {
        bandLabel = monthName + ' to date — emails presented';
        bandItems.push({ label: 'Emails presented', value: fInt(mtd.presented) },
                       { label: 'Handled', value: fInt(mtd.handled) },
                       { label: 'Total ASA', value: fDur(mtd.asa) });
      } else {
        const tot = cfg.channels.reduce((a, ch) => a + (mtd[ch] || 0), 0);
        bandItems.push({ label: 'Total contacts', value: fInt(tot) });
        cfg.channels.forEach(ch => bandItems.push({ label: FULLNAME[ch], value: fInt(mtd[ch]) }));
      }
      const abbrev = cfg.channels.some(ch => cfg.channelLabels[ch] !== FULLNAME[ch]);
      sections.push({
        number: '02', title: 'Inbound Non-Voice', kind: 'metric', cols: ncols, groups: nGroups,
        subtitle: cfg.emailPH
          ? cfg.name + ' email volumes presented and handled, with average speed of answer.'
          : (abbrev
              ? cfg.channels.map(ch => cfg.channelLabels[ch] === FULLNAME[ch] ? FULLNAME[ch] : cfg.channelLabels[ch] + ' ' + FULLNAME[ch]).join(' · ') + ', with average speed of answer.'
              : [FULLNAME[cfg.channels[0]], cfg.channels.slice(1).map(ch=>FULLNAME[ch].toLowerCase()).join(' and ')].filter(Boolean).join(' and ') + ' volumes, with average speed of answer.'),
        band: bandItems, bandLabel: bandLabel
      });
    }

    /* 03 — contact mix */
    const mix = data.mix || { list: [] };
    sections.push({
      number: cfg.channels.length ? '03' : '02', title: 'Contact Mix — All Channels', kind: 'bars',
      subtitle: 'Share of contacts by type.',
      items: mix.list.map(m => ({ label: m.label, value: m.pct, display: fPct(m.pct) }))
    });

    /* 04 — top call reasons */
    const reasons = data.reasons || { list: [] };
    const nReasons = cfg.reasonsLimit || 10;
    sections.push({
      number: cfg.channels.length ? '04' : '03', title: 'Top Call Reasons', kind: 'reasons',
      subtitle: (nReasons === 5 ? 'Five' : 'Ten') + ' most frequent reasons across all channels.',
      items: reasons.list.slice(0, nReasons).map(r => ({
        label: printed(r.reason, labels), note: '', value: r.pct, display: fPct(r.pct)
      }))
    });

    /* 05 — tickets */
    const tk = data.tickets || { total: 0, top: [], groups: [] };
    const when = multi ? periodWords : 'today';
    const tkSection = {
      number: cfg.channels.length ? '05' : '04', title: 'Member Care Tickets', kind: 'pairs',
      subtitle: fInt(tk.total) + ' tickets created ' + when + (tk.catRows ? ', by category and subcategory.' : '.'),
      blocks: [
        { left: 'Top ticketing category', right: 'Tickets', items: tk.top.map(x => ({ label: printed(x.label, labels), value: fInt(x.count) })) },
        { left: 'Tickets by owning group', right: 'Tickets', items: tk.groups.map(x => ({ label: printed(x.label, labels), value: fInt(x.count) })) }
      ]
    };
    if (tk.catRows) {
      tkSection.catRows = tk.catRows.map(x => ({ category: printed(x.category, labels), sub: printed(x.sub, labels), value: fInt(x.count) }));
      tkSection.totalValue = fInt(tk.total);
    }
    sections.push(tkSection);

    // KPI strip: the day itself, or the period's totals on a Sunday report
    const periodRows = voiceDaily.filter(r => inPeriod(r.date));
    const v = periodAgg(periodRows.length ? periodRows : [{}]);
    const kpis = [
      { label: 'Calls presented', value: fInt(v.presented),
        sub: cfg.postpaid ? (fPct(v.ppPct) + ' of Virgin total') : ((multi ? periodShort + ' · ' : '') + 'MTD avg ' + fInt(avg.presented) + (multi ? '/day' : '')) },
      { label: 'Answered', value: fPct(v.ansPct), sub: 'MTD avg ' + fPct(avg.ansPct) },
      { label: 'Service level', value: fPct(v.sl), sub: 'MTD avg ' + fPct(avg.sl) },
      { label: 'Avg handling', value: fDur(v.aht), sub: 'MTD avg ' + fDur(avg.aht) },
      { label: 'Tickets created', value: fInt(tk.total), sub: multi ? periodShort : 'Today' }
    ];

    const niceDate = R.niceRange(period.start, period.end);
    const shortWhen = multi ? niceDate.replace(/ \d{4}$/, '') : ((+date.slice(8, 10)) + ' ' + R.MONTHS[+date.slice(5, 7) - 1]);
    const model = {
      key: key, brandName: cfg.name, theme: t, logo: opts.logo || null, logoAspect: opts.logoAspect || null,
      eyebrow: cfg.eyebrow || 'MEMBER CARE',
      title: cfg.headTitle || 'Member Care Summary Report',
      stamp: multi ? periodShort.toUpperCase() + ' · ' + R.stampRange(period.start, period.end) : 'DAILY · ' + R.shortStamp(date),
      niceDate: niceDate,
      monthName: monthName,
      multiDay: multi, periodWords: periodWords, periodShort: periodShort, period: period,
      subject: 'Member Care Summary Report - ' + cfg.name +
        (multi ? ' from ' + R.dmy(period.start) + ' to ' + R.dmy(period.end) : ' for ' + R.dmy(date)),
      greeting: 'Hi Management Team,',
      intro: multi
        ? 'Kindly find below the member care report for ' + periodWords + ', ' + R.longRange(period.start, period.end) + '.'
        : 'Kindly find below the member care daily report for ' + R.longDate(date) + '.',
      insightLabel: 'SLA INSIGHT',
      insightText: opts.insight || 'Normal operation day.',
      preheader: shortWhen + ': ' + fInt(v.presented) + ' calls presented, ' + fPct(v.ansPct) +
        ' answered, ' + fPct(v.sl) + ' service level, ' + fInt(tk.total) + ' tickets. ' + (opts.insight || 'Normal operation day.'),
      kpis: kpis,
      sections: sections,
      footer: {
        thanks: 'Thanks.',
        signature: cfg.signature,
        generated: 'Report generated on ' + R.longDate(date) + '.',
        confidentialTitle: 'Confidential',
        confidentialText: 'This report is confidential and intended solely for the named recipients. Do not forward, copy or distribute outside ' +
          cfg.legal + '. If you received it in error, please delete it and notify the sender.'
      },
      _avg: avg, _voiceDaily: voiceDaily, _nvDaily: nvDaily
    };
    return model;
  }

  /* Compute the period's numbers for one report from the dropped files.
     bag.calls / bag.sm / bag.queue are { brand: { 'yyyy-mm-dd': rows, '*': undated rows } }. */
  function computeData(key, periodOrDate, bag, opts) {
    opts = opts || {};
    const period = typeof periodOrDate === 'string' ? makePeriod(periodOrDate, periodOrDate) : periodOrDate;
    const cfg = REPORTS[key];
    const out = { warnings: [], days: {} };
    const hist = opts.hist || {};
    const single = period.days.length === 1;
    const pick = (map, d) => (map ? (map[d] || (single && !opts.noUndated ? map['*'] : null)) : null);
    const label = d => R.dayName(d).slice(0, 3) + ' ' + (+d.slice(8, 10)) + ' ' + R.MONTHS[+d.slice(5, 7) - 1];
    const saved = (sec, d) => !!(hist[sec] && hist[sec].daily && hist[sec].daily.some(r => r.date === d));
    const missing = { calls: [], sm: [], queue: [] };

    period.days.forEach(d => {
      const day = {};
      const calls = pick(bag.calls[key], d);
      if (calls) {
        day.voice = E.voiceFromCalls(calls);
        if (cfg.postpaid) {
          const vrows = pick(bag.calls.virgin, d);
          const vt = vrows ? E.totalRow(vrows) : null;
          const tot = vt ? E.num(vt['Offer']) : null;
          day.voice.totalPresented = tot;
          day.voice.ppPct = tot ? day.voice.presented / tot : null;
        }
        if (cfg.q85) {
          const qrows = pick(bag.queue[key === 'postpaid' ? 'virgin' : key], d);
          if (qrows) day.voice.q85 = E.q85FromQueue(qrows, key === 'postpaid' ? (r => /postpaid/i.test(r['Queue'] || '')) : null);
          else missing.queue.push(d);
        }
      } else missing.calls.push(d);

      if (cfg.channels.length) {
        const sm = pick(bag.sm[cfg.nvFrom || key], d);
        if (sm) {
          const rule = (opts.asaRule || cfg.asaRule);
          const nv = E.nonVoiceFromSm(sm, cfg.channels, rule);
          day.nonvoice = cfg.emailPH
            ? { presented: nv.presented, handled: nv.handled, asa: nv.asa }
            : Object.assign({ asa: nv.asa }, nv.channels);
          day.asaOptions = nv.asaOptions;
        } else missing.sm.push(d);
      }
      out.days[d] = day;
    });

    // the day the ASA controls act on: the report date
    const last = out.days[period.end] || {};
    out.voice = last.voice; out.nonvoice = last.nonvoice; out.asaOptions = last.asaOptions;

    const say = (list, what, sec) => {
      if (!list.length) return;
      if (single) {
        out.warnings.push('No ' + what + ' found for ' + cfg.name + (saved(sec, list[0]) ? ' — using the figures saved in history.' : '.'));
        return;
      }
      const fromHist = list.filter(d => saved(sec, d)), none = list.filter(d => !saved(sec, d));
      if (none.length) out.warnings.push('No ' + what + ' for ' + none.map(label).join(', ') + '.');
      if (fromHist.length) out.warnings.push('No ' + what + ' for ' + fromHist.map(label).join(', ') + ' — using the figures saved in history.');
    };
    say(missing.calls, 'calls export', 'voice');
    if (cfg.q85 && missing.queue.length) {
      const q = missing.queue.filter(d => !saved('voice', d));
      if (q.length) out.warnings.push('No queue export for ' + (single ? cfg.name : q.map(label).join(', ')) + ' — 85% Q left blank.');
    }
    if (cfg.channels.length) say(missing.sm, cfg.nvFrom ? 'Virgin social/email export' : 'social/email export', 'nonvoice');

    const dates = period.days;
    const when = single ? period.end : R.dayShort(period.start, period.end) + ' (' + R.niceRange(period.start, period.end) + ')';
    if (bag.history) {
      const rows = E.sliceHistory(bag.history, key, dates);
      out.mix = E.contactMix(rows, key);
      let supp = opts.suppressed || E.DEFAULT_SUPPRESSED;
      if (cfg.keepReasons) {
        const keep = cfg.keepReasons.map(s => s.toLowerCase());
        supp = supp.filter(s => keep.indexOf(String(s).toLowerCase()) < 0);
      }
      out.reasons = E.topReasons(rows, supp, cfg.reasonsLimit || 10);
      out.historyRows = rows.length;
      if (!rows.length) out.warnings.push('No rows for ' + when + ' in the call history export.');
      else if (!single) {
        const got = {};
        rows.forEach(r => { got[E.rowDate(r[E.COL.date])] = true; });
        const gap = dates.filter(d => !got[d]);
        if (gap.length) out.warnings.push('The call history export has no rows for ' + gap.map(label).join(', ') + '.');
      }
    } else out.warnings.push('No call-history export found.');

    if (key === 'fpay') {
      // Sunday: the "Tickets by Category" sheet (already counted for Thu–Sat) wins over the paste
      const sheet = bag.fpayTicketsFile;
      let t;
      if (sheet) {
        // a dated sheet (Monday–Thursday) keeps the report's day(s); the Sunday sheet has no dates
        const f = E.ticketsOnDays(sheet.rows, dates);
        t = Object.assign(E.summariseTickets(f.kept), { dropped: f.dropped });
      } else t = E.parsePastedTickets(opts.fpayTickets || '', dates);
      const src = sheet ? 'FRiENDi Pay tickets in ' + sheet.name : 'pasted FRiENDi Pay tickets';
      if (sheet && String(opts.fpayTickets || '').trim()) {
        out.warnings.push('FRiENDi Pay tickets come from ' + sheet.name + ' — the pasted table is ignored while that file is loaded.');
      }
      const LIMIT = 12;
      let catRows = t.groups.slice();
      if (catRows.length > LIMIT) {
        const rest = catRows.slice(LIMIT - 1);
        catRows = catRows.slice(0, LIMIT - 1).concat([{ category: 'Other', sub: rest.length + ' more subcategories', count: rest.reduce((a, r) => a + r.count, 0) }]);
      }
      out.tickets = { total: t.total, top: t.list.slice(0, 5), groups: [], catRows: catRows };
      if (!t.total) out.warnings.push(period.multi
        ? 'Drop the FRiENDi Pay "Tickets by Category" sheet (or paste the ticket table) to fill the tickets section.'
        : 'Drop the FRiENDi Pay tickets sheet (or paste the ticket table) to fill the tickets section.');
      else if (t.dropped === -1) out.warnings.push('None of the ' + src + ' are dated ' + when + ' — counting them all anyway.');
      else if (t.dropped > 0) out.warnings.push(t.dropped + ' ' + src + ' from other days were left out.');
    } else if (bag.tickets) {
      const tk = E.sliceTickets(bag.tickets, key, dates);
      // Virgin leaves "Other" out of the category list (the tickets still count in the total);
      // Postpaid lists every (merged) sub category
      const skip = (cfg.ticketSkip || []).map(s => s.toLowerCase());
      const top = E.tally(tk, E.TCOL.sub).filter(x => skip.indexOf(String(x.label).toLowerCase()) < 0).slice(0, cfg.ticketTop || 5);
      out.tickets = { total: tk.length, top: top, groups: E.tally(tk, E.TCOL.group) };
      if (!tk.length) out.warnings.push('No tickets for ' + when + ' in the tickets export.');
    } else {
      out.tickets = { total: 0, top: [], groups: [] };
      out.warnings.push('No tickets export found.');
    }

    // sanity checks
    period.days.forEach(d => {
      const v = out.days[d].voice, nv = out.days[d].nonvoice;
      const tag = single ? '' : ' (' + label(d) + ')';
      if (v) {
        if (v.presented && v.handled > v.presented) out.warnings.push('Handled is greater than presented' + tag + ' — check the export.');
        if (v.asa !== null && v.asa > 600) out.warnings.push('ASA is unusually high' + tag + ' (' + E.fmtDur(v.asa) + ').');
      }
      if (nv && nv.asa !== null && nv.asa > 1800) {
        out.warnings.push('Non-voice ASA is unusually high' + tag + ' (' + E.fmtDur(nv.asa) + ') — worth a look before sending.');
      }
    });
    if (out.mix && out.mix.total === 0) out.warnings.push('Contact mix has no rows.');
    return out;
  }

  /* ---------- MC Leaders ----------
     Read straight from the Crystal tickets export (the same .xls the brand reports use):
     the tickets assigned to MC Leaders and dated inside the report's day(s). The EXECUTIVE
     TKTs dashboard is still read if it is the only ticket file dropped. */
  const LEADER_TEAM = /^\s*mc\s*leaders?\s*$/i;

  function computeLeaders(periodOrDate, bag, opts) {
    opts = opts || {};
    const period = typeof periodOrDate === 'string' ? makePeriod(periodOrDate, periodOrDate) : periodOrDate;
    const out = { warnings: [] };
    const src = (bag.tickets && bag.tickets.length)
      ? { name: 'the tickets export', rows: E.leaderRowsFromTickets(bag.tickets) }
      : bag.leaderRows;
    const when = period.multi
      ? R.dayShort(period.start, period.end) + ' (' + R.niceRange(period.start, period.end) + ')'
      : R.longDate(period.end);
    if (!src || !src.rows.length) {
      out.stats = E.leaderStats([]);
      out.warnings.push('No tickets export found — drop the Crystal tickets export (.xls) to fill the MC Leaders report.');
      return out;
    }
    const mine = src.rows.filter(r => LEADER_TEAM.test(r.assigned));
    if (!mine.length) {
      out.stats = E.leaderStats([]);
      const who = Array.from(new Set(src.rows.map(r => r.assigned).filter(Boolean))).slice(0, 6);
      out.warnings.push('No tickets assigned to MC Leaders in ' + src.name +
        (who.length ? ' — it has ' + who.join(', ') + '.' : '.'));
      return out;
    }
    const dates = period.days;
    const onDays = mine.filter(r => r.date && dates.indexOf(r.date) >= 0);
    let rows = onDays;
    if (!onDays.length) {
      rows = mine;
      out.warnings.push('None of the ' + E.fmtInt(mine.length) + ' MC Leaders tickets in ' + src.name +
        ' are dated ' + when + ' — counting them all anyway.');
    } else if (onDays.length < mine.length) {
      out.warnings.push(E.fmtInt(mine.length - onDays.length) + ' MC Leaders tickets from other days were left out.');
    }
    out.stats = E.leaderStats(rows);
    out.rowCount = rows.length;
    out.source = src.name;
    const a = out.stats.all;
    if (a.noTime) out.warnings.push(E.fmtInt(a.noTime) + ' closed ticket' + (a.noTime > 1 ? 's have' : ' has') +
      ' no Life Cycle time — left out of the average and the time bands.');
    if (a.other) {
      const kinds = Array.from(new Set(rows.map(r => r.status).filter(st => !/^(closed|open|pending)$/i.test(st)))).slice(0, 4);
      out.warnings.push(E.fmtInt(a.other) + ' ticket' + (a.other > 1 ? 's are' : ' is') + ' neither Closed, Open nor Pending (' +
        kinds.join(', ') + ') — counted in the total only, as the dashboard does.');
    }
    if (!period.multi) {
      const other = Array.from(new Set(mine.map(r => r.date).filter(Boolean))).sort();
      if (other.length > 1 && onDays.length) out.days = other;
    }
    return out;
  }

  function buildLeaders(period, data, opts) {
    opts = opts || {};
    const cfg = REPORTS.leaders;
    const multi = period.multi;
    const stats = data.stats || E.leaderStats([]);
    const periodWords = multi ? R.dayShort(period.start, period.end) : R.dayName(period.end);
    const periodShort = multi ? R.dayShort(period.start, period.end) : 'Daily';
    const niceDate = R.niceRange(period.start, period.end);
    return {
      key: 'leaders', kind: 'leaders', team: cfg.team,
      eyebrow: cfg.eyebrow,
      title: "MC Leader's Ticket Summary",
      stamp: multi ? periodShort.toUpperCase() + ' · ' + R.stampRange(period.start, period.end)
                   : 'DAILY · ' + R.shortStamp(period.end),
      niceDate: niceDate, multiDay: multi, period: period,
      periodWord: multi ? periodShort : R.dayLabel(period.end),
      periodPhrase: multi ? periodWords + ', ' + R.longRange(period.start, period.end)
                          : 'on ' + R.longDate(period.end),
      subject: "MC leader's ticket summary daily report  ( " +
        (multi ? R.longRange(period.start, period.end) : R.longDate(period.end)) + ' )',
      greeting: 'Hi Management Team,',
      intro: multi
        ? 'Kindly find below the MC Leaders ticket summary for ' + periodWords + ', ' + R.longRange(period.start, period.end) + '.'
        : 'Kindly find below the MC Leaders ticket summary daily report for ' + R.longDate(period.end) + '.',
      stats: stats,
      footer: {
        thanks: 'Thanks.',
        signature: cfg.signature,
        generated: 'Report generated on ' + R.longDate(period.end) + '.',
        confidentialTitle: 'Confidential',
        confidentialText: 'This report is confidential and intended solely for the named recipients. Do not forward, copy or distribute outside ' +
          cfg.legal + '. If you received it in error, please delete it and notify the sender.'
      }
    };
  }

  root.Build = { THEMES, REPORTS, SEED_NOTES, BRAND_NOTES, SEED_LABELS, printed, buildReport, computeData, upsert, makePeriod, periodAgg, seedNotes, noteFor, computeLeaders, buildLeaders };
})(typeof module !== 'undefined' ? module.exports : window);

