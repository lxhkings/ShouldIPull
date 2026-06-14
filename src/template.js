// src/template.js —— 纯函数: 数据 -> HTML 字符串. 无框架.
const SITE = "https://shouldipull.com";
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet" />`;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function footerNav(games) {
  const links = games
    .map((g) => `<a href="/${g.id}/">${esc(g.name)}</a>`)
    .join("\n      ");
  return `
  <footer class="site-footer">
    <nav class="footer-nav" aria-label="Site">
      <a href="/">Home</a>
      ${links}
    </nav>
    <p class="footer-mark">ShouldIPull.com</p>
  </footer>`;
}

export function currentBanners(items) {
  if (!items || items.length === 0) return "";
  const cards = items
    .map(({ char, game, banner }) =>
      `<a class="banner-card" href="/${game.id}/should-i-pull/${char.id}/">
        <span class="bc-name">${esc(char.name)}</span>
        <span class="bc-meta">${esc(char.element)} · ${esc(char.weapon)} · v${esc(banner.version)}</span>
        <span class="bc-cta">Should I pull? →</span>
      </a>`)
    .join("\n      ");
  return `
  <section class="current-banners">
    <h2>On the current banner</h2>
    <div class="banner-cards">
      ${cards}
    </div>
  </section>`;
}

function bannerLine(char, banner) {
  if (!banner) return `${char.name} is not on the current banner. Plan ahead for the next rerun.`;
  const kind = banner.type === "new" ? "makes their first appearance" : "is on a rerun banner";
  return `${char.name} ${kind} in version ${banner.version}, live from ${banner.start} until ${banner.end}.`;
}

export function calculatorForm() {
  return `
    <form id="calc">
      <label>Wishes / Primogems you have
        <input name="wishes" type="number" min="0" inputmode="numeric" placeholder="e.g. 80" />
        <small>1 wish = 160 primogems</small>
      </label>
      <label>Pity (pulls since last 5★)
        <input name="pity" type="number" min="0" max="89" inputmode="numeric" placeholder="0-89" />
      </label>
      <div class="field">
        <span class="field-label">Guaranteed?</span>
        <div class="seg" role="group" aria-label="Guarantee">
          <button type="button" class="seg-btn is-active" data-guar="no">🎲 50/50</button>
          <button type="button" class="seg-btn" data-guar="yes">✨ Guaranteed</button>
        </div>
        <input type="hidden" name="guaranteed" value="no" />
      </div>
      <div class="field">
        <span class="field-label">Goal (copies)</span>
        <div class="chips" role="group" aria-label="Copies desired">
          <button type="button" class="chip is-active" data-target="1">C0</button>
          <button type="button" class="chip" data-target="2">C1</button>
          <button type="button" class="chip" data-target="3">C2</button>
          <button type="button" class="chip" data-target="4">C3</button>
          <button type="button" class="chip" data-target="5">C4</button>
          <button type="button" class="chip" data-target="6">C5</button>
          <button type="button" class="chip" data-target="7">C6</button>
        </div>
        <input type="hidden" name="target" value="1" />
      </div>
      <label class="checkbox"><input type="checkbox" name="wantWeapon" /> Also want the signature weapon</label>
      <button type="submit">Should I pull?</button>
      <p id="error" class="error" role="alert"></p>
    </form>
    <section id="result" hidden>
      <div id="card">
        <div id="verdict-emoji"></div>
        <p id="verdict-line"></p>
        <div class="bar"><div id="bar-fill"></div></div>
        <p id="prob-text"></p>
        <ul id="reasons"></ul>
        <p class="watermark">ShouldIPull.com</p>
      </div>
      <button id="share">Save share image</button>
      <small class="algo">Based on official rates + pity system · 10,000 Monte Carlo simulations</small>
    </section>
    <section id="community-stats" hidden></section>`;
}

