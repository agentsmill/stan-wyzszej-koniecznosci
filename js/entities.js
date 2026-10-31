'use strict';
/* ============================================================
   ENCJE: jednostki (tłum, bossowie, obywatele), wieże, pociski, efekty.
   ============================================================ */
let NEXT_ID = 1;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

class Unit {
  /* role: 'attacker' (na zewnątrz), 'insideBoss', 'citizen' */
  constructor(key, def, role, gx, gy, opts = {}) {
    this.id = NEXT_ID++; this.key = key; this.def = def; this.role = role;
    this.isBoss = !!opts.boss; this.side = role === 'attacker' ? 'outside' : (role === 'citizen' ? 'neutral' : 'inside');
    this.gx = gx; this.gy = gy; this.hp = def.hp; this.maxHp = def.hp;
    this.speed = def.speed || 1.8; this.sprite = opts.sprite || pick(def.sprites || [key]);
    this.scale = this.isBoss ? 1.25 : 1; this.t = Math.random() * 10;
    this.dir = 'north-east'; this.anim = 'walk'; this.state = 'move';
    this.next = null; this.pushTarget = null; this.stunUntil = 0; this.frozenUntil = 0;
    this.slow = 1; this.jx = rnd(-13, 13); this.jy = rnd(-7, 7); this.dead = false; this.life = 0;
    this.patience = 0; this.name = def.name; this.ghost = !!def.ghost; this.wander = null;
    this.targetDoor = def.targetDoor || 'main'; this.flash = 0; this.bubble = null; this.bubbleT = 0;
    this.auraT = 0; this.bossTimer = def.duration || 0;
  }
  get cell() { return { gx: Math.round(this.gx), gy: Math.round(this.gy) }; }
  get depth() { return this.gx + this.gy + 0.01; }
  say(text, sec = 2.5) { this.bubble = text; this.bubbleT = sec; }
  damage(n, game, src) {
    if (this.dead) return; this.hp -= n; this.flash = 0.15;
    if (this.role === 'citizen') { this.giveUp(game, 'trafiony'); return; }
    if (this.hp <= 0) { this.dead = true; game.onUnitDied(this, src); }
  }
  giveUp(game, why) {
    if (this.state === 'leaving' || this.dead) return;
    this.state = 'leaving'; this.anim = 'walk'; this.life = 0; this.say('rezygnuję…', 2);
    game.onCitizenLost(this, why);
  }

  update(dt, game) {
    this.t += dt; this.life += dt; this.flash = Math.max(0, this.flash - dt);
    if (this.bubbleT > 0) { this.bubbleT -= dt; if (this.bubbleT <= 0) this.bubble = null; }
    if (this.dead) return;
    const now = game.time;
    if (this.state === 'leaving') { // odchodzi w stronę krawędzi
      const to = this.role === 'citizen' ? MAP.citizenSpawn : pick(MAP.spawns);
      this.moveToward(to.gx, to.gy, dt, 2.2); if (ISO.dist(this, to) < 0.3 || this.life > 12) this.dead = true; return;
    }
    if (this.frozenUntil > now) { this.anim = null; return; }
    if (this.stunUntil > now) { this.anim = null; return; }
    if (this.isBoss && this.bossTimer > 0) { this.bossTimer -= dt; if (this.bossTimer <= 0) { this.state = 'leaving'; game.log(`${this.name} schodzi ze sceny.`); return; } }

    if (this.role === 'insideBoss') return this.updateInsideBoss(dt, game);
    if (this.role === 'citizen') return this.updateCitizen(dt, game);
    return this.updateAttacker(dt, game);
  }

  /* ---------- ruch po polu ---------- */
  moveToward(tx, ty, dt, spd) {
    const dx = tx - this.gx, dy = ty - this.gy, d = Math.hypot(dx, dy);
    if (d < 1e-4) return true;
    const step = Math.min(d, spd * dt);
    this.gx += dx / d * step; this.gy += dy / d * step;
    this.dir = ISO.dirFromDelta(dx, dy); this.anim = 'walk';
    return d - step < 0.02;
  }
  atCenter() { const c = this.cell; return Math.abs(this.gx - c.gx) < 0.06 && Math.abs(this.gy - c.gy) < 0.06; }

