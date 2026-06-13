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
