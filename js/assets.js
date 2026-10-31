'use strict';
/* Loader: ładuje manifest, PNG-i i layouty arkuszy. */
const ASSETS = {
  images: {},   // key -> HTMLImageElement
  sprites: {},  // key -> { img, cell, cols, rot: {dir: idx}, anims: {name: {dir: {row, frames}}} }
  manifest: null,
  async load(onProgress) {
    const man = await fetch('assets/manifest.json').then(r => r.json());
    this.manifest = man;
    const jobs = [];
    for (const key of Object.keys(man.characters)) {
      if (!man.characters[key]) continue;
      jobs.push(this._loadSprite(key));
    }
    for (const key of Object.keys(man.images)) jobs.push(this._loadImage('objects/' + key, key));
    for (const key of Object.keys(man.tiles)) jobs.push(this._loadImage('tiles/' + key, 'tile_' + key));
    let done = 0;
    await Promise.all(jobs.map(j => j.catch(e => console.warn('asset', e)).then(() => { done++; onProgress && onProgress(done / jobs.length); })));
  },
  _loadImage(path, key) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { this.images[key] = img; res(img); };
      img.onerror = () => rej(new Error('brak ' + path));
      img.src = 'assets/' + path + '.png';
    });
  },
  async _loadSprite(key) {
    const [img, layout] = await Promise.all([
      this._loadImage('sprites/' + key, 'spr_' + key),
      fetch('assets/sprites/' + key + '.json').then(r => r.json()),
    ]);
    const sp = { img, cell: layout.cell, cols: layout.columns, rot: {}, anims: {} };
    for (const r of layout.rows) {
      if (r.type === 'rotations') r.directions.forEach((d, i) => { sp.rot[d] = { row: r.row, col: i }; });
      else if (r.type === 'animation') {
        const nm = /walk|ch[oó]d/i.test(r.animation) ? 'walk' : (/idle|stanie|breath/i.test(r.animation) ? 'idle' : r.animation);
        (sp.anims[nm] ||= {})[r.direction] = { row: r.row, frames: r.frame_count };
      }
    }
    this.sprites[key] = sp;
    return sp;
  },
  sprite(key) { return this.sprites[key] || null; },
  img(key) { return this.images[key] || null; },
};

/* Rysuje klatkę postaci: anim 'walk'/'idle'/null, kierunek, czas t (s). (x,y) = punkt pod stopami. */
function drawSprite(ctx, key, dir, anim, t, x, y, scale = 1, tint = null) {
  const sp = ASSETS.sprite(key);
  if (!sp) { ctx.fillStyle = tint || '#f0f'; ctx.fillRect(x - 6, y - 24, 12, 24); return; }
  let flip = false, row, col;
  const a = anim && sp.anims[anim];
  if (a) {
    let d = dir, ad = a[d];
    if (!ad && a[MIRROR[d]]) { ad = a[MIRROR[d]]; flip = true; }
    if (!ad && a[NEAREST_CARDINAL[d]]) { ad = a[NEAREST_CARDINAL[d]]; d = NEAREST_CARDINAL[d]; }
    if (ad) { row = ad.row; col = Math.floor(t * 7) % ad.frames; }
  }
  if (row === undefined) {
    let r = sp.rot[dir];
    if (!r && sp.rot[MIRROR[dir]]) { r = sp.rot[MIRROR[dir]]; flip = true; }
    if (!r) r = sp.rot.south; row = r.row; col = r.col;
    if (anim === 'idle') y += Math.round(Math.sin(t * 4) * 0.8); // delikatne „oddychanie"
  }
  const cw = sp.cell.width, ch = sp.cell.height;
  const dw = cw * scale, dh = ch * scale;
  ctx.save();
  if (flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
  ctx.drawImage(sp.img, col * cw, row * ch, cw, ch, Math.round(x - dw / 2), Math.round(y - dh + 6 * scale), dw, dh);
  ctx.restore();
}
