---
type: "query"
date: "2026-11-06T10:54:59.789035+00:00"
question: "Why does 'Injection into the page check (OWASP A03, CWE-79)' connect 'XSS Injection Checks' to 'WFM Daily Review Report', 'Council Session Verdicts', 'Leaders Email Render', 'Build Import and KPI Model', 'Uploads and Agent Tests', 'Security Review Skill', 'Daily Email Rendering'?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Injection into the page check (OWASP A03, CWE-79)", "esc()", "ui3.js", "xss.cjs", "unescaped.cjs", "Sandboxed email preview iframe (#mailFrame)", "Skeptic case: the engine survives as a calculator, the multi-role system does not"]
---

# Q: Why does 'Injection into the page check (OWASP A03, CWE-79)' connect 'XSS Injection Checks' to 'WFM Daily Review Report', 'Council Session Verdicts', 'Leaders Email Render', 'Build Import and KPI Model', 'Uploads and Agent Tests', 'Security Review Skill', 'Daily Email Rendering'?

## Answer

Expanded from original query via vocab: [injection, owasp, cwe, xss, esc, security, check, html]. Then traversed BFS and explained the node (9 links). Answer: the check (.claude/skills/mc-security-review/SKILL.md L64-L81) is the only node that names the separate HTML-escaping helpers. dt/leaders.js, dt/render.js and dt/wfm.js each carry their own esc() (copied from Member Care Report Builder 14) and are pasted into the page by js/make_rb.py, not imported, so the code graph has no links between them; SKILL.md L66 ('esc() in js/ui3.js, or the module's own esc in dt/*.js') is what ties them together. Without the node, dt/leaders.js is cut off from the graph (8-node island). Its other links: ui3.js (L66), xss.cjs (L78), unescaped.cjs (L76), the sandboxed #mailFrame preview (js/ui3_body.html L433, sandbox=allow-same-origin), the credits (L223) and a loose INFERRED link to the council skeptic case (council/sessions/2026-10-19 L72, about overall security standing, not injection). Checked in code: the three esc() links and the #mailFrame link are right; unescaped.cjs sits in Uploads and Agent Tests by clustering only; the graph misses js/ui3.js esc (an arrow function). Findings: esc() in dt/leaders.js, dt/render.js and the start guard (js/head_boot.html, js/ui3_head.html) do not escape the apostrophe, unlike the checklist says; harmless today as none of them puts data in a single-quoted attribute. unescaped.cjs only reads template literals and xss.cjs does not render the brand or MC Leaders emails; a hand test planting markup in every MC Leaders category and subcategory left 0 raw and 8 escaped; the brand email routes every data text through esc().

## Outcome

- Signal: useful

## Source Nodes

- Injection into the page check (OWASP A03, CWE-79)
- esc()
- ui3.js
- xss.cjs
- unescaped.cjs
- Sandboxed email preview iframe (#mailFrame)
- Skeptic case: the engine survives as a calculator, the multi-role system does not