export function characterPage({ char, game, banner, games = [] }) {
  const url = `${SITE}/${game.id}/should-i-pull/${char.id}/`;
  const desc = `Should you pull for ${char.name} (${char.rarity}★ ${char.element}, ${char.weapon})? Free pity calculator gives you Pull / Wait / Skip based on your wishes and pity.`;
  const gameData = JSON.stringify({ game: game.id, character: char.id, rules: game.rules, weaponAvgCost: game.weaponAvgCost });
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Should I Pull ${esc(char.name)}? — Pity Calculator | ShouldIPull</title>
  <meta name="description" content="${esc(desc)}" />
  <meta property="og:title" content="Should I Pull ${esc(char.name)}? — ShouldIPull" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="${url}" />
  <link rel="stylesheet" href="/style.css" />
  ${FONTS}
</head>
<body>
  <div class="starfield" aria-hidden="true">
    <div class="nebula"></div>
    <div class="stars"></div>
    <div class="stars2"></div>
    <div class="shoot"></div>
    <div class="shoot2"></div>
  </div>
  <main id="app">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a> <span aria-hidden="true">›</span>
      <a href="/${game.id}/">${esc(game.name)}</a> <span aria-hidden="true">›</span>
      <span aria-current="page">${esc(char.name)}</span>
    </nav>
    <h1>Should I Pull ${esc(char.name)}?</h1>
    <p class="sub">${esc(char.name)} — ${esc(char.rarity)}★ ${esc(char.element)}, ${esc(char.weapon)} · ${esc(char.role)}.</p>
    <p class="banner-status">${esc(bannerLine(char, banner))}</p>
    ${calculatorForm()}
  </main>
  ${footerNav(games)}
  <script type="application/json" id="game-data">${gameData}</script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script type="module" src="/src/ui.js"></script>
</body>
</html>`;
}

export function gameIndexPage({ game, characters, games = [] }) {
  const url = `${SITE}/${game.id}/`;
  const items = characters
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => `<li><a href="/${game.id}/should-i-pull/${c.id}/">Should I Pull ${esc(c.name)}?</a> <span>${esc(c.element)} · ${esc(c.weapon)}</span></li>`)
    .join("\n      ");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(game.name)} — Should I Pull? Character Pity Calculators | ShouldIPull</title>
  <meta name="description" content="Per-character pull/wait/skip pity calculators for ${esc(game.name)}. Pick a character to see if you should pull." />
  <link rel="canonical" href="${url}" />
  <link rel="stylesheet" href="/style.css" />
  ${FONTS}
</head>
<body>
  <div class="starfield" aria-hidden="true">
    <div class="nebula"></div>
    <div class="stars"></div>
    <div class="stars2"></div>
    <div class="shoot"></div>
    <div class="shoot2"></div>
  </div>
  <main id="app">
    <h1>${esc(game.name)} — Should I Pull?</h1>
    <p class="sub">Pick a character for a pull / wait / skip verdict based on your wishes and pity.</p>
    <ul class="char-index">
      ${items}
    </ul>
  </main>
  ${footerNav(games)}
</body>
</html>`;
}

export function homePage({ game, activeBanners, games }) {
  const gameData = JSON.stringify({ game: game.id, character: null, rules: game.rules, weaponAvgCost: game.weaponAvgCost });
  const browse = games
    .map((g) => `<a class="game-link" href="/${g.id}/">${esc(g.name)}</a>`)
    .join("\n        ");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>ShouldIPull — Should you pull on the new banner?</title>
  <meta name="description" content="Tells you Pull, Wait, or Skip on the new banner based on your wishes and pity. Free, instant, no login." />
  <meta property="og:title" content="ShouldIPull — Should you pull on the new banner?" />
  <meta property="og:description" content="Pull, Wait, or Skip — instant verdict based on your wishes and pity." />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="${SITE}/" />
  <link rel="stylesheet" href="/style.css" />
  ${FONTS}
</head>
<body>
  <div class="starfield" aria-hidden="true">
    <div class="nebula"></div>
    <div class="stars"></div>
    <div class="stars2"></div>
    <div class="shoot"></div>
    <div class="shoot2"></div>
  </div>
  <main id="app">
    <h1>Should I Pull?</h1>
    <p class="sub">Tells you <b>Pull / Wait / Skip</b> on the new banner. No login.</p>
    ${calculatorForm()}
    ${currentBanners(activeBanners)}
    <section class="browse-games">
      <h2>Browse by game</h2>
      <div class="game-links">
        ${browse}
      </div>
    </section>
  </main>
  ${footerNav(games)}
  <script type="application/json" id="game-data">${gameData}</script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script type="module" src="/src/ui.js"></script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>`;
}
