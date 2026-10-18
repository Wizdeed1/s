# Third-party code built into the page

Both files are copied unchanged from their npm packages (only the trailing `sourceMappingURL` comment is removed) and are
placed inline in the built HTML by `js/assemble_standalone.sh` and `js/assemble3.sh`, so the tool still runs offline with no
network request.

| File | Package | Version | Licence |
|---|---|---|---|
| `gsap.min.js` | [gsap](https://gsap.com) (GreenSock) | 3.15.0 | GreenSock's standard "no charge" licence, <https://gsap.com/standard-license>. Copyright (c) 2008-2026, GreenSock. The licence header stays at the top of the file. |
| `lenis.min.js` | [lenis](https://github.com/darkroomengineering/lenis) (darkroom.engineering) | 1.3.27 | MIT, see `LICENSE-lenis.txt` |

What the page uses them for (`js/motion.js`): Lenis makes wheel scrolling glide on the page (touch scrolling stays native, and
tables, drawers, menus and lists keep their own scroll); GSAP animates the few things that move: a drawer or the More sheet
swiped away on a phone (from where the finger left it), the dashboard's numbers counting up once a visit. With reduced motion
set in the system, neither runs.

To update: `npm pack gsap@<version> lenis@<version>`, copy `dist/gsap.min.js` and `dist/lenis.min.js` here, and rebuild.