  updateAttacker(dt, game) {
    const def = this.def, c = this.cell;
    // bossowie z własnym celem
    if (def.stopAtGate) {
      const g = MAP.gates.furtka; const tgt = g.approach;
      if (ISO.dist(this, tgt) < 0.15) { this.anim = 'idle'; this.state = 'hold'; this.dir = 'north'; return; }
    }
    // cel: drzwi (prezydent -> boczne) lub, gdy brak drogi, brama do sforsowania
    let field = this.targetDoor === 'side' ? MAP.fields.side : MAP.fields.main;
    if (def.stopAtGate) field = MAP.fields.gate.length ? MAP.fields.gateAll : field;
    const door = MAP.doors[this.targetDoor];
    if (ISO.dist(this, door) < 0.2) { game.onBreach(this); return; }
    let d = field[c.gy]?.[c.gx];
    let usingGate = false;
    if (d === undefined || d >= 1e9) { field = MAP.fields.gate; d = field[c.gy]?.[c.gx]; usingGate = true; }
    if (d === undefined || d >= 1e9) { this.anim = 'idle'; this.state = 'stuck'; return; }

    // przy zamkniętej bramie: napieraj / przetnij
    if (usingGate && d === 0) {
      const g = Object.values(MAP.gates).find(x => x.locked && Math.abs(x.approach.gx - c.gx) + Math.abs(x.approach.gy - c.gy) <= 1);
      if (g) {
        this.state = 'push'; this.anim = 'idle'; this.dir = g.along === 'gx' ? 'north' : 'east';
        if (def.cutter) { game.cutGate(g, this); return; }
        g.hp -= (def.push || 2) * dt; this.pushing = g;
        if (g.hp <= 0) game.cutGate(g, this, true);
        return;
      }
    }
    if (!this.next || (this.atCenter())) {
      this.next = MAP.nextStep(field, c.gx, c.gy);
      if (!this.next) { this.anim = 'idle'; return; }
    }
    const tw = MAP.tower(this.next.gx, this.next.gy);
    if (tw && !this.ghost) {
      // napieranie na wieżę
      this.state = 'push'; this.anim = 'idle'; this.pushTarget = tw;
      this.dir = ISO.dirFromDelta(this.next.gx - this.gx, this.next.gy - this.gy);
      let p = (def.push || 0) * dt * game.pushMult();
      if (def.argue && tw.key === 'judge') p = def.argue * dt;
      if (tw.key === 'judge' && !def.argue) p *= 0.4; // sędziego tłum raczej nie przewraca
      tw.damage(p, game, this);
      game.clash += dt;
      return;
    }
    // ruch
    let spd = this.speed * this.slow * (game.premierActive ? INSIDE_BOSSES.premier.enemySlow : 1) * game.auraSpeedAt(this);
    if (this.ghost && (tw || MAP.tower(c.gx, c.gy))) { spd *= def.ghostSlow; if (Math.random() < dt * 1.5) game.spark(this, 'przepychanka'); game.clash += dt; }
    this.state = 'move'; this.pushTarget = null;
    if (this.moveToward(this.next.gx, this.next.gy, dt, spd)) { this.gx = this.next.gx; this.gy = this.next.gy; this.next = null; }
    this.slow = 1;
  }

  updateCitizen(dt, game) {
    const c = this.cell, field = MAP.fields.citizen;
    const door = MAP.doors.main;
    if (ISO.dist(this, door) < 0.25) { game.onCitizenFiled(this); this.dead = true; return; }
    const d = field[c.gy]?.[c.gx];
    const blocked = d === undefined || d >= 1e9;
    if (blocked) { this.patience += dt; this.anim = 'idle'; if (this.patience > CFG.CITIZEN_PATIENCE) this.giveUp(game, 'zablokowany'); return; }
    this.patience = Math.max(0, this.patience - dt * 0.5);
    if (!this.next || this.atCenter()) { this.next = MAP.nextStep(field, c.gx, c.gy); if (!this.next) { this.anim = 'idle'; return; } }
    // tłum na kaflu? obywatel się boi
    if (game.crowdAt(this.next.gx, this.next.gy) >= 3) { this.patience += dt * 1.5; this.anim = 'idle'; if (this.patience > CFG.CITIZEN_PATIENCE) this.giveUp(game, 'tłum'); return; }
    if (this.moveToward(this.next.gx, this.next.gy, dt, 1.3)) { this.gx = this.next.gx; this.gy = this.next.gy; this.next = null; }
  }

