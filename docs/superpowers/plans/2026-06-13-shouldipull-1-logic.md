# ShouldIPull 计划 1/2 — 逻辑与骨架（DeepSeek 执行）

> **For agentic workers:** 按 Task 顺序逐个执行。每个 Task 含完整代码、命令、预期输出。用 checkbox 跟踪。每个 Task 末尾必须 `git commit`。

**Goal:** 把 ShouldIPull 整个能跑的骨架做完——所有概率逻辑、表单、渲染、分享图、SEO、部署配置。文案库和样式先用**占位版**（功能正确但不打磨），交给计划 2 由 Claude 升级。

**Architecture:** 纯前端、无后端、无构建。核心逻辑是纯 JS 模块（浏览器 `type="module"` 加载，Node 用内置 `node --test` 跑 TDD）。DOM 胶水读表单→调逻辑→渲染→html2canvas 生成图。

**Tech Stack:** 原生 HTML + CSS + JS (ESM)；Node 26 内置 `node:test`；`html2canvas`（CDN）；Vercel。

**⚠️ 你负责的范围**：本计划全部 Task。**不要**美化文案或结果卡视觉——那是计划 2 的事。文案库和 CSS 只做到「功能正确、能跑」即可，**严格按下面的占位代码写**，不要自由发挥，否则会和计划 2 冲突。

---

## 共享契约（计划 1 和计划 2 都不能改）

两份计划靠这些接口对接，**签名/字段名/id 必须完全一致**：

**`src/gacha.js` 导出：**
- `pull5StarRate(pity) -> number`
- `exactProbabilitySingle(wishes, pity, guaranteed) -> number`
- `simulate({ wishes, pity, guaranteed, target, sims }) -> { probability, avgWishesUsedOnSuccess }`
- `verdict(probability) -> "pull" | "wait" | "skip"`
- `buildReasons({ wishes, pity, guaranteed, tier, probability, avgWishesUsedOnSuccess, wantWeapon }) -> string[]`

**`src/copy.js` 导出（计划 2 会替换内容，但签名不变）：**
- `VERDICT_LINES = { pull: string[], wait: string[], skip: string[] }`
- `pickVerdictLine(tier, ctx, index?) -> string`，`ctx = { probabilityPct: number, shortBy: number }`，模板占位 `{pct}` `{short}`

**`src/ui.js` 导出：**
- `parseInputs(raw) -> { ok: boolean, values?: {...}, error?: string }`

**HTML 结果卡 id（计划 2 的 CSS 依赖这些，不能改名）：**
`#card`（含 `data-tier` 属性）、`#verdict-emoji`、`#verdict-line`、`#bar-fill`、`#prob-text`、`#reasons`、`#share`、`.watermark`、`.algo`

**原神 5★ 概率模型（写死在 `pull5StarRate`）：**
- `pity ≤ 73` → `0.006`；`74 ≤ pity ≤ 89` → `0.006 + 0.06*(pity-73)`；`pity ≥ 90` → `1.0`
- 50/50：出 5★ 时 guaranteed 则必限定，否则 50% 限定 / 50% 歪（歪后 guaranteed=true）。拿到限定后 pity=0、guaranteed=false。

---

## Task 1: 项目脚手架

**Files:** Create `package.json`、`.gitignore`、`index.html`（空骨架）

- [ ] **Step 1: package.json**

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

- [ ] **Step 2: .gitignore**

```
node_modules/
.DS_Store
.vercel/
```

- [ ] **Step 3: index.html 空骨架**

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

- [ ] **Step 4: 验证 `npm test` 能跑**

