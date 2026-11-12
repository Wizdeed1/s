# Look-and-fix review for Cadence screens

Adapted from MotionSites Web Builder's review rubric (MIT, see ../NOTICE) for the screens of an offline work tool.

You cannot judge a screen you have not seen. After every build, run:

```bash
node .claude/skills/cadence-look/scripts/shoot.cjs <page.html> <outDir>
```

Open the PNGs and look at them properly, as images:
- `desktop.png`
- `laptop.png`
- `phone.png`
- `early.png`
- `reduced.png`

Read the QA report too. Then score the screen against the rubric below. Score it as someone who will use it every working day, not as a visitor who sees it once.

## Fix immediately (blocking)
Any of these makes the screen fail, whatever else is good:
- **QA report problems:**
  - a console error;
  - any request that is not `file:`, `data:` or `blob:` (Cadence makes no network request);
  - a broken image.
- **Horizontal overflow** at 390 px.
- **A white flash** in `early.png` on a dark screen.
- **Unreadable text:**
  - under 4.5:1 contrast for body text, 3:1 for large text;
  - text over a busy part of a visual;
  - clipped numbers or names (test a long name).
- **Fonts:** the display font not loaded, or the H1 falling back to a system font.
- **Broken layout:**
  - overlapping elements;
  - the nav wrapping onto two lines;
  - the main action pushed below the first screen on a laptop.
- **Real data:** a real person's name, ID or email anywhere. Fake names only: first name + initial.
- **Filler copy:** "Lorem", "Feature 1", made-up product talk.

## Score 1–10 on each
1. **First glance.** In 3 seconds you know what this page is for and what to do next. One focal point, made with intent.
2. **Signature.** One memorable thing, ideally made from the tool's own data. The rest stays quiet.
3. **Typography.**
   - Display type is big, confident and tight.
   - UI text is calm, at 13–15 px.
   - Numbers use tabular figures.
   - At most 2 families.
4. **Composition and density.**
   - Generous space around the first panel.
   - Data areas can be dense, but aligned and scannable.
   - Equal radii and gutters everywhere.
5. **Colour and light.**
   - A small palette, with hierarchy from opacity.
   - Status colours (good / warn / bad) used only for status.
   - Both Light and Dark checked.
6. **Visuals.** The data visual or photo feels designed in (cropped, layered, protected behind text), not a box dropped in.
7. **Motion.**
   - One entrance per visit, done in 1.2 s or less.
   - Hovers 150–300 ms.
   - Nothing loops for attention.
   - Reduced motion shows the final state.
8. **Phone.**
   - Re-laid out, not just squeezed.
   - Tap targets 44 px or more.
   - The signature survives.
9. **Copy.** The tool's plain words: specific, short, with verbs on buttons, and the real names of the steps and files.
10. **Polish.**
    - Focus rings, hover and pressed states.
    - Empty, loading and error states.
    - No layout shift.
    - The title and icon are right.

**The bar is an average of 8 or more, with no score under 7.**

## Fix loop
1. Write down the three weakest scores and, for each, the exact change, with values. For example:
   - "H1 from 48 px to clamp(40px, 5.2vw, 76px), tracking −0.01em";
   - "a 55% #111 gradient over the left 45% of the hero".
2. Make the changes, shoot again and look again.
3. Repeat for up to 3 rounds. Tell the user plainly what would lift the screen further, for example a real photo of the team's floor.
