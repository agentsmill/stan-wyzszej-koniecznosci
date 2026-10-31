'use strict';
/* Siatka izometryczna 2:1. Kafel 64×32. Punkt (gx, gy) to ŚRODEK kafla. */
const ISO = {
  TW: 64, TH: 32, HW: 32, HH: 16,
  COLS: 20, ROWS: 20,
  originX: 640, originY: 118,
  toScreen(gx, gy) {
    return { x: ISO.originX + (gx - gy) * ISO.HW, y: ISO.originY + (gx + gy) * ISO.HH };
  },
  toGrid(sx, sy) {
    const dx = (sx - ISO.originX) / ISO.HW, dy = (sy - ISO.originY) / ISO.HH;
    return { gx: (dx + dy) / 2, gy: (dy - dx) / 2 };
  },
  inBounds(gx, gy) { return gx >= 0 && gy >= 0 && gx < ISO.COLS && gy < ISO.ROWS; },
  dist(a, b) { const dx = a.gx - b.gx, dy = a.gy - b.gy; return Math.hypot(dx, dy); },
  /* kierunek sprite'a (8) z wektora ruchu w PRZESTRZENI SIATKI */
  dirFromDelta(dgx, dgy) {
    // przelicz na ekran: ruch +gx = ekranowo w prawo-dół (SE), +gy = lewo-dół (SW)
    const sx = dgx - dgy, sy = (dgx + dgy) * 0.5;
    const a = Math.atan2(sy, sx); // 0 = wschód (prawo), +pi/2 = południe (dół)
    const names = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
    let i = Math.round(a / (Math.PI / 4)); if (i < 0) i += 8; return names[i % 8];
  },
};
const DIRS8 = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
const MIRROR = { 'south-east': 'south-west', 'south-west': 'south-east', 'north-east': 'north-west', 'north-west': 'north-east', 'east': 'west', 'west': 'east' };
const NEAREST_CARDINAL = { 'south-east': 'south', 'south-west': 'south', 'north-east': 'north', 'north-west': 'north', 'east': 'east', 'west': 'west', 'north': 'north', 'south': 'south' };
