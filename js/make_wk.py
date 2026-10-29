"""The Weekly Commercial Presentation's design, built into the page: wk/deck-template.pptx (made by tools/weekly/make_template.py,
no week's numbers in it) as one script block the Weekly tab reads when it makes the deck (js/weekly.js, wkTemplate)."""
import base64, os, sys

here = os.path.dirname(os.path.abspath(__file__))
data = open(os.path.join(here, '..', 'wk', 'deck-template.pptx'), 'rb').read()
assert data[:2] == b'PK', 'wk/deck-template.pptx is not a .pptx'
sys.stdout.write('<script id="wk-tpl" type="text/plain">' + base64.b64encode(data).decode('ascii') + '</script>\n')
