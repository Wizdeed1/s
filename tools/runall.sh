#!/bin/bash
# Every browser suite against one page, four at a time; a summary line per suite (exit code, passes, failures), then the count.
# Usage: bash tools/runall.sh [page.html] [workDir]
#   page.html  the built page (default out/mc.html; a path from the repository's folder, or a full path)
#   workDir    where the made-up exports, the screenshots and the logs go (default: a new temporary folder)
# The exports are made up by test/exports.cjs; nothing here uses real data. Exit code 0 when every suite passes.
# A suite that ends with "Target page, context or browser has been closed" and no failed check is the browser dying, not the
# page: some Chromium builds stop (SIGTRAP) when a page that keeps a data folder is opened a second time (datafolder, folder, trust).
cd "$(dirname "$0")/.." || exit 2
case "${1:-out/mc.html}" in /*) PAGE="$1" ;; *) PAGE="$(pwd)/${1:-out/mc.html}" ;; esac; [ -f "$PAGE" ] || { echo "no page at $PAGE (npm run build first)"; exit 2; }
WORK="${2:-$(mktemp -d)}"; EX="$WORK/exports"; OUT="$WORK/shots"; LOG="$WORK/logs"; mkdir -p "$EX" "$OUT" "$LOG"; rm -f "$LOG"/*.log
DEMO="final/Meeting kit/05 Cadence - Demo.html"; DROP="final/Meeting kit/06 Live drop pack (made-up, Sep 2026)"
node test/exports.cjs "$EX" > "$LOG/_exports.txt" 2>&1 || { echo "the made-up exports could not be written (see $LOG/_exports.txt)"; exit 2; }
cat > "$WORK/suites.txt" <<EOF
shots|$PAGE|$OUT
buildflow|$PAGE|$EX|$OUT
overlays|$PAGE|$OUT
motion|$PAGE|$OUT
quality|$PAGE|$OUT
signin|$PAGE|$OUT
agent|$PAGE|$OUT
recon|$PAGE|$OUT
recog|$PAGE|$EX|$OUT
caps|$PAGE
theme|$PAGE|$OUT
wfmteam|$PAGE|$OUT
uploads|$PAGE|$EX|$OUT
folder|$PAGE|$EX|$OUT
accounts|$PAGE|$OUT
nosched|$PAGE|$EX|$OUT
peek|$PAGE|$OUT
rounding|$PAGE|$OUT|$EX
attflow|$PAGE|$EX|$OUT
datafolder|$PAGE|$OUT
xss|$PAGE|$OUT
trust|$PAGE|$OUT
tenure|$PAGE|$OUT
depts|$PAGE|$OUT|$EX
dailyhist|$PAGE|$OUT
rb158|$PAGE|$OUT
mailboard|$PAGE|$OUT
incedits|$PAGE|$EX|$OUT
incmail|$PAGE|$OUT|$EX
steps|$PAGE|$OUT
ctflow|$PAGE|$EX|$OUT
smartlink|$PAGE|$EX|$OUT
absgrid|$PAGE|$OUT
weekly|$PAGE|$OUT
attupd|$PAGE|$OUT
dedcycle|$PAGE|$OUT
perfrev|$PAGE|$OUT
viewas|$PAGE|$OUT
ux|$PAGE|$OUT|$EX
glass|$PAGE|$OUT
meeting|$DEMO|$DROP|$OUT
EOF
run_one() {
  IFS='|' read -r name a b c <<< "$1"
  [ -f "test/$name.cjs" ] || { printf '%-11s skipped (no test/%s.cjs)\n' "$name" "$name"; return 0; }
  local log="$LOG/$name.log"
  if [ -n "$c" ]; then timeout 900 node "test/$name.cjs" "$a" "$b" "$c" > "$log" 2>&1; elif [ -n "$b" ]; then timeout 900 node "test/$name.cjs" "$a" "$b" > "$log" 2>&1; else timeout 900 node "test/$name.cjs" "$a" > "$log" 2>&1; fi
  local code=$?
  printf '%-11s exit %-3s pass %-4s fail %s\n' "$name" "$code" "$(grep -c '^ *✓' "$log")" "$(grep -c '^ *✗' "$log")"
  return $code
}
export -f run_one; export LOG
xargs -a "$WORK/suites.txt" -d '\n' -P 4 -I{} bash -c 'run_one "$1"' _ {} | tee "$LOG/_summary.txt"
BAD=$(grep -vc 'exit 0 \|skipped' "$LOG/_summary.txt")
echo "$(grep -c 'exit 0 ' "$LOG/_summary.txt") suites passed, $BAD failed · logs in $LOG"
[ "$BAD" -eq 0 ]
