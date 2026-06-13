# ShouldIPull Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一个英文单页网页，玩家填入原神抽数/保底进度，输出 🟢Pull/🟡Wait/🔴Skip 决策 + 带梗结论 + 可分享结果卡。

**Architecture:** 纯前端、无后端、无构建步骤。核心概率逻辑是纯 JS 模块（浏览器用 `<script type="module">` 直接加载，Node 用内置 `node --test` 跑单测）。DOM 胶水层读表单、调逻辑、渲染、用 `html2canvas`（CDN）生成结果卡图片。部署 Vercel 静态托管。

**Tech Stack:** 原生 HTML + CSS + JavaScript (ESM)；Node 26 内置测试运行器 `node:test`；`html2canvas`（CDN）；Vercel。

**核心赌注（来自 spec 差异化楔子）:** 结果卡 + 带梗结论是项目生死手，`copy.js` 文案库和结果卡视觉要重点打磨。

---

## File Structure

| 文件 | 职责 |
|---|---|
| `package.json` | `type: module` + `npm test` 脚本（仅为跑 node 单测，无打包） |
| `index.html` | 页面结构：表单 + 结果区 + 结果卡模板；加载 html2canvas CDN 和 `src/ui.js` |
| `style.css` | 移动端优先样式 |
| `src/gacha.js` | 纯逻辑：`pull5StarRate()`、`simulate()`、`exactProbabilitySingle()`、`verdict()`、`buildReasons()`。无 DOM 依赖，可 Node 测试 |
| `src/copy.js` | 梗文案库 + `pickVerdictLine(tier, ctx)` |
| `src/ui.js` | DOM 胶水：`parseInputs()`、读表单、调 gacha、渲染结果、触发 html2canvas 下载 |
| `test/gacha.test.js` | `src/gacha.js` 单测 |
| `test/copy.test.js` | `src/copy.js` 单测 |
| `test/ui.test.js` | `parseInputs()` 纯函数单测（不测 DOM） |
| `vercel.json` | 静态站点配置（可选，Vercel 默认即可识别静态站） |
| `.gitignore` | 忽略 node_modules 等 |

**原神 5★ 概率模型（社区公认，paimon.moe 同款，全代码以此为准）:**
- 第 n 抽出 5★ 概率 `P(n)`：
  - `n ≤ 73` → `0.006`
  - `74 ≤ n ≤ 89` → `0.006 + 0.06 * (n - 73)`
  - `n ≥ 90` → `1.0`（硬保底）
- 50/50：出 5★ 时，若处于「大保底(guaranteed)」→ 必为限定；否则 50% 限定、50% 歪（歪后置为大保底）。
- 拿到限定后 pity 归 0、guaranteed 归 false。歪了 pity 归 0、guaranteed 置 true。

---

## Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `index.html`（空骨架）

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "shouldipull",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: 写 .gitignore**

```
node_modules/
.DS_Store
.vercel/
```

- [ ] **Step 3: 写 index.html 空骨架**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ShouldIPull — Should you pull on the new banner?</title>
</head>
<body>
  <main id="app"></main>
</body>
</html>
```

- [ ] **Step 4: 验证 npm test 能跑（暂无测试）**

Run: `npm test`
Expected: 退出码 0，输出类似 `tests 0`（没有测试文件也正常通过）。

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore index.html
git commit -m "chore: 项目脚手架 (package.json, gitignore, html骨架)"
```

---

## Task 2: 单抽 5★ 概率函数 `pull5StarRate()`

**Files:**
- Create: `src/gacha.js`
- Create: `test/gacha.test.js`

- [ ] **Step 1: 写失败测试**