Run: `npm test` → Expected: 退出码 0，`tests 0`（无测试也通过）。

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore index.html
git commit -m "chore: 项目脚手架"
```

---

## Task 2: 单抽 5★ 概率 `pull5StarRate()`

**Files:** Create `src/gacha.js`、`test/gacha.test.js`

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

- [ ] **Step 2: 跑测试确认失败** — Run: `npm test` → Expected: FAIL，`pull5StarRate is not a function`。

- [ ] **Step 3: 实现**

```javascript
// src/gacha.js
export function pull5StarRate(pity) {
  if (pity >= 90) return 1.0;
  if (pity >= 74) return 0.006 + 0.06 * (pity - 73);
  return 0.006;
}
```

- [ ] **Step 4: 跑测试确认通过** — Run: `npm test` → Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/gacha.js test/gacha.test.js
git commit -m "feat: 单抽5星概率函数(软硬保底)"
```

---

## Task 3: 精确概率参考 `exactProbabilitySingle()`

**Files:** Modify `src/gacha.js`、`test/gacha.test.js`

- [ ] **Step 1: 追加失败测试**

```javascript
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
```

- [ ] **Step 2: 跑测试确认失败** — Expected: FAIL，`exactProbabilitySingle is not a function`。

- [ ] **Step 3: 实现**

```javascript
// 追加到 src/gacha.js
// W 抽内至少拿到 1 个限定的精确概率。传播 "还没拿到限定" 的概率质量, 最后 1-剩余。
export function exactProbabilitySingle(wishes, pity, guaranteed) {
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
      add(newPity, curGuar, mass * (1 - r)); // 没出5星, 留下
      if (!curGuar) add(0, true, mass * r * 0.5); // 出5星但歪, 留下; 大保底/中限定则离开
    }
    dp = next;
  }
  let remaining = 0;
  for (const mass of dp.values()) remaining += mass;
  return 1 - remaining;
}
```

- [ ] **Step 4: 跑测试确认通过** — Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/gacha.js test/gacha.test.js
git commit -m "feat: 精确概率参考函数"
```

---

## Task 4: 蒙特卡洛模拟 `simulate()`

**Files:** Modify `src/gacha.js`、`test/gacha.test.js`

- [ ] **Step 1: 追加失败测试（含与精确解交叉验证）**

```javascript
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
```

- [ ] **Step 2: 跑测试确认失败** — Expected: FAIL，`simulate is not a function`。

- [ ] **Step 3: 实现**

```javascript
// 追加到 src/gacha.js
function simulateOnce(wishes, pity, guaranteed, target) {
  let curPity = pity, curGuar = guaranteed, limited = 0;
  for (let i = 1; i <= wishes; i++) {
    curPity += 1;
    if (Math.random() < pull5StarRate(curPity)) {
      let isLimited;
      if (curGuar) isLimited = true;
      else if (Math.random() < 0.5) isLimited = true;
      else isLimited = false;
      if (isLimited) { limited += 1; curGuar = false; }
      else curGuar = true;
      curPity = 0;
      if (limited >= target) return { gotTarget: true, wishesUsedToReachTarget: i };
    }
  }
  return { gotTarget: false, wishesUsedToReachTarget: null };
}

export function simulate({ wishes, pity, guaranteed, target, sims = 10000 }) {
  let success = 0, usedSum = 0;
  for (let s = 0; s < sims; s++) {
    const r = simulateOnce(wishes, pity, guaranteed, target);
    if (r.gotTarget) { success += 1; usedSum += r.wishesUsedToReachTarget; }
  }
  return {
    probability: success / sims,
    avgWishesUsedOnSuccess: success > 0 ? usedSum / success : null,
  };
}
```

- [ ] **Step 4: 跑测试确认通过** — Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/gacha.js test/gacha.test.js
git commit -m "feat: 蒙特卡洛模拟"
```

---

## Task 5: 决策档位 `verdict()`

**Files:** Modify `src/gacha.js`、`test/gacha.test.js`

- [ ] **Step 1: 追加失败测试**

```javascript
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
```

- [ ] **Step 2: 跑测试确认失败** — Expected: FAIL。

- [ ] **Step 3: 实现**

