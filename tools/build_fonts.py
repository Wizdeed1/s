"""The tool's typeface, embedded so every computer shows the same letters (no web font service, works offline): Geist, for
headlines and figures everywhere (body text uses the system font on Apple devices, San Francisco, and Geist elsewhere).
One variable WOFF2 (weights 100 to 900, tabular figures), the latin subset as Google Fonts serves it, under the SIL Open Font
License 1.1 (tools/fontsrc/GEIST-OFL.txt). Writes js/fonts.css; needs only Python.
Another copy of the file can be used with MC_GEIST=/path/to/geist-latin.woff2."""
import base64, os

here = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get('MC_GEIST', os.path.join(here, 'fontsrc', 'geist-latin.woff2'))
OUT = os.path.join(here, '..', 'js', 'fonts.css')
# Google Fonts' "latin" range for Geist (the letters the file holds)
RANGE = ('U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,'
         'U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD')

data = open(SRC, 'rb').read()
if data[:4] != b'wOF2':
    raise SystemExit('%s is not a WOFF2 file' % SRC)
css = ('/* Typeface: Geist (The Geist Project Authors, https://github.com/vercel/geist-font), SIL Open Font License 1.1, '
       'variable weight 100 to 900, latin subset.\n'
       '   Headlines and figures everywhere; body text uses the system font on Apple devices (San Francisco) and Geist elsewhere. */\n'
       '@font-face { font-family: "Geist"; font-style: normal; font-weight: 100 900; font-display: swap; unicode-range: %s; '
       'src: url(data:font/woff2;base64,%s) format("woff2"); }\n') % (RANGE, base64.b64encode(data).decode('ascii'))
with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    f.write(css)
print('%s: Geist %d KB' % (os.path.relpath(OUT), len(data) // 1024))
