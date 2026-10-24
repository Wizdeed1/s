#!/bin/bash
# The stakeholder deck from the current build, with synthetic data only:
#   bash tools/deck/build.sh [workDir]   ->   final/MC Monthly Report Builder - Overview.pptx
# Needs: Playwright with Chromium, LibreOffice (soffice) and pdftoppm, and pptxgenjs (npm i pptxgenjs in workDir, or on NODE_PATH).
set -e
cd "$(dirname "$0")/../.."
W="${1:-/tmp/mc-deck}"; mkdir -p "$W"
[ -d "$W/node_modules/pptxgenjs" ] || (cd "$W" && npm init -y >/dev/null && npm install pptxgenjs@3.12.0 >/dev/null)
export NODE_PATH="$W/node_modules:$(npm root -g)"
npm run build >/dev/null
node test/exports.cjs "$W/exports" >/dev/null
node tools/deck/shots.cjs out/mc.html "$W/exports" "$W/shots"
node tools/deck/docs.cjs "$W/docs"
(cd "$W/docs" && rm -f form-*.png xlsx-*.png template.pdf && pdftoppm -r 130 -png form.pdf form \
  && soffice -env:UserInstallation="file://$W/lo" --headless --convert-to pdf --outdir "$W/docs" template.xlsx >/dev/null 2>&1 \
  && pdftoppm -r 130 -f 1 -l 1 -png template.pdf xlsx)
python3 -I -c "import sys; from PIL import Image; im = Image.open(sys.argv[1]); w, h = im.size; im.crop((40, 60, w - 40, int(h * .93))).save(sys.argv[2])" "$W/docs/xlsx-01.png" "$W/docs/xlsx-crop.png"
node tools/deck/art.cjs "$W/shots" "$W/art" "$W/docs/form-1.png" "$W/docs/xlsx-crop.png"
node tools/deck/make_deck.cjs "$W/art" "final/MC Monthly Report Builder - Overview.pptx"
