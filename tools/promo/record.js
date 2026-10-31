/* Nagrywa ujęcia do filmiku promocyjnego: Playwright (Chrome) + lokalny serwer gry.
   Użycie: NODE_PATH=<node_modules z playwright-core> node tools/promo/record.js <katalog_wyjściowy> [http://localhost:8799/] */
const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const OUT = path.resolve(process.argv[2] || 'promo/raw'); const BASE = process.argv[3] || 'http://localhost:8799/';
fs.mkdirSync(OUT, { recursive: true });
const W = 1920, H = 1080; const ONLY = process.argv[4] || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function take(browser, name, fn) {
  if (ONLY && !name.startsWith(ONLY)) { console.log('pomijam', name); return; }
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: { width: W, height: H } } });
  const page = await ctx.newPage(); const t0 = Date.now(); const marks = [];
  const mark = (label) => { marks.push({ label, t: (Date.now() - t0) / 1000 }); console.log(`  [${((Date.now() - t0) / 1000).toFixed(1)}s] ${label}`); };
  page.on('pageerror', e => console.log('  PAGE ERROR', e.message));
  await fn(page, mark);
  const v = page.video(); await page.close(); const p = await v.path(); await ctx.close();
  const dst = path.join(OUT, name + '.webm'); fs.renameSync(p, dst);
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(marks, null, 1));
  console.log('zapisano', dst);
}

async function ready(page) {
  await page.waitForFunction(() => typeof GAME !== 'undefined' && GAME.state !== 'loading', null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready); await sleep(600);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  /* ---------- UJĘCIE 1: menu + gra WEWNĄTRZ ---------- */
  await take(browser, 'take1_inside', async (page, mark) => {
    await page.goto(BASE); await ready(page); mark('menu');
    await sleep(1200);
    await page.hover('.side-btn.inside'); await sleep(900);
    await page.hover('.side-btn.outside'); await sleep(900);
    await page.hover('.side-btn.inside'); await sleep(500);
    await page.click('.side-btn.inside'); mark('start inside');
    await page.evaluate(() => { GAME.speed = 1.3; GAME.money.inside = 600; GAME.money.outside = 200; });
    const build = async (k, x, y, wait = 650) => { await page.evaluate(([k, x, y]) => GAME.build(k, x, y), [k, x, y]); await sleep(wait); };
    const spawn = async (k, s) => page.evaluate(([k, s]) => GAME.spawnUnit(k, s, true), [k, s]);
    for (let i = 0; i < 8; i++) { await spawn(i % 4 === 3 ? 'unionist' : 'protester', i % 3); await sleep(250); }
    await build('cordon', 12, 9); await build('cordon', 7, 5); await build('judge', 14, 5); mark('kordony');
    await build('riot', 12, 8); await build('barrier', 11, 9); await build('barrier', 13, 9);
    await build('decree', 10, 8); await build('tweet', 14, 8); await build('judge', 17, 3); mark('wieże gotowe');
    for (let i = 0; i < 10; i++) { await spawn(i % 5 === 4 ? 'unionist' : 'protester', i % 3); await sleep(300); }
    await spawn('mp', 1); await sleep(2500);
    await page.evaluate(() => GAME.summonBoss('prosecutor')); mark('prokurator');
    for (let i = 0; i < 6; i++) { await spawn('protester', i % 3); await sleep(350); }
    await sleep(3500);
    await page.evaluate(() => GAME.summonBoss('senior')); mark('senior freeze');
    await sleep(5000); mark('koniec ujęcia 1');
  });

  /* ---------- UJĘCIE 2: gra NA ZEWNĄTRZ + Prezydent + zakończenie ---------- */
  await take(browser, 'take2_outside', async (page, mark) => {
    await page.goto(BASE + '?side=outside'); await ready(page); mark('start outside');
    await page.evaluate(() => { GAME.speed = 2.0; GAME.money.outside = 900; GAME.money.inside = 260; });
    const spawn = async (k, s, wait = 220) => { await page.evaluate(([k, s]) => GAME.spawnUnit(k, s, false), [k, s]); await sleep(wait); };
    await sleep(800);
    for (let i = 0; i < 7; i++) await spawn(i % 3 === 2 ? 'unionist' : 'protester', i % 3);
    await spawn('mp', 1, 400); await spawn('journalist', 0, 300); await spawn('lawyer', 2, 300);
    await page.evaluate(() => GAME.summonBoss('tkpresident')); mark('prezes TK');
    for (let i = 0; i < 6; i++) await spawn('protester', i % 3, 400);
    await sleep(1500);
    await page.evaluate(() => GAME.summonBoss('chairman')); mark('prezes partii');
    for (let i = 0; i < 6; i++) await spawn(i % 2 ? 'unionist' : 'protester', i % 3, 500);
    await page.waitForFunction(() => GAME.gameMin >= 56, null, { timeout: 60000 }); mark('0:56');
    await page.evaluate(() => { GAME.speed = 1.5; GAME.money.outside = 300; });
    await page.evaluate(() => GAME.summonBoss('president')); mark('prezydent');
    for (let i = 0; i < 5; i++) await spawn('protester', 0, 700);
    const t1 = Date.now();
    while (Date.now() - t1 < 60000) { const st = await page.evaluate(() => ({ s: GAME.state, hp: (GAME.units.find(u => u.key === 'president') || {}).hp })); if (st.s === 'ending') break; await sleep(250); }
    mark('ending'); await sleep(2200); mark('przegrana'); await sleep(5500); mark('koniec ujęcia 2');
  });

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
