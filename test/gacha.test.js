// test/gacha.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { pull5StarRate } from "../src/gacha.js";

test("base rate before soft pity", () => {
  assert.equal(pull5StarRate(1), 0.006);
  assert.equal(pull5StarRate(73), 0.006);
});
test("soft pity ramps up", () => {
  assert.ok(Math.abs(pull5StarRate(74) - 0.066) < 1e-9);
  assert.ok(Math.abs(pull5StarRate(89) - 0.966) < 1e-9);
});
test("hard pity at 90", () => {
  assert.equal(pull5StarRate(90), 1.0);
  assert.equal(pull5StarRate(95), 1.0);
});

// 追加到 test/gacha.test.js
import { exactProbabilitySingle } from "../src/gacha.js";

test("exact: zero wishes -> 0", () => {
  assert.equal(exactProbabilitySingle(0, 0, false), 0);
});
test("exact: hard pity + guaranteed -> 1", () => {
  assert.ok(Math.abs(exactProbabilitySingle(1, 89, true) - 1) < 1e-9);
});
test("exact: hard pity + 50/50 -> 0.5", () => {
  assert.ok(Math.abs(exactProbabilitySingle(1, 89, false) - 0.5) < 1e-9);
});

// 追加到 test/gacha.test.js
import { simulate } from "../src/gacha.js";

test("simulate: zero wishes -> 0%", () => {
  assert.equal(simulate({ wishes: 0, pity: 0, guaranteed: false, target: 1 }).probability, 0);
});
test("simulate: hard pity + guaranteed -> ~100%", () => {
  assert.ok(simulate({ wishes: 1, pity: 89, guaranteed: true, target: 1 }).probability > 0.99);
});
test("simulate matches exact within 2%", () => {
  const scenarios = [
    { wishes: 90, pity: 0, guaranteed: false },
    { wishes: 50, pity: 20, guaranteed: false },
    { wishes: 180, pity: 0, guaranteed: false },
    { wishes: 30, pity: 70, guaranteed: true },
  ];
  for (const s of scenarios) {
    const sim = simulate({ ...s, target: 1, sims: 50000 }).probability;
    const exact = exactProbabilitySingle(s.wishes, s.pity, s.guaranteed);
    assert.ok(Math.abs(sim - exact) < 0.02, `sim ${sim} vs exact ${exact} for ${JSON.stringify(s)}`);
  }
});

// 追加到 test/gacha.test.js
import { verdict } from "../src/gacha.js";
test("verdict thresholds", () => {
  assert.equal(verdict(0.91), "pull");
  assert.equal(verdict(0.70), "pull");
  assert.equal(verdict(0.69), "wait");
  assert.equal(verdict(0.40), "wait");
  assert.equal(verdict(0.39), "skip");
  assert.equal(verdict(0), "skip");
});

// 追加到 test/gacha.test.js
import { buildReasons } from "../src/gacha.js";
test("buildReasons: pull mentions leftover", () => {
  const r = buildReasons({ wishes: 90, pity: 20, guaranteed: true, tier: "pull", probability: 0.9, avgWishesUsedOnSuccess: 75, wantWeapon: false });
  assert.ok(r.some((x) => /left/i.test(x)));
});
test("buildReasons: skip mentions short by", () => {
  const r = buildReasons({ wishes: 20, pity: 0, guaranteed: false, tier: "skip", probability: 0.1, avgWishesUsedOnSuccess: 93, wantWeapon: false });
  assert.ok(r.some((x) => /short by/i.test(x)));
});
test("buildReasons: weapon note when wanted", () => {
  const r = buildReasons({ wishes: 90, pity: 0, guaranteed: false, tier: "pull", probability: 0.8, avgWishesUsedOnSuccess: 80, wantWeapon: true });
  assert.ok(r.some((x) => /weapon/i.test(x)));
});
