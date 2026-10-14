
/* Builds the Outlook-ready email HTML for one report. */
(function (root) {
  'use strict';
  const E = (typeof module !== 'undefined') ? require('./engine.js').Engine : window.Engine;

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function d(str) { const p = String(str).split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function monthLabel(dateStr, fmt) {
    const x = d(dateStr), mon = MONTHS[x.m - 1], yy = String(x.y).slice(2);
    return fmt === 'YY-Mon' ? (yy + '-' + mon) : (mon + '-' + yy);
  }
  function dayLabel(dateStr) { const x = d(dateStr); return String(x.d).padStart(2, '0') + '-' + MONTHS[x.m - 1]; }
  function longDate(dateStr) { const x = d(dateStr); return x.d + ' ' + FULL[x.m - 1] + ' ' + x.y; }
  function shortStamp(dateStr) { const x = d(dateStr); return String(x.d).padStart(2, '0') + ' ' + MONTHS[x.m - 1].toUpperCase() + ' ' + x.y; }

  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function dayName(dateStr) { const x = d(dateStr); return DAYS[new Date(Date.UTC(x.y, x.m - 1, x.d)).getUTCDay()]; }
  function dmy(dateStr) { const x = d(dateStr); return String(x.d).padStart(2, '0') + '/' + String(x.m).padStart(2, '0') + '/' + x.y; }
  // "10–12 September 2026", "30 September – 2 October 2026"
  function longRange(a, b) {
    const x = d(a), y = d(b);
    if (a === b) return longDate(a);
    if (x.y !== y.y) return longDate(a) + ' – ' + longDate(b);
    if (x.m !== y.m) return x.d + ' ' + FULL[x.m - 1] + ' – ' + y.d + ' ' + FULL[y.m - 1] + ' ' + y.y;
    return x.d + '–' + y.d + ' ' + FULL[y.m - 1] + ' ' + y.y;
  }
  // "10–12 Sep 2026"
  function niceRange(a, b) {
    const x = d(a), y = d(b);
    if (a === b) return x.d + ' ' + MONTHS[x.m - 1] + ' ' + x.y;
    if (x.y !== y.y) return x.d + ' ' + MONTHS[x.m - 1] + ' ' + x.y + ' – ' + y.d + ' ' + MONTHS[y.m - 1] + ' ' + y.y;
    if (x.m !== y.m) return x.d + ' ' + MONTHS[x.m - 1] + ' – ' + y.d + ' ' + MONTHS[y.m - 1] + ' ' + y.y;
    return x.d + '–' + y.d + ' ' + MONTHS[y.m - 1] + ' ' + y.y;
  }
  // "10–12 SEP 2026"
  function stampRange(a, b) {
    const x = d(a), y = d(b), p = n => String(n).padStart(2, '0');
    if (a === b) return shortStamp(a);
    if (x.y !== y.y) return shortStamp(a) + ' – ' + shortStamp(b);
    if (x.m !== y.m) return p(x.d) + ' ' + MONTHS[x.m - 1].toUpperCase() + ' – ' + p(y.d) + ' ' + MONTHS[y.m - 1].toUpperCase() + ' ' + y.y;
    return p(x.d) + '–' + p(y.d) + ' ' + MONTHS[y.m - 1].toUpperCase() + ' ' + y.y;
  }
  // "Thursday to Saturday" / "Thu–Sat"
  function dayWords(a, b) { return a === b ? dayName(a) : dayName(a) + ' to ' + dayName(b); }
  function dayShort(a, b) { return a === b ? dayName(a).slice(0, 3) : dayName(a).slice(0, 3) + '–' + dayName(b).slice(0, 3); }

  const FONT = 'Arial,Helvetica,sans-serif';

  function cell(txt, opt) {
    opt = opt || {};
    const st = [
      'padding:' + (opt.padding || '8px 7px'),
      'font-family:' + FONT,
      'font-size:' + (opt.size || '12px'),
      'line-height:16px',
      'color:' + (opt.color || '#201e1d'),
      'white-space:nowrap'
    ];
    if (opt.bold) st.push('font-weight:700');
    if (opt.bg) st.push('background-color:' + opt.bg);
    if (opt.borderLeft) st.push('border-left:' + opt.borderLeft + ';padding-left:5px');
    if (opt.extra) st.push(opt.extra);
    return '<td align="' + (opt.align || 'right') + '" style="' + st.join(';') + ';">' + txt + '</td>';
  }

  function headCell(txt, t, align) {
    return '<td align="' + (align || 'right') + '" style="padding:9px 7px;background-color:' + t.ink +
      ';font-family:' + FONT + ';font-size:11px;line-height:15px;color:#ffffff;font-weight:700;letter-spacing:.4px;' +
      'text-transform:uppercase;white-space:nowrap;">' + esc(txt) + '</td>';
  }

  function sectionHead(n, title, sub, t) {
    return '<tr><td class="pad" style="padding:32px 32px 0 32px;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">' +
      '<tr><td style="border-top:2px solid ' + t.ink + ';font-size:0;line-height:0;">&nbsp;</td></tr>' +
      '<tr><td style="font-family:' + FONT + ';font-size:11px;line-height:15px;color:' + t.ink + ';font-weight:700;letter-spacing:2px;padding:9px 0 0 0;">' + n + '</td></tr>' +
      '<tr><td style="font-family:' + FONT + ';font-size:22px;line-height:28px;mso-line-height-rule:exactly;color:' + t.ink + ';font-weight:700;letter-spacing:-.3px;padding:2px 0 0 0;">' + esc(title) + '</td></tr>' +
      (sub ? '<tr><td style="font-family:' + FONT + ';font-size:13px;line-height:19px;color:' + t.muted + ';padding:5px 0 0 0;">' + esc(sub) + '</td></tr>' : '') +
      '</table></td></tr>';
  }

  function wrapBlock(inner, pad) {
    return '<tr><td class="pad scroll" style="padding:' + (pad || '12px 32px 0 32px') + ';">' + inner + '</td></tr>';
  }
  function table(inner) {
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">' + inner + '</table>';
  }

  /* ----- metric tables ----- */

  function metricTable(cols, groups, t) {
    let html = '<tr>' + cols.map((c, i) => headCell(c.label, t, i === 0 ? 'left' : 'right')).join('') + '</tr>';
    groups.forEach(g => {
      if (g.label) {
        html += '<tr><td colspan="' + cols.length + '" style="padding:11px 7px 5px 7px;font-family:' + FONT +
          ';font-size:11px;line-height:15px;color:' + t.muted + ';font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">' +
          esc(g.label) + '</td></tr>';
      }
      g.rows.forEach((r, idx) => {
        const zebra = (idx % 2 === 1) ? '#f7f7f7' : '#ffffff';
        const isToday = r.today, isTotal = r.total;
        const bg = isToday ? t.todayBg : (isTotal ? t.ink : zebra);
        const color = isToday ? t.todayColor : (isTotal ? '#ffffff' : '#201e1d');
        let tds = '';
        r.cells.forEach((v, i) => {
          const strong = isToday || isTotal || (cols[i] && cols[i].strong);
          tds += cell(esc(v), {
            align: i === 0 ? 'left' : 'right',
            bold: strong,
            color: (isToday || isTotal) ? color : (cols[i] && cols[i].strong ? t.ink : (i === 0 ? '#201e1d' : (cols[i] && cols[i].muted ? t.muted : '#201e1d'))),
            bg: bg,
            padding: isToday || isTotal ? '9px 7px' : '8px 7px',
            borderLeft: (i === 0 && isToday && t.todayBorder) ? t.todayBorder : null
          });
        });
        html += '<tr bgcolor="' + bg + '">' + tds + '</tr>';
      });
    });
    return table(html);
  }

  function barRows(items, t) {
    const max = Math.max.apply(null, items.map(i => i.value || 0)) || 1;
    let html = '';
    items.forEach((it, i) => {
      const bg = i % 2 === 1 ? '#f7f7f7' : '#ffffff';
      const w = Math.max(2, Math.round((it.value / max) * 100));
      const bar = table('<tr><td width="' + w + '%" height="10" bgcolor="' + t.accent + '" style="font-size:0;line-height:0;background-color:' + t.accent + ';">&nbsp;</td>' +
        (w < 100 ? '<td width="' + (100 - w) + '%" height="10" style="font-size:0;line-height:0;">&nbsp;</td>' : '') + '</tr>');
      html += '<tr bgcolor="' + bg + '">' +
        '<td width="32%" style="font-family:' + FONT + ';font-size:13px;line-height:17px;font-weight:700;color:' + t.ink + ';padding:9px 8px;">' + esc(it.label) + '</td>' +
        '<td style="padding:9px 8px;">' + bar + '</td>' +
        '<td width="12%" align="right" style="font-family:' + FONT + ';font-size:13px;line-height:17px;font-weight:700;color:' + t.ink + ';padding:9px 8px;white-space:nowrap;">' + esc(it.display) + '</td>' +
        '</tr>';
    });
    return table(html);
  }

  function reasonRows(items, t) {
    const max = Math.max.apply(null, items.map(i => i.value || 0)) || 1;
    let html = '';
    items.forEach((it, i) => {
      const bg = i % 2 === 1 ? '#f7f7f7' : '#ffffff';
      const w = Math.max(2, Math.round((it.value / max) * 100));
      const bar = table('<tr><td width="' + w + '%" height="10" bgcolor="' + t.accent + '" style="font-size:0;line-height:0;background-color:' + t.accent + ';">&nbsp;</td>' +
        (w < 100 ? '<td width="' + (100 - w) + '%" height="10" style="font-size:0;line-height:0;">&nbsp;</td>' : '') + '</tr>');
      html += '<tr bgcolor="' + bg + '">' +
        '<td width="5%" valign="top" style="font-family:' + FONT + ';font-size:12px;line-height:17px;color:' + t.muted + ';font-weight:700;padding:9px 4px 9px 8px;">' + (i + 1) + '</td>' +
        '<td width="40%" valign="top" style="font-family:' + FONT + ';font-size:13px;line-height:18px;font-weight:700;color:' + t.ink + ';padding:9px 8px;">' + esc(it.label) + '</td>' +
        '<td valign="top" style="padding:12px 8px;">' + bar + '</td>' +
        '<td width="8%" valign="top" align="right" style="font-family:' + FONT + ';font-size:13px;line-height:17px;font-weight:700;color:' + t.ink + ';padding:9px 8px;white-space:nowrap;">' + esc(it.display) + '</td>' +
        '</tr>';
    });
    return table(html);
  }

  function simpleTable(headerLeft, headerRight, items, t) {
    let html = '<tr>' + headCell(headerLeft, t, 'left') + headCell(headerRight, t, 'right') + '</tr>';
    items.forEach((it, i) => {
      const bg = i % 2 === 1 ? '#f7f7f7' : '#ffffff';
      html += '<tr bgcolor="' + bg + '">' +
        cell(esc(it.label), { align: 'left', bg: bg, size: '13px', extra: 'white-space:normal' }) +
        cell(esc(it.value), { align: 'right', bg: bg, size: '13px', bold: true, color: t.ink }) +
        '</tr>';
    });
    return table(html);
  }

  function totalsBand(items, t) {
    let cells = '';
    items.forEach((it, i) => {
      cells += '<td class="kpi" width="' + Math.floor(100 / items.length) + '%" valign="top" style="padding:12px;' +
        (i ? 'border-left:1px solid #e3e3e3;' : '') + '">' +
        '<div style="font-family:' + FONT + ';font-size:23px;line-height:29px;mso-line-height-rule:exactly;color:' + t.ink + ';font-weight:700;letter-spacing:-.5px;">' + esc(it.value) + '</div>' +
        '<div style="font-family:' + FONT + ';font-size:10px;line-height:14px;color:' + t.muted + ';font-weight:700;letter-spacing:1.2px;text-transform:uppercase;padding-top:3px;">' + esc(it.label) + '</div>' +
        '</td>';
    });
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#ffffff;border:2px solid ' + t.ink + ';border-collapse:collapse;"><tr>' + cells + '</tr></table>';
  }

  /* ----- the whole email ----- */

  function renderEmail(r) {
    const t = r.theme;
    let body = '';

    // header
    body += '<tr><td height="6" bgcolor="' + t.accent + '" style="height:6px;font-size:0;line-height:0;background-color:' + t.accent + ';">&nbsp;</td></tr>';
    body += '<tr><td bgcolor="#ffffff" class="pad" style="background-color:#ffffff;padding:18px 32px;border-bottom:2px solid ' + t.ink + ';">' +
      table('<tr>' +
        (r.logo ? '<td width="132" valign="middle" style="width:132px;"><img src="' + r.logo + '" width="' + (r.logoW || 110) + '" alt="' + esc(r.brandName) + '" style="display:block;width:' + (r.logoW || 110) + 'px;height:auto;border:0;outline:none;text-decoration:none;"></td>' : '') +
        '<td valign="middle">' +
        '<div style="font-family:' + FONT + ';font-size:11px;line-height:15px;color:' + t.muted + ';font-weight:700;letter-spacing:2px;">' + esc(r.eyebrow) + '</div>' +
        '<div style="font-family:' + FONT + ';font-size:22px;line-height:28px;mso-line-height-rule:exactly;color:' + t.ink + ';font-weight:700;letter-spacing:-.3px;padding-top:2px;">' + esc(r.title) + '</div>' +
        '</td>' +
        '<td align="right" valign="middle" style="font-family:' + FONT + ';font-size:11px;line-height:15px;color:' + t.muted + ';font-weight:700;letter-spacing:1.5px;white-space:nowrap;">' + esc(r.stamp) + '</td>' +
        '</tr>') +
      '</td></tr>';

    // greeting
    body += '<tr><td class="pad" style="padding:22px 32px 16px 32px;">' +
      table('<tr><td style="font-family:' + FONT + ';font-size:14px;line-height:20px;color:#201e1d;padding:0 0 6px 0;">' + esc(r.greeting) + '</td></tr>' +
        '<tr><td style="font-family:' + FONT + ';font-size:14px;line-height:20px;color:#201e1d;padding:0 0 10px 0;">' + esc(r.intro) + '</td></tr>') +
      '</td></tr>';

    // insight band
    body += '<tr><td class="pad" style="padding:0 32px;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:' + t.accent + ';border-collapse:collapse;">' +
      '<tr><td valign="middle" style="font-family:' + FONT + ';padding:16px 18px;">' +
      '<div style="font-size:11px;line-height:15px;color:' + t.onAccent + ';font-weight:700;letter-spacing:2px;">' + esc(r.insightLabel) + '</div>' +
      '<div style="font-size:28px;line-height:34px;mso-line-height-rule:exactly;color:' + t.onAccent + ';font-weight:700;letter-spacing:-.5px;padding-top:2px;">' + esc(r.insightText) + '</div>' +
      '</td></tr></table></td></tr>';

    // KPI strip
    let kpiCells = '';
    r.kpis.forEach((k, i) => {
      kpiCells += '<td class="kpi" width="' + Math.floor(100 / r.kpis.length) + '%" valign="top" style="width:' + Math.floor(100 / r.kpis.length) + '%;padding:12px;' + (i ? 'border-left:1px solid #e3e3e3;' : '') + '">' +
        '<div style="font-family:' + FONT + ';font-size:10px;line-height:14px;color:' + t.muted + ';font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">' + esc(k.label) + '</div>' +
        '<div style="font-family:' + FONT + ';font-size:23px;line-height:29px;mso-line-height-rule:exactly;color:' + t.ink + ';font-weight:700;letter-spacing:-.5px;padding-top:3px;">' + esc(k.value) + '</div>' +
        '<div style="font-family:' + FONT + ';font-size:10px;line-height:14px;color:' + t.muted + ';padding-top:2px;">' + esc(k.sub || '') + '</div>' +
        '</td>';
    });
    body += '<tr><td class="pad" style="padding:16px 32px 0 32px;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#ffffff;border:2px solid ' + t.ink + ';border-collapse:collapse;"><tr>' + kpiCells + '</tr></table>' +
      '</td></tr>';

    // sections
    r.sections.forEach(s => {
      body += sectionHead(s.number, s.title, s.subtitle, t);
      if (s.kind === 'metric') {
        if (s.band && s.band.length && s.groups.length > 1) {
          // the band sits between the monthly block and the daily block
          body += wrapBlock(metricTable(s.cols, [s.groups[0]], t));
          body += '<tr><td class="pad" style="padding:16px 32px 0 32px;font-family:' + FONT +
            ';font-size:11px;line-height:15px;color:' + t.muted + ';font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">' +
            esc(s.bandLabel || '') + '</td></tr>';
          body += wrapBlock(totalsBand(s.band, t), '8px 32px 0 32px');
          body += wrapBlock(metricTable(s.cols, s.groups.slice(1), t), '16px 32px 0 32px');
        } else {
          body += wrapBlock(metricTable(s.cols, s.groups, t));
        }
      }
      else if (s.kind === 'bars') body += wrapBlock(barRows(s.items, t));
      else if (s.kind === 'reasons') body += wrapBlock(reasonRows(s.items, t));
      else if (s.kind === 'pairs' && s.catRows) {
        // FRiENDi Pay: category / subcategory / tickets, closed by a total line
        let h = '<tr>' + headCell('Category', t, 'left') + headCell('Subcategory', t, 'left') + headCell('Tickets', t, 'right') + '</tr>';
        s.catRows.forEach((it, i) => {
          const bg = i % 2 === 1 ? '#f7f7f7' : '#ffffff';
          h += '<tr bgcolor="' + bg + '">' +
            cell(esc(it.category), { align: 'left', bg: bg, size: '13px', bold: true, color: t.ink, extra: 'white-space:normal' }) +
            cell(esc(it.sub), { align: 'left', bg: bg, size: '13px', extra: 'white-space:normal' }) +
            cell(esc(it.value), { align: 'right', bg: bg, size: '13px', bold: true, color: t.ink }) + '</tr>';
        });
        h += '<tr bgcolor="' + t.ink + '">' + cell('TOTAL TICKETS CREATED', { align: 'left', bg: t.ink, color: '#ffffff', bold: true, size: '11px' }) +
          cell('&nbsp;', { bg: t.ink }) + cell(esc(s.totalValue), { bg: t.ink, color: '#ffffff', bold: true }) + '</tr>';
        body += wrapBlock(table(h));
      }
      else if (s.kind === 'pairs') {
        s.blocks.forEach((b, i) => { body += wrapBlock(simpleTable(b.left, b.right, b.items, t), i ? '18px 32px 0 32px' : '12px 32px 0 32px'); });
      } else if (s.kind === 'band') body += wrapBlock(totalsBand(s.items, t));
      if (s.footnote) {
        body += '<tr><td class="pad" style="padding:8px 32px 0 32px;font-family:' + FONT + ';font-size:11px;line-height:16px;color:' + t.muted + ';">' + esc(s.footnote) + '</td></tr>';
      }
      if (s.extra) body += s.extra;
    });

    // footer — signature on the left, Beyond One logo on the right
    const bo = (typeof window !== 'undefined' && window.LOGOS && window.LOGOS.beyondone) || null;
    body += '<tr><td class="pad" style="padding:30px 32px 0 32px;">' +
      table('<tr><td colspan="2" style="border-top:2px solid #201e1d;font-size:0;line-height:0;">&nbsp;</td></tr>' +
        '<tr><td valign="bottom">' + table(
          '<tr><td style="font-family:' + FONT + ';font-size:14px;line-height:20px;color:#201e1d;padding:14px 0 0 0;">' + esc(r.footer.thanks) + '</td></tr>' +
          '<tr><td style="font-family:' + FONT + ';font-size:14px;line-height:20px;color:' + t.ink + ';font-weight:700;padding:2px 0 0 0;">' + esc(r.footer.signature) + '</td></tr>' +
          '<tr><td style="font-family:' + FONT + ';font-size:11px;line-height:16px;color:' + t.muted + ';padding:6px 0 0 0;">' + esc(r.footer.generated) + '</td></tr>') +
        '</td>' +
        (bo ? '<td width="226" align="right" valign="bottom" style="width:226px;padding:0 0 1px 20px;white-space:nowrap;"><img src="' + bo + '" width="206" height="58" alt="Beyond One" style="display:block;width:206px;height:58px;border:0;outline:none;text-decoration:none;"></td>' : '') +
        '</tr>') +
      '</td></tr>';
    body += '<tr><td class="pad" style="padding:18px 32px 26px 32px;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#f7f7f7;border-collapse:collapse;"><tr><td style="padding:12px 14px;">' +
      '<div style="font-family:' + FONT + ';font-size:10px;line-height:14px;color:#201e1d;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">' + esc(r.footer.confidentialTitle) + '</div>' +
      '<div style="font-family:' + FONT + ';font-size:11px;line-height:16px;color:' + t.muted + ';padding-top:4px;">' + esc(r.footer.confidentialText) + '</div>' +
      '</td></tr></table></td></tr>';

    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(r.title + ' — ' + r.brandName + ' · ' + r.stamp) + '</title>' +
      '<!--[if mso]><style>table,td{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}</style><![endif]-->' +
      '<style>@media only screen and (max-width:920px){.wrap{width:100%!important}.pad{padding-left:14px!important;padding-right:14px!important}' +
      '.kpi{display:block!important;width:100%!important;border-left:0!important;border-top:1px solid #e3e3e3!important}' +
      '.scroll{overflow-x:auto!important;-webkit-overflow-scrolling:touch}}</style></head>' +
      '<body style="margin:0;padding:0;background-color:#ffffff;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#ffffff;">' +
      '<tr><td align="center" style="padding:20px 10px;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="900" class="wrap" style="width:900px;max-width:900px;background-color:#ffffff;border:2px solid ' + t.ink + ';border-collapse:collapse;">' +
      body +
      '</table></td></tr></table></body></html>';
  }

  root.Render = { renderEmail, monthLabel, dayLabel, longDate, shortStamp, esc, MONTHS, FULL,
    dayName, dmy, longRange, niceRange, stampRange, dayWords, dayShort };
})(typeof module !== 'undefined' ? module.exports : window);

