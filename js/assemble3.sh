#!/bin/bash
set -e
OUT=$1
python3 make_head.py
{ cat ui3_head.html; cat ui3_body.html; python3 make_rb.py; cat rb_src.html; cat brand_src.html;
  echo '<script id="engine-src">'; cat core.js; echo; cat recog_core.js; echo '</script>';
  echo '<script>'; cat writer2.js; echo; cat glue.js; echo; cat attendance.js; echo; cat history.js; echo; cat kpi.js; echo; cat writer_inc.js; echo; cat forms.js; echo; cat recon.js; echo '</script>';
  echo '<script id="vendor-motion">'; cat ../vendor/gsap.min.js; echo; cat ../vendor/lenis.min.js; echo; echo '</script>';
  echo '<script>'; python3 combine.py; echo '</script>'; echo '<i id="mcEnd" hidden></i>'; } > "$OUT"
