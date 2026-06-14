// test/gacha.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pull5StarRate, exactProbabilitySingle, simulate, verdict, buildReasons } from "../src/gacha.js";

const GAME = JSON.parse(readFileSync(new URL("../data/games.json", import.meta.url))).genshin;
const R = GAME.rules;

test("base rate before soft pity", () => {
  assert.equal(pull5StarRate(1, R), 0.006);
  assert.equal(pull5StarRate(73, R), 0.006);
});
test("soft pity ramps up", () => {
  assert.ok(Math.abs(pull5StarRate(74, R) - 0.066) < 1e-9);
  assert.ok(Math.abs(pull5StarRate(89, R) - 0.966) < 1e-9);
});
test("hard pity at 90", () => {
  assert.equal(pull5StarRate(90, R), 1.0);
  assert.equal(pull5StarRate(95, R), 1.0);
});
test("exact: zero wishes -> 0", () => {
  assert.equal(exactProbabilitySingle(0, 0, false, R), 0);
});
test("exact: hard pity + guaranteed -> 1", () => {
  assert.ok(Math.abs(exactProbabilitySingle(1, 89, true, R) - 1) < 1e-9);
});
test("exact: hard pity + 50/50 -> 0.5", () => {
  assert.ok(Math.abs(exactProbabilitySingle(1, 89, false, R) - 0.5) < 1e-9);
});
test("simulate: zero wishes -> 0%", () => {
  assert.equal(simulate({ wishes: 0, pity: 0, guaranteed: false, target: 1, rules: R }).probability, 0);
});
test("simulate: hard pity + guaranteed -> ~100%", () => {
  assert.ok(simulate({ wishes: 1, pity: 89, guaranteed: true, target: 1, rules: R }).probability > 0.99);
});
test("simulate matches exact within 2%", () => {
  const scenarios = [
    { wishes: 90, pity: 0, guaranteed: false },
    { wishes: 50, pity: 20, guaranteed: false },
    { wishes: 180, pity: 0, guaranteed: false },
    { wishes: 30, pity: 70, guaranteed: true },
  ];
  for (const s of scenarios) {
    const sim = simulate({ ...s, target: 1, sims: 50000, rules: R }).probability;
    const exact = exactProbabilitySingle(s.wishes, s.pity, s.guaranteed, R);
    assert.ok(Math.abs(sim - exact) < 0.02, `sim ${sim} vs exact ${exact} for ${JSON.stringify(s)}`);
  }
});
test("verdict thresholds", () => {
  assert.equal(verdict(0.91), "pull");
  assert.equal(verdict(0.70), "pull");
  assert.equal(verdict(0.69), "wait");
  assert.equal(verdict(0.40), "wait");
  assert.equal(verdict(0.39), "skip");
  assert.equal(verdict(0), "skip");
});
test("buildReasons: pull mentions leftover", () => {
  const r = buildReasons({ wishes: 90, pity: 20, guaranteed: true, tier: "pull", probability: 0.9, avgWishesUsedOnSuccess: 75, wantWeapon: false, weaponAvgCost: GAME.weaponAvgCost });
  assert.ok(r.some((x) => /left/i.test(x)));
});
test("buildReasons: skip mentions short by", () => {
  const r = buildReasons({ wishes: 20, pity: 0, guaranteed: false, tier: "skip", probability: 0.1, avgWishesUsedOnSuccess: 93, wantWeapon: false, weaponAvgCost: GAME.weaponAvgCost });
  assert.ok(r.some((x) => /short by/i.test(x)));
});
test("buildReasons: weapon note when wanted", () => {
  const r = buildReasons({ wishes: 90, pity: 0, guaranteed: false, tier: "pull", probability: 0.8, avgWishesUsedOnSuccess: 80, wantWeapon: true, weaponAvgCost: GAME.weaponAvgCost });
  assert.ok(r.some((x) => /weapon/i.test(x)));
});
