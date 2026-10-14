"""The Member Care Report Builder's engine, built into the page (no inner page, no iframe).

Writes rb_src.html: two script blocks for the page body.
  <script id="rb-data" type="text/plain">  the email templates, logos and the history seed: gzip + base64 JSON, opened on first use
  <script id="rb-code">                    the builder's own modules, as they are in Member Care Report Builder 14
                                           (xls/xlsx reader, engine, renderer, template filler, MC Leaders, WFM Daily Review, build)
Only two things change in the WFM Daily Review module (Dia'a Banjar's, credits and watermark untouched): its preview frame
gets an id of its own (the page already has an element called "preview"), and its downloads go through the page's own
save (so they work inside claude.ai too)."""
import base64, gzip, json, os, sys

here = os.path.dirname(os.path.abspath(__file__))
DT = os.path.join(here, '..', 'dt')


def read(name):
    return open(os.path.join(DT, name), encoding='utf-8').read()


def data_of(name, var):
    s = read(name).strip()
    pre = 'window.%s=' % var
    assert s.startswith(pre), (name, s[:40])
    s = s[len(pre):]
    if s.endswith(';'):
        s = s[:-1]
    return json.loads(s)


def swap(src, old, new, count):
    n = src.count(old)
    assert n == count, (old[:60], n, count)
    return src.replace(old, new)


data = {'templates': data_of('templates.js', 'TEMPLATES'), 'logos': data_of('logos.js', 'LOGOS'), 'seed': data_of('seed.js', 'HISTORY_SEED')}
raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
b64 = base64.b64encode(gzip.compress(raw, 9, mtime=0)).decode('ascii')

wfm = read('wfm.js')
wfm = swap(wfm, '<iframe id="preview" title="Preview"></iframe>', '<iframe id="wfmPreview" title="Preview" sandbox="allow-same-origin"></iframe>', 1)
wfm = swap(wfm, "host.querySelector('#preview')", "host.querySelector('#wfmPreview')", 1)
wfm = swap(wfm, "function download(name, content, mime){\n  const blob = new Blob([content], { type: mime });",
           "function download(name, content, mime){\n  const blob = new Blob([content], { type: mime });\n  if(typeof window.__mcSave === 'function'){ window.__mcSave(name, blob); return; }", 1)
for bad in ('id="preview"', "'#preview'"):
    assert bad not in wfm, bad

code = []
for name in ('xls.js', 'engine.js', 'render.js', 'fill.js', 'leaders.js'):
    code.append(read(name))
code.append(wfm)
code.append(read('build.js'))
js = '\n'.join(code)
assert '</script' not in js.lower(), 'a closing script tag inside the code'

out = ('<script id="rb-data" type="text/plain">' + b64 + '</script>\n'
       '<script id="rb-code">\n' + js + '\n</script>\n')
open(os.path.join(here, 'rb_src.html'), 'w', encoding='utf-8').write(out)
sys.stderr.write('rb_src.html: data %d KB (gz-b64), code %d KB\n' % (len(b64) // 1024, len(js) // 1024))
