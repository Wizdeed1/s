"""Brand assets, built into the page from assets/brand/*.png and vendor/fonts/poppins-*.woff2 (run when one of them changes):
  ui6/05_brand.css  the logos the interface shows (CSS custom properties) and the Poppins typeface (the Beyond One template's)
  bologos.js        the logos the decks use (PNG bytes), as BoLogos
No web address anywhere: every picture and the typeface are data in the page."""
import base64, os, struct
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
def png(name):
    b = open(os.path.join(root, 'assets', 'brand', name), 'rb').read(); w, h = struct.unpack('>II', b[16:24]); return b, w, h
def uri(name): return 'data:image/png;base64,' + base64.b64encode(png(name)[0]).decode()
UNI = ('U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,'
       'U+2193,U+2212,U+2215,U+FEFF,U+FFFD')
faces = ''.join(
    '@font-face { font-family: "Poppins"; font-style: normal; font-weight: %d; font-display: swap; unicode-range: %s; src: url(data:font/woff2;base64,%s) format("woff2"); }\n'
    % (w, UNI, base64.b64encode(open(os.path.join(root, 'vendor', 'fonts', 'poppins-latin-%d-normal.woff2' % w), 'rb').read()).decode())
    for w in (300, 500, 600, 700))
css = ('/* Beyond One: the logos the interface shows and the template\'s typeface. Made by js/make_brand.py from assets/brand and vendor/fonts.\n'
       '   Typeface: Poppins (Indian Type Foundry), SIL Open Font License 1.1 (vendor/fonts/Poppins-OFL.txt), latin subset, 300 500 600 700. */\n'
       + faces +
       ':root { --bo-logo-white: url(%s); --bo-mark: url(%s); }\n' % (uri('beyond-one-white.png'), uri('beyond-one-mark.png')))
open(os.path.join(here, 'ui6', '05_brand.css'), 'w', encoding='utf-8').write(css)
logos = {k: png(f) for k, f in [('stackedBlack', 'beyond-one-stacked-black.png'), ('stackedWhite', 'beyond-one-stacked-white.png'),
                                ('black', 'beyond-one-black.png'), ('white', 'beyond-one-white.png'), ('mark', 'beyond-one-mark.png'),
                                ('virgin', 'virgin-mobile.png'), ('friendi', 'friendi-mobile.png'), ('fpay', 'friendi-pay.png')]}
js = ('/* Beyond One and the brands\' logos for the decks (made by js/make_brand.py from assets/brand): PNG bytes with their size. */\n'
      "'use strict';\nconst BoLogos = (() => {\nconst b = s => { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; };\n"
      'const L = {\n' + ''.join("  %s: { w: %d, h: %d, b64: '%s' },\n" % (k, w, h, base64.b64encode(d).decode()) for k, (d, w, h) in logos.items()) +
      '};\n// each picture decoded once and then the same bytes every time, so a deck keeps it once however many slides show it\nconst out = {}; for (const k of Object.keys(L)) { let u = null; out[k] = { w: L[k].w, h: L[k].h, get png() { return u || (u = b(L[k].b64)); }, dataUrl: \'data:image/png;base64,\' + L[k].b64 }; }\nreturn out;\n})();\n'
      "if (typeof module !== 'undefined') module.exports = BoLogos;\n")
open(os.path.join(here, 'bologos.js'), 'w', encoding='utf-8').write(js)
print('05_brand.css', len(css), 'bytes; bologos.js', len(js), 'bytes')
