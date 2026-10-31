'use strict';
/* ============================================================
   MAPA: teren, przeszkody, bramy, drzwi, pola przepływu.
   Oś gx = ekranowo w prawo-dół, oś gy = ekranowo w lewo-dół.
   ============================================================ */
const MAP = {
  terrain: [],   // [gy][gx] -> 'A' asfalt, 'S' chodnik, 'C' bruk, 'G' trawa, 'X' pasy, 'M' marmur, 'B' budynek, 'H' żywopłot
  solid: [],     // [gy][gx] -> true gdy nieprzechodnie na stałe (budynek, płot, żywopłot)
  towerAt: [],   // [gy][gx] -> Tower | null
  gates: {},     // key -> {gx, gy, locked, hp, maxHp, approach:{gx,gy}, inner:{gx,gy}}
  doors: {},     // 'main' / 'side' -> {gx, gy}
  spawns: [],    // punkty wejścia jednostek z zewnątrz
  citizenSpawn: null,
  statics: [],   // dekoracje: {img, gx, gy, ox, oy, flip, depthBias}
  building: null,
  fields: {},    // 'main' | 'side' | 'gate' -> dist[gy][gx]
  fieldsDirty: true,
  courtyard: (gx, gy) => gx >= 6 && gx <= 18 && gy >= 0 && gy <= 10,

  build() {
    const T = [], S = [], TW = [];
    for (let gy = 0; gy < ISO.ROWS; gy++) {
      T.push([]); S.push([]); TW.push([]);
      for (let gx = 0; gx < ISO.COLS; gx++) {
        let t = 'G';
        if (gx >= 2 && gx <= 4) t = 'A';                   // ulica zachodnia
        if (gx === 1 || gx === 5) t = 'S';
        if (gy >= 12 && gy <= 14) t = 'A';                 // al. Szucha (południe)
        if (gy === 11 || gy === 15) t = 'S';
        if (gy >= 12 && gy <= 14 && gx === 12) t = 'X';    // pasy przed furtką
        if (gx >= 2 && gx <= 4 && gy === 5) t = 'X';       // pasy przed bramą
        if (gx >= 2 && gx <= 4 && gy >= 12 && gy <= 14) t = 'A';
        if (gx >= 1 && gx <= 5 && gy >= 11 && gy <= 15) t = (gy >= 12 && gy <= 14 && gx >= 2 && gx <= 4) ? 'A' : (t === 'X' ? 'X' : 'S');
        if (gx >= 2 && gx <= 4 && gy >= 11 && gy <= 15) t = 'A';
        if (MAP.courtyard(gx, gy)) t = 'C';                // dziedziniec
        if (gx >= 16 && gy <= 3 && MAP.courtyard(gx, gy)) t = 'G';
        if (gx <= 8 && gy <= 2 && MAP.courtyard(gx, gy)) t = 'G';
        if ((gy === 0 || (gy === 1 && gx >= 9 && gx <= 16)) && MAP.courtyard(gx, gy)) t = 'H'; // żywopłot za budynkiem
        if (gx >= 10 && gx <= 15 && gy >= 2 && gy <= 4) t = 'B'; // gmach TK (6×3)
        if (gy === 5 && gx >= 10 && gx <= 13) t = 'M';     // schody portyku
        if (gx === 16 && gy >= 3 && gy <= 4) t = 'M';      // przy bocznym wejściu
        T[gy].push(t);
        S[gy].push(t === 'B' || t === 'H');
        TW[gy].push(null);
      }
    }
    this.terrain = T; this.solid = S; this.towerAt = TW;

    // ogrodzenie: wzdłuż gy=10 (gx 6..18) i gx=6 (gy 1..10); narożniki
    this.fenceCells = [];
    for (let gx = 6; gx <= 18; gx++) this.fenceCells.push({ gx, gy: 10, along: 'gx' });
    for (let gy = 1; gy <= 9; gy++) this.fenceCells.push({ gx: 6, gy, along: 'gy' });
    for (let gy = 1; gy <= 9; gy++) this.fenceCells.push({ gx: 18, gy, along: 'gy' });
    for (const c of this.fenceCells) S[c.gy][c.gx] = true;

    // bramy — furtka (południe, zamknięta, da się przeciąć) i brama (zachód, otwarta)
    this.gates = {
      furtka: { gx: 12, gy: 10, locked: true, hp: 220, maxHp: 220, approach: { gx: 12, gy: 11 }, inner: { gx: 12, gy: 9 }, along: 'gx', name: 'furtka' },
      brama:  { gx: 6, gy: 5, locked: false, hp: 400, maxHp: 400, approach: { gx: 5, gy: 5 }, inner: { gx: 7, gy: 5 }, along: 'gy', name: 'brama' },
    };
    for (const g of Object.values(this.gates)) S[g.gy][g.gx] = false; // bramy obsługujemy osobno
    this.fenceCells = this.fenceCells.filter(c => !(c.gx === 12 && c.gy === 10) && !(c.gx === 6 && c.gy === 5));

    this.doors = { main: { gx: 13, gy: 5 }, side: { gx: 16, gy: 3 } };
    this.balcony = { gx: 12, gy: 4.6, dy: -74 };
    this.spawns = [
      { gx: 19, gy: 13, name: 'wschód' },
      { gx: 0,  gy: 13, name: 'zachód' },
      { gx: 3,  gy: 19, name: 'południe' },
    ];
    // ulica zachodnia kończy się na gy=15; wydłuż do krawędzi
    for (let gy = 16; gy < ISO.ROWS; gy++) { for (let gx = 2; gx <= 4; gx++) T[gy][gx] = 'A'; T[gy][1] = 'S'; T[gy][5] = 'S'; }
    this.citizenSpawn = { gx: 0, gy: 11 };

    // dekoracje
    this.statics = [];
    const add = (img, gx, gy, ox = 0, oy = 0, flip = false, bias = 0) => this.statics.push({ img, gx, gy, ox, oy, flip, bias });
    for (const c of this.fenceCells) add('fence', c.gx, c.gy, 0, 0, c.along === 'gx');
    add('lamp', 7, 11.2, 0, 0);  add('lamp', 17, 11.2, 0, 0); add('lamp', 5.2, 1.5, 0, 0); add('lamp', 5.2, 9, 0, 0);
    add('tree', 17.2, 1.2, 0, 0); add('tree', 7.3, 1.3, 0, 0); add('tree', 18.5, 15.5, 0, 0); add('tree', 8, 16.5, 0, 0); add('tree', 15, 17, 0, 0);
    add('policecar', 8.5, 13.5, 0, 0);   // radiowóz na Szucha
    add('tvvan', 16, 13.6, 0, 0, true);  // wóz transmisyjny
    this.building = { img: 'building', gx: 15, gy: 4, ax: 260, ay: 283 }; // punkt (ax,ay) obrazu = dolny róg kafla (gx,gy)
    this.fieldsDirty = true;
  },

  isWalkable(gx, gy, forCitizen = false) {
    if (!ISO.inBounds(gx, gy)) return false;
    if (this.solid[gy][gx]) return false;
    const g = this.gateAt(gx, gy); if (g && g.locked) return false;
    return true;
  },
  gateAt(gx, gy) { for (const g of Object.values(this.gates)) if (g.gx === gx && g.gy === gy) return g; return null; },
  tower(gx, gy) { return ISO.inBounds(gx, gy) ? this.towerAt[gy][gx] : null; },
  canBuild(gx, gy, def) {
    if (!ISO.inBounds(gx, gy)) return false;
    if (!this.courtyard(gx, gy) && !(this.terrain[gy][gx] === 'S' && gy === 11)) return false; // dziedziniec + chodnik przed furtką
    if (this.solid[gy][gx] || this.towerAt[gy][gx] || this.gateAt(gx, gy)) return false;
    const t = this.terrain[gy][gx]; if (t === 'B' || t === 'H') return false;
    if ((gx === this.doors.main.gx && gy === this.doors.main.gy) || (gx === this.doors.side.gx && gy === this.doors.side.gy)) return false;
    if (def.nearDoor) {
      const d = Math.min(ISO.dist({ gx, gy }, this.doors.main), ISO.dist({ gx, gy }, this.doors.side));
      if (d > def.nearDoor) return false;
    }
    return true;
  },

  /* ---------- pola przepływu (Dijkstra, 4 sąsiedztwo) ---------- */
  computeField(targets, opts = {}) {
    const INF = 1e9, N = ISO.COLS, Mz = ISO.ROWS;
    const dist = []; for (let y = 0; y < Mz; y++) dist.push(new Array(N).fill(INF));
    const open = [];
    for (const t of targets) { if (ISO.inBounds(t.gx, t.gy)) { dist[t.gy][t.gx] = 0; open.push([0, t.gx, t.gy]); } }
    const towerCost = opts.towerCost ?? 30;
    while (open.length) {
      // prosty wybór minimum (siatka mała)
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [d, x, y] = open.splice(bi, 1)[0];
      if (d > dist[y][x]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!this.isWalkable(nx, ny)) continue;
        let c = 1;
        const tw = this.towerAt[ny][nx]; if (tw) { if (towerCost >= 1e5) continue; c += towerCost; }
        if (this.terrain[ny][nx] === 'G') c += 0.6;
        const nd = d + c;
        if (nd < dist[ny][nx]) { dist[ny][nx] = nd; open.push([nd, nx, ny]); }
      }
    }
    return dist;
  },
  rebuildFields() {
    this.fields.main = this.computeField([this.doors.main]);
    this.fields.side = this.computeField([this.doors.side], { towerCost: 4 });
    this.fields.gate = this.computeField(Object.values(this.gates).filter(g => g.locked).flatMap(g => g.along === 'gx'
      ? [g.approach, { gx: g.approach.gx - 1, gy: g.approach.gy }, { gx: g.approach.gx + 1, gy: g.approach.gy }]
      : [g.approach, { gx: g.approach.gx, gy: g.approach.gy - 1 }, { gx: g.approach.gx, gy: g.approach.gy + 1 }]));
    this.fields.citizen = this.computeField([this.doors.main], { towerCost: 1e6 });
    this.fieldsDirty = false;
  },
  /* następny krok wg pola; zwraca {gx, gy} lub null */
  nextStep(field, gx, gy) {
    const d = field[gy]?.[gx]; if (d === undefined || d >= 1e9 || d === 0) return null;
    let best = null, bd = d;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = gx + dx, ny = gy + dy; if (!ISO.inBounds(nx, ny)) continue;
      const nd = field[ny][nx]; if (nd < bd) { bd = nd; best = { gx: nx, gy: ny }; }
    }
    return best;
  },

  /* ---------- rysowanie terenu ---------- */
  drawTerrain(ctx, tiles) {
    for (let s = 0; s < ISO.COLS + ISO.ROWS - 1; s++) {
      for (let gx = 0; gx < ISO.COLS; gx++) {
        const gy = s - gx; if (gy < 0 || gy >= ISO.ROWS) continue;
        const t = this.terrain[gy][gx];
        if (t === 'B') continue;
        const p = ISO.toScreen(gx, gy);
        const img = tiles[t];
        if (img) ctx.drawImage(img, Math.round(p.x - img.width / 2), Math.round(p.y - ISO.HH), img.width, img.height);
        else { // fallback: romb kolorem
          ctx.fillStyle = TILE_COLORS[t] || '#333';
          ctx.beginPath(); ctx.moveTo(p.x, p.y - ISO.HH); ctx.lineTo(p.x + ISO.HW, p.y); ctx.lineTo(p.x, p.y + ISO.HH); ctx.lineTo(p.x - ISO.HW, p.y); ctx.closePath(); ctx.fill();
          if (t === 'X') { ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(p.x + i * 10 - 2, p.y - 6 + i * 5); ctx.lineTo(p.x + i * 10 + 4, p.y - 8 + i * 5); ctx.lineTo(p.x + i * 10 + 4 + 14, p.y - 1 + i * 5); ctx.lineTo(p.x + i * 10 - 2 + 14, p.y + 1 + i * 5); ctx.fill(); } }
        }
      }
    }
  },
};
const TILE_COLORS = { A: '#1d1f2a', S: '#3a3b47', C: '#4a4651', G: '#1f3322', X: '#1d1f2a', M: '#8a8470', H: '#172618' };
