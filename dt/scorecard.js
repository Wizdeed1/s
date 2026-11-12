/* IVR scorecard: the day's IVR numbers drawn as a picture for Teams, the same card as the IVR Scorecard tool (the emails have no IVR box).
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

  /* What the card says. s: { brand, flow, date, span, calls, agent, ended, abandoned, firstName, afterOut, afterMs,
     busyOut: [{name, n}], busyMs: [{name, n}], daFile, actions, errors: [{name, runs, rate}] (worst first) }.
     The names are the team's: IVR Summary daily report, IVR Calls, IVR deflection, Transfer to Agent, Errors. */
  function cardText(s) {
    const title = 'IVR Summary daily report' + (s.date ? ' · ' + s.date : '');
    const sub = [s.flow ? s.flow + ' flow' : 'Flow not named in the exports', s.span].filter(Boolean).join(' · ');
    const worst = s.errors[0];
    const tiles = [
      { lab: 'IVR Calls', val: fmt(s.calls), note: (s.firstName ? 'visits to ' + s.firstName : 'no outcomes in the export') + (s.abandoned ? ' · ' + fmt(s.abandoned) + ' abandoned left out' : '') },
      { lab: 'IVR deflection', val: pctOf(s.ended, s.calls), note: fmt(s.ended) + ' of ' + fmt(s.calls) + ' calls' },
      { lab: 'Transfer to Agent', val: pctOf(s.agent, s.calls), note: fmt(s.agent) + ' transfers' },
      !s.daFile ? { lab: 'Errors', val: '–', note: 'no data actions export' }
        : !s.actions ? { lab: 'Errors', val: '–', note: 'no actions for this flow' }
        : { lab: 'Errors', val: String(s.errors.length), note: worst ? 'worst: ' + rateTxt(worst.rate) + ' of ' + fmt(worst.runs) + ' runs' : 'none of ' + fmt(s.actions) + ' failed', alert: !!worst }
    ];
    const sources = s.daFile ? 'Flow Outcome Detail, Flow Milestone Detail and Data Actions Performance' : 'Flow Outcome Detail and Flow Milestone Detail';
    const foot = 'IVR deflection = IVR calls minus transfers to an agent' + (s.abandoned != null ? ', abandoned calls left out' : '') + '. Source: Genesys ' + sources + ' exports' + (s.date ? ', ' + s.date : '') + '.';
    return { title: title, sub: sub, tiles: tiles, foot: foot };
  }

  function paint(ctx, s, H, draw) {
    const X = CARD.X, CW = CARD.CW, t = cardText(s);
    if (draw) { ctx.fillStyle = COL.white; ctx.fillRect(0, 0, CARD.W, H); }
    let y = 26;
    y = block(ctx, TS.eb, 'IVR SCORECARD', X, y, CW, draw);
    y = block(ctx, TS.h1, t.title, X, y + 6, CW, draw);
    y = block(ctx, TS.sub, t.sub, X, y + 2, CW, draw);
    y += 18;

    // four tiles, two by two; tiles in a row share the taller height
    const TW = (CW - 10) / 2, IW = TW - 4 - 28;
    for (let r = 0; r < 2; r++) {
      const pair = t.tiles.slice(2 * r, 2 * r + 2);
      const h = Math.max.apply(null, pair.map(k => 2 + 12 + wrap(ctx, TS.lab, k.lab.toUpperCase(), IW).length * TS.lab.lh + 2 + TS.val.lh + 1 + wrap(ctx, TS.note, k.note, IW).length * TS.note.lh + 11 + 2));
      if (draw) pair.forEach((k, i) => {
        const x = X + i * (TW + 10), ix = x + 16;
        frame(ctx, x, y, TW, h, k.alert ? COL.pink : COL.white, k.alert ? COL.red : COL.ink, 2);
        let ty = block(ctx, TS.lab, k.lab.toUpperCase(), ix, y + 14, IW, true, k.alert ? COL.red2 : COL.mute);
        ty = block(ctx, TS.val, k.val, ix, ty + 2, IW, true);
        block(ctx, TS.note, k.note, ix, ty + 1, IW, true);
      });
      y += h + (r ? 0 : 10);
    }
    y += 20;

    // top 5 lists: name | bar | number
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
    y = list('Top 5 outcomes · attempts', s.afterOut, s.busyOut, y);
    y = list('Top 5 milestones · hits', s.afterMs, s.busyMs, y + 16);

    // data action errors, only when there are some
    if (s.daFile && s.actions && s.errors.length) {
      y += 18;
      const top = y, IX = X + 16, IWE = CW - 32, rows = s.errors.slice(0, 5), more = s.errors.length - rows.length;
      const head = ('Data action errors' + (s.flow ? ' · ' + s.flow : '')).toUpperCase();
      const lay = rows.map(e => {
        const pill = rateTxt(e.rate) + ' failed', runs = 'of ' + fmt(e.runs) + ' runs';
        const pw = textW(ctx, TS.pill, pill) + 17, rw = Math.max(84, textW(ctx, TS.runs, runs));
        const nl = wrap(ctx, TS.nm, e.name, IWE - pw - rw - 20);
        return { e: e, pill: pill, runs: runs, pw: pw, rw: rw, nl: nl, ch: Math.max(nl.length * TS.nm.lh, 18) };
      });
      const h = 2 + 12 + wrap(ctx, TS.h2, head, IWE).length * TS.h2.lh + 6 + lay.reduce((a, r, i) => a + (i ? 1 : 0) + 10 + r.ch, 0) + (more ? 1 + TS.more.lh + 8 : 0) + 8 + 2;
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
      if (more) {
        if (draw) { ctx.fillStyle = COL.erule; ctx.fillRect(IX, ry, IWE, 1); }
        block(ctx, TS.more, '+' + more + ' more ' + (more === 1 ? 'action' : 'actions') + ' with errors', IX, ry + 5, IWE, draw);
      }
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
    const parts = [t.title + '.', t.sub + '.'].concat(t.tiles.map(k => k.lab + ': ' + k.val + ', ' + k.note + '.'));
    if (s.busyOut.length) parts.push('Top outcomes: ' + s.busyOut.map(r => r.name + ' ' + fmt(r.n)).join(', ') + '.');
    if (s.busyMs.length) parts.push('Top milestones: ' + s.busyMs.map(r => r.name + ' ' + fmt(r.n)).join(', ') + '.');
    if (s.daFile && s.errors.length) parts.push('Data action errors: ' + s.errors.slice(0, 5).map(e => e.name + ' ' + rateTxt(e.rate) + ' of ' + fmt(e.runs) + ' runs').join(', ') + '.');
    return parts.join(' ');
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

  root.Scorecard = { draw: draw, alt: alt, brandOf: brandOf, open: open };
})(window);
