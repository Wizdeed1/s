#!/bin/bash
# The overview deck, told and drawn as the Showcase, with made-up data only, and the technical deck in the same look:
#   bash tools/deck/build.sh [workDir]   ->   final/Cadence - Overview.pptx, final/Cadence - Technical.pptx
# The Showcase is made again from the sources, its words and parts are taken from it (showcase_shots.cjs), and the deck is made
# from them (make_deck.cjs). Needs: Playwright with Chromium, and pptxgenjs (npm i pptxgenjs in workDir, or on NODE_PATH).
set -e
cd "$(dirname "$0")/../.."
W="${1:-/tmp/mc-deck}"; mkdir -p "$W"
[ -d "$W/node_modules/pptxgenjs" ] || (cd "$W" && npm init -y >/dev/null && npm install pptxgenjs@3.12.0 >/dev/null)
export NODE_PATH="$W/node_modules:$(npm root -g)"
node tools/showcase/make_showcase.cjs >/dev/null
node tools/deck/showcase_shots.cjs "final/Cadence - Showcase.html" "$W/sc"
node tools/deck/make_deck.cjs "$W/sc" "final/Cadence - Overview.pptx"
node tools/deck/make_tech.cjs "$W/sc" "final/Cadence - Technical.pptx"
