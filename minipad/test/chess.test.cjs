// Checks the chess move generator against known perft counts.
// Run: node minipad/test/chess.test.cjs
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const MP = { define() {}, shuffle: (a) => a.slice() };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'apps', 'chess.js'), 'utf8'), { MP, window: {} });
const E = MP.chessEngine;

const cases = [
  // start position
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902, 197281]],
  // "Kiwipete": castling, en passant, promotions, pins
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  // en passant and discovered checks along the rank
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  // promotions and castling rights after rook captures
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]]
];

for (const [fen, counts] of cases) {
  const s = E.fromFEN(fen);
  counts.forEach((want, i) => {
    const got = E.perft(s, i + 1);
    assert.strictEqual(got, want, `perft(${i + 1}) for ${fen}: got ${got}, want ${want}`);
  });
  console.log('ok', fen.split(' ')[0]);
}

// The computer finds a mate in one.
const mate = E.fromFEN('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1');
const best = E.search(mate, 2, 0);
assert.strictEqual(best.f + '>' + best.t, '59>3', 'should play Rd8 mate');
console.log('ok mate in one');
