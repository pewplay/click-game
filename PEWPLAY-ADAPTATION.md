# Click Game for PewPlay

This directory contains the original static game adapted for the PewPlay game template. Open `index.html` to play.

`game.json` holds the game page text. `preview.png` and `cover.png` provide the page images. The PewPlay workflow checks pushes to `preview` and `main`. The game remains a draft until you remove `"draft": true` after reviewing it.

Game controls: Choose a target category, press Play and click the requested items to build a score.

## Update (October 2026)
- Font Awesome (CDN) and Google Fonts removed: the icons are now bundled locally as SVG paths in `icons.js` (Font Awesome Free, CC BY 4.0). No external requests.
- Full-screen responsive layout (100dvh, safe areas), symbol size adapts to the screen, symbols react on `pointerdown` (no tap delay), HUD with an End button.
- Natural English texts; the 50-point checkpoint now offers "Keep going" / "Stop"; new results screen (score, time, best) with Play again / Menu.
- Best score saved in `click-game:best`; the timer pauses when the page is hidden. Missing letter "J" added.
- New cover and screenshots.