```javascript
// 追加到 src/gacha.js
export function verdict(probability) {
  if (probability >= 0.70) return "pull";
  if (probability >= 0.40) return "wait";
  return "skip";
}
```

- [ ] **Step 4: 跑测试确认通过** — Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/gacha.js test/gacha.test.js
git commit -m "feat: 决策档位(70/40阈值)"
```

---

## Task 6: 事实理由 `buildReasons()`

**Files:** Modify `src/gacha.js`、`test/gacha.test.js`

- [ ] **Step 1: 追加失败测试**

```javascript
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
```

- [ ] **Step 2: 跑测试确认失败** — Expected: FAIL。

- [ ] **Step 3: 实现**

```javascript
// 追加到 src/gacha.js
const WEAPON_AVG_COST = 80; // 专武粗估, 仅供参考
export function buildReasons({ wishes, pity, guaranteed, tier, probability, avgWishesUsedOnSuccess, wantWeapon }) {
  const reasons = [];
  if (tier === "pull" && avgWishesUsedOnSuccess != null) {
    const leftover = Math.max(0, Math.round(wishes - avgWishesUsedOnSuccess));
    reasons.push(`You'll likely have ~${leftover} wishes left after getting them.`);
  }
  if (tier === "skip") {
    const need = avgWishesUsedOnSuccess != null ? Math.round(avgWishesUsedOnSuccess) : 93;
    reasons.push(`Short by ~${Math.max(0, need - wishes)} wishes for a comfortable shot.`);
  }
  if (guaranteed) reasons.push(`You're on guarantee — the next 5★ is the rate-up character.`);
  else reasons.push(`You're on 50/50 — a 5★ might still be a standard character.`);
  if (wantWeapon) {
    const weaponShort = Math.max(0, WEAPON_AVG_COST + 80 - wishes);
    reasons.push(`Want the weapon too? Roughly ~${weaponShort} more wishes needed (rough estimate).`);
  }
  return reasons.slice(0, 3);
}
```

- [ ] **Step 4: 跑测试确认通过** — Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/gacha.js test/gacha.test.js
git commit -m "feat: 事实理由生成器"
```

---

## Task 7: 输入解析 `parseInputs()`

**Files:** Create `src/ui.js`、`test/ui.test.js`

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
test("pity clamped 0..89", () => {
  assert.equal(parseInputs({ wishes: "10", pity: "200", guaranteed: "no", target: "1", wantWeapon: false }).values.pity, 89);
});
test("target clamped 1..7", () => {
  assert.equal(parseInputs({ wishes: "600", pity: "0", guaranteed: "no", target: "99", wantWeapon: false }).values.target, 7);
});
test("negative wishes -> error", () => {
  assert.equal(parseInputs({ wishes: "-5", pity: "0", guaranteed: "no", target: "1", wantWeapon: false }).ok, false);
});
```

- [ ] **Step 2: 跑测试确认失败** — Expected: FAIL，`parseInputs is not a function`。

- [ ] **Step 3: 实现（本 Task 只写 parseInputs，DOM 在 Task 9）**

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
    values: { wishes: Math.floor(wishes), pity, guaranteed: raw.guaranteed === "yes", target, wantWeapon: !!raw.wantWeapon },
  };
}
```

