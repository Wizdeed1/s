
/* The MC Leaders ticket summary, drawn in the same theme as the Member Care reports.
   It has its own renderer because it has no template of its own to fill. */
(function (root) {
  'use strict';
  const E = (typeof module !== 'undefined') ? require('./engine.js').Engine : window.Engine;
  const R = (typeof module !== 'undefined') ? require('./render.js').Render : window.Render;

  const FONT = 'Arial,Helvetica,sans-serif';
  const HAIR = '1px solid rgba(255,255,255,.34)';
  const T = { ink: '#22384f', accent: '#22384f', onAccent: '#ffffff', muted: '#6b6b6b', line: '#e3e3e3', zebra: '#f7f7f7' };

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  const dash = v => (v === 0 || v === '0' || v === null || v === undefined || v === '') ? '-' : v;
  const hrs = v => (v === null || v === undefined || isNaN(v)) ? '-' : v.toFixed(2);
  const pct1 = v => (v === null || v === undefined || isNaN(v)) ? '-' : (v * 100).toFixed(1) + '%';

  function table(inner) {
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">' + inner + '</table>';
  }
  function head(txt, align, width) {
    return '<td align="' + (align || 'right') + '"' + (width ? ' width="' + width + '"' : '') +
      ' style="padding:9px 7px;background-color:' + T.ink + ';font-family:' + FONT +
      ';font-size:11px;line-height:15px;color:#ffffff;font-weight:700;letter-spacing:.4px;text-transform:uppercase;white-space:nowrap;">' + esc(txt) + '</td>';
  }
  function cell(txt, o) {
    o = o || {};
    const st = ['padding:' + (o.pad || '8px 7px'), 'font-family:' + FONT, 'font-size:' + (o.size || '12px'),
      'line-height:16px', 'color:' + (o.color || '#201e1d')];
    st.push(o.wrap ? 'white-space:normal' : 'white-space:nowrap');
    if (o.bold) st.push('font-weight:700');
    if (o.bg) st.push('background-color:' + o.bg);
    if (o.top) st.push('border-top:' + o.top);
    return '<td align="' + (o.align || 'right') + '" style="' + st.join(';') + ';">' + txt + '</td>';
  }
  function sectionHead(n, title, sub) {
    return '<tr><td class="pad" style="padding:32px 32px 0 32px;">' + table(
      '<tr><td style="border-top:2px solid ' + T.ink + ';font-size:0;line-height:0;">&nbsp;</td></tr>' +
      '<tr><td style="font-family:' + FONT + ';font-size:11px;line-height:15px;color:' + T.ink + ';font-weight:700;letter-spacing:2px;padding:9px 0 0 0;">' + n + '</td></tr>' +
      '<tr><td style="font-family:' + FONT + ';font-size:22px;line-height:28px;mso-line-height-rule:exactly;color:' + T.ink + ';font-weight:700;letter-spacing:-.3px;padding:2px 0 0 0;">' + esc(title) + '</td></tr>' +
      (sub ? '<tr><td style="font-family:' + FONT + ';font-size:13px;line-height:19px;color:' + T.muted + ';padding:5px 0 0 0;">' + esc(sub) + '</td></tr>' : '')
    ) + '</td></tr>';
  }
  function block(inner, pad) {
    return '<tr><td class="pad scroll" style="padding:' + (pad || '12px 32px 0 32px') + ';">' + inner + '</td></tr>';
  }

  function render(m) {
    const s = m.stats, all = s.all;
    let body = '';

    // header
    body += '<tr><td height="6" bgcolor="' + T.accent + '" style="height:6px;font-size:0;line-height:0;background-color:' + T.accent + ';">&nbsp;</td></tr>';
    body += '<tr><td bgcolor="#ffffff" class="pad" style="background-color:#ffffff;padding:18px 32px;border-bottom:2px solid ' + T.ink + ';">' +
      table('<tr>' +
        '<td valign="middle">' +
        '<div style="font-family:' + FONT + ';font-size:11px;line-height:15px;color:' + T.ink + ';font-weight:700;letter-spacing:2px;">' + esc(m.eyebrow) + '</div>' +
        '<div style="font-family:' + FONT + ';font-size:26px;line-height:32px;mso-line-height-rule:exactly;color:' + T.ink + ';font-weight:700;letter-spacing:-.6px;padding-top:3px;">' + esc(m.title) + '</div>' +
        '</td>' +
        '<td align="right" valign="middle" style="font-family:' + FONT + ';font-size:11px;line-height:16px;color:' + T.muted + ';font-weight:700;letter-spacing:1px;white-space:nowrap;">' + esc(m.stamp) + '</td>' +
        '</tr>') +
      '</td></tr>';

    // greeting
    body += '<tr><td class="pad" style="padding:22px 32px 16px 32px;">' + table(
      '<tr><td style="font-family:' + FONT + ';font-size:14px;line-height:20px;color:#201e1d;padding:0 0 6px 0;">' + esc(m.greeting) + '</td></tr>' +
      '<tr><td style="font-family:' + FONT + ';font-size:14px;line-height:20px;color:#201e1d;padding:0 0 4px 0;">' + esc(m.intro) + '</td></tr>') +
      '</td></tr>';

    // KPI strip
    const kpis = [
      { label: 'Total tickets', value: E.fmtInt(all.total), sub: m.periodWord },
      { label: 'Closed', value: E.fmtInt(all.closed), sub: pct1(all.closurePct) + ' of total' },
      { label: 'Open · pending', value: E.fmtInt(all.open) + ' · ' + E.fmtInt(all.pending), sub: 'still with the team' },
      { label: 'Avg closure', value: hrs(all.avg) + ' h', sub: 'closed tickets' },
      { label: 'Closed within 2h', value: pct1(all.within2Pct), sub: E.fmtInt(all.b2) + ' tickets' }
    ];
    let kpiCells = '';
    kpis.forEach((k, i) => {
      kpiCells += '<td class="kpi" width="20%" valign="top" style="width:20%;padding:12px;' + (i ? 'border-left:1px solid ' + T.line + ';' : '') + '">' +
        '<div style="font-family:' + FONT + ';font-size:10px;line-height:14px;color:' + T.muted + ';font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">' + esc(k.label) + '</div>' +
        '<div style="font-family:' + FONT + ';font-size:23px;line-height:29px;mso-line-height-rule:exactly;color:' + T.ink + ';font-weight:700;letter-spacing:-.5px;padding-top:3px;">' + esc(k.value) + '</div>' +
        '<div style="font-family:' + FONT + ';font-size:10px;line-height:14px;color:' + T.muted + ';padding-top:2px;">' + esc(k.sub) + '</div>' +
        '</td>';
    });
    body += '<tr><td class="pad" style="padding:6px 32px 0 32px;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#ffffff;border:2px solid ' + T.ink + ';border-collapse:collapse;"><tr>' + kpiCells + '</tr></table>' +
      '</td></tr>';

    /* 01 — summary line */
    body += sectionHead('01', 'MC Leader Tickets Summary', 'Tickets assigned to ' + m.team + ' ' + m.periodPhrase + '.');
    body += block(table(
      '<tr>' + ['Total tickets', 'Closed', 'Open', 'Pending', 'Closure %', 'Avg closure (h)', 'Closed within 2h %']
        .map((h, i) => head(h, i === 0 ? 'left' : 'right')).join('') + '</tr>' +
      '<tr bgcolor="#ffffff">' +
        cell(E.fmtInt(all.total), { align: 'left', bold: true, size: '13px', color: T.ink }) +
        cell(E.fmtInt(all.closed), { size: '13px' }) +
        cell(E.fmtInt(all.open), { size: '13px' }) +
        cell(E.fmtInt(all.pending), { size: '13px' }) +
        cell(pct1(all.closurePct), { size: '13px', bold: true, color: T.ink }) +
        cell(hrs(all.avg), { size: '13px' }) +
        cell(pct1(all.within2Pct), { size: '13px', bold: true, color: T.ink }) +
      '</tr>'));

    /* 02 — category table */
    body += sectionHead('02', 'Detailed Tickets Table by Category', 'Every category and subcategory, with how quickly they closed.');
    const cols = ['Category', 'Sub category', 'Total', '% of total', 'Closed', 'Open', 'Pending']
      .concat(E.LEADER_BUCKETS.map(b => b.label)).concat(['Avg Closure (h)']);
    let rows = '<tr>' + cols.map((c, i) => head(c, i < 2 ? 'left' : 'right')).join('') + '</tr>';
    rows += '<tr bgcolor="' + T.ink + '">' +
      cell('TOTAL', { align: 'left', bg: T.ink, color: '#ffffff', bold: true, size: '11px', pad: '9px 7px', top: HAIR }) +
      cell('&nbsp;', { bg: T.ink, top: HAIR }) +
      cell(E.fmtInt(all.total), { bg: T.ink, color: '#ffffff', bold: true, pad: '9px 7px', top: HAIR }) +
      cell('100.0%', { bg: T.ink, color: '#ffffff', bold: true, pad: '9px 7px', top: HAIR }) +
      cell(dash(E.fmtInt(all.closed)), { bg: T.ink, color: '#ffffff', bold: true, pad: '9px 7px', top: HAIR }) +
      cell(dash(all.open), { bg: T.ink, color: '#ffffff', bold: true, pad: '9px 7px', top: HAIR }) +
      cell(dash(all.pending), { bg: T.ink, color: '#ffffff', bold: true, pad: '9px 7px', top: HAIR }) +
      E.LEADER_BUCKETS.map(b => cell(dash(all[b.key]), { bg: T.ink, color: '#ffffff', bold: true, pad: '9px 7px', top: HAIR })).join('') +
      cell(hrs(all.avg), { bg: T.ink, color: '#ffffff', bold: true, pad: '9px 7px', top: HAIR }) +
      '</tr>';
    s.list.forEach((r, i) => {
      const bg = i % 2 === 0 ? T.zebra : '#ffffff';
      rows += '<tr bgcolor="' + bg + '">' +
        cell(esc(r.category), { align: 'left', bold: true, color: T.ink, bg: bg, wrap: true, size: '12px' }) +
        cell(esc(r.sub), { align: 'left', bg: bg, wrap: true, size: '12px' }) +
        cell(E.fmtInt(r.total), { bg: bg, bold: true }) +
        cell(pct1(r.share), { bg: bg, color: T.muted }) +
        cell(dash(E.fmtInt(r.closed)), { bg: bg }) +
        cell(dash(r.open), { bg: bg }) +
        cell(dash(r.pending), { bg: bg }) +
        E.LEADER_BUCKETS.map(b => cell(dash(r[b.key]), { bg: bg })).join('') +
        cell(hrs(r.avg), { bg: bg, color: T.muted }) +
        '</tr>';
    });
    body += block(table(rows));

    /* 03 — closure time */
    body += sectionHead('03', 'Tickets by Closure Time', 'How long the closed tickets took.');
    const max = Math.max.apply(null, s.buckets.map(b => b.count)) || 1;
    let bars = '';
    s.buckets.forEach((b, i) => {
      const bg = i % 2 === 1 ? T.zebra : '#ffffff';
      const w = b.count ? Math.max(2, Math.round((b.count / max) * 100)) : 0;
      const bar = table('<tr>' +
        (w ? '<td width="' + w + '%" height="10" bgcolor="' + T.accent + '" style="font-size:0;line-height:0;background-color:' + T.accent + ';">&nbsp;</td>' : '') +
        (w < 100 ? '<td width="' + (100 - w) + '%" height="10" style="font-size:0;line-height:0;">&nbsp;</td>' : '') + '</tr>');
      bars += '<tr bgcolor="' + bg + '">' +
        '<td width="22%" style="font-family:' + FONT + ';font-size:13px;line-height:17px;font-weight:700;color:' + T.ink + ';padding:9px 8px;">' + esc(b.label) + '</td>' +
        '<td style="padding:9px 8px;">' + bar + '</td>' +
        '<td width="10%" align="right" style="font-family:' + FONT + ';font-size:13px;line-height:17px;font-weight:700;color:' + T.ink + ';padding:9px 8px;white-space:nowrap;">' + dash(E.fmtInt(b.count)) + '</td>' +
        '<td width="10%" align="right" style="font-family:' + FONT + ';font-size:12px;line-height:17px;color:' + T.muted + ';padding:9px 8px;white-space:nowrap;">' +
          (all.total && b.count ? (b.count / all.total * 100).toFixed(1) + '%' : '-') + '</td>' +
        '</tr>';
    });
    body += block(table(bars));

    // footer — the same as the Member Care reports
    const bo = (typeof window !== 'undefined' && window.LOGOS && window.LOGOS.beyondone) || null;
    body += '<tr><td class="pad" style="padding:28px 32px 0 32px;">' + table(
      '<tr><td style="border-top:2px solid ' + T.ink + ';font-size:0;line-height:0;">&nbsp;</td></tr>' +
      '<tr><td style="font-family:' + FONT + ';font-size:14px;line-height:20px;mso-line-height-rule:exactly;color:#201e1d;padding:12px 0 0 0;">' + esc(m.footer.thanks) + '</td></tr>') +
      '</td></tr>';
    body += '<tr><td class="pad" style="padding:20px 32px 26px 32px;">' + table(
      '<tr><td style="padding:0;">' + table('<tr><td valign="bottom" style="padding:0;">' + table(
          '<tr><td style="font-family:' + FONT + ';font-size:11px;line-height:15px;color:' + T.muted + ';font-weight:700;letter-spacing:1.2px;text-transform:uppercase;padding-bottom:5px;">' + esc(m.footer.signature) + '</td></tr>' +
          '<tr><td style="font-family:' + FONT + ';font-size:11px;line-height:17px;color:' + T.muted + ';">' + esc(m.footer.generated) + '</td></tr>') +
        '</td>' +
        (bo ? '<td width="226" align="right" valign="bottom" style="width:226px;padding:0 0 1px 20px;white-space:nowrap;"><img src="' + bo + '" width="206" height="58" alt="Beyond One" style="display:block;width:206px;height:58px;border:0;outline:none;text-decoration:none;"></td>' : '') +
        '</tr>') + '</td></tr>' +
      '<tr><td style="padding-top:10px;">' + table(
        '<tr><td style="border-top:2px solid ' + T.ink + ';font-size:0;line-height:0;">&nbsp;</td></tr>' +
        '<tr><td style="font-family:' + FONT + ';font-size:10px;line-height:15px;color:' + T.ink + ';font-weight:700;letter-spacing:1.2px;text-transform:uppercase;padding:9px 0 3px 0;">' + esc(m.footer.confidentialTitle) + '</td></tr>' +
        '<tr><td style="font-family:' + FONT + ';font-size:10px;line-height:15px;color:' + T.muted + ';">' + esc(m.footer.confidentialText) + '</td></tr>') +
      '</td></tr>') + '</td></tr>';

    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(m.title + ' · ' + m.stamp) + '</title>' +
      '<!--[if mso]><style>table,td{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}</style><![endif]-->' +
      '<style>@media only screen and (max-width:920px){.wrap{width:100%!important}.pad{padding-left:14px!important;padding-right:14px!important}' +
      '.kpi{display:block!important;width:100%!important;border-left:0!important;border-top:1px solid ' + T.line + '!important}' +
      '.scroll{overflow-x:auto!important;-webkit-overflow-scrolling:touch}}</style></head>' +
      '<body style="margin:0;padding:0;background-color:#ffffff;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#ffffff;">' +
      '<tr><td align="center" style="padding:20px 10px;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="900" class="wrap" style="width:900px;max-width:900px;background-color:#ffffff;border:2px solid ' + T.ink + ';border-collapse:collapse;">' +
      body + '</table></td></tr></table></body></html>';
  }

  root.Leaders = { render: render, THEME: T };
})(typeof module !== 'undefined' ? module.exports : window);
