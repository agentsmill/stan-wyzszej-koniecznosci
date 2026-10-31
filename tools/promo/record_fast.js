/* Szybkie ujęcia do dynamicznego montażu + zrzuty 4K do miniatur.
   Użycie: NODE_PATH=... node tools/promo/record_fast.js <katalog_wyj> [base] */
const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const OUT = path.resolve(process.argv[2] || 'promo/raw_fast'); const BASE = process.argv[3] || 'http://localhost:8799/';
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); const ONLY = process.argv[4] || '';
async function ready(page) { await page.waitForFunction(() => typeof GAME !== 'undefined' && GAME.state !== 'loading', null, { timeout: 30000 }); await page.evaluate(() => document.fonts.ready); await sleep(500); }
async function take(browser, name, fn) {
  if (ONLY && !name.startsWith(ONLY)) { console.log('pomijam', name); return; }
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } } });
  const page = await ctx.newPage(); const t0 = Date.now(); const marks = []; const track = [];
  const mark = l => { marks.push({ label: l, t: (Date.now() - t0) / 1000 }); console.log(`  [${((Date.now() - t0) / 1000).toFixed(1)}s] ${l}`); };
  const tracker = setInterval(async () => { try { const p = await page.evaluate(() => { const u = GAME.units.find(x => x.key === 'president' && !x.dead); return u ? { gx: u.gx, gy: u.gy } : null; }); if (p) track.push({ t: (Date.now() - t0) / 1000, ...p }); } catch (_) {} }, 120);
  await fn(page, mark); clearInterval(tracker);
  const v = page.video(); await page.close(); const p = await v.path(); await ctx.close();
  fs.renameSync(p, path.join(OUT, name + '.webm')); fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify({ marks, track }, null, 1)); console.log('zapisano', name);
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const spawnMany = async (page, list, gap) => { for (const [k, s] of list) { await page.evaluate(([k, s]) => GAME.spawnUnit(k, s, true), [k, s]); await sleep(gap); } };

  await take(browser, 'f1_inside', async (page, mark) => {
    await page.goto(BASE); await ready(page); mark('menu');
    await page.hover('.side-btn.outside'); await sleep(500); await page.hover('.side-btn.inside'); await sleep(500); await page.click('.side-btn.inside'); mark('start');
    await page.evaluate(() => { GAME.speed = 2.5; GAME.money.inside = 900; GAME.money.outside = 700; });
    await spawnMany(page, [['protester', 0], ['protester', 1], ['unionist', 2], ['protester', 1], ['protester', 0], ['unionist', 1], ['protester', 2], ['protester', 1], ['mp', 1], ['protester', 0]], 90);
    mark('build');
    for (const [k, x, y] of [['cordon', 12, 9], ['cordon', 7, 5], ['judge', 14, 5], ['riot', 12, 8], ['barrier', 11, 9], ['barrier', 13, 9], ['decree', 10, 8], ['tweet', 14, 8], ['judge', 17, 3], ['decree', 15, 7], ['cordon', 16, 5], ['tweet', 9, 7]]) { await page.evaluate(([k, x, y]) => GAME.build(k, x, y), [k, x, y]); await sleep(170); }
    await spawnMany(page, [['protester', 1], ['protester', 0], ['unionist', 1], ['protester', 2], ['lawyer', 1], ['protester', 1], ['journalist', 0], ['protester', 2], ['protester', 1], ['unionist', 0], ['protester', 1], ['protester', 2]], 110);
    mark('bosses'); await page.evaluate(() => GAME.summonBoss('prosecutor')); await sleep(1800);
    await page.evaluate(() => GAME.summonBoss('premier')); await sleep(1400);
    await spawnMany(page, [['protester', 1], ['protester', 0], ['protester', 2], ['protester', 1]], 100);
    await page.evaluate(() => GAME.summonBoss('senior')); mark('freeze'); await sleep(3500); mark('end');
  });

  await take(browser, 'f2_outside', async (page, mark) => {
    await page.goto(BASE + '?side=outside'); await ready(page); await page.addStyleTag({ content: '#log{display:none !important}' }); mark('start');
    await page.evaluate(() => { GAME.speed = 2.5; GAME.money.outside = 1800; GAME.money.inside = 320; });
    await sleep(600);
    await spawnMany(page, [['protester', 1], ['protester', 0], ['protester', 2], ['unionist', 1], ['protester', 1], ['mp', 1], ['protester', 0], ['protester', 2], ['unionist', 0], ['protester', 1], ['journalist', 1], ['protester', 2], ['protester', 1], ['lawyer', 0], ['protester', 1], ['unionist', 2], ['protester', 0], ['protester', 1]], 80);
    mark('swarm');
    await page.evaluate(() => GAME.summonBoss('tkpresident')); await sleep(700);
    await page.waitForFunction(() => !MAP.gates.furtka.locked, null, { timeout: 30000 }).catch(() => {}); mark('cut');
    await page.evaluate(() => GAME.summonBoss('chairman')); mark('chairman');
    await spawnMany(page, [['protester', 1], ['unionist', 1], ['protester', 1], ['protester', 0], ['unionist', 0], ['protester', 1]], 150);
    await page.waitForFunction(() => GAME.gameMin >= 56, null, { timeout: 60000 }); 
    await page.evaluate(() => { GAME.speed = 1.8; }); await page.evaluate(() => GAME.summonBoss('president')); mark('president');
    await spawnMany(page, [['protester', 0], ['protester', 0], ['protester', 0]], 500);
    const t1 = Date.now(); while (Date.now() - t1 < 70000) { const st = await page.evaluate(() => GAME.state); if (st === 'ending') break; await sleep(200); }
    mark('ending'); await sleep(2200); mark('loss'); await sleep(4500); mark('end');
  });

  /* ---------- zrzuty 4K do miniatur ---------- */
  if (ONLY && ONLY !== 'stills') { await browser.close(); return; }
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const shot = n => page.screenshot({ path: path.join(OUT, 'stills', n + '.png') });
  await page.goto(BASE); await ready(page); await page.hover('.side-btn.inside'); await sleep(300); await shot('menu');
  await page.click('.side-btn.inside'); await page.evaluate(() => { GAME.speed = 2; GAME.money.inside = 900; GAME.money.outside = 500; });
  await spawnMany(page, [['protester', 1], ['protester', 0], ['unionist', 2], ['protester', 1], ['protester', 0], ['unionist', 1], ['protester', 2], ['mp', 1], ['protester', 1], ['protester', 0], ['protester', 2], ['protester', 1]], 60);
  for (const [k, x, y] of [['cordon', 12, 9], ['cordon', 7, 5], ['judge', 14, 5], ['riot', 12, 8], ['barrier', 11, 9], ['barrier', 13, 9], ['decree', 10, 8], ['tweet', 14, 8], ['judge', 17, 3]]) await page.evaluate(([k, x, y]) => GAME.build(k, x, y), [k, x, y]);
  await sleep(4500); await page.evaluate(() => GAME.summonBoss('prosecutor')); await sleep(2500); await shot('inside');
  await page.goto(BASE + '?side=outside'); await ready(page); await page.evaluate(() => { GAME.speed = 2.5; GAME.money.outside = 1500; GAME.money.inside = 320; });
  await spawnMany(page, [['protester', 1], ['protester', 0], ['protester', 2], ['unionist', 1], ['mp', 1], ['protester', 1], ['protester', 0], ['unionist', 2], ['protester', 1], ['journalist', 1], ['protester', 2], ['protester', 1]], 60);
  await page.evaluate(() => GAME.summonBoss('tkpresident')); await page.evaluate(() => GAME.summonBoss('chairman'));
  await page.waitForFunction(() => GAME.gameMin >= 56, null, { timeout: 60000 }); await page.evaluate(() => { GAME.speed = 1.5; GAME.summonBoss('president'); });
  await page.waitForFunction(() => { const u = GAME.units.find(x => x.key === 'president'); return u && u.gx >= 12 && u.gy <= 9.5; }, null, { timeout: 60000 }).catch(() => {}); await shot('president_gate');
  await page.waitForFunction(() => { const u = GAME.units.find(x => x.key === 'president'); return !u || (u.gx >= 15 && u.gy <= 5.5); }, null, { timeout: 60000 }).catch(() => {}); await shot('president_door');
  await page.waitForFunction(() => GAME.state === 'ending', null, { timeout: 40000 }).catch(() => page.evaluate(() => GAME.endGame('outside')));
  await sleep(600); await shot('victory'); await sleep(3200); await shot('loss');
  await ctx.close(); await browser.close(); console.log('stills ok');
})().catch(e => { console.error(e); process.exit(1); });
