// Writes the offline file list and a content-based version into sw.js,
// so every change to the app reaches the iPad on its next visit.
// Run: node minipad/test/stamp.cjs
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const files = ['index.html', 'manifest.json', 'css/app.css', 'js/core.js', 'vendor/NoSleep.min.js']
  .concat(fs.readdirSync(path.join(ROOT, 'apps')).filter((f) => f.endsWith('.js')).sort().map((f) => 'apps/' + f))
  .concat(fs.readdirSync(path.join(ROOT, 'icons')).filter((f) => f.endsWith('.png')).sort().map((f) => 'icons/' + f));

const hash = crypto.createHash('sha256');
for (const f of files) hash.update(f).update(fs.readFileSync(path.join(ROOT, f)));
const version = 'minipad-' + hash.digest('hex').slice(0, 10);

const swPath = path.join(ROOT, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/var VERSION = '[^']*';/, `var VERSION = '${version}';`);
sw = sw.replace(/var ASSETS = \[[\s\S]*?\];/, 'var ASSETS = [\n  ' + ['./'].concat(files).map((f) => `'${f}'`).join(',\n  ') + '\n];');
fs.writeFileSync(swPath, sw);
console.log(`sw.js: ${version}, ${files.length + 1} files`);
