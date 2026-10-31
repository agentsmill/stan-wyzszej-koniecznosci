# Stan wyższej konieczności

Cyfrowy performans o nocy z 30 na 31 października 2026 r. w Trybunale Konstytucyjnym.
Tower defense, w którym można grać obiema stronami. Niezależnie od tego, kto „wygra", ekran końcowy
jest zawsze ten sam: **PRZEGRANA: POLSKA**.

## Graj online

https://agentsmill.github.io/stan-wyzszej-koniecznosci/ (GitHub Pages z gałęzi `main`).

## Uruchomienie lokalne

Gra to czysty HTML5 Canvas + vanilla JS, ale assety ładuje przez `fetch`, więc potrzebuje
dowolnego serwera HTTP (otwarcie `index.html` z dysku nie zadziała w Chrome).

```bash
python3 -m http.server 8799
```

i wejdź na <http://localhost:8799>. Na macOS można też dwukliknąć `start.command`.

Parametry URL do testów: `?side=inside|outside` (od razu start), `?speed=3` (przyspieszenie),
`?auto=1` (AI gra obiema stronami).

## Sterowanie

- **WEWNĄTRZ**: karta (klik lub klawisze 1–9) → klik na kafel dziedzińca. Prawy przycisk / Esc anuluje.
  Sędzia tylko przy drzwiach. Wniosek o immunitet: wybierz kartę, kliknij bossa (raz na osobę).
  Kordon policji i Oddział prewencji nasycają napór tłumu (więcej rąk nie znaczy szybciej) i regenerują się,
  gdy nikt nie napiera. Zwykły tłum nie wchodzi do budynku: dobija się do drzwi i zostaje wyprowadzony
  (licznik „pod drzwiami"). Do środka przechodzi tylko Prezydent.
- **NA ZEWNĄTRZ**: kliknij romb punktu wejścia na ulicy, potem kartę (1–8) — jednostka rusza od razu.
- `R` pokazuje/ukrywa zasięgi.

## Struktura

- `js/config.js` — wszystkie liczby, teksty, linia czasu nocy, statystyki końcowe. **Tu się balansuje.**
- `js/map.js` — teren, ogrodzenie, bramy, drzwi, pola przepływu (Dijkstra).
- `js/entities.js` — jednostki, wieże, bossowie, obywatele, pociski.
- `js/ai.js` — AI strony przeciwnej.
- `js/game.js` — pętla, ekonomia, licznik POLSKA, wejście, render (noc, światła).
- `js/ui.js` — HUD, karty, log, ekran końcowy.
- `tools/fetch_assets.py` + `tools/postprocess.py` — pobieranie i obróbka assetów z PixelLab wg `assets/manifest.json`.
- `docs/design.md` — dokument projektowy z faktami, na których opiera się fabuła.

## Assety

Pixel art wygenerowany w PixelLab (postacie 48×48 „low top-down", 8 kierunków; chód SE/NE, reszta
kierunków odbijana lustrzanie w kodzie). Część postaci (Kibic, Dresiarz, Budowlaniec, obywatele)
pochodzi z istniejącej biblioteki na koncie PixelLab. Kafle izometryczne 64×32, gmach TK 400×320.
