#!/bin/bash
# Standalone HTML file (for sharing): full document with doctype and UTF-8 charset.
set -e
OUT=$1
python3 make_head.py
{ echo '<!doctype html>'; echo '<html lang="en">'; echo '<head>'; echo '<meta charset="utf-8">'; echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
  cat ui3_head.html; echo '</head>'; echo '<body>'; cat ui3_body.html; python3 make_rb.py; cat rb_src.html; cat brand_src.html;
  echo '<script id="engine-src">'; cat core.js; echo; cat recog_core.js; echo '</script>';
  echo '<script>'; cat writer2.js; echo; cat glue.js; echo; cat attendance.js; echo; cat history.js; echo; cat kpi.js; echo; cat writer_inc.js; echo; cat forms.js; echo; cat recon.js; echo '</script>';
  echo '<script id="vendor-motion">'; cat ../vendor/gsap.min.js; echo; echo '</script>';
  echo '<script>'; python3 combine.py; echo '</script>'; echo '<i id="mcEnd" hidden></i>'; echo '</body>'; echo '</html>'; } > "$OUT"
