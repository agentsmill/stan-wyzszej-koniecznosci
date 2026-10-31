'use strict';
/* ============================================================
   GRA: stan, pętla, ekonomia, licznik POLSKA, wejście, render.
   ============================================================ */
const GAME = {
  canvas: null, ctx: null, lm: null, lmx: null,
  state: 'loading', side: null, time: 0, gameMin: CFG.GAME_START_MIN, polska: CFG.POLSKA_START,
  money: { inside: 0, outside: 0 }, units: [], towers: [], projectiles: [], fx: [], clash: 0,
  stats: null, bossUsed: {}, premierActive: false, premierUntil: 0, policeStateUntil: 0, freezeUntil: 0,
  selected: null, selectedSpawn: 1, hover: null, timelineIdx: 0, breaches: 0, citizenTimer: 8, showRanges: true,
  last: 0, ended: false, tiles: {}, ticker: '', bossOnScreen: 0,

  async init() {
    this.canvas = document.getElementById('game'); this.ctx = this.canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    this.lm = document.createElement('canvas'); this.lm.width = 1280; this.lm.height = 768; this.lmx = this.lm.getContext('2d');
    UI.init(this);
    await ASSETS.load(p => UI.loading(p));
    for (const k of 'ASCGXMH') this.tiles[k] = ASSETS.img('tile_' + k) || null;
    if (!this.tiles.X) this.tiles.X = null; if (!this.tiles.M) this.tiles.M = null; if (!this.tiles.H) this.tiles.H = this.tiles.G;
    this.tiles._oy = 0;
    MAP.build();
    this.bindInput(); this.applyMode();
    const q = new URLSearchParams(location.search); this.speed = +q.get('speed') || 1; this.auto = q.get('auto') === '1';
    this.state = 'menu'; UI.showMenu();
    if (q.get('side')) this.start(q.get('side'));
    requestAnimationFrame(ts => this.loop(ts));
  },

  start(side) {
    this.side = side; this.state = 'play'; this.ended = false; this.time = 0; this.gameMin = CFG.GAME_START_MIN; this.polska = CFG.POLSKA_START;
    this.money = { inside: CFG.ECON.inside.start, outside: CFG.ECON.outside.start };
    this.units = []; this.towers = []; this.projectiles = []; this.fx = []; this.clash = 0; this.breaches = 0; this.citizenTimer = 6;
    this.stats = { towers: 0, units: 0, bosses: 0, citizensLost: 0, citizensFiled: 0, breaches: 0, towersLost: 0, unitsLost: 0 };
    this.bossUsed = {}; this.premierActive = false; this.premierUntil = 0; this.policeStateUntil = 0; this.freezeUntil = 0; this.selected = null; this.timelineIdx = 0;
    MAP.build(); MAP.rebuildFields(); AI.reset();
    UI.showGame(this); UI.log(T('log.night'), 'ev');
    UI.log(T(side === 'inside' ? 'log.intro.inside' : 'log.intro.outside'));
    UI.ticker(T('ticker.start'));
    UI.hint(T(side === 'inside' ? 'hint.start.inside' : 'hint.start.outside'));
    this.selectedSpawn = 1; this.pending = null; UI.setSelecting(false);
    if (this.mobile) { UI.hint(T(side === 'inside' ? 'hint.mobile.inside' : 'hint.mobile.outside')); requestAnimationFrame(() => this.resizeCanvas(true)); }
  },

  /* ---------- pętla ---------- */
  fitHud() {
    const hud = document.getElementById('hud');
    if (this.mobile) { hud.style.transform = ''; this.syncCanvasSize(); return; }
    const r = this.canvas.getBoundingClientRect();
    hud.style.transform = `translate(${r.left}px, ${r.top}px) scale(${r.width / 1280})`;
  },
  /* ---------- tryb mobilny i kamera ---------- */
  detectMobile() { const w = window.innerWidth, h = window.innerHeight; const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); return w < 900 || (coarse && Math.min(w, h) < 900); },
  applyMode() {
    const was = this.mobile; this.mobile = this.detectMobile(); document.body.classList.toggle('mobile', this.mobile);
    if (!this.mobile) { this.canvas.width = 1280; this.canvas.height = 768; this.view = { scale: 1, x: 0, y: 0, fit: 1, dpr: 0 }; this.pending = null; return; }
    requestAnimationFrame(() => this.resizeCanvas(was !== this.mobile || !this.view || !this.view.dpr));
  },
  syncCanvasSize() { const cv = this.canvas, r = cv.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); if (Math.abs(r.width * dpr - cv.width) > 2 || Math.abs(r.height * dpr - cv.height) > 2) this.resizeCanvas(false); },
  resizeCanvas(recenter) {
    const cv = this.canvas, r = cv.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const portrait = r.height > r.width;
    const fit = portrait ? r.width / 560 : r.width / 1280;
    const v = (this.view && this.view.dpr) ? this.view : {};
    const userScale = (!recenter && v.userScale) ? v.userScale : null;
    this.view = { x: v.x ?? 0, y: v.y ?? 0, fit, dpr, userScale, scale: (userScale || fit) * dpr };
    if (recenter || v.x === undefined) this.centerCamera(portrait ? 820 : 640, portrait ? 440 : 420);
    this.clampCamera();
  },
  centerCamera(wx, wy) { const v = this.view; v.x = wx - this.canvas.width / 2 / v.scale; v.y = wy - this.canvas.height / 2 / v.scale; this.clampCamera(); },
  clampCamera() {
    const v = this.view; if (!v || !v.dpr) return; const vw = this.canvas.width / v.scale, vh = this.canvas.height / v.scale, M = 90;
    v.x = vw >= 1280 + 2 * M ? (1280 - vw) / 2 : Math.max(-M, Math.min(1280 + M - vw, v.x));
    v.y = vh >= 768 + 2 * M ? (768 - vh) / 2 : Math.max(-M, Math.min(768 + M - vh, v.y));
  },
  toWorld(clientX, clientY) { const cv = this.canvas, r = cv.getBoundingClientRect(); const v = this.view || { scale: 1, x: 0, y: 0 }; const px = (clientX - r.left) * cv.width / r.width, py = (clientY - r.top) * cv.height / r.height; return { x: px / v.scale + v.x, y: py / v.scale + v.y }; },
  setUserScale(sc, clientX, clientY) { const v = this.view; if (!v || !v.dpr) return; sc = Math.max(v.fit * 0.7, Math.min(2.5, sc)); const before = this.toWorld(clientX, clientY); v.userScale = sc; v.scale = sc * v.dpr; const after = this.toWorld(clientX, clientY); v.x += before.x - after.x; v.y += before.y - after.y; this.clampCamera(); },
  cancelSelection() { this.selected = null; this.pending = null; UI.hint(''); UI.setSelecting(false); },
  loop(ts) {
    let dt = Math.min(0.05, (ts - this.last) / 1000 || 0); this.last = ts; dt *= this.speed || 1;
    this.fitHud();
    if (this.state === 'play') { this.update(dt); UI.update(this); }
    if (this.state !== 'loading') this.render();
    requestAnimationFrame(t => this.loop(t));
  },
  update(dt) {
    this.time += dt; this.dtNow = dt;
    this.gameMin = CFG.GAME_START_MIN + (this.time / CFG.REAL_SECONDS) * (CFG.GAME_END_MIN - CFG.GAME_START_MIN);
    this.money.inside += CFG.ECON.inside.income * dt; this.money.outside += CFG.ECON.outside.income * dt;
    // linia czasu
    while (this.timelineIdx < TIMELINE.length && this.gameMin >= TIMELINE[this.timelineIdx][0]) {
      const ev = TIMELINE[this.timelineIdx++]; UI.ticker(ev[1]); UI.log(ev[1], 'ev');
      if (ev[2] === 'president') UI.log(T('log.presidentUnlocked'), 'ev');
    }
    if (MAP.fieldsDirty) MAP.rebuildFields();
    if (!MAP.fields.gateAll) MAP.fields.gateAll = MAP.computeField([MAP.gates.furtka.approach]);
    AI.update(dt, this);
    // obywatele
    this.citizenTimer -= dt; if (this.citizenTimer <= 0) { this.citizenTimer = CFG.CITIZEN_EVERY * rnd(0.8, 1.2); this.spawnCitizen(); }
    // premier
    if (this.premierActive && this.time > this.premierUntil) { this.premierActive = false; UI.log(T('log.premierLeaves')); }
    // encje
    for (const u of this.units) u.update(dt, this);
    for (const t of this.towers) t.update(dt, this);
    for (const p of this.projectiles) p.update(dt, this);
    for (const f of this.fx) f.update(dt, this);
    this.units = this.units.filter(u => !u.dead); this.towers = this.towers.filter(t => !t.dead);
    this.projectiles = this.projectiles.filter(p => !p.dead); this.fx = this.fx.filter(f => !f.dead);
    // Polska: przepychanki
    const clashSec = Math.min(this.clash, dt * 1.0); this.clash = 0;
    if (clashSec > 0) this.polska -= clashSec * CFG.POLSKA_COST.clashPerSec;
    const custom = CFG.customPolskaRule(this, dt); if (custom) this.polskaCost(custom);
    // koniec
    if (this.polska <= 0) return this.endGame(null);
    if (this.gameMin >= CFG.GAME_END_MIN) return this.endGame('inside');
  },

  /* ---------- akcje ---------- */
  polskaCost(n) { this.polska = Math.max(0, Math.min(100, this.polska - n)); },
  log(t, c) { UI.log(t, c); },
  build(key, gx, gy, byAI = false) {
    const def = TOWERS[key]; const side = 'inside';
    if (!MAP.canBuild(gx, gy, def) || this.money[side] < def.cost) return false;
    this.money[side] -= def.cost; this.polskaCost(def.polska);
    const t = new Tower(key, def, gx, gy); this.towers.push(t); MAP.towerAt[gy][gx] = t; MAP.fieldsDirty = true; this.stats.towers++;
    this.floatAt(gx, gy, def.name, '#7c5cff');
    if (!byAI) UI.log(T('log.youBuild', { name: def.name })); else if (Math.random() < 0.5) UI.log(T('log.aiBuild', { name: def.name.toLowerCase() }));
    return true;
  },
  spawnUnit(key, spawnIdx, byAI = false) {
    const def = UNITS[key]; const side = 'outside';
    if (this.money[side] < def.cost) return false;
    this.money[side] -= def.cost; this.polskaCost(def.polska);
    const sp = MAP.spawns[spawnIdx % MAP.spawns.length];
    const u = new Unit(key, def, 'attacker', sp.gx, sp.gy); this.units.push(u); this.stats.units++;
    if (!byAI && Math.random() < 0.3) UI.log(T('log.youSend', { name: def.name }));
    return true;
  },
  summonBoss(key, byAI = false) {
    const owner = INSIDE_BOSSES[key] ? 'inside' : 'outside'; const def = INSIDE_BOSSES[key] || OUTSIDE_BOSSES[key];
    if (this.bossUsed[key] || this.money[owner] < def.cost) return false;
    if (def.unlockMin && this.gameMin < def.unlockMin) return false;
    this.money[owner] -= def.cost; this.polskaCost(def.polska); this.bossUsed[key] = true; this.stats.bosses++;
    UI.log(T('log.summon', { side: SIDES[owner].name, name: def.name, quote: def.quote }), owner === this.side ? 'good' : 'bad');
    if (owner === 'outside') {
      const sp = MAP.spawns[key === 'president' ? 0 : 1];
      const u = new Unit(key, def, 'attacker', sp.gx, sp.gy, { boss: true }); this.units.push(u); u.say(def.quote, 4);
      if (key === 'chairman') { this.policeStateUntil = this.time + def.policeState; UI.log(T('log.policeState'), 'ev'); }
    } else if (key === 'prosecutor') {
      const u = new Unit(key, def, 'insideBoss', 9, 8, { boss: true, sprite: 'prosecutor' }); this.units.push(u); u.say(def.quote, 4);
    } else if (key === 'premier') {
      this.premierActive = true; this.premierUntil = this.time + def.duration;
      const u = new Unit(key, def, 'insideBoss', MAP.balcony.gx, MAP.balcony.gy, { boss: true, sprite: 'premier' }); u.bossTimer = def.duration; u.balcony = true; this.units.push(u); u.say(def.quote, 5);
    } else if (key === 'senior') {
      this.freezeUntil = this.time + def.freeze;
      for (const u of this.units) if (u.role === 'attacker') u.frozenUntil = this.time + def.freeze;
      UI.log(T('log.freeze'), 'ev');
      this.fx.push(new Ring(MAP.doors.side.gx, MAP.doors.side.gy, 9, '#9fd0ff'));
      // staje w bocznych drzwiach jako sędzia
      const spots = [[17, 3], [16, 4], [17, 4], [17, 2]];
      for (const [gx, gy] of spots) if (MAP.canBuild(gx, gy, TOWERS.judge)) { const t = new Tower('judge', { ...TOWERS.judge, hp: def.hp, sprite: 'judge_senior', name: def.name }, gx, gy); t.name = def.name; this.towers.push(t); MAP.towerAt[gy][gx] = t; MAP.fieldsDirty = true; break; }
    }
    return true;
  },
  useImmunity(unit, byAI = false) {
    const def = TOWERS.immunity; if (this.money.inside < def.cost || unit.immunityUsed) { if (unit.immunityUsed && !byAI) UI.hint(T('hint.immunityUsed')); return false; }
    unit.immunityUsed = true;
    this.money.inside -= def.cost; this.polskaCost(def.polska); unit.damage(def.dmg, this, 'immunity'); unit.say(T('say.immunity'), 2.5);
    this.fx.push(new Ring(unit.gx, unit.gy, 2, '#ffd166')); UI.log(T('log.immunity', { name: unit.name }), byAI ? 'bad' : 'good');
    return true;
  },
  spawnCitizen() {
    const s = MAP.citizenSpawn; const u = new Unit('citizen', { name: T('unit.citizen'), hp: 10, speed: 1.3 }, 'citizen', s.gx, s.gy, { sprite: pick(CITIZEN_SPRITES) });
    this.units.push(u);
  },
  cutGate(g, by, byForce = false) {
    if (!g.locked) return; g.locked = false; MAP.fieldsDirty = true; this.polskaCost(CFG.POLSKA_COST.fenceCut);
    UI.log(byForce ? T('log.gateForced', { gate: T('gate.' + g.name) }) : T('log.mpCut'), this.side === 'outside' ? 'good' : 'bad');
    this.fx.push(new Ring(g.gx, g.gy, 1.5, '#ffd166')); this.floatAt(g.gx, g.gy, T('float.cut'), '#ffd166');
  },
  onBreach(u) {
    u.dead = true; this.polskaCost(CFG.POLSKA_COST.breach);
    if (u.key === 'president') { this.floatAt(u.gx, u.gy, T('float.entered'), '#ff4d4d'); UI.log(T('log.presidentIn'), 'ev'); return this.endGame('outside'); }
    this.breaches++; this.stats.breaches++;
    this.floatAt(u.gx, u.gy, T('float.escorted'), '#ff8080');
    if (this.breaches === 1 || this.breaches % 5 === 0) UI.log(T('log.atDoors', { n: this.breaches, max: CFG.OUTSIDE_WIN_BREACHES }), this.side === 'outside' ? 'good' : 'bad');
    if (this.breaches >= CFG.OUTSIDE_WIN_BREACHES) return this.endGame('outside');
  },
  onUnitDied(u, src) {
    if (u.role === 'attacker') { this.stats.unitsLost++; this.floatAt(u.gx, u.gy, T(u.isBoss ? 'float.bossRetreats' : 'float.detained'), '#aaa'); if (u.isBoss) UI.log(T('log.bossRetreats', { name: u.name }), 'ev'); if (!u.isBoss && Math.random() < 0.3) this.polskaCost(CFG.POLSKA_COST.detained); }
    else if (u.role === 'insideBoss') { UI.log(T('log.bossOusted', { name: u.name }), 'ev'); }
  },
  onTowerDied(t, src) {
    MAP.towerAt[t.gy][t.gx] = null; MAP.fieldsDirty = true; this.stats.towersLost++;
    this.floatAt(t.gx, t.gy, T(t.key === 'cordon' ? 'float.cordonBroke' : (t.key === 'judge' ? 'float.judgeLeft' : 'float.toppled')), '#ff8080');
  },
  onCitizenLost(u, why) { this.stats.citizensLost++; this.polskaCost(CFG.POLSKA_COST.citizenLost); UI.log(T('log.citizenLost', { why: T('why.' + why) }), 'bad'); },
  onCitizenFiled(u) { this.stats.citizensFiled++; this.polska = Math.min(100, this.polska + 1); UI.log(T('log.citizenFiled'), 'good'); this.floatAt(u.gx, u.gy, T('float.filed'), '#9be39b'); },
  endGame(winner) {
    if (this.ended) return; this.ended = true; this.state = 'ending'; this.winner = winner; UI.showEnding(this, winner);
  },

  /* ---------- pomocnicze ---------- */
  pushMult() { return this.time < this.policeStateUntil ? 2 : 1; },
  towerMult(t) {
    let m = this.premierActive ? INSIDE_BOSSES.premier.buff : 1;
    for (const u of this.units) if (!u.dead && u.role === 'attacker' && u.def.dampen && ISO.dist(u, t) <= u.def.dampenRange) { m *= u.def.dampen; break; }
    return m;
  },
  auraSpeedAt(u) { for (const b of this.units) if (b !== u && !b.dead && b.def.auraSpeed && b.state === 'hold' && ISO.dist(b, u) <= b.def.auraRange) return b.def.auraSpeed; return 1; },
  nearestAttacker(ent, range, filter) { let best = null, bd = range; for (const u of this.units) { if (u.dead || u.role !== 'attacker' || (filter && !filter(u))) continue; const d = ISO.dist(ent, u); if (d <= bd) { bd = d; best = u; } } return best; },
  attackersInRange(ent, range) { return this.units.filter(u => !u.dead && u.role === 'attacker' && ISO.dist(ent, u) <= range); },
  citizensInRange(ent, range) { return this.units.filter(u => !u.dead && u.role === 'citizen' && ISO.dist(ent, u) <= range); },
  crowdAt(gx, gy) { let n = 0; for (const u of this.units) if (!u.dead && u.role === 'attacker' && Math.round(u.gx) === gx && Math.round(u.gy) === gy) n++; return n; },
  throwProjectile(from, to, dmg, glyph) { this.projectiles.push(new Projectile(from, to, dmg, glyph)); },
  tweetWave(t) { this.polskaCost(CFG.POLSKA_COST.tweet); this.fx.push(new Ring(t.gx, t.gy, t.def.range, '#6cf')); this.floatAt(t.gx, t.gy, T('float.tweet'), '#6cf'); },
  spark(u, text) { this.floatAt(u.gx, u.gy, text, '#ffd166', 14); },
  floatAt(gx, gy, text, color, size = 16) { const p = ISO.toScreen(gx, gy); this.fx.push(new FloatText(p.x, p.y - 40, text, color, size)); },

  /* ---------- wejście ---------- */
  bindInput() {
    const cv = this.canvas; const ptrs = new Map(); let g = null;
    cv.addEventListener('pointerdown', e => {
      if (e.button === 2) return;
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* brak wsparcia */ }
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) g = { sx: e.clientX, sy: e.clientY, camX: this.view.x, camY: this.view.y, moved: false };
      else if (ptrs.size === 2 && g) { const [a, b] = [...ptrs.values()]; g.dist0 = Math.hypot(a.x - b.x, a.y - b.y); g.scale0 = this.view.userScale || this.view.fit; g.moved = true; }
      e.preventDefault();
    });
    cv.addEventListener('pointermove', e => {
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!this.mobile) { const w = this.toWorld(e.clientX, e.clientY); const gr = ISO.toGrid(w.x, w.y); this.hover = { gx: Math.round(gr.gx), gy: Math.round(gr.gy) }; }
      if (!g || !ptrs.has(e.pointerId)) return;
      if (ptrs.size >= 2 && g.dist0) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 0) this.setUserScale(g.scale0 * d / g.dist0, (a.x + b.x) / 2, (a.y + b.y) / 2); return; }
      const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
      if (!g.moved && Math.hypot(dx, dy) > 8) g.moved = true;
      if (g.moved && this.mobile) { const r = cv.getBoundingClientRect(); const k = cv.width / r.width / this.view.scale; this.view.x = g.camX - dx * k; this.view.y = g.camY - dy * k; this.clampCamera(); }
    });
    const end = e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
      if (ptrs.size === 0) { if (g && !g.moved && this.state === 'play') this.onTap(e.clientX, e.clientY); g = null; }
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('mouseleave', () => { if (!this.mobile) this.hover = null; });
    cv.addEventListener('contextmenu', e => { e.preventDefault(); this.cancelSelection(); });
    window.addEventListener('keydown', e => {
      if (this.state !== 'play') return;
      if (e.key === 'Escape') this.cancelSelection();
      if (e.key === 'r') this.showRanges = !this.showRanges;
      const n = parseInt(e.key); if (n >= 1 && n <= UI.cards.length) { const c = UI.cards[n - 1]; this.onCard(c.type, c.key); }
    });
    window.addEventListener('resize', () => this.applyMode());
    window.addEventListener('orientationchange', () => setTimeout(() => this.applyMode(), 300));
  },
  onCard(type, key) {
    if (this.side === 'inside') {
      if (type === 'boss') { this.summonBoss(key); return; }
      this.selected = { type, key }; this.pending = null; UI.setSelecting(true);
      if (key === 'immunity') { UI.hint(T(this.mobile ? 'hint.immunity.mobile' : 'hint.immunity')); return; }
      UI.hint(T(this.mobile ? 'hint.cardMobile' : 'hint.card', { name: TOWERS[key].name, desc: TOWERS[key].desc }));
    } else {
      if (type === 'boss') { if (!this.summonBoss(key)) UI.hint(T('hint.noSupportBoss')); return; }
      if (!this.spawnUnit(key, this.selectedSpawn)) UI.hint(T('hint.noSupport')); else if (this.mobile) UI.hint(T('hint.unitGoes', { name: UNITS[key].name, spawn: MAP.spawns[this.selectedSpawn].name }));
    }
  },
  onTap(clientX, clientY) {
    const p = this.toWorld(clientX, clientY);
    const gr = ISO.toGrid(p.x, p.y); const gx = Math.round(gr.gx), gy = Math.round(gr.gy);
    if (this.side === 'outside') {
      let bi = -1, bd = this.mobile ? 2.4 : 1.6; MAP.spawns.forEach((s, i) => { const d = ISO.dist(s, { gx: gr.gx, gy: gr.gy }); if (d < bd) { bd = d; bi = i; } });
      if (bi >= 0) { this.selectedSpawn = bi; UI.hint(T('hint.spawn', { spawn: MAP.spawns[bi].name, keys: this.mobile ? '' : ' (1–8)' })); }
      return;
    }
    if (!this.selected) return;
    if (this.selected.key === 'immunity') {
      let best = null, bd = this.mobile ? 64 : 40; for (const u of this.units) { if (u.dead || !u.isBoss || u.role !== 'attacker') continue; const sp = ISO.toScreen(u.gx, u.gy); const d = Math.hypot(sp.x - p.x, sp.y - p.y + 20); if (d < bd) { bd = d; best = u; } }
      if (best) { this.useImmunity(best); this.cancelSelection(); } else UI.hint(T('hint.aimBoss'));
      return;
    }
    const def = TOWERS[this.selected.key];
    if (this.mobile && (!this.pending || this.pending.gx !== gx || this.pending.gy !== gy)) {
      this.pending = { gx, gy };
      UI.hint(MAP.canBuild(gx, gy, def) ? T('hint.confirmHere', { name: def.name }) : T('hint.cantBuild'));
      return;
    }
    if (!this.build(this.selected.key, gx, gy)) UI.hint(T(MAP.canBuild(gx, gy, def) ? 'hint.noLegit' : 'hint.cantBuild'));
    else if (this.mobile) { this.pending = null; UI.hint(T('hint.placed', { name: def.name })); }
  },

  /* ---------- render ---------- */
  render() {
    const ctx = this.ctx, v = this.view || { scale: 1, x: 0, y: 0 }; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(v.scale, 0, 0, v.scale, -v.x * v.scale, -v.y * v.scale);
    MAP.drawTerrain(ctx, this.tiles);
    this.drawMarkers(ctx);
    // drawables wg głębokości
    const list = [];
    const bimg = ASSETS.img(MAP.building.img);
    if (bimg) { const b = MAP.building; const p = ISO.toScreen(b.gx, b.gy); list.push({ depth: -1, draw: () => ctx.drawImage(bimg, Math.round(p.x - b.ax), Math.round(p.y + ISO.HH - b.ay)) }); }
    for (const s of MAP.statics) { const img = ASSETS.img(s.img); if (!img) continue; list.push({ depth: s.gx + s.gy + s.bias, draw: () => { const p = ISO.toScreen(s.gx, s.gy); ctx.save(); if (s.flip) { ctx.translate(p.x, 0); ctx.scale(-1, 1); ctx.translate(-p.x, 0); } ctx.drawImage(img, Math.round(p.x - img.width / 2 + s.ox), Math.round(p.y + ISO.HH - img.height + s.oy + (s.img === 'fence' ? 6 : 0)), img.width, img.height); ctx.restore(); } }); }
    for (const g of Object.values(MAP.gates)) list.push({ depth: g.gx + g.gy, draw: () => this.drawGate(ctx, g) });
    for (const t of this.towers) list.push({ depth: t.depth, draw: () => t.draw(ctx, this) });
    for (const u of this.units) list.push({ depth: u.balcony ? 99 : u.depth, draw: () => { if (u.balcony) { const p = ISO.toScreen(u.gx, u.gy); drawSprite(ctx, 'premier', 'south', 'idle', u.t, p.x, p.y + MAP.balcony.dy, 1.1); if (u.bubble) drawBubble(ctx, p.x, p.y + MAP.balcony.dy - 60, u.bubble); } else u.draw(ctx, this); } });
    list.sort((a, b) => a.depth - b.depth); for (const d of list) d.draw();
    for (const p of this.projectiles) p.draw(ctx);
    this.drawNight(ctx);
    for (const f of this.fx) f.draw(ctx);
    if (this.time < this.freezeUntil) { ctx.fillStyle = 'rgba(120,180,255,.10)'; ctx.fillRect(0, 0, 1280, 768); }
    if (this.state === 'play') this.drawHover(ctx);
  },
  drawGate(ctx, g) {
    const p = ISO.toScreen(g.gx, g.gy); const img = ASSETS.img('fence');
    if (g.locked && img) { ctx.save(); if (g.along === 'gx') { ctx.translate(p.x, 0); ctx.scale(-1, 1); ctx.translate(-p.x, 0); } ctx.globalAlpha = 0.9; ctx.drawImage(img, Math.round(p.x - 32), Math.round(p.y + 16 - 64 + 6)); ctx.restore();
      if (g.hp < g.maxHp) { ctx.fillStyle = '#000'; ctx.fillRect(p.x - 13, p.y - 44, 26, 5); ctx.fillStyle = '#ffd166'; ctx.fillRect(p.x - 12, p.y - 43, 24 * g.hp / g.maxHp, 3); }
    } else { // otwarte: słupki
      ctx.fillStyle = '#2b2b33'; ctx.fillRect(p.x - 30, p.y - 26, 5, 30); ctx.fillRect(p.x + 25, p.y - 26, 5, 30);
    }
  },
  drawMarkers(ctx) {
    if (this.state !== 'play') return;
    if (this.side === 'outside') MAP.spawns.forEach((s, i) => { const p = ISO.toScreen(s.gx, s.gy); const sel = i === this.selectedSpawn; ctx.strokeStyle = sel ? '#ff4d4d' : 'rgba(255,77,77,.5)'; ctx.lineWidth = sel ? 3 : 2; ctx.beginPath(); ctx.moveTo(p.x, p.y - 16); ctx.lineTo(p.x + 32, p.y); ctx.lineTo(p.x, p.y + 16); ctx.lineTo(p.x - 32, p.y); ctx.closePath(); ctx.stroke(); if (sel) { ctx.fillStyle = 'rgba(255,77,77,.25)'; ctx.fill(); } ctx.font = '15px VT323, monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(s.name, p.x, p.y - 20); });
    // drzwi
    for (const [k, d] of Object.entries(MAP.doors)) { const p = ISO.toScreen(d.gx, d.gy); ctx.strokeStyle = 'rgba(255,209,102,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x, p.y - 16); ctx.lineTo(p.x + 32, p.y); ctx.lineTo(p.x, p.y + 16); ctx.lineTo(p.x - 32, p.y); ctx.closePath(); ctx.stroke(); }
  },
  drawHover(ctx) {
    const h = this.mobile ? this.pending : this.hover;
    if (!h || this.side !== 'inside' || !this.selected || this.selected.key === 'immunity') return;
    const { gx, gy } = h; if (!ISO.inBounds(gx, gy)) return;
    const ok = MAP.canBuild(gx, gy, TOWERS[this.selected.key]); const p = ISO.toScreen(gx, gy);
    ctx.fillStyle = ok ? 'rgba(124,92,255,.35)' : 'rgba(255,77,77,.35)'; ctx.strokeStyle = ok ? '#7c5cff' : '#ff4d4d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 16); ctx.lineTo(p.x + 32, p.y); ctx.lineTo(p.x, p.y + 16); ctx.lineTo(p.x - 32, p.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    const def = TOWERS[this.selected.key]; if (def.range && ok) { ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, def.range * 32, def.range * 16, 0, 0, Math.PI * 2); ctx.stroke(); }
  },
  drawNight(ctx) {
    const lx = this.lmx; lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, 1280, 768);
    lx.fillStyle = 'rgba(6,10,38,.48)'; lx.fillRect(0, 0, 1280, 768);
    lx.globalCompositeOperation = 'destination-out';
    const glow = (x, y, r, a = 1) => { const g = lx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); lx.fillStyle = g; lx.fillRect(x - r, y - r, r * 2, r * 2); };
    for (const s of MAP.statics) if (s.img === 'lamp') { const p = ISO.toScreen(s.gx, s.gy); glow(p.x, p.y - 20, 120, 0.9); }
    const b = ISO.toScreen(12.5, 3.5); glow(b.x, b.y - 60, 260, 0.75);
    for (const d of Object.values(MAP.doors)) { const p = ISO.toScreen(d.gx, d.gy); glow(p.x, p.y - 10, 90, 0.9); }
    const car = MAP.statics.find(s => s.img === 'policecar'); if (car) { const p = ISO.toScreen(car.gx, car.gy); glow(p.x, p.y - 20, 100, 0.5); }
    ctx.drawImage(this.lm, 0, 0);
    // koguty
    if (car) { const p = ISO.toScreen(car.gx, car.gy); const ph = Math.sin(this.time * 9); const col = ph > 0 ? 'rgba(60,120,255,' : 'rgba(255,60,60,'; const g = ctx.createRadialGradient(p.x, p.y - 30, 0, p.x, p.y - 30, 140); g.addColorStop(0, col + '.28)'); g.addColorStop(1, col + '0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(p.x - 140, p.y - 170, 280, 280); ctx.globalCompositeOperation = 'source-over'; }
  },
};
window.addEventListener('load', () => GAME.init());
