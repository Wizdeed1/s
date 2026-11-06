#!/bin/bash
set -e
OUT=$1
python3 make_head.py
{ cat ui3_head.html; cat ui3_body.html; python3 make_rb.py; cat rb_src.html; cat brand_src.html;
  echo '<script id="engine-src">'; cat core.js; echo; cat recog_core.js; echo '</script>';
  echo '<script>'; cat writer2.js; echo; cat atttpl.js; echo; cat glue.js; echo; cat attendance.js; echo; cat history.js; echo; cat kpi.js; echo; cat writer_inc.js; echo; cat forms.js; echo; cat recon.js; echo; cat bologos.js; echo; cat pptx.js; echo; cat bodeck.js; echo; cat wcdeck.js; echo; cat updparse.js; echo; cat prdeck.js; echo '</script>';
  echo '<script id="vendor-motion">'; cat ../vendor/gsap.min.js; echo; echo '</script>';
  # the Showcase's line figures (vendor/hairline.js, an ES module): wrapped as one script that gives Hairline its 33 figures
  echo '<script id="vendor-figures">'; echo '/*! @lucasmarkes/hairline 0.5.1 | MIT License | Copyright (c) 2026 Lucas Marques */'; echo "const Hairline = (() => { 'use strict';"; sed 's/^export {$/return {/' ../vendor/hairline.js; echo '})();'; echo '</script>';
  echo '<script>'; python3 combine.py; echo '</script>'; echo '<i id="mcEnd" hidden></i>'; } > "$OUT"
