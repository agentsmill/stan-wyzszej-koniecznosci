# Stan wyższej konieczności

Cyfrowy performans o nocy z 30 na 31 października 2026 r. w Trybunale Konstytucyjnym.
Tower defense, w którym można grać obiema stronami. Niezależnie od tego, kto „wygra", ekran końcowy
jest zawsze ten sam: **PRZEGRANA: POLSKA**.

## English

The game is bilingual. The language follows the browser, the PL / EN switch in the menu overrides it,
and `?lang=en` / `?lang=pl` force it. Everything is translated: cards, the night's timeline ticker,
the event log, hints and the ending screen. Texts live in `js/i18n.js` (code strings) and `js/config.js`
(data: `B('polski', 'English')` pairs flattened at load time).

**What it is:** a pixel-art tower defense about the night of 30/31 October 2026 at Poland's Constitutional
Tribunal. Pick a side: INSIDE holds the doors with police cordons, judges and decrees; OUTSIDE sends the
crowd, an MP with bolt cutters and, at 0:58, the President, the only one who walks through the cordon.
A third counter, POLAND, drains from both sides' moves. Whoever wins, the ending screen is the same:
DEFEAT: POLAND.

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
  Kordon odpycha jednego mocno, a tłum słabo (odrzut dzieli się między napierających) i regeneruje się,
  gdy nikt nie napiera; sędziów jest najwyżej 4, po wypchnięciu jednego reszta przegrupowuje się 25 s. Zwykły tłum nie wchodzi do budynku: dobija się do drzwi i zostaje wyprowadzony
  (licznik „pod drzwiami"). Do środka przechodzi tylko Prezydent.
- **NA ZEWNĄTRZ**: kliknij romb punktu wejścia na ulicy, potem kartę (1–8) — jednostka rusza od razu.
- `R` pokazuje/ukrywa zasięgi.
- **Telefon / tablet** (szerokość poniżej 900 px albo ekran dotykowy): mapę przeciągasz palcem i przybliżasz
  dwoma palcami; wieżę stawiasz dwoma tapnięciami w ten sam kafel (pierwsze pokazuje podgląd i zasięg),
  ✕ anuluje; punkt wejścia wybierasz tapnięciem w romb na ulicy; karty przewijasz w listwie na dole;
  log zdarzeń jest pod przyciskiem „log", ostatnie zdarzenie pokazuje się jako dymek.

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
