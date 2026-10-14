"""The page's main script: ui3.js with its modules put in at the markers (one IIFE, shared names)."""
import sys, os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'ui3.js'), encoding='utf-8').read()
PARTS = [('/*@@STORE@@*/', ['store.js']), ('/*@@AUTH@@*/', ['auth.js']),
         ('/*@@PORTAL@@*/', ['namelink.js', 'rules.js', 'portal.js', 'extras.js', 'quality.js', 'team.js', 'senior.js', 'agentws.js', 'dailyx.js', 'rbx.js', 'inter.js', 'wfmx.js', 'find.js', 'calendar.js', 'objections.js', 'followup.js', 'mtd.js', 'today.js', 'compare.js', 'i18n.js'])]
for mk, files in PARTS:
    assert src.count(mk) == 1, mk
    body = '\n'.join(open(os.path.join(here, f), encoding='utf-8').read() for f in files if os.path.exists(os.path.join(here, f)))
    src = src.replace(mk, body)
sys.stdout.write(src)
