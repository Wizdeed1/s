"""The moving Beyond One logo, from the company's animated logos (assets/brand/beyond-one-white.gif and beyond-one-black.gif: eleven
frames of 400 ms; the mosaic moves, the words stay). Run when they change (needs Pillow), then js/make_brand.py.
  beyond-one-mark-frames.png    the mosaic's eleven frames one under the other (160 px squares): the pages step through them in CSS
  beyond-one-words-white.png    the words, still, white and black, as wide as they stand beside the mosaic
  beyond-one-words-black.png
  beyond-one-stacked-white.gif  the template's stacked logo with the moving mosaic, for the decks (PowerPoint plays GIFs)
  beyond-one-stacked-black.gif
  beyond-one-mark-navy.gif      the moving mosaic on navy, 60 px, for the dark header of the IVR Summary Daily Report email
The frame-0 mosaic is the logo's own shape, so a page that keeps still (reduced motion) shows the logo as printed."""
import os, sys
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__)); B = os.path.join(os.path.dirname(here), 'assets', 'brand')
P = lambda n: os.path.join(B, n)

def frames(name):
    im = Image.open(P(name)); out = []
    try:
        while True:
            out.append((im.convert('RGBA').copy(), im.info.get('duration', 400))); im.seek(im.tell() + 1)
    except EOFError:
        pass
    return out

def fit(im, w, h):   # resized with the colours premultiplied, so no dark fringe where a square meets the transparent ground
    return im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')

white, black = frames('beyond-one-white.gif'), frames('beyond-one-black.gif')
W, H = white[0][0].size
if len(white) != len(black) or (W, H) != black[0][0].size:
    sys.exit('the two logos should have the same frames')
M = H   # the mosaic is the square at the left; the words take the rest
durs = sorted({d for _, d in white})
if durs != [400]:
    print('note: frame durations', durs, '(the CSS steps every 400 ms)')

# the mosaic, frame by frame, one under the other
S = 160
sprite = Image.new('RGBA', (S, S * len(white)), (0, 0, 0, 0))
for i, (f, _) in enumerate(white):
    sprite.paste(fit(f.crop((0, 0, M, M)), S, S), (0, i * S))
sprite.save(P('beyond-one-mark-frames.png'), optimize=True)

# the words, still: from the first frame, beside the mosaic as in the logo
ww = round((W - M) * S / H)
for name, src in (('white', white), ('black', black)):
    fit(src[0][0].crop((M, 0, W, H)), ww, S).save(P(f'beyond-one-words-{name}.png'), optimize=True)

# the template's stacked logo (the mosaic above the words) with the moving mosaic, as GIFs for PowerPoint
def gif_frame(rgba):   # one transparent colour (index 255), as a GIF has
    alpha = rgba.getchannel('A'); p = rgba.convert('RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    p.paste(255, mask=alpha.point(lambda a: 255 if a < 128 else 0)); p.info['transparency'] = 255
    return p
for name in ('white', 'black'):
    base = Image.open(P(f'beyond-one-stacked-{name}.png')).convert('RGBA'); bw, bh = base.size
    words = base.crop((0, round(bh * 0.70), bw, bh))   # the words under the mosaic (rows 335 to 455 of 457)
    out = []
    for f, _ in white:
        c = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
        c.paste(fit(f.crop((0, 0, M, M)), bw, bw), (0, 0))
        c.alpha_composite(words, (0, round(bh * 0.70)))
        out.append(gif_frame(c))
    out[0].save(P(f'beyond-one-stacked-{name}.gif'), save_all=True, append_images=out[1:], duration=[d for _, d in white], loop=0, transparency=255, disposal=2, optimize=False)

# the moving mark on the dark header of the IVR Summary Daily Report email (60 px, shown at 30 px): the mosaic on the header's navy,
# so its edges stay clean in Outlook (a GIF has no soft edges on a transparent ground)
NAVY = (15, 23, 42, 255)   # #0F172A
mail = []
for f, _ in white:
    c = Image.new('RGBA', (60, 60), NAVY); c.alpha_composite(fit(f.crop((0, 0, M, M)), 60, 60))
    mail.append(c.convert('RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT))
mail[0].save(P('beyond-one-mark-navy.gif'), save_all=True, append_images=mail[1:], duration=[d for _, d in white], loop=0, optimize=False)

for n in ('beyond-one-mark-frames.png', 'beyond-one-words-white.png', 'beyond-one-words-black.png', 'beyond-one-stacked-white.gif', 'beyond-one-stacked-black.gif', 'beyond-one-mark-navy.gif'):
    im = Image.open(P(n)); print(f'{n}: {im.size[0]}x{im.size[1]}, {getattr(im, "n_frames", 1)} frame(s), {os.path.getsize(P(n)) // 1024} KB')
