// Supply chain and no-network checks that need only Node (npm test): the vendored GSAP is the reviewed file (its SHA-256 is in
// vendor/README.md), nothing comes from npm at run time, the CI workflow's token can only read, and the built page names no web
// address it could load (only XML namespaces and licence links) with the no-network rule as the first script in its head.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
let bad = 0, n = 0; const ok = (c, m) => { n++; if (!c) bad++; console.log((c ? 'ok ' : 'NOT OK ') + m); };
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const want = (read('vendor/README.md').match(/SHA-256 of the reviewed `gsap\.min\.js`: `([0-9a-f]{64})`/) || [])[1];
const got = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'vendor/gsap.min.js'))).digest('hex');
ok(want && got === want, `vendor/gsap.min.js is the reviewed file (SHA-256 ${got.slice(0, 16)}…${want ? '' : ', none recorded in vendor/README.md'})`);
const pkg = JSON.parse(read('package.json'));
ok(!pkg.dependencies && !pkg.devDependencies && !pkg.optionalDependencies, 'nothing is installed from npm: the page carries all of its code');
ok(/^permissions:\s*\n\s+contents:\s*read\s*$/m.test(read('.github/workflows/node.js.yml')), "the CI workflow's token can only read the repository");
const page = path.join(root, 'out/mc.html');
if (fs.existsSync(page)) {
  const html = fs.readFileSync(page, 'utf8');
  const KNOWN = /^https?:\/\/(www\.w3\.org\/|schemas\.openxmlformats\.org\/|gsap\.com\b|github\.com\/vercel\/geist-font\b)/;   // namespaces and licence links: never loaded
  const urls = [...new Set(html.match(/https?:\/\/[^\s"'`<>)\\]+/g) || [])], odd = urls.filter(u => !KNOWN.test(u));
  ok(!odd.length, `the page names no web address to load (${urls.length} namespace and licence links${odd.length ? '; not expected: ' + odd.slice(0, 5).join(', ') : ''})`);
  const head = html.slice(0, html.indexOf('</head>')), first = head.indexOf('<script');
  ok(first > 0 && head.startsWith('<script id="cspBoot">', first) && head.includes(`m.content = "default-src 'unsafe-inline' data: blob:; form-action 'none'; base-uri 'none'"`), 'the no-network rule is the first script in the head');
} else console.log('skip: out/mc.html is not built (npm run build), so the page itself was not checked');
console.log(bad ? `${bad} of ${n} checks failed` : `${n} checks passed`);
process.exit(bad ? 1 : 0);
