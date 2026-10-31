#!/usr/bin/env python3
"""Post-produkcja assetów: usuwa wypalone tło budynku, przycina kafle, liczy kotwice.
Użycie: python3 tools/postprocess.py
"""
import json, pathlib
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent
OBJ = ROOT / 'assets' / 'objects'
TIL = ROOT / 'assets' / 'tiles'
MAN = ROOT / 'assets' / 'manifest.json'

def flood_remove_bg(path, tol=18):
    im = Image.open(path).convert('RGBA'); w, h = im.size; px = im.load()
    bg = px[0, 0][:3]
    seen = bytearray(w * h); stack = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    def close(c): return all(abs(c[i] - bg[i]) <= tol for i in range(3))
    n = 0
    while stack:
        x, y = stack.pop(); i = y * w + x
        if seen[i]: continue
        seen[i] = 1
        if not close(px[x, y][:3]): continue
        px[x, y] = (0, 0, 0, 0); n += 1
        if x > 0: stack.append((x - 1, y))
        if x < w - 1: stack.append((x + 1, y))
        if y > 0: stack.append((x, y - 1))
        if y < h - 1: stack.append((x, y + 1))
    im.save(path); return im, n, bg

def base_corners(im):
    w, h = im.size; px = im.load()
    bottom = None
    for y in range(h - 1, -1, -1):
        xs = [x for x in range(w) if px[x, y][3] > 0]
        if xs: bottom = ((min(xs) + max(xs)) // 2, y); break
    left = right = None
    for x in range(w):
        ys = [y for y in range(h) if px[x, y][3] > 0]
        if ys: left = (x, max(ys)); break
    for x in range(w - 1, -1, -1):
        ys = [y for y in range(h) if px[x, y][3] > 0]
        if ys: right = (x, max(ys)); break
    return bottom, left, right

man = json.loads(MAN.read_text())
anchors = man.setdefault('anchors', {})
for key in ('building', 'building_alt'):
    p = OBJ / f'{key}.png'
    if not p.exists(): continue
    im = Image.open(p).convert('RGBA')
    if im.getpixel((0, 0))[3] > 0:
        im, n, bg = flood_remove_bg(p); print(key, 'usunięto tło', bg, n, 'px')
    b, l, r = base_corners(im)
    print(key, 'bottom', b, 'left', l, 'right', r, 'size', im.size)
    anchors[key] = {'bx': b[0], 'by': b[1], 'lx': l[0], 'ly': l[1], 'rx': r[0], 'ry': r[1], 'w': im.size[0], 'h': im.size[1]}

# kafle: wytnij górną ścianę rombu i przeskaluj do dokładnie 64x32 (siatka 2:1)
for p in sorted(TIL.glob('*.png')):
    im = Image.open(p).convert('RGBA')
    if im.size == (64, 32): continue
    px = im.load(); w, h = im.size
    widths = []
    for y in range(h):
        xs = [x for x in range(w) if px[x, y][3] > 0]
        widths.append((max(xs) - min(xs) + 1) if xs else 0)
    top = next(y for y in range(h) if widths[y] > 0)
    mid = max(range(h), key=lambda y: (widths[y], -y))  # pierwszy najszerszy wiersz
    face_h = 2 * (mid - top) + 1
    face = im.crop((0, top, w, top + face_h)).resize((64, 32), Image.NEAREST)
    face.save(p)
    print('tile', p.name, 'top', top, 'mid', mid, 'face_h', face_h, '-> 64x32')
MAN.write_text(json.dumps(man, ensure_ascii=False, indent=1))
