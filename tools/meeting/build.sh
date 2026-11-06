#!/bin/bash
# The meeting kit from the current build, with made-up data only:
#   bash tools/meeting/build.sh   ->   final/Meeting kit/
# Needs: Playwright with Chromium, ffmpeg (for the video), Python 3.
set -e
cd "$(dirname "$0")/../.."
K="final/Meeting kit"; T="$(mktemp -d)"
export NODE_PATH="$(npm root -g)"
npm run build >/dev/null
mkdir -p "$K"
python3 tools/meeting/make_demo.py out/mc.html "$K/05 Cadence - Demo.html"
node test/exports.cjs "$T/exports" >/dev/null
D="$K/06 Live drop pack (made-up, Sep 2026)"; mkdir -p "$D"
for f in "Monthly Adherence - Sep.csv" "Agents Performance Summary.csv" "Schedule activities.csv" "Agent Status Timeline Details.csv"; do cp "$T/exports/$f" "$D/$f"; done
printf 'The four Genesys exports of September 2026, made up (no real person).\r\nIn the demo file (05): WFM team > Import, drag all four in at once.\r\nPress F5 in the demo afterwards to start clean.\r\n' > "$D/Read me.txt"
node tools/meeting/make_video.cjs out/mc.html "$T/exports" "$K/09 Backup demo video.mp4"
node tools/meeting/make_kit.cjs "$K"
ls -la "$K"
