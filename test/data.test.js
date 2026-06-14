// test/data.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const games = read("../data/games.json");
const chars = read("../data/characters/genshin.json");
const banners = read("../data/banners/genshin.json");
const ISO = /^\d{4}-\d{2}-\d{2}$/;

test("games.genshin has full rules", () => {
  const r = games.genshin.rules;
  for (const k of ["baseRate", "hardPity", "softPityStart", "softPityRamp", "fiftyFifty"]) {
    assert.equal(typeof r[k], "number", `rules.${k} missing/NaN`);
  }
  assert.equal(typeof games.genshin.weaponAvgCost, "number");
});
test("characters: required fields + valid", () => {
  assert.ok(Array.isArray(chars) && chars.length >= 1);
  for (const c of chars) {
    for (const k of ["id", "name", "rarity", "element", "weapon", "role", "released"]) {
      assert.ok(c[k] !== undefined && c[k] !== "", `char ${c.id} missing ${k}`);
    }
    assert.ok(/^[a-z0-9-]+$/.test(c.id), `char id not kebab: ${c.id}`);
    assert.ok(ISO.test(c.released), `char ${c.id} bad released date`);
  }
});
test("characters: ids unique", () => {
  const ids = chars.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate character id");
});
test("banners: required fields + valid dates", () => {
  assert.ok(Array.isArray(banners));
  for (const b of banners) {
    for (const k of ["characterId", "type", "version", "start", "end"]) {
      assert.ok(b[k] !== undefined && b[k] !== "", `banner missing ${k}`);
    }
    assert.ok(["new", "rerun"].includes(b.type), `banner bad type: ${b.type}`);
    assert.ok(ISO.test(b.start) && ISO.test(b.end), `banner bad date for ${b.characterId}`);
    assert.ok(new Date(b.end) >= new Date(b.start), `banner end<start for ${b.characterId}`);
  }
});
test("banners: characterId references existing character", () => {
  const ids = new Set(chars.map((c) => c.id));
  for (const b of banners) {
    assert.ok(ids.has(b.characterId), `banner references unknown character: ${b.characterId}`);
  }
});
