// Made-up Outlook messages for the tests: msgFile() writes a .msg (a compound file with the message's text body, as Outlook keeps
// it: UTF-16, one table cell a line), and sampleBody() is a made-up "MC performance Review" email with its tables. No real data.
'use strict';
/** a compound file (version 3, 512-byte sectors) with one stream, __substg1.0_1000001F: the body. The body is padded to 4096 bytes
    or more, so it sits in normal sectors and the file needs no mini stream */
function msgFile(body) {
  const SS = 512, END = 0xFFFFFFFE, FREE = 0xFFFFFFFF, FATS = 0xFFFFFFFD, NOS = 0xFFFFFFFF;
  let text = String(body); while (Buffer.byteLength(text, 'utf16le') < 4200) text += '\r\n';
  const data = Buffer.from(text, 'utf16le'), n = Math.ceil(data.length / SS);
  if (n + 2 > SS / 4) throw new Error('body too long for one FAT sector');
  const head = Buffer.alloc(SS, 0), fat = Buffer.alloc(SS, 0xFF), dir = Buffer.alloc(SS, 0), body2 = Buffer.alloc(n * SS, 0);
  Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]).copy(head, 0);
  head.writeUInt16LE(0x3E, 24); head.writeUInt16LE(3, 26); head.writeUInt16LE(0xFFFE, 28); head.writeUInt16LE(9, 30); head.writeUInt16LE(6, 32);
  head.writeUInt32LE(0, 40); head.writeUInt32LE(1, 44); head.writeUInt32LE(1, 48); head.writeUInt32LE(0, 52); head.writeUInt32LE(4096, 56);
  head.writeUInt32LE(END, 60); head.writeUInt32LE(0, 64); head.writeUInt32LE(END, 68); head.writeUInt32LE(0, 72);
  for (let i = 0; i < 109; i++) head.writeUInt32LE(i === 0 ? 0 : FREE, 76 + i * 4);
  // sector 0: the FAT; sector 1: the directory; sectors 2…: the body
  fat.writeUInt32LE(FATS, 0); fat.writeUInt32LE(END, 4);
  for (let i = 0; i < n; i++) fat.writeUInt32LE(i === n - 1 ? END : 3 + i, (2 + i) * 4);
  const entry = (i, name, type, child, start, size) => {
    const o = i * 128, nm = Buffer.from(name + '\0', 'utf16le'); nm.copy(dir, o); dir.writeUInt16LE(nm.length, o + 64); dir[o + 66] = type; dir[o + 67] = 1;
    dir.writeUInt32LE(NOS, o + 68); dir.writeUInt32LE(NOS, o + 72); dir.writeUInt32LE(child, o + 76); dir.writeUInt32LE(start, o + 116); dir.writeUInt32LE(size, o + 120);
  };
  entry(0, 'Root Entry', 5, 1, END, 0);
  entry(1, '__substg1.0_1000001F', 2, NOS, 2, data.length);
  for (const i of [2, 3]) { const o = i * 128; dir.writeUInt32LE(NOS, o + 68); dir.writeUInt32LE(NOS, o + 72); dir.writeUInt32LE(NOS, o + 76); }
  data.copy(body2, 0);
  return Buffer.concat([head, fat, dir, body2]);
}
/** a made-up "MC performance Review" email: the tables as Outlook's text has them (a cell a line, blank lines between) */
function sampleBody(o = {}) {
  const M = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct'], cells = ['Hi Team,', 'Rebooking TKTs:', 'Months', 'Virgin', 'FRiENDi', 'Total'];
  M.forEach((m, i) => cells.push(m, String(600 + i * 10), String(450 + i * 8), String(1050 + i * 18)));
  cells.push('Nov to 3', '80', '70', '150');
  if (o.network !== false) {
    cells.push('Network Issues TKTs:', 'Network', 'Type', 'No Network', 'Weak Coverage', 'MNP- Port In', 'Inbound', 'Outbound', 'Total');
    const NM = ['Jun-25', 'Jul-25', 'Aug-25', 'Sep-25', 'Oct-25', 'Nov-25', 'Dec-25', 'Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'May-26', 'Jun-26', 'Jul-26', 'Aug-26', 'Sep-26', 'Oct-26'];
    NM.forEach((m, i) => { const v = [100 + i, 400 + i * 5, 10 + (i % 7), 80 + i, 90 + i]; cells.push(m, ...v.map(String), String(v.reduce((a, b) => a + b, 0))); });
    cells.push('11/1/2026 to 3', '5', '60', '2', '10', '11', '88');
  }
  cells.push('Web + App TKTs :', 'Month', 'Web + App TKTs Total (S+C)', 'All Just complaints  (App/Web + Agent )', '%');
  M.forEach((m, i) => { const a = 1800 + i * 20, b = 5000 + i * 50; cells.push(`1-${m.slice(0, 3)}`, a.toLocaleString('en-US'), b.toLocaleString('en-US'), `${(a / b * 100).toFixed(2)}%`); });
  cells.push('11/1/2026 to 3', '250', '700', '35.71%');
  cells.push('Social Media issue TKTs:', 'Month', 'Total', 'Postpaid', 'Prepaid');
  const SM = ['Jan-25', 'Feb-25', 'Mar-25', 'Apr-25', 'May-25', 'Jun-25', 'Jul-25', 'Aug-25', 'Sep-25', 'Oct-25', 'Nov-25', 'Dec-25', 'Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'May-26', 'Jun-26', 'Jul-26', 'Aug-26', 'Sep-26', 'Oct-26'];
  SM.forEach((m, i) => cells.push(m, String(120 + i * 20), String(5 + i * 3), String(115 + i * 17)));
  cells.push('11/1/2026 to 3', '60', '5', '55');
  if (o.vnet !== false) cells.push('Vnet Complaints:', 'Month', 'Total', 'Sep-26', '70', 'Oct-26', '90', '11/1/2026 to 3', '7');
  if (o.extra) cells.push('OTP Calls:', 'Month', 'Total', 'Sep-26', '1,500', 'Oct-26', '1,400', '11/1/2026 to 3', '120');
  cells.push('​​​', 'Sami Q.', 'Control and Complaint Manager', 'PO Box 0000, Riyadh', 'sami.q@example.com', 'Please consider the environment before printing this email.');
  return cells.join('\r\n\r\n \r\n\r\n');
}
/** a made-up answer to "Weekly commercial meeting" from the Complaint Management team: a block per brand (No. of Complaints,
    Resolution Time of Closed TKT, The Remaining Open TKT, Top Complaints), then the request quoted under it, with the same
    headings and no numbers. o.period: the blocks' month ('Oct 2026'); o.tabs: as copied from Outlook (a row tab-separated) */
function complaintsBody(o = {}) {
  const P = o.period || 'Oct 2026', rows = [];
  const block = (name, n, res, open, top, fpay) => {
    rows.push([name], [P]);
    if (fpay) rows.push(['Target']);
    rows.push(['No. of Complaints', n]);
    if (fpay) rows.push(['Resolution Time in Days'], ['Resolution Time', '', '5 Days'], ['Resolution Time One day', '', '1 Day']);
    else rows.push(['Resolution Time of Closed TKT', res]);
    rows.push(['The Remaining Open TKT ', open], ['Top Complaints :'], ['Subcategories ', 'Total', 'Percentage ']);
    top.forEach(r => rows.push(r));
  };
  rows.push(['Hi Team,'], ['Kindly find the needed below']);
  block(' Virgin', '1,240', '97%', '210', [['Data not working', '120', '10%'], ['Billing dispute', '98', '8%'], ['Wrong info from an agent', '85', '7%'], ['Weak Coverage', '80', '6%'], ['Recharge failed', '60', '5%']]);
  block('Friendi', '300', '100%', '40', [['SIM not working', '36', '12%'], ['Balance dispute', '30', '10%'], ['No network', '27', '9%'], ['Port-in delay', '24', '8%'], ['Wrong info from an agent', '21', '7%']]);
  block('FPAY', '90', '', '25', [['Remittance / Technical error while processing the remittance', '30', '33%'], ['Card / Card already used', '12', '13%'], ['Remittance / Transaction on hold', '9', '10%'], ['Sanction screening', '6', '7%'], ['Change phone number / Not working', '3', '3%']], true);
  rows.push(['Rana K.'], ['Complaint Management Supervisor'], ['rana.k@example.com']);
  rows.push(['From: Huda S. <huda.s@example.com>'], ['Subject: Weekly commercial meeting - Nov 2026'], ['Please provide the following data for VM, FR, and Fpay from Nov 01 to Nov 07.']);
  for (const b of ['Virgin', 'Friendi', 'Fpay']) rows.push([b], ['Nov-26'], ['No. of Complaints'], ['Resolution Time of Closed TKT'], ['The Remaining Open TKT'], ['Top 5 complaints'], ['Percentage']);
  if (o.tabs) return rows.map(r => r.join('\t')).join('\r\n');
  return rows.flat().map(c => c || ' ').join('\r\n\r\n \r\n\r\n');
}
module.exports = { msgFile, sampleBody, complaintsBody };
