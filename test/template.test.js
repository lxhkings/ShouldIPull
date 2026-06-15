// test/template.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { characterPage, gameIndexPage } from "../src/template.js";

const game = {
  id: "genshin", name: "Genshin Impact",
  currency: { name: "Primogem", perPull: 160, wishName: "Wish" },
  rules: { baseRate: 0.006, hardPity: 90, softPityStart: 74, softPityRamp: 0.06, fiftyFifty: 0.5 },
  weaponAvgCost: 80,
};
const furina = { id: "furina", name: "Furina", rarity: 5, element: "Hydro", weapon: "Sword", role: "Support DPS", released: "2023-11-08" };
const nahida = { id: "nahida", name: "Nahida", rarity: 5, element: "Dendro", weapon: "Catalyst", role: "Driver", released: "2022-11-02" };
const banner = { characterId: "furina", type: "rerun", version: "5.7", start: "2026-06-10", end: "2026-07-01" };

test("character page has unique SEO title/h1 with name", () => {
  const html = characterPage({ char: furina, game, banner });
  assert.ok(html.includes("<title>Should I Pull Furina?"));
  assert.ok(/<h1[^>]*>Should I Pull Furina\?<\/h1>/.test(html));
});
test("character page body differs by character data", () => {
  const a = characterPage({ char: furina, game, banner });
  const b = characterPage({ char: nahida, game, banner: null });
  assert.ok(a.includes("Hydro") && a.includes("Sword"));
  assert.ok(b.includes("Dendro") && b.includes("Catalyst"));
  assert.notEqual(a, b);
});
test("character page reflects banner status", () => {
  const live = characterPage({ char: furina, game, banner });
  assert.ok(/rerun/i.test(live) && live.includes("2026-07-01"));
  const none = characterPage({ char: nahida, game, banner: null });
  assert.ok(/not on (the )?current banner/i.test(none));
});
test("character page injects game-data for ui.js", () => {
  const html = characterPage({ char: furina, game, banner });
  assert.ok(html.includes('id="game-data"'));
  assert.ok(html.includes('"character":"furina"') || html.includes('"character": "furina"'));
  assert.ok(html.includes('src="/src/ui.js"'));
});
test("character page has canonical + reused card ids + community slot", () => {
  const html = characterPage({ char: furina, game, banner });
  assert.ok(html.includes('rel="canonical"') && html.includes("/genshin/should-i-pull/furina/"));
  assert.ok(html.includes('id="card"') && html.includes('id="bar-fill"') && html.includes('id="reasons"'));
  assert.ok(html.includes('id="community-stats"') && /id="community-stats"[^>]*hidden/.test(html));
});
test("index page lists character links", () => {
  const html = gameIndexPage({ game, characters: [furina, nahida] });
  assert.ok(html.includes("/genshin/should-i-pull/furina/"));
  assert.ok(html.includes("/genshin/should-i-pull/nahida/"));
  assert.ok(html.includes("Furina") && html.includes("Nahida"));
});

import { footerNav } from "../src/template.js";

test("footerNav links Home + every game index", () => {
  const html = footerNav([
    { id: "genshin", name: "Genshin Impact" },
    { id: "starrail", name: "Honkai: Star Rail" },
  ]);
  assert.match(html, /<footer class="site-footer">/);
  assert.match(html, /href="\/"/);
  assert.match(html, /href="\/genshin\/"/);
  assert.match(html, /href="\/starrail\/"/);
  assert.match(html, /Honkai: Star Rail/);
});

import { currentBanners } from "../src/template.js";

const sampleItems = [
  { char: { id: "furina", name: "Furina", element: "Hydro", weapon: "Sword" },
    game: { id: "genshin" }, banner: { version: "5.7" } },
];

test("currentBanners renders a card linking to the character page", () => {
  const html = currentBanners(sampleItems);
  assert.match(html, /class="current-banners"/);
  assert.match(html, /href="\/genshin\/should-i-pull\/furina\/"/);
  assert.match(html, /Furina/);
  assert.match(html, /v5\.7/);
});

test("currentBanners renders nothing when empty", () => {
  assert.equal(currentBanners([]), "");
  assert.equal(currentBanners(undefined), "");
});

import { calculatorForm } from "../src/template.js";

test("calculatorForm has fate toggle wired to hidden guaranteed", () => {
  const html = calculatorForm();
  assert.match(html, /class="seg-btn[^"]*" data-guar="no"/);
  assert.match(html, /data-guar="yes"/);
  assert.match(html, /<input type="hidden" name="guaranteed" value="no" \/>/);
});

test("calculatorForm has C0-C6 chips mapped to target 1-7 + hidden target", () => {
  const html = calculatorForm();
  assert.match(html, /class="chip is-active" data-target="1">C0</);
  assert.match(html, /data-target="7">C6</);
  assert.match(html, /<input type="hidden" name="target" value="1" \/>/);
});