  updateInsideBoss(dt, game) {
    const def = this.def;
    if (this.key === 'premier') { this.anim = 'idle'; this.dir = 'south'; return; }
    if (this.key === 'senior') { this.anim = 'idle'; this.dir = 'south-east'; return; }
    // prokurator: patroluje dziedziniec i rzuca teczkami
    this.cd = (this.cd || 0) - dt;
    const tgt = game.nearestAttacker(this, def.range);
    if (tgt && this.cd <= 0) { game.throwProjectile(this, tgt, def.dmg, 'folder'); this.cd = def.cooldown; this.anim = 'idle'; this.dir = ISO.dirFromDelta(tgt.gx - this.gx, tgt.gy - this.gy); return; }
    if (!this.wander || ISO.dist(this, this.wander) < 0.2) {
      let tries = 0; do { this.wander = { gx: 7 + Math.floor(Math.random() * 12), gy: 6 + Math.floor(Math.random() * 4) }; tries++; } while (tries < 20 && (!MAP.isWalkable(this.wander.gx, this.wander.gy) || MAP.tower(this.wander.gx, this.wander.gy)));
    }
    this.moveToward(this.wander.gx, this.wander.gy, dt, this.speed);
  }

  draw(ctx, game) {
    const p = ISO.toScreen(this.gx, this.gy);
    const x = p.x + this.jx, y = p.y + this.jy + 4;
    // cień
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 9 * this.scale, 4 * this.scale, 0, 0, Math.PI * 2); ctx.fill();
    if (this.isBoss) { ctx.strokeStyle = this.side === 'outside' ? 'rgba(255,77,77,.7)' : 'rgba(124,92,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 2, 16, 8, 0, 0, Math.PI * 2); ctx.stroke(); }
    const anim = this.anim;
    drawSprite(ctx, this.sprite, this.dir, anim, this.t, x, y, this.scale);
    if (this.frozenUntil > game.time) { ctx.fillStyle = 'rgba(140,200,255,.35)'; ctx.fillRect(x - 12, y - 46 * this.scale, 24, 46 * this.scale); }
    if (this.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,80,80,.35)'; ctx.fillRect(x - 10, y - 44 * this.scale, 20, 44 * this.scale); ctx.globalCompositeOperation = 'source-over'; }
    // pasek HP (bossowie i ranni)
    if (this.isBoss || this.hp < this.maxHp) {
      const w = this.isBoss ? 36 : 22, hy = y - 50 * this.scale;
      ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2 - 1, hy - 1, w + 2, 5);
      ctx.fillStyle = this.side === 'outside' ? '#ff4d4d' : (this.side === 'inside' ? '#7c5cff' : '#9be39b');
      ctx.fillRect(x - w / 2, hy, Math.max(0, w * this.hp / this.maxHp), 3);
    }
    if (this.isBoss) { ctx.font = '9px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(this.name, x + 1, y - 56 * this.scale + 1); ctx.fillStyle = '#fff'; ctx.fillText(this.name, x, y - 56 * this.scale); }
    if (this.role === 'citizen') { // koperta ze skargą
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 6, y - 52, 10, 7); ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(x + 6.5, y - 51.5, 9, 6); ctx.beginPath(); ctx.moveTo(x + 6.5, y - 51.5); ctx.lineTo(x + 11, y - 48); ctx.lineTo(x + 15.5, y - 51.5); ctx.stroke();
    }
    if (this.bubble) drawBubble(ctx, x, y - 58 * this.scale, this.bubble);
  }
}

function drawBubble(ctx, x, y, text) {
  ctx.font = '16px VT323, monospace'; ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 10;
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(x - w / 2, y - 16, w, 18);
  ctx.fillStyle = '#111'; ctx.fillText(text, x, y - 2);
}

