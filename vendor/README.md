# Third-party code built into the page

Each file is copied unchanged from its npm package (only the trailing `sourceMappingURL` comment is removed) and is
placed inline in the built HTML by `js/assemble_standalone.sh` and `js/assemble3.sh`, so the tool still runs offline with no
network request.

| File | Package | Version | Licence |
|---|---|---|---|
| `gsap.min.js` | [gsap](https://gsap.com) (GreenSock) | 3.15.0 | GreenSock's standard "no charge" licence, <https://gsap.com/standard-license>. Copyright (c) 2008-2026, GreenSock. The licence header stays at the top of the file. |
| `hairline.js` | [@lucasmarkes/hairline](https://www.npmjs.com/package/@lucasmarkes/hairline) | 0.5.1 | MIT, Copyright (c) 2026 Lucas Marques (`hairline-LICENSE.txt`). The build wraps the ES module as one script (`export {` becomes `return {` inside a function) and puts the copyright line above it. |

What the page uses it for (`js/motion.js`): the few things that move. A drawer or the More sheet swiped away on a phone
(from where the finger left it, at its speed), the dashboard's numbers counting up once a visit, and a progress bar growing
to a new value. Scrolling is the browser's own (Lenis, which made the wheel glide, was taken out with the Option A design:
Apple's guidelines leave motion out of things done many times a day). With reduced motion set in the system, none of it runs.

To update: `npm pack gsap@<version>`, copy `dist/gsap.min.js` here, read what changed, record the new file's SHA-256 below
(`sha256sum vendor/gsap.min.js`), and rebuild. `npm test` (test/supply.cjs) fails while the file and the line below differ, so
a changed library is always a deliberate, reviewed step.

SHA-256 of the reviewed `gsap.min.js`: `92bb9a96476f983d212a2bc4f54c889039c1696dd4461d40a736860938570fbb`

What the page uses hairline for (`js/showcase.js`): the line figures on the admin's Showcase page (an app in layers, sieves for
the checks, lines snapping square for the build, a relay for the emails, a hub for the roles, a vault for privacy). They are
drawn only while the Showcase is open, answer the pointer, and stand still with reduced motion. It makes no network request.

SHA-256 of the reviewed `hairline.js`: `da37558a80f012f9b962f0a85748291b9129f0292721c9fda26e9a9d5cee83f9`
