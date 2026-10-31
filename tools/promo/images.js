/* Miniatury i grafiki promocyjne z zrzutów 4K. Użycie: NODE_PATH=... node tools/promo/images.js <stills_dir> <out_dir> */
const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const STILLS = path.resolve(process.argv[2] || 'promo/raw_fast/stills'); const OUT = path.resolve(process.argv[3] || 'promo/img'); fs.mkdirSync(OUT, { recursive: true });
const data = n => 'data:image/png;base64,' + fs.readFileSync(path.join(STILLS, n + '.png')).toString('base64');
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">';
const css = (w, h) => `<style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#05070f;font-family:'VT323',monospace;color:#fff}
.bg{position:absolute;inset:0;background-size:cover;background-position:center;image-rendering:pixelated}
.shade{position:absolute;inset:0;background:linear-gradient(rgba(5,7,15,.15),rgba(5,7,15,.15) 45%,rgba(5,7,15,.92) 100%)}
.px{font-family:'Press Start 2P',monospace}
.t{position:absolute;left:0;right:0;text-align:center}
h1{margin:0;color:#fff;text-shadow:5px 5px 0 #3a1a5a,0 0 24px #000;line-height:1.45}
.sub{margin:10px 0 0;opacity:.95;text-shadow:0 2px 6px #000}
.url{color:#ffd166;text-shadow:0 2px 6px #000}
.bar{position:absolute;left:0;right:0;bottom:0;background:rgba(5,7,15,.9);border-top:3px solid #2a2d4a;padding:18px 36px;font-size:40px;text-align:left}
.bar b{color:#ffd166;font-family:'Press Start 2P',monospace;font-size:20px;margin-right:18px}
.badge{position:absolute;left:28px;top:24px;font-family:'Press Start 2P',monospace;font-size:14px;color:#ffd166;background:rgba(5,7,15,.85);border:2px solid #ffd166;padding:10px 14px}
</style>`;
const jobs = [
  { name: 'og-1200x630', w: 1200, h: 630, html: `<div class="bg" style="background-image:url(${data('president_gate')})"></div><div class="shade"></div>
     <div class="t" style="bottom:54px"><h1 class="px" style="font-size:40px">STAN WYŻSZEJ<br>KONIECZNOŚCI</h1><p class="sub" style="font-size:34px">Tower defense o nocy w Trybunale. Grasz dowolną stroną.<br>Przegrywa zawsze Polska.</p></div>` },
  { name: 'cover-1920x1080', w: 1920, h: 1080, html: `<div class="bg" style="background-image:url(${data('president_door')})"></div><div class="shade"></div>
     <div class="badge">GRA PRZEGLĄDARKOWA · DARMOWA · 6 MINUT</div>
     <div class="t" style="bottom:70px"><h1 class="px" style="font-size:62px">STAN WYŻSZEJ<br>KONIECZNOŚCI</h1><p class="sub" style="font-size:50px">Wybierz, kogo bronisz. Niezależnie od wyniku przegrywa Polska.</p><p class="url px" style="font-size:22px;margin-top:16px">agentsmill.github.io/stan-wyzszej-koniecznosci</p></div>` },
  { name: 'square-1080x1080', w: 1080, h: 1080, html: `<div class="bg" style="background-image:url(${data('inside')});background-position:62% 45%"></div><div class="shade"></div>
     <div class="t" style="bottom:60px"><h1 class="px" style="font-size:52px">STAN WYŻSZEJ<br>KONIECZNOŚCI</h1><p class="sub" style="font-size:42px">Noc w Trybunale jako tower defense.<br>Grasz dowolną stroną. Przegrywa zawsze Polska.</p></div>` },
  { name: 'screen-1-menu', w: 1600, h: 900, html: `<div class="bg" style="background-image:url(${data('menu')})"></div><div class="bar"><b>1/4</b>Obie strony twierdzą, że bronią Trybunału. Wybierz, kogo bronisz.</div>` },
  { name: 'screen-2-wewnatrz', w: 1600, h: 900, html: `<div class="bg" style="background-image:url(${data('inside')})"></div><div class="bar"><b>2/4</b>WEWNĄTRZ: kordony, sędziowie w drzwiach, zarządzenia, komunikaty na X, wnioski o immunitet.</div>` },
  { name: 'screen-3-prezydent', w: 1600, h: 900, html: `<div class="bg" style="background-image:url(${data('president_door')})"></div><div class="bar"><b>3/4</b>NA ZEWNĄTRZ: tłum, poseł z nożycami, prezes partii. Przez kordon przechodzi tylko Prezydent.</div>` },
  { name: 'screen-4-przegrana', w: 1600, h: 900, html: `<div class="bg" style="background-image:url(${data('loss')})"></div><div class="bar"><b>4/4</b>Ekran końcowy jest zawsze ten sam, niezależnie od tego, kto wygrał.</div>` },
];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const j of jobs) {
    const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 });
    await page.setContent(FONTS + css(j.w, j.h) + `<body>${j.html}</body>`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, j.name + '.png') }); console.log('obraz', j.name); await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
