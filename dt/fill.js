
/* Fills the user's own sent-email HTML with new data. No markup of ours is introduced:
   every row is a clone of a row that already existed in their template. */
(function (root) {
  'use strict';

  function kids(el, name) {
    const out = [];
    for (let c = el.firstElementChild; c; c = c.nextElementSibling) if (c.tagName.toLowerCase() === name) out.push(c);
    return out;
  }
  function bodyOf(t) { const tb = kids(t, 'tbody'); return tb.length ? tb[0] : t; }
  function trs(t) { return kids(bodyOf(t), 'tr'); }
  function tds(tr) { return kids(tr, 'td'); }
  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }

  function allTables(doc) { return Array.from(doc.querySelectorAll('table')); }

  function findTable(doc, pred) {
    const list = allTables(doc);
    for (const t of list) { const r = trs(t); if (r.length && pred(r, t)) return t; }
    return null;
  }
  function headerLabels(t) { return tds(trs(t)[0]).map(txt); }

  // the outer 900px container's direct rows — the 18 blocks of the report
  function blocks(doc) {
    const wrap = doc.querySelector('table.wrap') ||
      allTables(doc).find(t => (t.getAttribute('width') === '900'));
    return { wrap: wrap, rows: trs(wrap) };
  }

  function setText(el, s) { if (el) el.textContent = s; }

  function divsIn(el) { return Array.from(el.querySelectorAll('div')); }

  /* ---------- column surgery ---------- */

  function adaptColumns(table, targetLabels) {
    const rows = trs(table);
    if (!rows.length) return;
    const cur = headerLabels(table);
    if (cur.length === targetLabels.length && cur.every((c, i) => c === targetLabels[i])) return;

    const plan = targetLabels.map((lab, i) => {
      const src = cur.indexOf(lab);
      if (src >= 0) return { src: src };
      // no such column in the template — clone the nearest one and relabel it
      return { donor: Math.min(Math.max(i, 1), cur.length - 1), label: lab };
    });

    rows.forEach(r => {
      const cells = tds(r);
      if (cells.length !== cur.length) {          // a label row spanning the table
        const c = cells[0];
        if (c && c.hasAttribute('colspan')) c.setAttribute('colspan', String(targetLabels.length));
        return;
      }
      const out = plan.map(p => p.src !== undefined ? cells[p.src] : cells[p.donor].cloneNode(true));
      cells.forEach(c => { if (out.indexOf(c) < 0) c.remove(); });
      out.forEach(c => r.appendChild(c));
    });
    tds(rows[0]).forEach((c, i) => setText(c, targetLabels[i]));
  }

  /* ---------- generic row rebuild ---------- */

  function classifyRows(table, accentBg, inkBg) {
    const rows = trs(table);
    const out = { header: rows[0], labels: [], data: [], today: null, total: null };
    rows.slice(1).forEach(r => {
      const cells = tds(r);
      const bg = (r.getAttribute('bgcolor') || '').toLowerCase();
      if (cells.length === 1 && cells[0].hasAttribute('colspan')) { out.labels.push(r); return; }
      if (accentBg && bg === accentBg.toLowerCase()) { out.today = r; return; }
      if (inkBg && bg === inkBg.toLowerCase()) { out.total = r; return; }
      out.data.push(r);
    });
    return out;
  }

  function fillRow(tr, values) {
    tds(tr).forEach((td, i) => { if (i < values.length) setText(td, values[i]); });
    return tr;
  }

  /* Rebuild a metric table (monthly block, optional label rows, daily block, total row). */
  function rebuildMetric(table, spec, theme) {
    adaptColumns(table, spec.cols.map(c => (c && c.label !== undefined) ? c.label : String(c)));
    const parts = classifyRows(table, theme.todayBg, theme.ink);
    const proto = parts.data[0] ? parts.data[0].cloneNode(true) : null;
    const protoToday = parts.today ? parts.today.cloneNode(true) : (proto ? proto.cloneNode(true) : null);
    let protoTotal = parts.total ? parts.total.cloneNode(true) : null;
    if (!protoTotal && spec.groups.some(g => g.rows.some(r => r.total)) && parts.data[0]) {
      // this table has no total row in the template (FRiENDi Pay) — dress a normal row
      // in the same ink/white the other total rows use
      protoTotal = parts.data[0].cloneNode(true);
      protoTotal.setAttribute('bgcolor', theme.ink);
      tds(protoTotal).forEach(c => {
        let st = (c.getAttribute('style') || '').replace(/color:\s*#[0-9a-fA-F]{3,6}/g, 'color:#ffffff');
        if (!/font-weight/.test(st)) st += ';font-weight:700';
        if (!/color:/.test(st)) st += ';color:#ffffff';
        c.setAttribute('style', st);
      });
    }
    const protoLabel = parts.labels[0] ? parts.labels[0].cloneNode(true) : null;
    if (!proto) return;

    const tb = bodyOf(table);
    trs(table).forEach((r, i) => { if (i > 0) r.remove(); });

    let zebra = 0;
    const pushData = (values, kind) => {
      let tr;
      if (kind === 'today' && protoToday) tr = protoToday.cloneNode(true);
      else if (kind === 'total' && protoTotal) tr = protoTotal.cloneNode(true);
      else {
        tr = proto.cloneNode(true);
        tr.setAttribute('bgcolor', zebra % 2 === 0 ? '#ffffff' : '#f7f7f7');
        zebra++;
      }
      fillRow(tr, values);
      tb.appendChild(tr);
    };
    const pushLabel = text => {
      if (!protoLabel) return;
      const tr = protoLabel.cloneNode(true);
      setText(tds(tr)[0], text);
      tb.appendChild(tr);
    };

    // emit no more label rows than the template itself carries (Virgin labels only the daily block)
    const wanted = spec.groups.filter(g => g.label).length;
    const skip = Math.max(0, wanted - parts.labels.length);
    let seenLabel = 0;
    spec.groups.forEach(g => {
      if (g.label) { if (seenLabel++ >= skip) pushLabel(g.label); zebra = 0; }
      g.rows.forEach(r => pushData(r.cells, r.today ? 'today' : (r.total ? 'total' : 'data')));
    });
  }

  /* FRiENDi Pay tickets: Category | Subcategory | Tickets, closed by an ink "total" line. */
  function rebuildCatTable(table, items, totalValue, inkBg) {
    const rows = trs(table);
    const isTotal = r => (r.getAttribute('bgcolor') || '').toLowerCase() === String(inkBg || '').toLowerCase();
    const dataRows = rows.slice(1).filter(r => !isTotal(r));
    const totalRow = rows.slice(1).find(isTotal);
    if (!dataRows.length) return;
    const proto = dataRows[0].cloneNode(true);
    const protoTotal = totalRow ? totalRow.cloneNode(true) : null;
    rows.slice(1).forEach(r => r.remove());
    const tb = bodyOf(table);
    items.forEach((it, i) => {
      const tr = proto.cloneNode(true);
      tr.setAttribute('bgcolor', i % 2 === 0 ? '#ffffff' : '#f7f7f7');
      fillRow(tr, [it.category, it.sub, it.value]);
      tb.appendChild(tr);
    });
    if (protoTotal) {
      const c = tds(protoTotal);
      setText(c[c.length - 1], totalValue);
      tb.appendChild(protoTotal);
    }
  }

  /* Bars (contact mix / call reasons): set the label, note, width and percentage. */
  function rebuildBars(table, items, opts) {
    opts = opts || {};
    const rows = trs(table);
    const header = opts.hasHeader ? rows[0] : null;
    const dataRows = opts.hasHeader ? rows.slice(1) : rows;
    // two prototypes: a split bar (two cells) and, if the template has one, a full-width bar
    const barCells = r => { const inner = r.querySelector('table'); return inner ? tds(trs(inner)[0]).length : 0; };
    let proto = dataRows.find(r => barCells(r) > 1) || dataRows[0];
    const fullRow = dataRows.find(r => barCells(r) === 1);
    proto = proto.cloneNode(true);
    const protoFull = fullRow ? fullRow.cloneNode(true) : null;

    const tb = bodyOf(table);
    dataRows.forEach(r => r.remove());

    // bars are scaled off the printed percentages, the way the originals were drawn
    const shown = it => { const n = parseFloat(String(it.display).replace('%', '')); return isNaN(n) ? (it.value || 0) : n; };
    const max = Math.max.apply(null, items.map(shown)) || 1;
    items.forEach((it, idx) => {
      const full = Math.round((shown(it) / max) * 100) >= 100;
      const tr = (full && protoFull ? protoFull : proto).cloneNode(true);
      tr.setAttribute('bgcolor', idx % 2 === 0 ? '#ffffff' : '#f7f7f7');
      const cells = tds(tr);
      // text cells are those without a nested table
      const textCells = cells.filter(c => !c.querySelector('table'));
      const barCell = cells.find(c => c.querySelector('table'));
      const fields = opts.fields(it, idx, textCells.length);
      textCells.forEach((c, i) => { if (i < fields.length) setText(c, fields[i]); });
      if (barCell) {
        const inner = barCell.querySelector('table');
        const bar = tds(trs(inner)[0]);
        const w = Math.round((shown(it) / max) * 100);
        bar[0].setAttribute('width', w + '%');
        if (bar.length > 1) bar[1].setAttribute('width', (100 - w) + '%');
      }
      tb.appendChild(tr);
    });
  }

  /* Drop one half of a two-column block and let the other half take the full width. */
  function dropColumn(tableInColumn) {
    const cell = tableInColumn.closest('td');
    if (!cell) { tableInColumn.remove(); return; }
    const row = cell.parentElement;
    const siblings = tds(row).filter(c => c !== cell);
    cell.remove();
    siblings.forEach(c => {
      c.setAttribute('width', '100%');
      c.setAttribute('style', (c.getAttribute('style') || '')
        .replace(/width:\s*\d+%/, 'width:100%')
        .replace(/padding-(left|right):\s*\d+px;?/g, ''));
    });
  }

  /* Simple two-column tables (ticket categories / owning groups). */
  function rebuildPairs(table, items) {
    const rows = trs(table);
    const proto = rows[1] ? rows[1].cloneNode(true) : null;
    if (!proto) return;
    rows.slice(1).forEach(r => r.remove());
    const tb = bodyOf(table);
    items.forEach((it, i) => {
      const tr = proto.cloneNode(true);
      tr.setAttribute('bgcolor', i % 2 === 0 ? '#ffffff' : '#f7f7f7');
      fillRow(tr, [it.label, it.value]);
      tb.appendChild(tr);
    });
  }

  /* ---------- the whole email ---------- */

  function render(templateHtml, m, cfg) {
    const doc = new DOMParser().parseFromString(templateHtml, 'text/html');
    const t = m.theme;
    const B = blocks(doc);
    const rows = B.rows;

    // title + hidden preheader — keep the template's own wording, swap the date/brand
    const titleEl = doc.querySelector('title');
    if (titleEl) {
      let s = titleEl.textContent;
      if (cfg.titleBrand) s = s.replace(cfg.titleBrandFrom, cfg.titleBrand);
      if (/\d{1,2} [A-Za-z]{3} \d{4}/.test(s)) s = s.replace(/\d{1,2} [A-Za-z]{3} \d{4}/, m.niceDate);
      else s = m.subject;
      titleEl.textContent = s;
    }
    const pre = doc.querySelector('body > span') ||
      Array.from(doc.querySelectorAll('span')).find(sp => /display:\s*none/i.test(sp.getAttribute('style') || ''));
    // the hidden preview line ("17–19 Sep: 4,711 calls presented…") shows up once pasted into
    // Outlook, so it is taken out of every template
    if (pre) pre.remove();

    // [1] header: logo + stamp
    const head = rows[1];
    const img = head.querySelector('img');
    if (img && m.logo) {
      const w = parseInt(img.getAttribute('width'), 10) || 110;
      const h = m.logoAspect ? Math.round(w / m.logoAspect) : (parseInt(img.getAttribute('height'), 10) || 50);
      img.setAttribute('src', m.logo);
      img.setAttribute('alt', m.brandName);
      img.setAttribute('height', String(h));
      img.setAttribute('style', (img.getAttribute('style') || '').replace(/height:\s*\d+px/, 'height:' + h + 'px'));
    }
    // eyebrow + title beside the logo ("MEMBER CARE · VIRGIN POSTPAID" / "Virgin Postpaid Summary Report")
    const headDivs = divsIn(head);
    if (headDivs.length >= 2) { setText(headDivs[0], m.eyebrow); setText(headDivs[1], m.title); }
    const headCells = tds(head.querySelector('table').querySelector('tr'));
    const stampCell = headCells[headCells.length - 1];
    if (stampCell && /DAILY/i.test(txt(stampCell))) setText(stampCell, m.stamp);

    // [2] greeting + intro
    const greetRows = trs(rows[2].querySelector('table'));
    if (greetRows[0]) setText(tds(greetRows[0])[0], m.greeting);
    if (greetRows[1]) setText(tds(greetRows[1])[0], m.intro);

    // [3] SLA insight
    const insightDivs = divsIn(rows[3]);
    if (insightDivs.length >= 2) { setText(insightDivs[0], m.insightLabel); setText(insightDivs[1], m.insightText); }

    // [4] KPI strip
    const kpiCells = tds(trs(rows[4].querySelector('table'))[0]);
    m.kpis.forEach((k, i) => {
      const c = kpiCells[i]; if (!c) return;
      const d = divsIn(c);
      setText(d[0], k.label); setText(d[1], k.value); if (d[2]) setText(d[2], k.sub || '');
    });

    // section heads live at rows 5, 8, 10, 12, 14 in their template
    // a section head is [rule, "01", title, subtitle] inside one top-level row
    const headIdx = [];
    rows.forEach((r, i) => {
      const inner = r.querySelector('table');
      if (!inner) return;
      const irows = trs(inner);
      if (irows.length < 3) return;
      const numCell = tds(irows[1])[0];
      if (numCell && /^\d{2}$/.test(txt(numCell))) headIdx.push(i);
    });

    const secs = m.sections.slice();
    // drop the non-voice section from the template when this report has none
    if (!cfg.channels.length) {
      const nvHead = headIdx[1];
      if (nvHead !== undefined) { rows[nvHead + 1].remove(); rows[nvHead].remove(); headIdx.splice(1, 1); }
    }

    const MONTH_RE = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g;
    function setHead(rowIdx, sec) {
      const r = rows[rowIdx];
      const inner = trs(r.querySelector('table'));
      // [rule, number, title, subtitle]
      const cellsOf = i => (inner[i] ? tds(inner[i])[0] : null);
      setText(cellsOf(1), sec.number);
      setText(cellsOf(2), sec.title);
      const sub = cellsOf(3);
      if (!sub) return;
      const current = txt(sub);
      if (/tickets created/i.test(current)) setText(sub, sec.subtitle);
      else if (cfg.emailPH && /Inbound Non-Voice/i.test(sec.title)) setText(sub, sec.subtitle);
      else if (m.monthName) {
        let s = current.replace(MONTH_RE, m.monthName);
        // Sunday report: the three highlighted rows are Thursday to Saturday
        if (m.multiDay) s = s.replace(/(Today is|The report date is|The report day is) marked in/i, m.periodWords + ' are marked in');
        setText(sub, s);
      }
    }

    headIdx.forEach((ri, i) => { if (secs[i]) setHead(ri, secs[i]); });

    // [6] voice table
    const voiceTable = findTable(doc, (r, tb) => {
      const labels = tds(r[0]).map(txt);
      return labels[0] === 'Date' && labels.indexOf('Handled') > 0;
    });
    const voiceSec = secs[0];
    if (voiceTable && voiceSec) rebuildMetric(voiceTable, voiceSec, t);

    // [7] footnote
    const fnRow = rows.find(r => /average handling time/i.test(txt(r)));
    if (fnRow && voiceSec && voiceSec.footnote) setText(tds(fnRow)[0], voiceSec.footnote);

    // [9] non-voice: monthly table, band, daily table
    const nvSec = secs.find(s => s.title === 'Inbound Non-Voice');
    if (nvSec && cfg.channels.length) {
      // every "Date" table after the voice one (FRiENDi Pay's email tables have a Handled column too)
      const nvTables = allTables(doc).filter(tb => {
        const labels = headerLabels(tb);
        return labels[0] === 'Date' && labels.length >= 3 && tb !== voiceTable;
      });
      const monthlyTable = nvTables[0], dailyTable = nvTables[1];
      const monthGroup = nvSec.groups.find(g => /monthly/i.test(g.label || ''));
      const dayGroup = nvSec.groups[nvSec.groups.length - 1];
      if (monthlyTable && monthGroup) rebuildMetric(monthlyTable, { cols: nvSec.cols, groups: [monthGroup] }, t);
      if (dailyTable) rebuildMetric(dailyTable, { cols: nvSec.cols, groups: [dayGroup] }, t);

      // the "September to date — total contacts" band: label div, big number, one line per channel
      {
        const bandTable = allTables(doc).find(tb => {
          const d = tb.querySelector('div');
          return d && /to date — /i.test(txt(d));
        });
        if (bandTable && !(nvSec.band && nvSec.band.length)) bandTable.remove();
        else if (bandTable) {
          const bandRows = trs(bandTable);
          const heads = Array.from(bandRows[0].querySelectorAll('div'));
          if (heads[0]) setText(heads[0], nvSec.bandLabel);
          if (heads[1]) setText(heads[1], nvSec.band[0].value);
          const inner = bandRows[1] ? bandRows[1].querySelector('table') : null;
          if (inner) {
            const irows = trs(inner);
            const protoFirst = irows[0].cloneNode(true);
            const protoRest = (irows[1] || irows[0]).cloneNode(true);
            irows.forEach(r => r.remove());
            const ib = bodyOf(inner);
            nvSec.band.slice(1).forEach((w, i) => {
              const tr = (i === 0 ? protoFirst : protoRest).cloneNode(true);
              fillRow(tr, [w.label, w.value]);
              ib.appendChild(tr);
            });
          }
        }
      }
    }

    // contact mix
    const mixSec = secs.find(s => s.kind === 'bars');
    if (mixSec) {
      const mixTable = findTable(doc, r => {
        const c = tds(r[0]); return c.length === 3 && r.length <= 4 && !!r[0].querySelector('table') && /%$/.test(txt(c[2]));
      });
      if (mixTable) rebuildBars(mixTable, mixSec.items, { fields: it => [it.label, it.display] });
    }

    // top call reasons
    const rsnSec = secs.find(s => s.kind === 'reasons');
    if (rsnSec) {
      // 5 cells: rank, reason, note, bar, % — FRiENDi Pay's has no note column (4 cells)
      const rsnTable = findTable(doc, r => {
        const c = tds(r[0]); return (c.length === 5 || c.length === 4) && txt(c[0]) === '1' && !!r[0].querySelector('table');
      });
      if (rsnTable) {
        // no description column: drop it if a template still has one, and give the reason its width
        trs(rsnTable).forEach(r => {
          const c = tds(r);
          if (c.length === 5) { c[2].remove(); c[1].setAttribute('width', '40%'); c[3].removeAttribute('width'); }
        });
      }
      if (rsnTable) rebuildBars(rsnTable, rsnSec.items, {
        fields: (it, i, n) => n >= 4 ? [String(i + 1), it.label, it.note || '', it.display] : [String(i + 1), it.label, it.display]
      });
    }

    // tickets
    const tkSec = secs.find(s => s.kind === 'pairs');
    if (tkSec) {
      // match on the header cell itself, not on any ancestor that merely contains the words
      const firstCell = r => { const c = tds(r[0]); return c.length ? txt(c[0]) : ''; };
      const catTable = findTable(doc, r => /^category$/i.test(firstCell(r)));
      const topTable = findTable(doc, r => /^top ticketing category$/i.test(firstCell(r)));
      const grpTable = findTable(doc, r => /^tickets by owning group$/i.test(firstCell(r)));
      if (catTable) rebuildCatTable(catTable, tkSec.catRows || [], tkSec.totalValue || '0', t.ink);
      // always rebuild, even when empty, so no ticket rows from the template's own day survive
      if (topTable) rebuildPairs(topTable, tkSec.blocks[0] ? tkSec.blocks[0].items : []);
      if (grpTable && !cfg.noGroups) rebuildPairs(grpTable, tkSec.blocks[1] ? tkSec.blocks[1].items : []);
      else if (grpTable) dropColumn(grpTable);
    }

    // month captions that sit in <div>s rather than table rows ("Monthly", "September — daily")
    if (m.monthName) {
      Array.from(doc.querySelectorAll('div')).forEach(d => {
        if (d.querySelector('div,table')) return;
        const s = txt(d);
        const mm = s.match(/^([A-Z][a-z]+) — daily$/);
        if (mm) setText(d, m.monthName + ' — daily');
      });
    }

    // footer — only ever touch leaf cells, never a container holding a table
    const leaves = Array.from(doc.querySelectorAll('td,div')).filter(el => !el.querySelector('table,div,tr,td'));
    leaves.forEach(el => {
      const s = txt(el);
      if (/^Thanks\.?$/i.test(s)) setText(el, m.footer.thanks);
      else if (/^Report generated on/i.test(s)) setText(el, m.footer.generated);
      else if (/confidential and intended/i.test(s)) setText(el, m.footer.confidentialText);
      else if (/^Confidential$/i.test(s)) setText(el, m.footer.confidentialTitle);
      else if (cfg.signatureFrom && s === cfg.signatureFrom) setText(el, m.footer.signature);
    });

    // the parser inserts <tbody>; the original markup has none, so take them back out
    return '<!DOCTYPE html>' + doc.documentElement.outerHTML.replace(/<\/?tbody>/g, '');
  }

  root.Templater = { render };
})(typeof module !== 'undefined' ? module.exports : window);

