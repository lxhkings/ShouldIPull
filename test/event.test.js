// test/event.test.js
import { test } from "node:test";
import assert from "node:assert/strict";

function validate(b) {
  const TIERS = new Set(["pull", "wait", "skip"]);
  const game = typeof b.game === "string" ? b.game.slice(0, 40) : null;
  const character = b.character == null ? null : String(b.character).slice(0, 60);
  const tier = TIERS.has(b.tier) ? b.tier : null;
  const prob = typeof b.prob === "number" && b.prob >= 0 && b.prob <= 1 ? b.prob : null;
  if (!game || !tier || prob === null) return null;
  return { game, character, tier, prob };
}

test("valid event passes", () => {
  assert.deepEqual(validate({ game: "genshin", character: "furina", tier: "pull", prob: 0.73 }),
    { game: "genshin", character: "furina", tier: "pull", prob: 0.73 });
});
test("bad tier rejected", () => {
  assert.equal(validate({ game: "genshin", character: "furina", tier: "maybe", prob: 0.5 }), null);
});
test("prob out of range rejected", () => {
  assert.equal(validate({ game: "genshin", character: null, tier: "skip", prob: 1.5 }), null);
});
test("missing game rejected", () => {
  assert.equal(validate({ tier: "wait", prob: 0.5 }), null);
});
test("null character allowed (homepage)", () => {
  assert.equal(validate({ game: "genshin", character: null, tier: "wait", prob: 0.5 }).character, null);
});
