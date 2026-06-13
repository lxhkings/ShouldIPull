// 覆盖 test/copy.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickVerdictLine, VERDICT_LINES } from "../src/copy.js";

test("each tier has >=5 lines", () => {
  assert.ok(VERDICT_LINES.pull.length >= 5);
  assert.ok(VERDICT_LINES.wait.length >= 5);
  assert.ok(VERDICT_LINES.skip.length >= 5);
});
test("no unfilled placeholders remain in any line after fill", () => {
  for (const tier of ["pull", "wait", "skip"]) {
    for (let i = 0; i < VERDICT_LINES[tier].length; i++) {
      const line = pickVerdictLine(tier, { probabilityPct: 73, shortBy: 42 }, i);
      assert.ok(!line.includes("{pct}"), `${tier}[${i}] left {pct}`);
      assert.ok(!line.includes("{short}"), `${tier}[${i}] left {short}`);
      assert.ok(line.includes("73"), `${tier}[${i}] missing pct`);
    }
  }
});
test("pickVerdictLine random stays in range", () => {
  for (let n = 0; n < 50; n++) {
    const line = pickVerdictLine("pull", { probabilityPct: 88, shortBy: 0 });
    assert.equal(typeof line, "string");
    assert.ok(line.length > 0);
  }
});