/* ---------- WIEŻE ---------- */
class Tower {
  constructor(key, def, gx, gy) {
    this.id = NEXT_ID++; this.key = key; this.def = def; this.gx = gx; this.gy = gy;
    this.hp = def.hp; this.maxHp = def.hp; this.cd = rnd(0, 0.5); this.dir = 'south'; this.t = Math.random() * 10; this.dead = false; this.flash = 0; this.name = def.name;
  }
  get depth() { return this.gx + this.gy; }
  damage(n, game, src) { if (this.dead) return; this.hp -= n; this.flash = 0.1; if (this.hp <= 0) { this.dead = true; game.onTowerDied(this, src); } }
  update(dt, game) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt); this.cd -= dt;
    const def = this.def; const mult = game.towerMult(this);
    const near = game.nearestAttacker(this, 3.2);
    if (near) this.dir = ISO.dirFromDelta(near.gx - this.gx, near.gy - this.gy);
    else this.dir = 'south';
    if (def.kind === 'block' && def.push) {
      for (const u of game.attackersInRange(this, def.range)) { u.damage(def.push * mult * dt, game, this); }
    } else if (def.kind === 'aura') {
      for (const u of game.attackersInRange(this, def.range)) u.slow = Math.min(u.slow, def.slow);
    } else if (def.kind === 'shoot') {
      if (this.cd <= 0) { const tgt = game.nearestAttacker(this, def.range, u => !u.def.immuneDecree); if (tgt) { game.throwProjectile(this, tgt, def.dmg * mult, '§'); this.cd = def.cooldown; } }
    } else if (def.kind === 'stun') {
      if (this.cd <= 0) { const us = game.attackersInRange(this, def.range); if (us.length) { for (const u of us) u.stunUntil = Math.max(u.stunUntil, game.time + def.stun); for (const c of game.citizensInRange(this, def.range)) c.giveUp(game, 'hałas'); game.tweetWave(this); this.cd = def.cooldown; } }
    }
  }
  draw(ctx, game) {
    const p = ISO.toScreen(this.gx, this.gy); const x = p.x, y = p.y + 4; const def = this.def;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + 1, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
    if (def.sprite === 'police' || def.sprite === 'judge') drawSprite(ctx, def.sprite, this.dir, 'idle', this.t, x, y, 1);
    else {
      const img = ASSETS.img(def.sprite);
      if (img) {
        let flip = def.sprite === 'barrier' && !(MAP.tower(this.gx, this.gy - 1)?.key === 'barrier' || MAP.tower(this.gx, this.gy + 1)?.key === 'barrier');
        ctx.save(); if (flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
        ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height + 14), img.width, img.height); ctx.restore();
      } else { ctx.fillStyle = '#88f'; ctx.fillRect(x - 10, y - 20, 20, 20); }
    }
    if (def.kind === 'aura' && game.showRanges) { ctx.strokeStyle = 'rgba(124,92,255,.35)'; ctx.beginPath(); ctx.ellipse(x, y, def.range * 32, def.range * 16, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (this.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x - 12, y - 44, 24, 46); ctx.globalCompositeOperation = 'source-over'; }
    if (this.hp < this.maxHp) { const w = 24, hy = y - 50; ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2 - 1, hy - 1, w + 2, 5); ctx.fillStyle = '#7c5cff'; ctx.fillRect(x - w / 2, hy, Math.max(0, w * this.hp / this.maxHp), 3); }
  }
}

/* ---------- POCISKI I EFEKTY ---------- */
class Projectile {
  constructor(from, to, dmg, glyph) {
    const a = ISO.toScreen(from.gx, from.gy); this.x = a.x; this.y = a.y - 24; this.target = to; this.dmg = dmg; this.glyph = glyph; this.speed = 260; this.dead = false; this.t = 0;
  }
  update(dt, game) {
    this.t += dt; const tp = ISO.toScreen(this.target.gx, this.target.gy); const tx = tp.x + this.target.jx, ty = tp.y + this.target.jy - 18;
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    if (d < 8 || this.target.dead || this.t > 3) { if (!this.target.dead && d < 30) this.target.damage(this.dmg, game, this); this.dead = true; return; }
    this.x += dx / d * this.speed * dt; this.y += dy / d * this.speed * dt - Math.sin(this.t * 10) * 0.3;
  }
  draw(ctx) {
    if (this.glyph === 'folder') { ctx.fillStyle = '#e8d8a0'; ctx.fillRect(this.x - 6, this.y - 4, 12, 9); ctx.fillStyle = '#a08050'; ctx.fillRect(this.x - 6, this.y - 4, 12, 2); }
    else { ctx.font = 'bold 18px "VT323", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('§', this.x + 1, this.y + 1); ctx.fillStyle = '#fff'; ctx.fillText('§', this.x, this.y); }
  }
}
class FloatText {
  constructor(x, y, text, color = '#fff', size = 16) { this.x = x; this.y = y; this.text = text; this.color = color; this.life = 1.4; this.size = size; this.dead = false; }
  update(dt) { this.life -= dt; this.y -= 18 * dt; if (this.life <= 0) this.dead = true; }
  draw(ctx) { ctx.globalAlpha = Math.max(0, Math.min(1, this.life)); ctx.font = `${this.size}px "VT323", monospace`; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(this.text, this.x + 1, this.y + 1); ctx.fillStyle = this.color; ctx.fillText(this.text, this.x, this.y); ctx.globalAlpha = 1; }
}
class Ring {
  constructor(gx, gy, r, color) { this.gx = gx; this.gy = gy; this.r = r; this.color = color; this.life = 0.7; this.dead = false; }
  update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; }
  draw(ctx) { const p = ISO.toScreen(this.gx, this.gy); const k = 1 - this.life / 0.7; ctx.globalAlpha = 1 - k; ctx.strokeStyle = this.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y, this.r * 32 * k, this.r * 16 * k, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
}
