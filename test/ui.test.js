// test/ui.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInputs } from "../src/ui.js";

test("valid input parses", () => {
  const r = parseInputs({ wishes: "80", pity: "20", guaranteed: "yes", target: "1", wantWeapon: false });
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, { wishes: 80, pity: 20, guaranteed: true, target: 1, wantWeapon: false });
});
test("empty wishes -> error", () => {
  const r = parseInputs({ wishes: "", pity: "0", guaranteed: "no", target: "1", wantWeapon: false });
  assert.equal(r.ok, false);
  assert.match(r.error, /wishes/i);
});
test("pity clamped 0..89", () => {
  assert.equal(parseInputs({ wishes: "10", pity: "200", guaranteed: "no", target: "1", wantWeapon: false }).values.pity, 89);
});
test("target clamped 1..7", () => {
  assert.equal(parseInputs({ wishes: "600", pity: "0", guaranteed: "no", target: "99", wantWeapon: false }).values.target, 7);
});
test("negative wishes -> error", () => {
  assert.equal(parseInputs({ wishes: "-5", pity: "0", guaranteed: "no", target: "1", wantWeapon: false }).ok, false);
});
