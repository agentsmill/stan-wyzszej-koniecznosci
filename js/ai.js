'use strict';
/* ============================================================
   AI przeciwnika — gra tą stroną, której nie wybrał gracz.
   ============================================================ */
const AI = {
  timer: 0,
  /* plan obrony: kolejność ma znaczenie, zniszczone wieże są odbudowywane */
  insidePlan: [
    ['cordon', 12, 9], ['cordon', 7, 5], ['judge', 14, 5], ['judge', 17, 3], ['door', 16, 3], ['judge', 16, 4], ['judge', 16, 2],
    ['riot', 12, 8], ['barrier', 11, 9], ['barrier', 13, 9], ['decree', 10, 8],
    ['decree', 17, 5], ['riot', 8, 5], ['tweet', 14, 8], ['riot', 16, 5], ['decree', 15, 7], ['decree', 18, 3], ['cordon', 17, 4],
    ['barrier', 14, 9], ['barrier', 10, 9], ['cordon', 12, 8], ['tweet', 9, 7],
    ['cordon', 11, 11], ['decree', 13, 7], ['cordon', 13, 8], ['barrier', 8, 6],
  ],
  reset() { this.timer = 0; this.used = {}; this.saveFor = null; },
  update(dt, game) {
    this.timer -= dt; if (this.timer > 0) return;
    if (game.auto) { this.timer = 1.8; this.playInside(game); this.playOutside(game); return; }
    if (game.side === 'outside') { this.timer = 2.4; this.playInside(game); }
    else { this.timer = 1.5; this.playOutside(game); }
  },

  playInside(game) {
    const money = game.money.inside, min = game.gameMin;
    const outsideBosses = game.units.filter(u => u.role === 'attacker' && u.isBoss && !u.dead);
    const attackers = game.units.filter(u => u.role === 'attacker' && !u.dead).length;
    // wniosek o immunitet na bossa
    if (outsideBosses.length && money >= TOWERS.immunity.cost && Math.random() < 0.7) {
      const b = outsideBosses.filter(x => !x.immunityUsed).sort((a, b) => b.hp - a.hp)[0]; if (b) { game.useImmunity(b, true); return; }
    }
    // bossowie
    if (!this.used.senior && money >= INSIDE_BOSSES.senior.cost && (attackers >= 8 || outsideBosses.length >= 1 || min > 200)) { this.used.senior = 1; game.summonBoss('senior', true); return; }
    if (!this.used.premier && min >= 110 && money >= INSIDE_BOSSES.premier.cost && attackers >= 2) { this.used.premier = 1; game.summonBoss('premier', true); return; }
    if (!this.used.prosecutor && min >= 60 && money >= INSIDE_BOSSES.prosecutor.cost && attackers >= 2) { this.used.prosecutor = 1; game.summonBoss('prosecutor', true); return; }
    // plan budowy
    for (const [key, gx, gy] of this.insidePlan) {
      const def = TOWERS[key];
      if (MAP.tower(gx, gy)) continue;
      if (!MAP.canBuild(gx, gy, def)) continue;
      if (money < def.cost) return; // czekaj na pieniądze na ten element
      game.build(key, gx, gy, true); return;
    }
  },

  playOutside(game) {
    const money = game.money.outside, min = game.gameMin;
    const alive = game.units.filter(u => u.role === 'attacker' && !u.dead);
    const has = k => alive.some(u => u.key === k);
    const towers = game.towers.length, judges = game.towers.filter(t => t.key === 'judge').length;
    // bossowie wg linii czasu: gdy boss jest „należny", AI oszczędza na niego
    const due = [['president', OUTSIDE_BOSSES.president.unlockMin], ['tkpresident', 40], ['chairman', 95]].find(([k, m]) => !this.used[k] && min >= m);
    if (due) {
      const [key] = due; const cost = OUTSIDE_BOSSES[key].cost;
      if (money >= cost) { this.used[key] = 1; game.summonBoss(key, true); return; }
      // w czasie oszczędzania: poseł do furtki, prawnicy na sędziów, co trzeci tick protestujący
      if (MAP.gates.furtka.locked && !has('mp') && money >= UNITS.mp.cost) { game.spawnUnit('mp', 1, true); return; }
      if (key === 'president' && judges >= 2 && !has('lawyer') && money >= UNITS.lawyer.cost + 20) { game.spawnUnit('lawyer', 0, true); return; }
      if (money > 30 && Math.random() < 0.35) game.spawnUnit('protester', Math.floor(Math.random() * 3), true);
      return;
    }
    // jednostki
    let key = 'protester';
    const r = Math.random();
    if (MAP.gates.furtka.locked && !has('mp') && money >= UNITS.mp.cost && r < 0.6) key = 'mp';
    else if (judges > 0 && !has('lawyer') && money >= UNITS.lawyer.cost && r < 0.35) key = 'lawyer';
    else if (towers >= 3 && !has('journalist') && money >= UNITS.journalist.cost && r < 0.5) key = 'journalist';
    else if (r < 0.3 && money >= UNITS.unionist.cost) key = 'unionist';
    if (money < UNITS[key].cost) return;
    const sp = Math.random() < 0.55 ? 1 : (Math.random() < 0.5 ? 0 : 2);
    game.spawnUnit(key, sp, true);
  },
};