```javascript
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL，`pull5StarRate is not a function` / 模块找不到导出。

- [ ] **Step 3: 写最小实现**

```javascript
// src/gacha.js
export function pull5StarRate(pity) {
  if (pity >= 90) return 1.0;
  if (pity >= 74) return 0.006 + 0.06 * (pity - 73);
  return 0.006;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: PASS，3 个测试全过。

- [ ] **Step 5: Commit**

```bash
git add src/gacha.js test/gacha.test.js
git commit -m "feat: 单抽5星概率函数(软硬保底模型)"
```

---

## Task 3: 精确概率参考 `exactProbabilitySingle()`（用于交叉验证）

精确推算「W 抽内、从 pity p、guaranteed g 出发，至少拿到 1 个限定」的概率。做法：传播「尚未拿到限定」的概率质量，最后 `1 - 剩余质量`。

**Files:**
- Modify: `src/gacha.js`
- Modify: `test/gacha.test.js`

- [ ] **Step 1: 写失败测试**

```javascript
// 追加到 test/gacha.test.js
import { exactProbabilitySingle } from "../src/gacha.js";

test("exact: zero wishes -> zero", () => {
  assert.equal(exactProbabilitySingle(0, 0, false), 0);
});

test("exact: hard pity + guaranteed -> 1", () => {
  // pity 89 -> 下一抽到90硬保底必出, guaranteed 必为限定
  assert.ok(Math.abs(exactProbabilitySingle(1, 89, true) - 1) < 1e-9);
});

test("exact: hard pity + 50/50 -> 0.5", () => {
  assert.ok(Math.abs(exactProbabilitySingle(1, 89, false) - 0.5) < 1e-9);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL，`exactProbabilitySingle is not a function`。

- [ ] **Step 3: 写实现**

```javascript
// 追加到 src/gacha.js
// 返回 W 抽内至少拿到 1 个限定的精确概率。
// 思路：dp 是 "还没拿到限定" 的世界里，按 (pity, guaranteed) 分布的概率质量。
export function exactProbabilitySingle(wishes, pity, guaranteed) {
  // key: pity*2 + (guaranteed?1:0) -> 概率
  let dp = new Map();
  dp.set(pity * 2 + (guaranteed ? 1 : 0), 1);

  for (let w = 0; w < wishes; w++) {
    const next = new Map();
    const add = (p, g, prob) => {
      if (prob <= 0) return;
      const k = p * 2 + (g ? 1 : 0);
      next.set(k, (next.get(k) || 0) + prob);
    };
    for (const [key, mass] of dp) {
      const curPity = Math.floor(key / 2);
      const curGuar = (key % 2) === 1;
      const newPity = curPity + 1;
      const r = pull5StarRate(newPity);

      // 没出 5★：留在 "未拿到限定" 集合
      add(newPity, curGuar, mass * (1 - r));

      // 出 5★：
      if (curGuar) {
        // 必为限定 -> 离开集合(成功), 不加回 next
      } else {
        // 50% 限定(成功离开) / 50% 歪 -> 重置 pity=0, guaranteed=true 留在集合
        add(0, true, mass * r * 0.5);
      }
    }
    dp = next;
  }

  let remaining = 0;
  for (const mass of dp.values()) remaining += mass;
  return 1 - remaining;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/gacha.js test/gacha.test.js
git commit -m "feat: 精确概率参考函数(交叉验证用)"
```

---

## Task 4: 蒙特卡洛模拟 `simulate()`

返回对象 `{ probability, avgWishesUsedOnSuccess }`：到手概率 + 成功世界里平均用了多少抽（给「剩余/差多少抽」文案用）。

**Files:**
- Modify: `src/gacha.js`
- Modify: `test/gacha.test.js`

- [ ] **Step 1: 写失败测试（含与精确解交叉验证）**

```javascript
// 追加到 test/gacha.test.js
import { simulate } from "../src/gacha.js";

test("simulate: zero wishes -> 0%", () => {
  const r = simulate({ wishes: 0, pity: 0, guaranteed: false, target: 1 });
  assert.equal(r.probability, 0);
});

test("simulate: hard pity + guaranteed -> ~100%", () => {
  const r = simulate({ wishes: 1, pity: 89, guaranteed: true, target: 1 });
  assert.ok(r.probability > 0.99);
});

test("simulate matches exact within 2% (cross-check)", () => {
  const scenarios = [
    { wishes: 90, pity: 0, guaranteed: false },
    { wishes: 50, pity: 20, guaranteed: false },
    { wishes: 180, pity: 0, guaranteed: false },
    { wishes: 30, pity: 70, guaranteed: true },
  ];
  for (const s of scenarios) {
    const sim = simulate({ ...s, target: 1, sims: 50000 }).probability;
    const exact = exactProbabilitySingle(s.wishes, s.pity, s.guaranteed);
    assert.ok(
      Math.abs(sim - exact) < 0.02,
      `sim ${sim} vs exact ${exact} for ${JSON.stringify(s)}`
    );
  }
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL，`simulate is not a function`。

- [ ] **Step 3: 写实现**

```javascript
// 追加到 src/gacha.js
// 单次模拟：返回 { gotTarget: bool, wishesUsedToReachTarget: number|null }
function simulateOnce(wishes, pity, guaranteed, target) {
  let curPity = pity;
  let curGuar = guaranteed;
  let limited = 0;
  for (let i = 1; i <= wishes; i++) {
    curPity += 1;
    if (Math.random() < pull5StarRate(curPity)) {
      let isLimited;
      if (curGuar) {
        isLimited = true;
      } else if (Math.random() < 0.5) {
        isLimited = true;
      } else {
        isLimited = false;
      }
      if (isLimited) {
        limited += 1;
        curGuar = false;
      } else {
        curGuar = true; // 歪了, 下次必中
      }
      curPity = 0;
      if (limited >= target) {
        return { gotTarget: true, wishesUsedToReachTarget: i };
      }
    }
  }
  return { gotTarget: false, wishesUsedToReachTarget: null };
}

export function simulate({ wishes, pity, guaranteed, target, sims = 10000 }) {
  let success = 0;
  let usedSum = 0;
  for (let s = 0; s < sims; s++) {
    const r = simulateOnce(wishes, pity, guaranteed, target);
    if (r.gotTarget) {
      success += 1;
      usedSum += r.wishesUsedToReachTarget;
    }
  }
  return {
    probability: success / sims,
    avgWishesUsedOnSuccess: success > 0 ? usedSum / success : null,
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: PASS（交叉验证用了 50000 次模拟，误差 < 2%）。

- [ ] **Step 5: Commit**

```bash
git add src/gacha.js test/gacha.test.js
git commit -m "feat: 蒙特卡洛模拟(到手概率+平均用抽数)"
```

---

## Task 5: 决策档位 `verdict()`

**Files:**
- Modify: `src/gacha.js`
- Modify: `test/gacha.test.js`

- [ ] **Step 1: 写失败测试**

```javascript
// 追加到 test/gacha.test.js
import { verdict } from "../src/gacha.js";

test("verdict thresholds", () => {
  assert.equal(verdict(0.91), "pull");
  assert.equal(verdict(0.70), "pull");   // 边界含进 green
  assert.equal(verdict(0.69), "wait");
  assert.equal(verdict(0.40), "wait");   // 边界含进 yellow
  assert.equal(verdict(0.39), "skip");
  assert.equal(verdict(0), "skip");
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL，`verdict is not a function`。

- [ ] **Step 3: 写实现**

```javascript
// 追加到 src/gacha.js
export function verdict(probability) {
  if (probability >= 0.70) return "pull";
  if (probability >= 0.40) return "wait";
  return "skip";
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/gacha.js test/gacha.test.js
git commit -m "feat: 决策档位函数(70/40阈值)"
```

---

## Task 6: 事实理由 `buildReasons()`

按输入和模拟结果生成 2~3 条英文事实理由。

**Files:**
- Modify: `src/gacha.js`
- Modify: `test/gacha.test.js`

- [ ] **Step 1: 写失败测试**

```javascript
// 追加到 test/gacha.test.js
import { buildReasons } from "../src/gacha.js";

test("buildReasons: success path mentions leftover", () => {
  const reasons = buildReasons({
    wishes: 90, pity: 20, guaranteed: true,
    tier: "pull",
    probability: 0.9, avgWishesUsedOnSuccess: 75, wantWeapon: false,
  });
  assert.ok(reasons.some((r) => /left/i.test(r)));
});

test("buildReasons: skip path mentions short by", () => {
  const reasons = buildReasons({
    wishes: 20, pity: 0, guaranteed: false,
    tier: "skip",
    probability: 0.1, avgWishesUsedOnSuccess: 93, wantWeapon: false,
  });
  assert.ok(reasons.some((r) => /short by/i.test(r)));
});

test("buildReasons: weapon note when wanted", () => {
  const reasons = buildReasons({
    wishes: 90, pity: 0, guaranteed: false,
    tier: "pull",
    probability: 0.8, avgWishesUsedOnSuccess: 80, wantWeapon: true,
  });
  assert.ok(reasons.some((r) => /weapon/i.test(r)));
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL，`buildReasons is not a function`。

- [ ] **Step 3: 写实现**

```javascript
// 追加到 src/gacha.js
const WEAPON_AVG_COST = 80; // 专武粗估: 平均约 80 抽, 仅供参考

export function buildReasons({
  wishes, pity, guaranteed, tier,
  probability, avgWishesUsedOnSuccess, wantWeapon,
}) {
  const reasons = [];

  if (tier === "pull" && avgWishesUsedOnSuccess != null) {
    const leftover = Math.max(0, Math.round(wishes - avgWishesUsedOnSuccess));
    reasons.push(`You'll likely have ~${leftover} wishes left after getting them.`);
  }

  if (tier === "skip") {
    const need = avgWishesUsedOnSuccess != null
      ? Math.round(avgWishesUsedOnSuccess)
      : 93;
    const shortBy = Math.max(0, need - wishes);
    reasons.push(`Short by ~${shortBy} wishes for a comfortable shot.`);
  }

  if (guaranteed) {
    reasons.push(`You're on guarantee — the next 5★ is the rate-up character.`);
  } else {
    reasons.push(`You're on 50/50 — a 5★ might still be a standard character.`);
  }

  if (wantWeapon) {
    const weaponShort = Math.max(0, WEAPON_AVG_COST + 80 - wishes); // 角色+专武粗估
    reasons.push(
      `Want the weapon too? Roughly ~${weaponShort} more wishes needed (rough estimate).`
    );
  }

  return reasons.slice(0, 3);
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/gacha.js test/gacha.test.js
git commit -m "feat: 事实理由生成器"
```

---

## Task 7: 梗文案库 `copy.js`（核心赌注）

按档位备多条 Reddit 黑话文案，`pickVerdictLine(tier, ctx)` 选一条。ctx 含 `shortBy`/`probabilityPct` 供模板插值。

**Files:**
- Create: `src/copy.js`
- Create: `test/copy.test.js`

- [ ] **Step 1: 写失败测试**

```javascript
// test/copy.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickVerdictLine, VERDICT_LINES } from "../src/copy.js";

test("each tier has multiple lines", () => {
  assert.ok(VERDICT_LINES.pull.length >= 3);
  assert.ok(VERDICT_LINES.wait.length >= 3);
  assert.ok(VERDICT_LINES.skip.length >= 3);
});

test("pickVerdictLine returns a non-empty string with pct filled", () => {
  const line = pickVerdictLine("pull", { probabilityPct: 91, shortBy: 0 });
  assert.equal(typeof line, "string");
  assert.ok(line.length > 0);
  assert.ok(line.includes("91"));
});

test("skip line can include shortBy", () => {
  const line = pickVerdictLine("skip", { probabilityPct: 8, shortBy: 140 }, 0);
  assert.ok(line.includes("140"));
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL，模块找不到。

- [ ] **Step 3: 写实现**

```javascript
// src/copy.js
// 文案用 {pct}=到手概率%, {short}=差多少抽 占位
export const VERDICT_LINES = {
  pull: [
    "PULL — {pct}%. The gacha gods smile upon you.",
    "PULL — {pct}%. Green light, anon. Send it.",
    "PULL — {pct}%. You've got the wishes. No copium needed.",
  ],
  wait: [
    "WAIT — {pct}%. That's a coinflip, anon.",
    "WAIT — {pct}%. Dangerously close. Save a bit more.",
    "WAIT — {pct}%. Could go either way. Pray to RNGesus first.",
  ],
  skip: [
    "SKIP — {pct}%. You're {short} wishes short. Pure copium.",
    "SKIP — {pct}%. Not even close, anon. F2P pain.",
    "SKIP — {pct}%. Save your primos for next patch.",
  ],
};

function fill(template, ctx) {
  return template
    .replace("{pct}", String(ctx.probabilityPct))
    .replace("{short}", String(ctx.shortBy ?? 0));
}

// index 可选, 不传则随机(便于测试可传固定 index)
export function pickVerdictLine(tier, ctx, index) {
  const lines = VERDICT_LINES[tier];
  const i = index != null ? index : Math.floor(Math.random() * lines.length);
  return fill(lines[i], ctx);
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/copy.js test/copy.test.js
git commit -m "feat: 梗文案库(Reddit黑话, 核心差异点)"
```

---

## Task 8: 输入解析与校验 `parseInputs()`

纯函数，输入原始字符串/状态，输出 `{ ok, values, error }`。可 Node 测试，不碰 DOM。

**Files:**
- Create: `src/ui.js`
- Create: `test/ui.test.js`

- [ ] **Step 1: 写失败测试**

```javascript
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

test("pity clamped to 0..89", () => {
  const r = parseInputs({ wishes: "10", pity: "200", guaranteed: "no", target: "1", wantWeapon: false });
  assert.equal(r.values.pity, 89);
});

test("target clamped to 1..7", () => {
  const r = parseInputs({ wishes: "600", pity: "0", guaranteed: "no", target: "99", wantWeapon: false });
  assert.equal(r.values.target, 7);
});

test("negative wishes -> error", () => {
  const r = parseInputs({ wishes: "-5", pity: "0", guaranteed: "no", target: "1", wantWeapon: false });
  assert.equal(r.ok, false);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL，`parseInputs is not a function`。

- [ ] **Step 3: 写实现（仅 parseInputs，DOM 部分下一个 Task）**

```javascript
// src/ui.js
export function parseInputs(raw) {
  const wishes = Number(raw.wishes);
  if (raw.wishes === "" || !Number.isFinite(wishes) || wishes < 0) {
    return { ok: false, error: "Please enter a valid number of wishes." };
  }
  let pity = Number(raw.pity);
  if (!Number.isFinite(pity) || pity < 0) pity = 0;
  pity = Math.min(89, Math.floor(pity));

  let target = Number(raw.target);
  if (!Number.isFinite(target) || target < 1) target = 1;
  target = Math.min(7, Math.floor(target));

  return {
    ok: true,
    values: {
      wishes: Math.floor(wishes),
      pity,
      guaranteed: raw.guaranteed === "yes",
      target,
      wantWeapon: !!raw.wantWeapon,
    },
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/ui.js test/ui.test.js
git commit -m "feat: 输入解析校验(纯函数)"
```

---

## Task 9: 页面表单 + 渲染胶水（手动浏览器验证）

把表单 UI 接上逻辑。DOM 渲染无法用 node 单测，靠浏览器手动验证。

**Files:**
- Modify: `index.html`
- Modify: `src/ui.js`
- Modify: `style.css`（新建占位即可，下个 Task 细化）

- [ ] **Step 1: 写 index.html 表单 + 结果区结构**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ShouldIPull — Should you pull on the new banner?</title>
  <meta name="description" content="Tells you Pull, Wait, or Skip on the new Genshin banner based on your wishes and pity. Free, instant, no login." />
  <link rel="stylesheet" href="./style.css" />
</head>
<body>
  <main id="app">
    <h1>Should I Pull?</h1>
    <p class="sub">Tells you <b>Pull / Wait / Skip</b> on the new banner. No login.</p>

    <form id="calc">
      <label>Wishes / Primogems you have
        <input name="wishes" type="number" min="0" inputmode="numeric" placeholder="e.g. 80" />
        <small>1 wish = 160 primogems</small>
      </label>

      <label>Pity (pulls since last 5★)
        <input name="pity" type="number" min="0" max="89" inputmode="numeric" placeholder="0-89" />
      </label>

      <fieldset>
        <legend>Guaranteed?</legend>
        <label><input type="radio" name="guaranteed" value="yes" /> Yes (next 5★ is guaranteed)</label>
        <label><input type="radio" name="guaranteed" value="no" checked /> No (50/50)</label>
      </fieldset>

      <label>Goal (how many copies)
        <input name="target" type="number" min="1" max="7" value="1" inputmode="numeric" />
      </label>

      <label class="checkbox">
        <input type="checkbox" name="wantWeapon" /> Also want the signature weapon
      </label>

      <button type="submit">Should I pull?</button>
      <p id="error" class="error" role="alert"></p>
    </form>

    <section id="result" hidden>
      <div id="card">
        <div id="verdict-emoji"></div>
        <p id="verdict-line"></p>
        <div class="bar"><div id="bar-fill"></div></div>
        <p id="prob-text"></p>
        <ul id="reasons"></ul>
        <p class="watermark">ShouldIPull.com</p>
      </div>
      <button id="share">Save share image</button>
      <small class="algo">Based on official rates + pity system · 10,000 Monte Carlo simulations</small>
    </section>
  </main>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script type="module" src="./src/ui.js"></script>
</body>
</html>
```

- [ ] **Step 2: 在 src/ui.js 追加 DOM 胶水**

```javascript
// 追加到 src/ui.js
import { simulate, verdict, buildReasons } from "./gacha.js";
import { pickVerdictLine } from "./copy.js";

const EMOJI = { pull: "🟢", wait: "🟡", skip: "🔴" };

function renderResult(values) {
  const sim = simulate({ ...values, sims: 10000 });
  const tier = verdict(sim.probability);
  const pct = Math.round(sim.probability * 100);

  const reasons = buildReasons({
    ...values,
    tier,
    probability: sim.probability,
    avgWishesUsedOnSuccess: sim.avgWishesUsedOnSuccess,
  });
  const shortBy = sim.avgWishesUsedOnSuccess != null
    ? Math.max(0, Math.round(sim.avgWishesUsedOnSuccess - values.wishes))
    : 0;
  const line = pickVerdictLine(tier, { probabilityPct: pct, shortBy });

  document.getElementById("verdict-emoji").textContent = EMOJI[tier];
  document.getElementById("verdict-line").textContent = line;
  document.getElementById("prob-text").textContent = `${pct}% chance to get your goal`;
  document.getElementById("bar-fill").style.width = `${pct}%`;
  const card = document.getElementById("card");
  card.dataset.tier = tier;

  const ul = document.getElementById("reasons");
  ul.innerHTML = "";
  for (const r of reasons) {
    const li = document.createElement("li");
    li.textContent = r;
    ul.appendChild(li);
  }
  document.getElementById("result").hidden = false;
}

function init() {
  const form = document.getElementById("calc");
  if (!form) return; // 测试环境无 DOM 时跳过
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const parsed = parseInputs({
      wishes: fd.get("wishes") ?? "",
      pity: fd.get("pity") ?? "0",
      guaranteed: fd.get("guaranteed") ?? "no",
      target: fd.get("target") ?? "1",
      wantWeapon: fd.get("wantWeapon") === "on",
    });
    const errEl = document.getElementById("error");
    if (!parsed.ok) {
      errEl.textContent = parsed.error;
      document.getElementById("result").hidden = true;
      return;
    }
    errEl.textContent = "";
    renderResult(parsed.values);
  });
}

if (typeof document !== "undefined") init();
```

注意：`parseInputs` 已在本文件上方定义（Task 8），此处直接调用。

- [ ] **Step 3: 写最小 style.css 占位**

```css
/* style.css — 占位, Task 10 细化 */
body { font-family: system-ui, sans-serif; margin: 0; padding: 1rem; }
#app { max-width: 480px; margin: 0 auto; }
[hidden] { display: none; }
```

- [ ] **Step 4: 跑单测确认没破坏纯逻辑**

Run: `npm test`
Expected: PASS（ui.js 顶部新增 import；node 测试只 import parseInputs，DOM 分支被 `typeof document` 守卫，不会执行）。

- [ ] **Step 5: 手动浏览器验证**

Run: `python3 -m http.server 8000`，浏览器开 `http://localhost:8000`
Expected:
- 填 wishes=80, pity=20, guaranteed=yes, target=1 → 点按钮 → 出 🟢 + 梗结论 + 概率条 + 理由。
- 留空 wishes → 点按钮 → 显示红色错误，不出结果。
- 控制台无报错。

- [ ] **Step 6: Commit**

```bash
git add index.html src/ui.js style.css
git commit -m "feat: 表单UI接通逻辑+结果渲染"
```

---

## Task 10: 结果卡视觉打磨 + 移动端样式（核心赌注）

结果卡是传播载体，重点打磨。竖版、好看、三档配色、移动端清晰。

**Files:**
- Modify: `style.css`
- Modify: `index.html`（如需微调 card 结构）

- [ ] **Step 1: 写完整 style.css**

```css
:root {
  --bg: #0f1020; --fg: #f4f4f8; --muted: #9aa0b5;
  --pull: #38d27a; --wait: #f2c14e; --skip: #ff5d6c;
  --card-bg: #1a1c30;
}
* { box-sizing: border-box; }
body {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  margin: 0; padding: 1.25rem; background: var(--bg); color: var(--fg);
}
#app { max-width: 460px; margin: 0 auto; }
h1 { font-size: 1.9rem; margin: 0 0 .25rem; }
.sub { color: var(--muted); margin: 0 0 1.25rem; }
[hidden] { display: none; }

form label { display: block; margin: 0 0 1rem; font-weight: 600; }
form input[type=number] {
  display: block; width: 100%; margin-top: .35rem; padding: .7rem;
  font-size: 1.1rem; border-radius: .6rem; border: 1px solid #33365a;
  background: #14162a; color: var(--fg);
}
form small { color: var(--muted); font-weight: 400; }
fieldset { border: 1px solid #33365a; border-radius: .6rem; margin: 0 0 1rem; }
fieldset label, .checkbox { font-weight: 400; }
button[type=submit] {
  width: 100%; padding: .9rem; font-size: 1.1rem; font-weight: 700;
  border: 0; border-radius: .7rem; background: #6c5ce7; color: #fff; cursor: pointer;
}
.error { color: var(--skip); min-height: 1.2em; }

#result { margin-top: 1.5rem; }
#card {
  background: var(--card-bg); border-radius: 1rem; padding: 1.5rem 1.25rem;
  text-align: center; border-top: 6px solid #444;
}
#card[data-tier=pull]  { border-top-color: var(--pull); }
#card[data-tier=wait]  { border-top-color: var(--wait); }
#card[data-tier=skip]  { border-top-color: var(--skip); }
#verdict-emoji { font-size: 3rem; }
#verdict-line { font-size: 1.3rem; font-weight: 800; margin: .5rem 0 1rem; }
.bar { height: 14px; background: #2a2d4a; border-radius: 10px; overflow: hidden; }
#bar-fill { height: 100%; background: linear-gradient(90deg,#6c5ce7,#38d27a); }
#prob-text { color: var(--muted); margin: .5rem 0 1rem; }
#reasons { text-align: left; color: var(--fg); font-size: .95rem; padding-left: 1.2rem; }
.watermark { color: var(--muted); font-size: .8rem; margin-top: 1rem; letter-spacing: .05em; }
#share {
  width: 100%; margin-top: 1rem; padding: .8rem; font-weight: 700;
  border: 0; border-radius: .7rem; background: #38d27a; color: #04210f; cursor: pointer;
}
.algo { display: block; color: var(--muted); margin-top: .75rem; text-align: center; }
```

- [ ] **Step 2: 手动浏览器验证三档配色**

Run: `python3 -m http.server 8000`
Expected: 三种输入分别触发 🟢/🟡/🔴，卡片顶边颜色对应变化，移动端宽度（DevTools 手机视图）显示正常、不溢出。
- 🟢: wishes=120, pity=40, guaranteed=yes
- 🟡: wishes=55, pity=10, guaranteed=no
- 🔴: wishes=15, pity=0, guaranteed=no

- [ ] **Step 3: Commit**

```bash
git add style.css index.html
git commit -m "style: 结果卡视觉+三档配色+移动端样式"
```

---

## Task 11: 分享图生成（html2canvas）

点按钮把 `#card` 转成竖图下载。

**Files:**
- Modify: `src/ui.js`

- [ ] **Step 1: 在 src/ui.js 追加分享逻辑，并在 init() 里绑定**

```javascript
// 追加到 src/ui.js
function initShare() {
  const btn = document.getElementById("share");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const card = document.getElementById("card");
    if (typeof window.html2canvas !== "function") {
      btn.textContent = "Screenshot the card to share 📸";
      return;
    }
    const canvas = await window.html2canvas(card, {
      backgroundColor: "#1a1c30",
      scale: 2,
    });
    const link = document.createElement("a");
    link.download = "shouldipull.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}
```

并在 `init()` 末尾调用 `initShare()`：

```javascript
// 修改 init() 末尾, 在 form 监听之后加:
  initShare();
```

- [ ] **Step 2: 跑单测确认未破坏逻辑**

Run: `npm test`
Expected: PASS（分享代码在 DOM 守卫内，node 不执行）。

- [ ] **Step 3: 手动浏览器验证**

Run: `python3 -m http.server 8000`
Expected:
- 出结果后点 "Save share image" → 下载一张 `shouldipull.png`。
- 图片含 emoji + 梗结论 + 概率条 + 理由 + `ShouldIPull.com` 水印，清晰可读。
- 若 html2canvas 未加载（断网 CDN），按钮文字降级为提示，不报错。

- [ ] **Step 4: Commit**

```bash
git add src/ui.js
git commit -m "feat: 结果卡一键生成分享图(html2canvas)"
```

---

## Task 12: SEO + 部署配置

**Files:**
- Modify: `index.html`（补 SEO/OG meta）
- Create: `vercel.json`
- Create: `README.md`

- [ ] **Step 1: 在 index.html `<head>` 补 OG / SEO meta**

```html
  <meta property="og:title" content="ShouldIPull — Should you pull on the new banner?" />
  <meta property="og:description" content="Pull, Wait, or Skip — instant verdict based on your wishes and pity." />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="https://shouldipull.com/" />
```

- [ ] **Step 2: 写 vercel.json（静态站点，无构建）**

```json
{
  "cleanUrls": true,
  "trailingSlash": false
}
```

- [ ] **Step 3: 写 README.md**

```markdown
# ShouldIPull

A single-page tool that tells Genshin players **Pull / Wait / Skip** on the new banner,
based on their wishes and pity. Pure front-end, no backend, no login.

## Develop
- Open `index.html` via a static server: `python3 -m http.server 8000`
- Run logic tests: `npm test`

## Deploy
Static site on Vercel. Connect the GitHub repo; no build step. Domain: shouldipull.com
```

- [ ] **Step 4: 全量验证**

Run: `npm test`
Expected: PASS（所有逻辑测试）。
Run: `python3 -m http.server 8000` 手动过一遍三档 + 分享图 + 错误校验。

- [ ] **Step 5: Commit**

```bash
git add index.html vercel.json README.md
git commit -m "chore: SEO meta + Vercel配置 + README"
```

- [ ] **Step 6: 部署（用户操作）**

1. 把仓库推到 GitHub。
2. Vercel 导入仓库 → 自动识别静态站 → 部署 → 拿到 `shouldipull.vercel.app`。
3. 验证有人用后，在 Vercel 把 `shouldipull.com` DNS 指过去。

---

## 验收清单（对应 spec 第 5 节）

- [ ] `npm test` 全绿：概率模型、精确解交叉验证(±2%)、阈值、理由、文案、输入校验。
- [ ] 边界：0 抽→0%；pity89+大保底→~100%；pity89+50/50→~50%。
- [ ] 三档 🟢🟡🔴 配色正确触发。
- [ ] 表单校验：空/负数 wishes 报错不出结果；pity、target 越界被钳制。
- [ ] 分享图能下载，含水印+网址，手机清晰；CDN 失败降级不崩。
- [ ] 移动端布局正常。
- [ ] Vercel 部署后线上链接可访问。
