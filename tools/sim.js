/* Symulacja AI kontra AI w headless Chrome. Użycie: NODE_PATH=... node tools/sim.js [liczba_gier] [speed] [base] */
const { chromium } = require('playwright-core');
const N = +(process.argv[2] || 3), SPEED = +(process.argv[3] || 10), BASE = process.argv[4] || 'http://localhost:8799/';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const rows = [];
  for (let i = 0; i < N; i++) {
    await page.goto(`${BASE}?auto=1&speed=${SPEED}&side=inside&lang=pl&cb=${Date.now()}`);
    await page.waitForFunction(() => typeof GAME !== 'undefined' && GAME.state === 'play', null, { timeout: 30000 });
    await page.waitForFunction(() => GAME.state === 'ending', null, { timeout: 120000 }).catch(() => {});
    const r = await page.evaluate(() => ({ winner: GAME.winner, end: `${Math.floor(GAME.gameMin / 60)}:${String(Math.floor(GAME.gameMin % 60)).padStart(2, '0')}`, polska: Math.round(GAME.polska), ...GAME.stats, towersAlive: GAME.towers.length, doors: GAME.towers.filter(t => t.key === 'door').length, presHp: Math.round((GAME.units.find(u => u.key === 'president') || {}).hp || 0), bossesUsed: Object.keys(AI.used).join('+') }));
    rows.push(r); console.log(JSON.stringify(r));
  }
  await browser.close();
  const w = rows.map(r => r.winner || 'polska0'); console.log('WYNIKI:', w.join(', '));
})().catch(e => { console.error(e); process.exit(1); });
