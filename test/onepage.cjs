// The one-to-one form on one A4 page, synthetic people only: a usual form, a long one with last month's follow-up and the agent's
// signature, and one with more writing than a page can hold (the full form then runs on to a second page).
const assert = require('node:assert/strict');
const path = require('node:path');
const Forms = require(path.join(__dirname, '..', 'js', 'forms.js'));
const pages = b => (Buffer.from(b).toString('latin1').match(/\/Type \/Page\b/g) || []).length;
const res = [['DRC-CSAT', '>= 85%', '85%', 'Ranking 5 of 5'], ['Quality Observations', '>= 95%', '94.67%', 'Ranking 4 of 5'], ['AHT', '<= 150', '158.8', 'Ranking 4 of 5'],
  ['Empowerment Utilization', '>= 95%', '96%', 'Ranking 5 of 5'], ['Call Reason & FCR Accuracy', '>= 95%', '100%', 'Ranking 5 of 5'], ['Adherence', '>= 95%', '94.63%', 'Ranking 4 of 5'],
  ['Tardiness', '<= 4', '58', 'Ranking 1 of 5'], ['Final % (scorecard)', '', '84%', 'Ranking 4.20']].map(([metric, target, result, status]) => ({ metric, target, result, status }));
const usual = { agent: { name: 'Lina A.', id: '1000000001', team: 'CC', teamName: 'Customer Care', brand: 'Virgin' }, supervisor: 'Faisal M.', date: '2026-10-20', period: 'September 2026',
  ref: '1TO1-2026-09-1000000001', topics: { kpi: true, adh: true }, results: res, details: ['Days under 95% adherence: 6 Sep (91.35%), 7 Sep (93.41%), 19 Sep (92.94%), 22 Sep (87.41%)'],
  discussion: 'We went through the month day by day.', rootCause: 'Shift start clashes with the shuttle.', agentComments: 'I will take the earlier shuttle.',
  actions: [{ action: 'Ask HR for the earlier shuttle', owner: 'Agent', due: '2026-10-25' }], reviewDate: '2026-11-20',
  verdict: { d: 'accepted', comment: 'Agreed.', byName: 'Faisal M.', at: '2026-10-21T10:00:00Z' }, agentSig: { typed: 'Lina A.', date: '21 Oct 2026', when: 'Oct 21, 08:42 PM', ref: 'a1b2c3' } };
const long = { ...usual, discussion: 'Adherence dipped on the weekends when the queue was long, and two late sign-ons came from the shuttle. '.repeat(12), agentComments: 'I will ask for the earlier shuttle and set a reminder. '.repeat(6),
  actions: [1, 2, 3, 4].map(i => ({ action: `Action ${i}: a weekly check-in on adherence and the late sign-ons`, owner: i % 2 ? 'Agent' : 'Supervisor', due: `2026-10-2${i}` })),
  followup: { from: '2026-08', label: 'Aug 2026', actions: [{ action: 'Shorter breaks on Sundays', owner: 'Agent', due: '2026-09-10', status: 'done' }, { action: 'Coaching on holds', owner: 'Supervisor', due: '2026-09-20', status: 'part' }],
    kpis: [{ metric: 'Adherence', before: '92.10%', after: '94.63%', better: true }, { metric: 'AHT', before: '150.2', after: '158.8', better: false }] } };
const huge = { ...long, discussion: long.discussion.repeat(8), agentComments: long.agentComments.repeat(10) };
let n = 0, failed = 0;
const ok = async (name, fn) => { try { await fn(); n++; console.log('ok', name); } catch (e) { failed++; console.log('FAIL', name, '\n ', e.message); } };
(async () => {
  await ok('a usual one-to-one is one page', async () => assert.equal(pages(await Forms.oneToOne(usual)), 1));
  await ok('a long one, with last month\'s follow-up, four actions, the supervisor\'s final and the signature: still one page', async () => assert.equal(pages(await Forms.oneToOne(long)), 1));
  await ok('more writing than a page holds: the full form, over more pages, so nothing is cut', async () => assert.ok(pages(await Forms.oneToOne(huge)) >= 2));
  await ok('the final form is as it was (its own layout)', async () => assert.ok(pages(await Forms.finalForm({ ...usual, findings: 'x', outcome: 'verbal', actionPlan: 'y' })) >= 1));
  console.log(`${n} checks passed${failed ? `, ${failed} failed` : ''}`);
  if (failed) process.exit(1);
})();
