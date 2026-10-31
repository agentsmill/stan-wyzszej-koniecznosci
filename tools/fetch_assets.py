#!/usr/bin/env python3
"""Pobiera assety z PixelLab według assets/manifest.json.

Użycie:
  python3 tools/fetch_assets.py            # wszystko
  python3 tools/fetch_assets.py characters # tylko postacie
  python3 tools/fetch_assets.py images     # tylko obrazy/obiekty
  python3 tools/fetch_assets.py tiles      # tylko kafle

Postacie: arkusz sprite'ów (PNG + layout JSON) ze spritesheet endpointu.
Obrazy/kafle: bezpośrednie URL-e z manifestu.
"""
import io
import json
import pathlib
import sys
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "assets" / "manifest.json"
UA = {"User-Agent": "trybunal-fetch/1.0"}


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def fetch_character(key: str, cid: str) -> None:
    out_png = ROOT / "assets" / "sprites" / f"{key}.png"
    out_json = ROOT / "assets" / "sprites" / f"{key}.json"
    data = get(f"https://api.pixellab.ai/mcp/characters/{cid}/spritesheet")
    zf = zipfile.ZipFile(io.BytesIO(data))
    png = next(n for n in zf.namelist() if n.endswith(".png"))
    js = next(n for n in zf.namelist() if n.endswith(".json"))
    out_png.write_bytes(zf.read(png))
    layout = json.loads(zf.read(js))
    sheet = layout["spritesheet"]
    slim = {
        "cell": sheet["cell_size"],
        "columns": sheet["columns"],
        "rows": [
            {k: r[k] for k in ("row", "type", "frame_count", "directions", "animation", "direction") if k in r}
            for r in sheet["rows"]
        ],
    }
    out_json.write_text(json.dumps(slim, ensure_ascii=False, indent=1))
    anims = sorted({r.get("animation") for r in sheet["rows"] if r.get("animation")})
    print(f"  {key:14s} {sheet['sheet_size']['width']}x{sheet['sheet_size']['height']} anims={anims}")


def fetch_file(sub: str, key: str, url: str) -> None:
    out = ROOT / "assets" / sub / f"{key}.png"
    out.write_bytes(get(url))
    print(f"  {key:14s} -> {out.relative_to(ROOT)}")


def main() -> None:
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    man = json.loads(MANIFEST.read_text())
    if what in ("all", "characters"):
        print("Postacie:")
        for key, cid in man.get("characters", {}).items():
            if cid:
                try:
                    fetch_character(key, cid)
                except Exception as e:  # noqa: BLE001
                    print(f"  {key:14s} BŁĄD: {e}")
    if what in ("all", "images"):
        print("Obiekty:")
        for key, url in man.get("images", {}).items():
            if url:
                fetch_file("objects", key, url)
    if what in ("all", "tiles"):
        print("Kafle:")
        for key, url in man.get("tiles", {}).items():
            if url:
                fetch_file("tiles", key, url)


if __name__ == "__main__":
    main()
