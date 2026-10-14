"""The tool's two typefaces, embedded so every computer shows the same letters (no web font service, works offline):
Poppins (the brand's face: page titles and section heads) and Inter (everything else: text, labels, tables, numbers with
tabular figures). Latin subsets, WOFF2. Both are under the SIL Open Font License 1.1.
Writes js/fonts.css. Needs fontTools and brotli (pip install fonttools brotli)."""
import base64, io, os, sys
from fontTools import subset
from fontTools.ttLib import TTFont

here = os.path.dirname(os.path.abspath(__file__))
# Where the font files are: set MC_POPPINS and MC_INTER to their folders (Poppins-Medium/SemiBold as .ttf or the
# Fontsource poppins-latin-500/600-normal.woff2, Inter-Regular/Medium/SemiBold/Bold.otf).
POP = os.environ.get('MC_POPPINS', os.path.join(here, 'fontsrc')) + '/'
INTER = os.environ.get('MC_INTER', '/usr/share/fonts/opentype/inter') + '/'
OUT = os.path.join(here, '..', 'js', 'fonts.css')


def pick(folder, *names):
    for n in names:
        if os.path.exists(folder + n):
            return folder + n
    raise SystemExit('missing font file in %s: one of %s' % (folder, ', '.join(names)))


# Google Fonts' "latin" range, plus a few signs the tool writes (arrows, <=, >=, minus, multiplication, check)
RANGE = ('U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,'
         'U+2190-2199,U+2212,U+2215,U+2264-2265,U+2713,U+FEFF,U+FFFD')
FACES = [
    ('Inter', 400, INTER + 'Inter-Regular.otf', 'kern,liga,calt,ccmp,locl,mark,mkmk,tnum,case,cv11'),
    ('Inter', 500, INTER + 'Inter-Medium.otf', 'kern,liga,calt,ccmp,locl,mark,mkmk,tnum,case,cv11'),
    ('Inter', 600, INTER + 'Inter-SemiBold.otf', 'kern,liga,calt,ccmp,locl,mark,mkmk,tnum,case,cv11'),
    ('Inter', 700, INTER + 'Inter-Bold.otf', 'kern,liga,calt,ccmp,locl,mark,mkmk,tnum,case,cv11'),
    ('Poppins', 500, pick(POP, 'Poppins-Medium.ttf', 'poppins-latin-500-normal.woff2'), 'kern,liga,ccmp,locl,mark,mkmk'),
    ('Poppins', 600, pick(POP, 'Poppins-SemiBold.ttf', 'poppins-latin-600-normal.woff2'), 'kern,liga,ccmp,locl,mark,mkmk'),
]


def unicodes(spec):
    out = []
    for part in spec.split(','):
        part = part.strip()[2:]
        if '-' in part:
            a, b = part.split('-'); out.extend(range(int(a, 16), int(b, 16) + 1))
        else:
            out.append(int(part, 16))
    return out


css = ['/* Typefaces: Poppins (Indian Type Foundry) and Inter (Rasmus Andersson), SIL Open Font License 1.1, latin subsets */']
total = 0
for fam, wt, path, feats in FACES:
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = feats.split(',')
    opts.name_IDs = ['*']; opts.name_legacy = True; opts.name_languages = ['*']
    opts.notdef_outline = True; opts.recalc_bounds = True; opts.drop_tables += ['DSIG']
    f = TTFont(path)
    s = subset.Subsetter(options=opts); s.populate(unicodes=unicodes(RANGE)); s.subset(f)
    buf = io.BytesIO(); f.flavor = 'woff2'; f.save(buf)
    data = buf.getvalue(); total += len(data)
    css.append('@font-face { font-family: "%s"; font-style: normal; font-weight: %d; font-display: swap; unicode-range: %s; src: url(data:font/woff2;base64,%s) format("woff2"); }'
               % (fam, wt, RANGE, base64.b64encode(data).decode('ascii')))
    sys.stderr.write('%s %d: %d KB\n' % (fam, wt, len(data) // 1024))
open(OUT, 'w').write('\n'.join(css) + '\n')
sys.stderr.write('fonts.css: %d KB of fonts (%d KB as base64)\n' % (total // 1024, total * 4 // 3 // 1024))
