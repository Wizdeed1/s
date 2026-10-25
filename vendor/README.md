# Third-party code built into the page

The file is copied unchanged from its npm package (only the trailing `sourceMappingURL` comment is removed) and is
placed inline in the built HTML by `js/assemble_standalone.sh` and `js/assemble3.sh`, so the tool still runs offline with no
network request.

| File | Package | Version | Licence |
|---|---|---|---|
| `gsap.min.js` | [gsap](https://gsap.com) (GreenSock) | 3.15.0 | GreenSock's standard "no charge" licence, <https://gsap.com/standard-license>. Copyright (c) 2008-2026, GreenSock. The licence header stays at the top of the file. |

What the page uses it for (`js/motion.js`): the few things that move. A drawer or the More sheet swiped away on a phone
(from where the finger left it, at its speed), the dashboard's numbers counting up once a visit, and a progress bar growing
to a new value. Scrolling is the browser's own (Lenis, which made the wheel glide, was taken out with the Option A design:
Apple's guidelines leave motion out of things done many times a day). With reduced motion set in the system, none of it runs.

To update: `npm pack gsap@<version>`, copy `dist/gsap.min.js` here, read what changed, record the new file's SHA-256 below
(`sha256sum vendor/gsap.min.js`), and rebuild. `npm test` (test/supply.cjs) fails while the file and the line below differ, so
a changed library is always a deliberate, reviewed step.

SHA-256 of the reviewed `gsap.min.js`: `92bb9a96476f983d212a2bc4f54c889039c1696dd4461d40a736860938570fbb`
