/* IVR scorecard: the day's IVR numbers drawn as a picture for Teams, the same card as the IVR Scorecard tool (the emails have no IVR box),
   and the same card written as an email body (mailHtml) for the IVR Summary Daily Report email.
   Scorecard.open(model) shows it in a dialog with Copy for Teams and Download PNG. */
(function (root) {
  'use strict';
  const CARD = { W: 640, X: 28, CW: 584 };
  const COL = { ink: '#201e1d', mute: '#6f6c6a', red: '#e10a0a', red2: '#b30808', pink: '#fbe0dd', rule: '#eeeeee', track: '#f1efed', erule: '#f3cfc9', white: '#ffffff' };
  const FF = 'Arial, Helvetica, sans-serif';
  const TS = {
    eb:    { size: 11,   bold: 1, ls: 2,    lh: 12, color: COL.red },
    h1:    { size: 24,   bold: 1, ls: -0.4, lh: 30, color: COL.ink },
    sub:   { size: 12.5,               lh: 14, color: COL.mute },
    lab:   { size: 10,   bold: 1, ls: 1.2, lh: 11, color: COL.mute },
    val:   { size: 30,   bold: 1, ls: -0.6, lh: 36, color: COL.ink },
    big:   { size: 40,   bold: 1, ls: -0.8, lh: 46, color: COL.ink },
    note:  { size: 11,                 lh: 12, color: COL.mute },
    h2:    { size: 10.5, bold: 1, ls: 1.2, lh: 12, color: COL.mute },
    after: { size: 11,                 lh: 12, color: COL.mute },
    nm:    { size: 12.5,               lh: 16, color: COL.ink },
    num:   { size: 13,   bold: 1,      lh: 15, color: COL.ink },
    pill:  { size: 11.5, bold: 1,      lh: 12, color: COL.ink },
    runs:  { size: 11.5,               lh: 12, color: COL.mute },
    more:  { size: 11,                 lh: 14, color: COL.mute },
    foot:  { size: 10.5,               lh: 15, color: COL.mute }
  };
  const HAS_LS = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype;
  const fmt = n => Math.round(n || 0).toLocaleString('en-US');
  const pctOf = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';
  const rateTxt = r => r >= 0.01 ? Math.round(100 * r) + '%' : '<1%';
  const brandOf = flow => /fpay|friendi\s*pay/i.test(flow) ? 'FRiENDi PAY' : /virgin/i.test(flow) ? 'Virgin Mobile' : /friendi/i.test(flow) ? 'FRiENDi mobile' : flow;

  function setFont(ctx, st, color) { ctx.font = (st.bold ? '700 ' : '') + st.size + 'px ' + FF; ctx.fillStyle = color || st.color; }
  function textW(ctx, st, s) {
    setFont(ctx, st);
    if (!st.ls) return ctx.measureText(s).width;
    if (HAS_LS) { ctx.letterSpacing = st.ls + 'px'; const w = ctx.measureText(s).width; ctx.letterSpacing = '0px'; return w; }
    let w = 0; for (const ch of s) w += ctx.measureText(ch).width + st.ls; return w;
  }
  // the baseline inside a line box, placed the way the browser places Arial in CSS
  function baseline(st) { const a = Math.round(0.905 * st.size), d = Math.round(0.212 * st.size); return (st.lh - a - d) / 2 + a; }
  function drawText(ctx, st, s, x, top, color) {
    setFont(ctx, st, color);
    const y = top + baseline(st);
    if (!st.ls) { ctx.fillText(s, x, y); return; }
    if (HAS_LS) { ctx.letterSpacing = st.ls + 'px'; ctx.fillText(s, x, y); ctx.letterSpacing = '0px'; return; }
    let cx = x; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + st.ls; }
  }
  // lines that fit maxW: breaks at spaces, after _ - / and, for a word too long, inside it
  function wrap(ctx, st, text, maxW) {
    const parts = String(text).match(/[^ _\-\/]*(?:[ _\-\/]+|$)/g).filter(Boolean);
    const fits = s => textW(ctx, st, s.replace(/ +$/, '')) <= maxW + 0.01;
    const out = []; let line = '';
    for (const p of parts) {
      if (fits(line + p)) { line += p; continue; }
      if (line) { out.push(line.replace(/ +$/, '')); line = ''; }
      let rest = p;
      while (rest.length > 1 && !fits(rest)) {
        let k = rest.length - 1;
        while (k > 1 && !fits(rest.slice(0, k))) k--;
        out.push(rest.slice(0, k)); rest = rest.slice(k);
      }
      line = rest;
    }
    if (line.trim() || !out.length) out.push(line.replace(/ +$/, ''));
    return out;
  }
  function block(ctx, st, text, x, y, w, draw, color) {
    const ls = wrap(ctx, st, text, w);
    if (draw) ls.forEach((l, i) => drawText(ctx, st, l, x, y + i * st.lh, color));
    return y + ls.length * st.lh;
  }
  function rrect(ctx, x, y, w, h, r) {
    const rs = Array.isArray(r) ? r : [r, r, r, r], m = Math.min(w, h) / 2;
    const c = v => Math.max(0, Math.min(v, m)), tl = c(rs[0]), tr = c(rs[1]), br = c(rs[2]), bl = c(rs[3]);
    ctx.beginPath();
    ctx.moveTo(x + tl, y); ctx.lineTo(x + w - tr, y); ctx.arcTo(x + w, y, x + w, y + tr, tr);
    ctx.lineTo(x + w, y + h - br); ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
    ctx.lineTo(x + bl, y + h); ctx.arcTo(x, y + h, x, y + h - bl, bl);
    ctx.lineTo(x, y + tl); ctx.arcTo(x, y, x + tl, y, tl); ctx.closePath();
  }
  function frame(ctx, x, y, w, h, fill, stroke, bw) {
    ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = stroke; ctx.lineWidth = bw; ctx.strokeRect(x + bw / 2, y + bw / 2, w - bw, h - bw);
  }

  /* What the card says. s: { brand, flow, date, span, calls, u30, u60, agent (from the Interactions export of the IVR's flow),
     lists, firstName, afterOut, afterMs, busyOut: [{name, n}], busyMs: [{name, n}] (the Flow Outcome and Milestone exports, when
     dropped), daFile, actions, runs, errorsN, errors: [{name, runs, errors, rate}] (the Data Actions export: every action that
     failed, the most errors first) }. The names are the team's: IVR Summary daily report, IVR Calls, IVR deflection, Transfer to
     Agent, Errors. */
  const errPct = r => (r == null ? '–' : r <= 0 ? '0%' : r < 0.0005 ? '<0.1%' : r < 0.1 ? Math.round(r * 1000) / 10 + '%' : Math.round(100 * r) + '%');
  const andList = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  function cardText(s) {
    const title = 'IVR Summary daily report' + (s.date ? ' · ' + s.date : '');
    const sub = [s.flow ? s.flow + ' flow' : 'Flow not named in the export', s.span].filter(Boolean).join(' · ');
    const er = s.runs ? s.errorsN / s.runs : null, calls = s.calls || 0;
    const tiles = {
      calls: { lab: 'IVR Calls', val: fmt(calls), note: 'calls into ' + (s.flow || 'the IVR') },
      d60: { lab: 'IVR deflection · under 60s', val: pctOf(s.u60, calls), note: fmt(s.u60) + ' of ' + fmt(calls) + ' calls' },
      d30: { lab: 'IVR deflection · under 30s', val: pctOf(s.u30, calls), note: fmt(s.u30) + ' of ' + fmt(calls) + ' calls' },
      agent: { lab: 'Transfer to Agent', val: pctOf(s.agent, calls), note: fmt(s.agent) + ' transfers' },
      errors: !s.daFile ? { lab: 'Errors', val: '–', note: 'no data actions export' }
        : !s.actions ? { lab: 'Errors', val: '–', note: 'no data actions for ' + (s.flow || 'this flow') }
        : { lab: 'Errors', val: errPct(er), note: fmt(s.errorsN) + (s.errorsN === 1 ? ' error' : ' errors') + ' of ' + fmt(s.runs) + ' data action runs', alert: er >= 0.05 }
    };
    const order = [tiles.calls, tiles.d60, tiles.d30, tiles.agent, tiles.errors];
    const sources = ['Interactions' + (s.flow ? ' (' + s.flow + ')' : '')].concat(s.daFile ? ['Data Actions Performance'] : [], s.lists ? ['Flow Outcome Detail', 'Flow Milestone Detail'] : []);
    const foot = 'IVR deflection = calls with no queue that ended within 60 s or 30 s, of all IVR calls. Transfer to Agent = calls an agent took.'
      + (s.daFile ? ' Errors = data action runs that failed, of all the flow’s runs, Customer Type included.' : '')
      + ' Source: Genesys ' + andList(sources) + (sources.length > 1 ? ' exports' : ' export') + (s.date ? ', ' + s.date : '') + '.';
    return { title: title, sub: sub, tiles: tiles, order: order, foot: foot };
  }
  /* an error row: the action the errors belong to, a pill with how many, and the share of its runs that failed */
  const errPill = e => fmt(e.errors) + (e.errors === 1 ? ' error' : ' errors');
  const errRuns = e => rateTxt(e.rate) + ' of ' + fmt(e.runs) + ' runs';

  function paint(ctx, s, H, draw) {
    const X = CARD.X, CW = CARD.CW, t = cardText(s), T = t.tiles;
    if (draw) { ctx.fillStyle = COL.white; ctx.fillRect(0, 0, CARD.W, H); }
    let y = 26;
    y = block(ctx, TS.eb, 'IVR SCORECARD', X, y, CW, draw);
    y = block(ctx, TS.h1, t.title, X, y + 6, CW, draw);
    y = block(ctx, TS.sub, t.sub, X, y + 2, CW, draw);
    y += 18;

    // the tiles as the WFM team lays them out: the calls on the left, as tall as the two deflections beside it (under 60 s above
    // under 30 s); under them the transfers to an agent and the errors
    const TW = (CW - 10) / 2, IW = TW - 4 - 28;
    const inner = (k, big) => wrap(ctx, TS.lab, k.lab.toUpperCase(), IW).length * TS.lab.lh + 2 + (big ? TS.big.lh : TS.val.lh) + 1 + wrap(ctx, TS.note, k.note, IW).length * TS.note.lh;
    const tileH = (k, big) => 2 + 12 + inner(k, big) + 11 + 2;
    function tile(k, x, ty, h, big) {
      if (!draw) return;
      frame(ctx, x, ty, TW, h, k.alert ? COL.pink : COL.white, k.alert ? COL.red : COL.ink, 2);
      const ix = x + 16;
      let cy = big ? ty + (h - inner(k, true)) / 2 : ty + 14;
      cy = block(ctx, TS.lab, k.lab.toUpperCase(), ix, cy, IW, true, k.alert ? COL.red2 : COL.mute);
      cy = block(ctx, big ? TS.big : TS.val, k.val, ix, cy + 2, IW, true);
      block(ctx, TS.note, k.note, ix, cy + 1, IW, true);
    }
    const hr = Math.max(tileH(T.d60), tileH(T.d30), Math.ceil((tileH(T.calls, true) - 10) / 2)), hl = 2 * hr + 10;
    tile(T.calls, X, y, hl, true); tile(T.d60, X + TW + 10, y, hr); tile(T.d30, X + TW + 10, y + hr + 10, hr);
    y += hl + 10;
    const hb = Math.max(tileH(T.agent), tileH(T.errors));
    tile(T.agent, X, y, hb); tile(T.errors, X + TW + 10, y, hb);
    y += hb;

    // top 5 lists: name | bar | number (only when the Flow Outcome and Milestone exports were dropped too)
    function list(head, after, rows, y) {
      y = block(ctx, TS.h2, head.toUpperCase(), X, y, CW, draw);
      if (after) y = block(ctx, TS.after, after, X, y + 2, CW, draw);
      y += 6;
      if (!rows.length) {
        if (draw) { ctx.fillStyle = COL.rule; ctx.fillRect(X, y, CW, 1); }
        return block(ctx, TS.nm, 'Nothing else in the export', X, y + 6, CW, draw, COL.mute) + 5;
      }
      const max = Math.max.apply(null, rows.map(r => r.n)) || 1;
      rows.forEach(r => {
        const nl = wrap(ctx, TS.nm, r.name, 262), ch = Math.max(nl.length * TS.nm.lh, TS.num.lh), top = y + 6;
        if (draw) {
          ctx.fillStyle = COL.rule; ctx.fillRect(X, y, CW, 1);
          const ny = top + (ch - nl.length * TS.nm.lh) / 2;
          nl.forEach((l, i) => drawText(ctx, TS.nm, l, X, ny + i * TS.nm.lh));
          const bx = X + 272, by = top + (ch - 8) / 2, bw = 250 * r.n / max;
          ctx.save(); rrect(ctx, bx, by, 250, 8, 4); ctx.fillStyle = COL.track; ctx.fill(); ctx.clip();
          if (bw > 0) { rrect(ctx, bx, by, bw, 8, [0, 4, 4, 0]); ctx.fillStyle = COL.ink; ctx.fill(); }
          ctx.restore();
          const v = fmt(r.n); drawText(ctx, TS.num, v, X + CW - textW(ctx, TS.num, v), top + (ch - TS.num.lh) / 2);
        }
        y += 1 + 5 + ch + 5;
      });
      return y;
    }
    if (s.lists) {
      y = list('Top 5 outcomes · attempts', s.afterOut, s.busyOut, y + 20);
      y = list('Top 5 milestones · hits', s.afterMs, s.busyMs, y + 16);
    }

    // data action errors, only when there are some: every action that failed, Customer Type too, so each error has its place;
    // each row the action, a pill with its errors (red from 5% of its runs) and the share of its runs that failed
    if (s.daFile && s.actions && s.errors.length) {
      y += 18;
      const top = y, IX = X + 16, IWE = CW - 32;
      const head = ('Data action errors' + (s.flow ? ' · ' + s.flow : '')).toUpperCase();
      const lay = s.errors.map(e => {
        const pill = errPill(e), runs = errRuns(e);
        const pw = textW(ctx, TS.pill, pill) + 17, rw = Math.max(96, textW(ctx, TS.runs, runs));
        const nl = wrap(ctx, TS.nm, e.name, IWE - pw - rw - 20);
        return { e: e, pill: pill, runs: runs, pw: pw, rw: rw, nl: nl, ch: Math.max(nl.length * TS.nm.lh, 18) };
      });
      const h = 2 + 12 + wrap(ctx, TS.h2, head, IWE).length * TS.h2.lh + 6 + lay.reduce((a, r, i) => a + (i ? 1 : 0) + 10 + r.ch, 0) + 8 + 2;
      if (draw) frame(ctx, X, top, CW, h, COL.pink, COL.ink, 2);
      let ry = block(ctx, TS.h2, head, IX, top + 14, IWE, draw, COL.red) + 6;
      lay.forEach((r, i) => {
        if (i) { if (draw) { ctx.fillStyle = COL.erule; ctx.fillRect(IX, ry, IWE, 1); } ry += 1; }
        const ct = ry + 5;
        if (draw) {
          const ny = ct + (r.ch - r.nl.length * TS.nm.lh) / 2;
          r.nl.forEach((l, j) => drawText(ctx, TS.nm, l, IX, ny + j * TS.nm.lh));
          const px = IX + IWE - r.rw - 10 - r.pw, py = ct + (r.ch - 18) / 2, hi = r.e.rate >= 0.05;
          rrect(ctx, px + 0.75, py + 0.75, r.pw - 1.5, 16.5, 8.25);
          ctx.fillStyle = hi ? COL.red : COL.white; ctx.fill();
          ctx.lineWidth = 1.5; ctx.strokeStyle = hi ? COL.red : COL.ink; ctx.stroke();
          drawText(ctx, TS.pill, r.pill, px + 8.5, py + 3, hi ? COL.white : COL.ink);
          drawText(ctx, TS.runs, r.runs, IX + IWE - textW(ctx, TS.runs, r.runs), ct + (r.ch - TS.runs.lh) / 2);
        }
        ry = ct + r.ch + 5;
      });
      y = top + h;
    }

    // footnote
    y += 16;
    if (draw) { ctx.fillStyle = COL.ink; ctx.fillRect(X, y, CW, 2); }
    y = block(ctx, TS.foot, t.foot, X, y + 12, CW, draw);
    return Math.ceil(y + 22);
  }

  function draw(s, scale) {
    scale = scale || 2;
    const H = paint(document.createElement('canvas').getContext('2d'), s, 0, false);
    const cv = document.createElement('canvas');
    cv.width = CARD.W * scale; cv.height = H * scale;
    const ctx = cv.getContext('2d');
    ctx.scale(scale, scale); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    paint(ctx, s, H, true);
    return cv;
  }
  // the card in words, for screen readers
  function alt(s) {
    const t = cardText(s);
    const parts = [t.title + '.', t.sub + '.'].concat(t.order.map(k => k.lab + ': ' + k.val + ', ' + k.note + '.'));
    if (s.lists && s.busyOut.length) parts.push('Top outcomes: ' + s.busyOut.map(r => r.name + ' ' + fmt(r.n)).join(', ') + '.');
    if (s.lists && s.busyMs.length) parts.push('Top milestones: ' + s.busyMs.map(r => r.name + ' ' + fmt(r.n)).join(', ') + '.');
    if (s.daFile && s.errors.length) parts.push('Data action errors: ' + s.errors.map(e => e.name + ' ' + errPill(e) + ', ' + errRuns(e)).join('; ') + '.');
    return parts.join(' ');
  }

  /* The card as the body of an email: the same words and numbers written as text, the tiles, rows and bars as tables, every style
     inline. Outlook lays mail out with Word, so it is written the way Word keeps it: every cell ends with a paragraph (Word adds an
     empty line after a table that ends a cell), a paragraph sits between two tables (Word joins touching tables into one), and each
     paragraph has its text's size (Word sizes the last line by the paragraph's own size). Sharp at any zoom, no picture, and the
     numbers can be changed before it goes. W: the width it fills, in px (688 in the IVR Summary Daily Report email). */
  function mailHtml(s, W) {
    W = W || 688;
    const t = cardText(s), T = t.tiles, F = 'font-family:&quot;Aptos&quot;,Arial,sans-serif;';
    const pt = px => +(px * 0.75).toFixed(2) + 'pt';
    const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    // a paragraph of one run: size in pt; o: bold, ls (letter spacing, pt), mt/mb (margins, pt), align, box (more of the paragraph's style)
    const line = (text, size, color, o) => {
      o = o || {};
      const al = o.align ? ` align="${o.align}"` : '', ta = o.align ? ';text-align:' + o.align : '';
      const sp = `<span style="font-size:${size}pt;${F}color:${color}${o.ls ? ';letter-spacing:' + o.ls + 'pt' : ''}">${esc(text)}</span>`;
      return `<p class="MsoNormal"${al} style="margin:${o.mt || 0}pt 0in ${o.mb || 0}pt 0in;font-size:${size}pt${ta}${o.box ? ';' + o.box : ''}">${o.bold ? '<b>' + sp + '</b>' : sp}</p>`;
    };
    // an empty paragraph exactly h px high: the space between two parts, and the paragraph a cell ends with
    const gap = h => `<p class="MsoNormal" style="margin:0in;font-size:${pt(h)};line-height:${pt(h)};mso-line-height-rule:exactly"><span style="font-size:${pt(h)}">&nbsp;</span></p>`;
    const table = (w, rows) => `<table class="MsoNormalTable" border="0" cellspacing="0" cellpadding="0" width="${w}" style="width:${typeof w === 'number' ? pt(w) : '100.0%'};border-collapse:collapse">${rows}</table>`;
    const cell = (w, inner, style, attrs) => `<td${w ? ` width="${w}"` : ''}${attrs || ''} style="${w ? 'width:' + pt(w) + ';' : ''}${style}">${inner}</td>`;

    // eyebrow, title and the flow
    const head = line('IVR SCORECARD', 8.5, COL.red, { bold: 1, ls: 1.5 })
      + line(t.title, 18, COL.ink, { bold: 1, ls: -0.3, mt: 4.5 })
      + line(t.sub, 10, COL.mute, { mt: 1.5 });

    // the tiles as the team lays them out: the calls on the left, as tall as the two deflections beside it (one cell over three
    // rows: under 60 s, the space, under 30 s), then the transfers and the errors; the cells of a row share its height
    const TW = (W - 10) / 2;
    const tile = (k, big, attrs) => {
      const bg = k.alert ? COL.pink : COL.white;
      return cell(TW, line(k.lab.toUpperCase(), 7.5, k.alert ? COL.red2 : COL.mute, { bold: 1, ls: 0.9 })
        + line(k.val, big ? 30 : 24, COL.ink, { bold: 1, ls: -0.45, mt: 1.5 })
        + line(k.note, 8.5, COL.mute, { mt: 0.75 }),
        `border:solid ${k.alert ? COL.red : COL.ink} 1.5pt;background:${bg};padding:${pt(12)} ${pt(16)} ${pt(11)} ${pt(16)}`, ` valign="${big ? 'middle' : 'top'}" bgcolor="${bg}"${attrs || ''}`);
    };
    const space = attrs => cell(10, gap(10), 'padding:0in', attrs || '');
    const tiles = table(W, '<tr>' + tile(T.calls, true, ' rowspan="3"') + space(' rowspan="3"') + tile(T.d60) + '</tr>'
      + `<tr><td style="padding:0in">${gap(10)}</td></tr>`
      + '<tr>' + tile(T.d30) + '</tr>'
      + `<tr><td colspan="3" style="padding:0in">${gap(10)}</td></tr>`
      + '<tr>' + tile(T.agent) + space() + tile(T.errors) + '</tr>');

    // the top 5 lists: name | bar | number, a hairline above each row; a bar is a row of two cells, the dark one as long as the number
    const BW = 280, NUM = 92, NAME = W - BW - NUM;
    const bar = (n, max) => {
      const on = n > 0 ? Math.min(BW, Math.max(3, Math.round(BW * n / max))) : 0;
      const piece = (w, c) => cell(w, gap(8), `height:6.0pt;background:${c};padding:0in`, ` bgcolor="${c}"`);
      return table(BW, `<tr style="height:6.0pt">${on ? piece(on, COL.ink) : ''}${on < BW ? piece(BW - on, COL.track) : ''}</tr>`) + gap(1);
    };
    const list = (title, after, rows) => {
      const pad = `padding:${pt(6)} 0in ${pt(6)} 0in`, rule = `border-top:solid ${COL.rule} 1.0pt;`;
      const max = Math.max.apply(null, rows.map(r => r.n).concat(1));
      const body = rows.length ? rows.map(r => '<tr>'
        + cell(NAME, line(r.name, 10, COL.ink), `${rule}padding:${pt(6)} ${pt(14)} ${pt(6)} 0in`, ' valign="middle"')
        + cell(BW, bar(r.n, max), rule + pad, ' valign="middle"')
        + cell(NUM, line(fmt(r.n), 10, COL.ink, { bold: 1, align: 'right' }), rule + pad, ' valign="middle" align="right"')
        + '</tr>').join('')
        : '<tr>' + cell(0, line('Nothing else in the export', 10, COL.mute), rule + pad, ' colspan="3"') + '</tr>';
      return line(title.toUpperCase(), 8, COL.mute, { bold: 1, ls: 0.9 })
        + (after ? line(after, 8.5, COL.mute, { mt: 1.5 }) : '')
        + gap(6) + table(W, body);
    };
    const lists = s.lists ? gap(22) + list('Top 5 outcomes · attempts', s.afterOut, s.busyOut) + gap(16) + list('Top 5 milestones · hits', s.afterMs, s.busyMs) : '';

    // data action errors, only when there are some: a pink box; every action that failed (Customer Type too), a pill with its
    // errors and the share of its runs that failed
    let errs = '';
    if (s.daFile && s.actions && s.errors.length) {
      const pad = (i, l) => `${i ? `border-top:solid ${COL.erule} 1.0pt;` : ''}padding:${pt(5)} 0in ${pt(5)} ${pt(l)}`;
      const pill = e => {
        const hi = e.rate >= 0.05, c = hi ? COL.red : COL.ink, bg = hi ? COL.red : COL.white;
        return line(errPill(e), 8.5, hi ? COL.white : COL.ink, { bold: 1, align: 'center', box: `border:solid ${c} 1.0pt;padding:1.0pt 0in 1.0pt 0in;background:${bg};border-radius:9px` });
      };
      const body = s.errors.map((e, i) => '<tr>'
        + cell(0, line(e.name, 10, COL.ink), pad(i, 0), ' valign="middle"')
        + cell(92, pill(e), pad(i, 10), ' valign="middle"')
        + cell(112, line(errRuns(e), 8.5, COL.mute, { align: 'right' }), pad(i, 10), ' valign="middle" align="right"')
        + '</tr>').join('');
      errs = table(W, '<tr>' + cell(W, line(('Data action errors' + (s.flow ? ' · ' + s.flow : '')).toUpperCase(), 8, COL.red, { bold: 1, ls: 0.9 }) + gap(4) + table('100%', body) + gap(4),
        `border:solid ${COL.ink} 1.5pt;background:${COL.pink};padding:${pt(14)} ${pt(16)} ${pt(8)} ${pt(16)}`, ` bgcolor="${COL.pink}"`) + '</tr>');
    }

    // the parts one under the other, a paragraph of space between them; the footnote under a rule (the paragraph's own border)
    return head + gap(18) + tiles + lists + gap(18)
      + (errs ? errs + gap(16) : '')
      + line(t.foot, 8, COL.mute, { box: `border-top:solid ${COL.ink} 1.5pt;padding:${pt(12)} 0in 0in 0in` });
  }

  /* The dialog: the picture, Copy for Teams and Download PNG */
  let dlg = null, cur = null;
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function status(t) { dlg.querySelector('.sc-status').textContent = t || ''; }
  function build() {
    dlg = el('dialog', 'sc-dlg');
    dlg.setAttribute('aria-labelledby', 'sc-title');
    const head = el('div', 'sc-head'), h = el('h2', '', 'IVR scorecard'), x = el('button', 'sc-x', '×');
    h.id = 'sc-title'; x.type = 'button'; x.setAttribute('aria-label', 'Close');
    head.append(h, x);
    const acts = el('div', 'sc-actions'), copyB = el('button', 'primary', 'Copy for Teams'), saveB = el('button', '', 'Download PNG'), st = el('span', 'sc-status');
    copyB.type = saveB.type = 'button'; copyB.autofocus = true;
    st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    acts.append(copyB, saveB, st);
    const stage = el('div', 'sc-stage'), img = el('img', 'sc-img');
    stage.append(img);
    const hint = el('p', 'sc-hint', 'In Teams, click in the message box and paste with Ctrl+V. If copying is blocked, right-click the picture and choose Copy image, or download the PNG and attach it.');
    dlg.append(head, acts, stage, hint);
    document.body.append(dlg);
    x.onclick = () => dlg.close();
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    copyB.onclick = copy; saveB.onclick = save;
  }
  function copy() {
    if (!cur) return;
    const blocked = 'Copying was blocked. Right-click the picture and choose Copy image, or download the PNG.';
    if (!navigator.clipboard || !window.ClipboardItem) { status(blocked); return; }
    let item;
    try { item = new ClipboardItem({ 'image/png': cur.blob || cur.ready }); } catch (e) { status(blocked); return; }
    navigator.clipboard.write([item]).then(() => status('Copied. In Teams, click in the message box and press Ctrl+V.'), () => status(blocked));
  }
  function save() {
    if (!cur) return;
    const c = cur;
    Promise.resolve(c.blob || c.ready).then(blob => {
      if (!blob) { status('The picture could not be made.'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = c.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      status('Saved ' + c.name + '.');
    });
  }
  function open(s) {
    if (!dlg) build();
    const cv = draw(s, 2);
    const slug = (s.brand || 'IVR').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'IVR';
    const c = { name: 'IVR-Scorecard-' + slug + '-' + (s.slug || 'report') + '.png', blob: null };
    c.ready = new Promise(res => cv.toBlob(b => { c.blob = b; res(b); }, 'image/png'));
    cur = c;
    const img = dlg.querySelector('.sc-img');
    img.src = cv.toDataURL('image/png'); img.alt = alt(s);
    status('');
    if (!dlg.open) dlg.showModal();
    dlg.querySelector('.sc-stage').scrollTop = 0;
  }

  root.Scorecard = { draw: draw, alt: alt, mailHtml: mailHtml, brandOf: brandOf, open: open };
})(window);
