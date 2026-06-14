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
