// src/template.js —— 纯函数: 数据 -> HTML 字符串. 无框架.
const SITE = "https://shouldipull.com";

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

function bannerLine(char, banner) {
  if (!banner) return `${char.name} is not on the current banner. Plan ahead for the next rerun.`;
  const kind = banner.type === "new" ? "makes their first appearance" : "is on a rerun banner";
  return `${char.name} ${kind} in version ${banner.version}, live from ${banner.start} until ${banner.end}.`;
}

function calculatorForm() {
  return `
    <form id="calc">
      <label>Wishes / Primogems you have
        <input name="wishes" type="number" min="0" inputmode="numeric" placeholder="e.g. 80" />
        <small>1 wish = 160 primogems</small>
      </label>
      <label>Pity (pulls since last 5★)
        <input name="pity" type="number" min="0" max="89" inputmode="numeric" placeholder="0-89" />
      </label>
      <fieldset>
        <legend>Guaranteed?</legend>
        <label><input type="radio" name="guaranteed" value="yes" /> Yes (next 5★ is guaranteed)</label>
        <label><input type="radio" name="guaranteed" value="no" checked /> No (50/50)</label>
      </fieldset>
      <label>Goal (how many copies)
        <input name="target" type="number" min="1" max="7" value="1" inputmode="numeric" />
      </label>
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

export function characterPage({ char, game, banner }) {
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
</head>
<body>
  <main id="app">
    <h1>Should I Pull ${esc(char.name)}?</h1>
    <p class="sub">${esc(char.name)} — ${esc(char.rarity)}★ ${esc(char.element)}, ${esc(char.weapon)} · ${esc(char.role)}.</p>
    <p class="banner-status">${esc(bannerLine(char, banner))}</p>
    ${calculatorForm()}
    <nav class="related"><a href="/${game.id}/">← All ${esc(game.name)} characters</a></nav>
  </main>
  <script type="application/json" id="game-data">${gameData}</script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script type="module" src="/src/ui.js"></script>
</body>
</html>`;
}

export function gameIndexPage({ game, characters }) {
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
</head>
<body>
  <main id="app">
    <h1>${esc(game.name)} — Should I Pull?</h1>
    <p class="sub">Pick a character for a pull / wait / skip verdict based on your wishes and pity.</p>
    <ul class="char-index">
      ${items}
    </ul>
  </main>
</body>
</html>`;
}
