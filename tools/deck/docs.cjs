// Two documents the tool makes, filled with synthetic people, for the deck's pictures: a one-to-one form (PDF) and a department's
// attendance template (xlsx). Usage: node tools/deck/docs.cjs outDir
const fs = require('node:fs'), path = require('node:path');
const js = p => path.join(__dirname, '..', '..', 'js', p);
const Forms = require(js('forms.js')), AttTpl = require(js('atttpl.js'));
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const res = [['DRC-CSAT', '>= 85%', '90%', 'Ranking 5 of 5'], ['Quality Observations', '>= 95%', '96%', 'Ranking 5 of 5'], ['AHT', '<= 150', '140', 'Ranking 5 of 5'], ['Empowerment Utilization', '>= 95%', '96%', 'Ranking 5 of 5'],
  ['Call Reason & FCR Accuracy', '>= 95%', '96%', 'Ranking 5 of 5'], ['Adherence', '>= 95%', '94.96% -> 95%', 'Ranking 5 of 5'], ['Tardiness', '<= 4', '0', 'Ranking 5 of 5'], ['Final % (scorecard)', '', '100%', 'Ranking 5.00']].map(([metric, target, result, status]) => ({ metric, target, result, status }));
const form = { agent: { name: 'Lina A.', id: '1000000001', team: 'CC', teamName: 'Customer Care', brand: 'Virgin' }, supervisor: 'Ghada S.', date: '2026-10-07', period: 'September 2026', ref: '1TO1-2026-09-0001',
  topics: { kpi: true, adh: true }, results: res, details: ['Days under 95% adherence: 6 Sep (93.4%), 20 Sep (94.1%)'],
  discussion: 'A strong month: every KPI on target. Two days under 95% adherence, both on Sundays when the queue was long; agreed to keep breaks to the schedule on busy days.',
  rootCause: 'Breaks taken late on two busy Sundays.', agentComments: 'Agreed. I will follow the break schedule on Sundays.',
  actions: [{ action: 'Keep breaks to the schedule on busy days', owner: 'Agent', due: '2026-10-31' }, { action: 'Check adherence together mid-month', owner: 'Supervisor', due: '2026-10-15' }],
  reviewDate: '2026-11-05', verdict: { d: 'accepted', comment: 'Well done, keep it up.', byName: 'Ghada S.', at: '2026-10-07T10:00:00Z' },
  agentSig: { typed: 'Lina A.', date: '7 Oct 2026', when: 'Oct 7, 11:20 AM', ref: 'f3a9c1' } };
const people = [['1000000011', 'Rami K.'], ['1000000012', 'Dana W.'], ['1000000013', 'Sami H.'], ['1000000014', 'Reem F.'], ['1000000015', 'Talal B.']].map(([id, name]) => ({ id, name, brand: 'Virgin', team: 'TS' }));
(async () => {
  fs.writeFileSync(path.join(out, 'form.pdf'), await Forms.oneToOne(form));
  fs.writeFileSync(path.join(out, 'template.xlsx'), await AttTpl.build({ y: 2026, m: 10, dep: 'TS', depName: 'Tele-Sales', spv: 'Waleed G.', people }));
  console.log('✓ form.pdf, template.xlsx');
})();
