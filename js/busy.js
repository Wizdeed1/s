// ================================================================ STILL READING: a pill at the top of every page while the tool reads
// After the sign-in the shared data takes a while on a slow folder (each file is opened and unlocked); the month's saved files are put
// back in Build; dropped files are read. Until each is done the pill says so, with what it reads and how far it is, so nobody takes a
// page that is still filling for an empty one. It shows only for what takes longer than half a second.
const Busy = (() => {
  const jobs = new Map(), ORDER = ['restore', 'parse', 'data'];
  let shown = false, showT = 0, hideT = 0;
  function paint() {
    const el = $('busy'); if (!el) return;
    const key = ORDER.find(k => jobs.has(k)) || [...jobs.keys()][0];
    if (key) {
      $('busyMsg').textContent = jobs.get(key);
      clearTimeout(hideT); hideT = 0;
      if (!shown && !showT) showT = setTimeout(() => { showT = 0; if (jobs.size) { el.hidden = false; shown = true; } }, 500);
    } else {
      clearTimeout(showT); showT = 0;
      if (shown && !hideT) hideT = setTimeout(() => { hideT = 0; if (!jobs.size) { el.hidden = true; shown = false; } }, 350);
    }
  }
  return {
    /** id: 'data' | 'restore' | 'parse'; text: what is read now, or '' when it is done */
    set(id, text) { const was = jobs.has(id); if (text) jobs.set(id, text); else jobs.delete(id); paint(); if (was && !text && id !== 'parse') setTimeout(() => { if (state.ws !== 'build') renderWs(); else render(); }, 0); },
    has: id => jobs.has(id),
  };
})();
/** the months, the roster and the rest are still coming in (the empty states say so instead of "nothing yet") */
const stillReading = () => Busy.has('data') || Busy.has('restore');
/** after the sign-in: the shared data's first read, with how many files are open so far; done once every collection asked for is in
    and ready() says the page has what it waited for. Returns poke(): look again (call it when ready() may have changed) */
function busyWatch(db, ready) {
  if (!db || typeof db.onBusy !== 'function') return () => {};
  let off = null, done = false, timer = 0, last = { open: 1, read: 0 };
  const check = b => {
    if (done) return; if (b) last = b;
    Busy.set('data', `Reading the shared data…${last.read ? ` ${plural(last.read, 'file')}` : ''}`);
    clearTimeout(timer);
    if (!last.open && ready()) timer = setTimeout(() => { if (last.open || !ready()) return; done = true; if (off) off(); Busy.set('data', ''); }, 600);
  };
  off = db.onBusy(check);
  return () => check();
}
