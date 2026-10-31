'use strict';
/* ============================================================
   UI (DOM): HUD, karty, log, ticker, menu, ekran końcowy.
   ============================================================ */
const UI = {
  el: {}, cards: [], logLines: [],
  init(game) {
    const $ = id => document.getElementById(id);
    ['hud', 'menu', 'loading', 'loading-pct', 'ending', 'ending-victory', 'ending-loss', 'ending-stats', 'side-name', 'side-slogan', 'clock', 'ticker', 'polska-fill', 'polska-val', 'resource-name', 'resource-val', 'log', 'cards', 'hint', 'loss-count', 'btn-other', 'btn-again', 'toast', 'logbtn', 'cancelbtn']
      .forEach(id => this.el[id] = $(id));
    document.querySelectorAll('.side-btn').forEach(b => b.addEventListener('click', () => game.start(b.dataset.side)));
    this.el['btn-other'].addEventListener('click', () => game.start(SIDES[game.side].enemy));
    this.el['btn-again'].addEventListener('click', () => game.start(game.side));
    this.el.logbtn.addEventListener('click', () => document.body.classList.toggle('showlog'));
    this.el.cancelbtn.addEventListener('click', () => game.cancelSelection());
    const n = +localStorage.getItem('swk_losses') || 0;
    this.el['loss-count'].textContent = n ? T('ui.lossCount', { n, times: T(n === 1 ? 'ui.once' : 'ui.times') }) : '';
  },
  loading(pct) { this.el['loading-pct'].textContent = Math.round(pct * 100) + '%'; },
  showMenu() { this.el.loading.classList.add('hidden'); this.el.menu.classList.remove('hidden'); this.el.hud.classList.add('hidden'); this.el.ending.classList.add('hidden'); },
  showGame(game) {
    this.el.menu.classList.add('hidden'); this.el.ending.classList.add('hidden'); this.el.hud.classList.remove('hidden');
    this.el.hud.className = game.side + '-ui';
    const S = SIDES[game.side];
    this.el['side-name'].textContent = S.name; this.el['side-slogan'].textContent = S.slogan; this.el['resource-name'].textContent = S.resource;
    this.logLines = []; this.el.log.innerHTML = ''; this.buildCards(game);
  },
  buildCards(game) {
    const box = this.el.cards; box.innerHTML = ''; this.cards = [];
    const defs = game.side === 'inside'
      ? [...Object.entries(TOWERS).map(([k, d]) => ['tower', k, d]), ...Object.entries(INSIDE_BOSSES).map(([k, d]) => ['boss', k, d])]
      : [...Object.entries(UNITS).map(([k, d]) => ['unit', k, d]), ...Object.entries(OUTSIDE_BOSSES).map(([k, d]) => ['boss', k, d])];
    defs.forEach(([type, key, def], i) => {
      const c = document.createElement('button'); c.className = 'card' + (type === 'boss' ? ' boss' : '');
      c.innerHTML = `<span class="key">${i + 1}</span><span class="cost">${def.cost}</span><span class="ttl">${def.name}</span><span class="desc">${def.desc}</span><span class="pl">PL −${def.polska}</span>`;
      const spr = def.sprite || (def.sprites && def.sprites[0]);
      if (spr && ASSETS.sprite(spr)) { const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; cv.className = 'ico'; const cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false; cx.save(); cx.scale(0.75, 0.75); drawSprite(cx, spr, 'south', null, 0, 21, 40, 1); cx.restore(); c.appendChild(cv); }
      else if (spr && ASSETS.img(spr)) { const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; cv.className = 'ico'; const cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false; const im = ASSETS.img(spr); const s = Math.min(32 / im.width, 32 / im.height); cx.drawImage(im, 0, 0, im.width, im.height, 16 - im.width * s / 2, 16 - im.height * s / 2, im.width * s, im.height * s); c.appendChild(cv); }
      c.addEventListener('click', () => game.onCard(type, key));
      box.appendChild(c); this.cards.push({ el: c, type, key, def });
    });
  },
  update(game) {
    const m = Math.floor(game.gameMin); this.el.clock.textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const p = Math.max(0, game.polska); this.el['polska-fill'].style.width = p + '%'; this.el['polska-fill'].style.backgroundPosition = `${100 - p}% 0`; this.el['polska-val'].textContent = Math.ceil(p);
    this.el['resource-val'].textContent = game.mobile ? `${Math.floor(game.money[game.side])} · ${T('ui.doors')} ${game.breaches}/${CFG.OUTSIDE_WIN_BREACHES}` : Math.floor(game.money[game.side]);
    this.el['side-slogan'].textContent = `${SIDES[game.side].slogan}  ·  ${T('ui.atDoors')}: ${game.breaches}/${CFG.OUTSIDE_WIN_BREACHES}`;
    const money = game.money[game.side];
    for (const c of this.cards) {
      let off = money < c.def.cost;
      if (c.type === 'boss' && game.bossUsed[c.key]) off = true;
      if (c.def.unlockMin && game.gameMin < c.def.unlockMin) off = true;
      c.el.classList.toggle('off', off);
      c.el.classList.toggle('sel', game.selected && game.selected.key === c.key);
    }
  },
  ticker(text) { this.el.ticker.textContent = text; },
  setSelecting(on) { document.body.classList.toggle('selecting', !!on); },
  log(text, cls = '') {
    if (document.body.classList.contains('mobile')) { const t = this.el.toast; t.textContent = text; t.classList.add('on'); clearTimeout(this._toastT); this._toastT = setTimeout(() => t.classList.remove('on'), 3200); }
    this.logLines.push({ text, cls }); if (this.logLines.length > 8) this.logLines.shift();
    this.el.log.innerHTML = this.logLines.map(l => `<div class="${l.cls}">${l.text}</div>`).join('');
  },
  hint(text) { this.el.hint.textContent = text || ''; },
  showEnding(game, winner) {
    this.el.hud.classList.add('hidden'); this.el.ending.classList.remove('hidden');
    const V = this.el['ending-victory'], L = this.el['ending-loss'];
    L.classList.add('hidden'); V.classList.remove('hidden'); V.className = winner || '';
    V.innerHTML = winner ? SIDES[winner].victoryText : `<small>${T('end.polskaZero')}</small>`;
    const n = (+localStorage.getItem('swk_losses') || 0) + 1; localStorage.setItem('swk_losses', n);
    setTimeout(() => {
      document.getElementById('stage').classList.add('glitch');
      setTimeout(() => document.getElementById('stage').classList.remove('glitch'), 1000);
      V.classList.add('hidden'); L.classList.remove('hidden');
      const s = game.stats;
      const rows = [
        [T('end.winner'), winner ? SIDES[winner].name : T('end.nobody')],
        [T('end.time'), this.el.clock.textContent],
        [T('end.towersUnits'), `${s.towers} / ${s.units}`],
        [T('end.atDoors'), `${s.breaches}`],
        [T('end.bosses'), `${s.bosses}`],
        [T('end.citizens'), `${s.citizensLost}`],
        ...ENDING_FACTS.map(([k, v]) => [k, String(v).replace('{n}', s.citizensLost)]),
        [T('end.lossCount'), `${n} ${T(n === 1 ? 'ui.once' : 'ui.times')}`],
      ];
      this.el['ending-stats'].innerHTML = rows.map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`).join('');
      this.el['loss-count'].textContent = T('ui.lossCount', { n, times: T(n === 1 ? 'ui.once' : 'ui.times') });
    }, winner ? 1800 : 900);
  },
};
