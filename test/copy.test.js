// test/copy.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickVerdictLine, VERDICT_LINES } from "../src/copy.js";

test("every tier has at least one line", () => {
  assert.ok(VERDICT_LINES.pull.length >= 1);
  assert.ok(VERDICT_LINES.wait.length >= 1);
  assert.ok(VERDICT_LINES.skip.length >= 1);
});
test("pickVerdictLine fills pct", () => {
  const line = pickVerdictLine("pull", { probabilityPct: 91, shortBy: 0 }, 0);
  assert.equal(typeof line, "string");
  assert.ok(line.includes("91"));
});
test("skip line can include shortBy", () => {
  const line = pickVerdictLine("skip", { probabilityPct: 8, shortBy: 140 }, 0);
  assert.ok(line.includes("140"));
});