- [ ] **Step 4: 跑测试确认通过** — Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/ui.js test/ui.test.js
git commit -m "feat: 输入解析校验"
```

---

## Task 8: 占位文案库 `copy.js`（⚠️ 严格照抄，计划 2 会替换内容）

**只写最小占位**，让 `ui.js` 能 import。**不要扩充文案**——那是计划 2 的事。

**Files:** Create `src/copy.js`、`test/copy.test.js`

- [ ] **Step 1: 写测试（只测接口，不测文案数量）**

```javascript
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
```

- [ ] **Step 2: 跑测试确认失败** — Expected: FAIL。

- [ ] **Step 3: 实现占位（每档 1 条，足够通过测试）**

```javascript
// src/copy.js  —— 占位版, 计划 2 (Claude) 会替换文案内容, 保持签名不变
export const VERDICT_LINES = {
  pull: ["PULL — {pct}%. You've got enough."],
  wait: ["WAIT — {pct}%. It's a coinflip."],
  skip: ["SKIP — {pct}%. You're {short} wishes short."],
};
function fill(t, ctx) {
  return t.replace("{pct}", String(ctx.probabilityPct)).replace("{short}", String(ctx.shortBy ?? 0));
}
export function pickVerdictLine(tier, ctx, index) {
  const lines = VERDICT_LINES[tier];
  const i = index != null ? index : Math.floor(Math.random() * lines.length);
  return fill(lines[i], ctx);
}
```

- [ ] **Step 4: 跑测试确认通过** — Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/copy.js test/copy.test.js
git commit -m "feat: 占位文案库(接口冻结, 待计划2升级)"
```

---

## Task 9: 表单 + 渲染胶水（浏览器手动验证）

**Files:** Modify `index.html`、`src/ui.js`；Create `style.css`（占位）

- [ ] **Step 1: index.html 表单 + 结果卡结构**

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
      <label class="checkbox"><input type="checkbox" name="wantWeapon" /> Also want the signature weapon</label>
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

- [ ] **Step 2: src/ui.js 追加 DOM 胶水（在 parseInputs 下方）**

```javascript
// 追加到 src/ui.js
import { simulate, verdict, buildReasons } from "./gacha.js";
import { pickVerdictLine } from "./copy.js";

const EMOJI = { pull: "🟢", wait: "🟡", skip: "🔴" };

function renderResult(values) {
  const sim = simulate({ ...values, sims: 10000 });
  const tier = verdict(sim.probability);
  const pct = Math.round(sim.probability * 100);
  const reasons = buildReasons({ ...values, tier, probability: sim.probability, avgWishesUsedOnSuccess: sim.avgWishesUsedOnSuccess });
  const shortBy = sim.avgWishesUsedOnSuccess != null ? Math.max(0, Math.round(sim.avgWishesUsedOnSuccess - values.wishes)) : 0;
  const line = pickVerdictLine(tier, { probabilityPct: pct, shortBy });

  document.getElementById("verdict-emoji").textContent = EMOJI[tier];
  document.getElementById("verdict-line").textContent = line;
  document.getElementById("prob-text").textContent = `${pct}% chance to get your goal`;
  document.getElementById("bar-fill").style.width = `${pct}%`;
  document.getElementById("card").dataset.tier = tier;
  const ul = document.getElementById("reasons");
  ul.innerHTML = "";
  for (const r of reasons) { const li = document.createElement("li"); li.textContent = r; ul.appendChild(li); }
  document.getElementById("result").hidden = false;
}

function init() {
  const form = document.getElementById("calc");
  if (!form) return;
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
    if (!parsed.ok) { errEl.textContent = parsed.error; document.getElementById("result").hidden = true; return; }
    errEl.textContent = "";
    renderResult(parsed.values);
  });
}

if (typeof document !== "undefined") init();
```

- [ ] **Step 3: style.css 占位（⚠️ 只写最小可用, 计划 2 会替换）**

```css
/* style.css —— 占位, 计划 2 (Claude) 替换为打磨版 */
body { font-family: system-ui, sans-serif; margin: 0; padding: 1rem; }
#app { max-width: 480px; margin: 0 auto; }
[hidden] { display: none; }
form label { display: block; margin-bottom: 1rem; }
input[type=number] { display: block; width: 100%; padding: .5rem; }
.error { color: #c00; }
#card { border: 1px solid #ccc; padding: 1rem; margin-top: 1rem; text-align: center; }
.bar { height: 12px; background: #eee; } #bar-fill { height: 100%; background: #4a90d9; }
```