test("calculatorForm keeps weapon, share, and all result ids", () => {
  const html = calculatorForm();
  assert.match(html, /name="wantWeapon"/);
  assert.match(html, /id="share"/);
  for (const id of ["card","verdict-emoji","verdict-line","bar-fill","prob-text","reasons"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

const GAMES = [
  { id: "genshin", name: "Genshin Impact" },
  { id: "starrail", name: "Honkai: Star Rail" },
];

test("characterPage includes Google Fonts and footer nav", () => {
  const html = characterPage({
    char: { id: "furina", name: "Furina", rarity: 5, element: "Hydro", weapon: "Sword", role: "DPS" },
    game: { id: "genshin", name: "Genshin Impact", rules: {}, weaponAvgCost: 80 },
    banner: null,
    games: GAMES,
  });
  assert.match(html, /fonts\.googleapis\.com/);
  assert.match(html, /class="site-footer"/);
});

test("gameIndexPage includes footer nav", () => {
  const html = gameIndexPage({
    game: { id: "genshin", name: "Genshin Impact" },
    characters: [{ id: "furina", name: "Furina", element: "Hydro", weapon: "Sword" }],
    games: GAMES,
  });
  assert.match(html, /class="site-footer"/);
});

import { homePage } from "../src/template.js";

test("homePage renders calculator, game-data (genshin), hub, footer", () => {
  const html = homePage({
    game: { id: "genshin", name: "Genshin Impact", rules: { baseRate: 0.006 }, weaponAvgCost: 80 },
    activeBanners: [
      { char: { id: "furina", name: "Furina", element: "Hydro", weapon: "Sword" }, game: { id: "genshin" }, banner: { version: "5.7" } },
    ],
    games: GAMES,
  });
  assert.match(html, /id="calc"/);
  assert.match(html, /id="game-data"/);
  assert.match(html, /"game":"genshin"/);
  assert.match(html, /class="current-banners"/);
  assert.match(html, /href="\/genshin\/should-i-pull\/furina\/"/);
  assert.match(html, /class="browse-games"/);
  assert.match(html, /class="site-footer"/);
  assert.match(html, /rel="canonical" href="https:\/\/shouldipull\.com\/"/);
});

test("homePage omits current-banners section when none active", () => {
  const html = homePage({
    game: { id: "genshin", name: "Genshin Impact", rules: {}, weaponAvgCost: 80 },
    activeBanners: [],
    games: GAMES,
  });
  assert.doesNotMatch(html, /class="current-banners"/);
  assert.match(html, /class="browse-games"/);
});

test("characterPage has top breadcrumb Home > game > char (char not linked)", () => {
  const html = characterPage({ char: furina, game, banner, games: GAMES });
  assert.match(html, /class="breadcrumb"/);
  assert.match(html, /<a href="\/">Home<\/a>/);
  assert.match(html, /<a href="\/genshin\/">Genshin Impact<\/a>/);
  assert.match(html, /aria-current="page">Furina</);
});

test("characterPage no longer has the lone bottom related nav", () => {
  const html = characterPage({ char: furina, game, banner, games: GAMES });
  assert.doesNotMatch(html, /class="related"/);
});

test("gameIndexPage has breadcrumb Home > game (game is current)", () => {
  const html = gameIndexPage({ game, characters: [furina], games: GAMES });
  assert.match(html, /class="breadcrumb"/);
  assert.match(html, /<a href="\/">Home<\/a>/);
  assert.match(html, /aria-current="page">Genshin Impact</);
});

// --- SEO additions: favicon, og:image, og:url, JSON-LD ---

test("characterPage has favicon and apple-touch-icon links", () => {
  const html = characterPage({ char: furina, game, banner });
  assert.match(html, /rel="icon" href="\/favicon\.ico"/);
  assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon\.png"/);
});

test("characterPage has og:url and og:image", () => {
  const html = characterPage({ char: furina, game, banner });
  assert.match(html, /property="og:url" content="https:\/\/shouldipull\.com\/genshin\/should-i-pull\/furina\/"/);
  assert.match(html, /property="og:image" content="https:\/\/shouldipull\.com\/og-image\.png"/);
});

test("characterPage has WebApplication JSON-LD", () => {
  const html = characterPage({ char: furina, game, banner });
  assert.match(html, /type="application\/ld\+json"/);
  assert.match(html, /"@type":"WebApplication"/);
  assert.match(html, /"applicationCategory":"UtilitiesApplication"/);
  assert.match(html, /shouldipull\.com\/genshin\/should-i-pull\/furina\//);
});

test("gameIndexPage has full og: suite + twitter:card", () => {
  const html = gameIndexPage({ game, characters: [furina] });
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /property="og:type" content="website"/);
  assert.match(html, /property="og:url" content="https:\/\/shouldipull\.com\/genshin\/"/);
  assert.match(html, /property="og:image" content="https:\/\/shouldipull\.com\/og-image\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
});

test("gameIndexPage has favicon and apple-touch-icon links", () => {
  const html = gameIndexPage({ game, characters: [furina] });
  assert.match(html, /rel="icon" href="\/favicon\.ico"/);
  assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon\.png"/);
});

test("gameIndexPage has WebApplication JSON-LD", () => {
  const html = gameIndexPage({ game, characters: [furina] });
  assert.match(html, /type="application\/ld\+json"/);
  assert.match(html, /"@type":"WebApplication"/);
  assert.match(html, /shouldipull\.com\/genshin\//);
});

test("homePage has og:url, og:image, favicon, apple-touch-icon", () => {
  const html = homePage({
    game: { id: "genshin", name: "Genshin Impact", rules: { baseRate: 0.006 }, weaponAvgCost: 80 },
    activeBanners: [],
    games: GAMES,
  });
  assert.match(html, /property="og:url" content="https:\/\/shouldipull\.com\/"/);
  assert.match(html, /property="og:image" content="https:\/\/shouldipull\.com\/og-image\.png"/);
  assert.match(html, /rel="icon" href="\/favicon\.ico"/);
  assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon\.png"/);
});

test("homePage has WebApplication JSON-LD", () => {
  const html = homePage({
    game: { id: "genshin", name: "Genshin Impact", rules: { baseRate: 0.006 }, weaponAvgCost: 80 },
    activeBanners: [],
    games: GAMES,
  });
  assert.match(html, /type="application\/ld\+json"/);
  assert.match(html, /"@type":"WebApplication"/);
  assert.match(html, /"url":"https:\/\/shouldipull\.com\/"/);
});
