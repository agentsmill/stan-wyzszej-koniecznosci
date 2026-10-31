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
    this.bindInput();
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
    UI.showGame(this); UI.log('Noc z 30 na 31 października. Al. Szucha 12a.', 'ev');
    UI.log(side === 'inside' ? 'Trzymasz budynek. Stawiaj kordony i sędziów przy drzwiach (karty na dole, 1–9).' : 'Wysyłasz ludzi pod drzwi. Kliknij punkt wejścia na ulicy, potem kartę (1–8).');
    UI.ticker('Sędzia Korwin-Piotrowska zarządziła przerwę w czynnościach prezesa. Konto TK na X: „zamach stanu".');
    UI.hint(side === 'inside' ? 'Wybierz kartę i kliknij kafel na dziedzińcu.' : 'Kliknij jeden z punktów wejścia (romby na ulicy), potem kartę.');
    this.selectedSpawn = 1;
  },

  /* ---------- pętla ---------- */
  fitHud() {
    const r = this.canvas.getBoundingClientRect(); const hud = document.getElementById('hud');
    hud.style.transform = `translate(${r.left}px, ${r.top}px) scale(${r.width / 1280})`;
  },
  loop(ts) {
    let dt = Math.min(0.05, (ts - this.last) / 1000 || 0); this.last = ts; dt *= this.speed || 1;
    this.fitHud();
    if (this.state === 'play') { this.update(dt); UI.update(this); }
    if (this.state !== 'loading') this.render();
    requestAnimationFrame(t => this.loop(t));
  },
  update(dt) {
    this.time += dt;
    this.gameMin = CFG.GAME_START_MIN + (this.time / CFG.REAL_SECONDS) * (CFG.GAME_END_MIN - CFG.GAME_START_MIN);
    this.money.inside += CFG.ECON.inside.income * dt; this.money.outside += CFG.ECON.outside.income * dt;
    // linia czasu
    while (this.timelineIdx < TIMELINE.length && this.gameMin >= TIMELINE[this.timelineIdx][0]) {
      const ev = TIMELINE[this.timelineIdx++]; UI.ticker(ev[1]); UI.log(ev[1], 'ev');
      if (ev[2] === 'president') UI.log('Karta PREZYDENT odblokowana.', 'ev');
    }
    if (MAP.fieldsDirty) MAP.rebuildFields();
    if (!MAP.fields.gateAll) MAP.fields.gateAll = MAP.computeField([MAP.gates.furtka.approach]);
    AI.update(dt, this);
    // obywatele
    this.citizenTimer -= dt; if (this.citizenTimer <= 0) { this.citizenTimer = CFG.CITIZEN_EVERY * rnd(0.8, 1.2); this.spawnCitizen(); }
    // premier
    if (this.premierActive && this.time > this.premierUntil) { this.premierActive = false; UI.log('Premier schodzi z balkonu.'); }
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
    if (!byAI) UI.log(`Stawiasz: ${def.name}.`); else if (Math.random() < 0.5) UI.log(`Wewnątrz: ${def.name.toLowerCase()} na dziedzińcu.`);
    return true;
  },
  spawnUnit(key, spawnIdx, byAI = false) {
    const def = UNITS[key]; const side = 'outside';
    if (this.money[side] < def.cost) return false;
    this.money[side] -= def.cost; this.polskaCost(def.polska);
    const sp = MAP.spawns[spawnIdx % MAP.spawns.length];
    const u = new Unit(key, def, 'attacker', sp.gx, sp.gy); this.units.push(u); this.stats.units++;
    if (!byAI && Math.random() < 0.3) UI.log(`Wysyłasz: ${def.name}.`);
    return true;
  },
  summonBoss(key, byAI = false) {
    const owner = INSIDE_BOSSES[key] ? 'inside' : 'outside'; const def = INSIDE_BOSSES[key] || OUTSIDE_BOSSES[key];
    if (this.bossUsed[key] || this.money[owner] < def.cost) return false;
    if (def.unlockMin && this.gameMin < def.unlockMin) return false;
    this.money[owner] -= def.cost; this.polskaCost(def.polska); this.bossUsed[key] = true; this.stats.bosses++;
    UI.log(`${owner === 'inside' ? 'WEWNĄTRZ' : 'NA ZEWNĄTRZ'} wzywa: ${def.name}. ${def.quote}`, owner === this.side ? 'good' : 'bad');
    if (owner === 'outside') {
      const sp = MAP.spawns[key === 'president' ? 0 : 1];
      const u = new Unit(key, def, 'attacker', sp.gx, sp.gy, { boss: true }); this.units.push(u); u.say(def.quote, 4);
      if (key === 'chairman') { this.policeStateUntil = this.time + def.policeState; UI.log('„Państwo policyjne": kordony przyjmują ×2 przez 15 s.', 'ev'); }
    } else if (key === 'prosecutor') {
      const u = new Unit(key, def, 'insideBoss', 9, 8, { boss: true, sprite: 'prosecutor' }); this.units.push(u); u.say(def.quote, 4);
    } else if (key === 'premier') {
      this.premierActive = true; this.premierUntil = this.time + def.duration;
      const u = new Unit(key, def, 'insideBoss', MAP.balcony.gx, MAP.balcony.gy, { boss: true, sprite: 'premier' }); u.bossTimer = def.duration; u.balcony = true; this.units.push(u); u.say(def.quote, 5);
    } else if (key === 'senior') {
      this.freezeUntil = this.time + def.freeze;
      for (const u of this.units) if (u.role === 'attacker') u.frozenUntil = this.time + def.freeze;
      UI.log('PRZERWA W CZYNNOŚCIACH: wszyscy na zewnątrz zamrożeni na 10 s.', 'ev');
      this.fx.push(new Ring(MAP.doors.side.gx, MAP.doors.side.gy, 9, '#9fd0ff'));
      // staje w bocznych drzwiach jako sędzia
      const spots = [[17, 3], [16, 4], [17, 4], [17, 2]];
      for (const [gx, gy] of spots) if (MAP.canBuild(gx, gy, TOWERS.judge)) { const t = new Tower('judge', { ...TOWERS.judge, hp: def.hp, sprite: 'judge_senior', name: def.name }, gx, gy); t.name = def.name; this.towers.push(t); MAP.towerAt[gy][gx] = t; MAP.fieldsDirty = true; break; }
    }
    return true;
  },
  useImmunity(unit, byAI = false) {
    const def = TOWERS.immunity; if (this.money.inside < def.cost) return false;
    this.money.inside -= def.cost; this.polskaCost(def.polska); unit.damage(def.dmg, this, 'immunity'); unit.say('50 tomów akt!', 2.5);
    this.fx.push(new Ring(unit.gx, unit.gy, 2, '#ffd166')); UI.log(`Wniosek o uchylenie immunitetu: ${unit.name}.`, byAI ? 'bad' : 'good');
    return true;
  },
  spawnCitizen() {
    const s = MAP.citizenSpawn; const u = new Unit('citizen', { name: 'Obywatel ze skargą', hp: 10, speed: 1.3 }, 'citizen', s.gx, s.gy, { sprite: pick(CITIZEN_SPRITES) });
    this.units.push(u);
  },
  cutGate(g, by, byForce = false) {
    if (!g.locked) return; g.locked = false; MAP.fieldsDirty = true; this.polskaCost(CFG.POLSKA_COST.fenceCut);
    UI.log(byForce ? `Tłum sforsował ${g.name === 'furtka' ? 'furtkę' : 'bramę'}.` : `Poseł przeciął zabezpieczenie furtki. „Wg Onetu."`, this.side === 'outside' ? 'good' : 'bad');
    this.fx.push(new Ring(g.gx, g.gy, 1.5, '#ffd166')); this.floatAt(g.gx, g.gy, 'CIĘCIE', '#ffd166');
  },
  onBreach(u) {
    u.dead = true; this.breaches++; this.stats.breaches++; this.polskaCost(CFG.POLSKA_COST.breach);
    this.floatAt(u.gx, u.gy, 'wszedł', '#ff4d4d');
    if (u.key === 'president') { UI.log('PREZYDENT WSZEDŁ DO BUDYNKU. Zdjęcie z wnętrza TK.', 'ev'); return this.endGame('outside'); }
    if (this.breaches >= CFG.OUTSIDE_WIN_BREACHES) return this.endGame('outside');
  },
  onUnitDied(u, src) {
    if (u.role === 'attacker') { this.stats.unitsLost++; this.floatAt(u.gx, u.gy, u.isBoss ? 'wycofuje się' : 'zatrzymany', '#aaa'); if (u.isBoss) UI.log(`${u.name} wycofuje się spod Trybunału.`, 'ev'); if (!u.isBoss && Math.random() < 0.3) this.polskaCost(CFG.POLSKA_COST.detained); }
    else if (u.role === 'insideBoss') { UI.log(`${u.name} został wyparty.`, 'ev'); }
  },
  onTowerDied(t, src) {
    MAP.towerAt[t.gy][t.gx] = null; MAP.fieldsDirty = true; this.stats.towersLost++;
    this.floatAt(t.gx, t.gy, t.key === 'cordon' ? 'kordon się rozstąpił' : (t.key === 'judge' ? 'sędzia się wycofał' : 'przewrócone'), '#ff8080');
  },
  onCitizenLost(u, why) { this.stats.citizensLost++; this.polskaCost(CFG.POLSKA_COST.citizenLost); UI.log(`Obywatel ze skargą konstytucyjną zawraca (${why}). POLSKA −2.`, 'bad'); },
  onCitizenFiled(u) { this.stats.citizensFiled++; this.polska = Math.min(100, this.polska + 1); UI.log('Obywatel złożył skargę. Ktoś ją kiedyś rozpatrzy. POLSKA +1.', 'good'); this.floatAt(u.gx, u.gy, 'skarga złożona', '#9be39b'); },
  endGame(winner) {
    if (this.ended) return; this.ended = true; this.state = 'ending'; UI.showEnding(this, winner);
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
  tweetWave(t) { this.polskaCost(CFG.POLSKA_COST.tweet); this.fx.push(new Ring(t.gx, t.gy, t.def.range, '#6cf')); this.floatAt(t.gx, t.gy, '#TK  POLSKA −1', '#6cf'); },
  spark(u, text) { this.floatAt(u.gx, u.gy, text, '#ffd166', 14); },
  floatAt(gx, gy, text, color, size = 16) { const p = ISO.toScreen(gx, gy); this.fx.push(new FloatText(p.x, p.y - 40, text, color, size)); },

  /* ---------- wejście ---------- */
  bindInput() {
    const cv = this.canvas;
    const toCanvas = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
    cv.addEventListener('mousemove', e => { const p = toCanvas(e); const g = ISO.toGrid(p.x, p.y); this.hover = { gx: Math.round(g.gx), gy: Math.round(g.gy), x: p.x, y: p.y }; });
    cv.addEventListener('mouseleave', () => this.hover = null);
    cv.addEventListener('contextmenu', e => { e.preventDefault(); this.selected = null; UI.hint(''); });
    cv.addEventListener('click', e => { if (this.state !== 'play') return; const p = toCanvas(e); this.onClick(p); });
    window.addEventListener('keydown', e => {
      if (this.state !== 'play') return;
      if (e.key === 'Escape') { this.selected = null; UI.hint(''); }
      if (e.key === 'r') this.showRanges = !this.showRanges;
      const n = parseInt(e.key); if (n >= 1 && n <= UI.cards.length) { const c = UI.cards[n - 1]; this.onCard(c.type, c.key); }
    });
  },
  onCard(type, key) {
    if (this.side === 'inside') {
      if (type === 'boss') { this.summonBoss(key); return; }
      if (key === 'immunity') { this.selected = { type, key }; UI.hint('Kliknij bossa na mapie.'); return; }
      this.selected = { type, key }; UI.hint(`${TOWERS[key].name}: kliknij kafel. Prawy przycisk / Esc anuluje.`);
    } else {
      if (type === 'boss') { if (!this.summonBoss(key)) UI.hint('Za mało poparcia (albo jeszcze nie pora).'); return; }
      if (!this.spawnUnit(key, this.selectedSpawn)) UI.hint('Za mało poparcia.');
    }
  },
  onClick(p) {
    const g = ISO.toGrid(p.x, p.y); const gx = Math.round(g.gx), gy = Math.round(g.gy);
    if (this.side === 'outside') {
      // wybór punktu wejścia
      let bi = -1, bd = 1.6; MAP.spawns.forEach((s, i) => { const d = ISO.dist(s, { gx: g.gx, gy: g.gy }); if (d < bd) { bd = d; bi = i; } });
      if (bi >= 0) { this.selectedSpawn = bi; UI.hint(`Punkt wejścia: ${MAP.spawns[bi].name}. Teraz karta (1–8).`); }
      return;
    }
    if (!this.selected) return;
    if (this.selected.key === 'immunity') {
      let best = null, bd = 40; for (const u of this.units) { if (u.dead || !u.isBoss || u.role !== 'attacker') continue; const s = ISO.toScreen(u.gx, u.gy); const d = Math.hypot(s.x - p.x, s.y - p.y + 20); if (d < bd) { bd = d; best = u; } }
      if (best) { this.useImmunity(best); this.selected = null; UI.hint(''); } else UI.hint('Celuj w bossa (z czerwoną obwódką).');
      return;
    }
    if (!this.build(this.selected.key, gx, gy)) UI.hint(MAP.canBuild(gx, gy, TOWERS[this.selected.key]) ? 'Za mało legitymacji.' : 'Tu nie można. Dziedziniec, poza drzwiami; sędzia tylko przy drzwiach.');
  },

  /* ---------- render ---------- */
  render() {
    const ctx = this.ctx; ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, 1280, 768);
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
    if (!this.hover || this.side !== 'inside' || !this.selected || this.selected.key === 'immunity') return;
    const { gx, gy } = this.hover; if (!ISO.inBounds(gx, gy)) return;
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