- [ ] **Step 4: 跑单测确认逻辑未破坏** — Run: `npm test` → Expected: PASS（ui.js 新增 import；node 测试只 import parseInputs，DOM 分支被 `typeof document` 守卫）。

- [ ] **Step 5: 浏览器手动验证** — Run: `python3 -m http.server 8000`，开 `http://localhost:8000`
  - wishes=80, pity=20, guaranteed=Yes, target=1 → 点按钮 → 出 emoji + 一句结论 + 概率条 + 理由。
  - 留空 wishes → 点按钮 → 红字错误，不出结果。控制台无报错。

- [ ] **Step 6: Commit**

```bash
git add index.html src/ui.js style.css
git commit -m "feat: 表单UI接通逻辑+结果渲染(占位样式)"
```

---

## Task 10: 分享图 `html2canvas`

**Files:** Modify `src/ui.js`

- [ ] **Step 1: 追加分享逻辑并在 init() 调用**

```javascript
// 追加到 src/ui.js
function initShare() {
  const btn = document.getElementById("share");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const card = document.getElementById("card");
    if (typeof window.html2canvas !== "function") { btn.textContent = "Screenshot the card to share 📸"; return; }
    const canvas = await window.html2canvas(card, { backgroundColor: "#1a1c30", scale: 2 });
    const link = document.createElement("a");
    link.download = "shouldipull.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}
```

在 `init()` 末尾（form 监听之后）加一行：

```javascript
  initShare();
```

- [ ] **Step 2: 跑单测** — Run: `npm test` → Expected: PASS（分享代码在 DOM 守卫内）。

- [ ] **Step 3: 浏览器手动验证** — 出结果后点 "Save share image" → 下载 `shouldipull.png`。断网 CDN 时按钮降级提示、不报错。

- [ ] **Step 4: Commit**

```bash
git add src/ui.js
git commit -m "feat: 结果卡一键生成分享图"
```

---

## Task 11: SEO + 部署配置

**Files:** Modify `index.html`；Create `robots.txt`、`sitemap.xml`、`vercel.json`、`README.md`

- [ ] **Step 1: index.html `<head>` 补 OG/SEO meta**

```html
  <meta property="og:title" content="ShouldIPull — Should you pull on the new banner?" />
  <meta property="og:description" content="Pull, Wait, or Skip — instant verdict based on your wishes and pity." />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="https://shouldipull.com/" />
```

- [ ] **Step 2: robots.txt**

```
User-agent: *
Allow: /
Sitemap: https://shouldipull.com/sitemap.xml
```

- [ ] **Step 3: sitemap.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://shouldipull.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
```

- [ ] **Step 4: vercel.json**

```json
{ "cleanUrls": true, "trailingSlash": false }
```

- [ ] **Step 5: README.md**

```markdown
# ShouldIPull

Single-page tool telling Genshin players **Pull / Wait / Skip** on the new banner,
based on wishes and pity. Pure front-end, no backend, no login.

## Develop
- Serve: `python3 -m http.server 8000`
- Test logic: `npm test`

## Deploy
Static site on Vercel — connect the GitHub repo, no build step. Domain: shouldipull.com
```

- [ ] **Step 6: 全量验证** — Run: `npm test`（全绿）+ 浏览器过三档/分享/错误校验。

- [ ] **Step 7: Commit + Push**

```bash
git add index.html robots.txt sitemap.xml vercel.json README.md
git commit -m "chore: SEO meta + robots + sitemap + Vercel配置 + README"
git push
```

---

## 交接给计划 2

计划 1 完成标准：
- [ ] `npm test` 全绿。
- [ ] 浏览器三档 🟢🟡🔴 能触发、表单校验生效、分享图能下载。
- [ ] 已 `git push` 到 `origin/main`。

完成后通知，由 Claude 执行**计划 2（楔子打磨）**：替换 `src/copy.js` 文案库、重做 `style.css` 结果卡视觉。接口/HTML id 已在「共享契约」冻结，不会冲突。
