# ShouldIPull 计划 2/2 — 楔子打磨（Claude 执行）

> **For agentic workers:** 计划 1 完成且 push 后再执行本计划。逐 Task 进行，每个 Task 末尾 commit。

**Goal:** 把项目的胜负手做到位——升级梗文案库（Reddit 黑话、多档多条）+ 重做结果卡视觉（竖版、三档配色、移动端清晰、适合截图斗图）。

**前置依赖（计划 1 已完成）:** `src/copy.js`、`src/ui.js`、`index.html`（含结果卡 id）、`style.css`（占位版）、所有 `gacha.js` 逻辑 + 测试已 push。

**⚠️ 约束（来自共享契约）:** 不改任何接口签名、不改 HTML 结果卡 id、不动 `gacha.js`/`ui.js` 逻辑。只替换 `copy.js` 文案内容与 `copy.test.js`、重写 `style.css`。

**契约回顾（不可改）:**
- `pickVerdictLine(tier, ctx, index?) -> string`，`ctx = { probabilityPct, shortBy }`，模板占位 `{pct}` `{short}`
- `VERDICT_LINES = { pull: string[], wait: string[], skip: string[] }`
- HTML id：`#card`(data-tier)、`#verdict-emoji`、`#verdict-line`、`#bar-fill`、`#prob-text`、`#reasons`、`#share`、`.watermark`、`.algo`

---

## Task 1: 升级梗文案库（核心赌注）

每档备 ≥5 条 Reddit 黑话文案（copium/hopium/F2P/whale/anon/RNGesus/primos 等），有梗、对味、可传播。

**Files:** Modify `src/copy.js`、`test/copy.test.js`

- [ ] **Step 1: 强化测试（要求每档 ≥5 条 + 占位正确填充）**

```javascript
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
```

- [ ] **Step 2: 跑测试确认失败** — Run: `npm test` → Expected: FAIL（占位版只有 1 条/档，`>=5` 失败）。

- [ ] **Step 3: 替换 `src/copy.js` 文案（保持 fill/pickVerdictLine 不变，每行都含 `{pct}`）**

> 执行时由 Claude 现写：每档 5~7 条，地道 Reddit gacha 黑话，🟢 提气 / 🟡 纠结 / 🔴 自嘲。每行必须含 `{pct}`；skip 档至少几条含 `{short}`。示例风格（最终以执行时产出为准）：
> - pull: "PULL — {pct}%. The gacha gods smile upon you, anon."
> - wait: "WAIT — {pct}%. Coinflip territory. Pray to RNGesus first."
> - skip: "SKIP — {pct}%. {short} wishes short. Pure copium."

- [ ] **Step 4: 跑测试确认通过** — Run: `npm test` → Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/copy.js test/copy.test.js
git commit -m "feat: 升级梗文案库(Reddit黑话, 多档多条)"
```

---

## Task 2: 结果卡视觉打磨（核心赌注）

替换占位 `style.css` 为打磨版：暗色、三档配色、大号结论、概率条、水印，移动端清晰，截图好看。

**Files:** Modify `style.css`

- [ ] **Step 1: 重写 style.css**

> 执行时由 Claude 现写完整样式。要求：
> - 暗色背景、移动端优先、`#app` 居中 ≤460px。
> - `#card[data-tier=pull|wait|skip]` 顶边/强调色分别绿/黄/红。
> - `#verdict-emoji` 大号、`#verdict-line` 粗大、`.bar`/`#bar-fill` 概率条、`#reasons` 左对齐、`.watermark` 弱化带网址感。
> - `#share` 按钮显眼。截图时 `#card` 自身是完整美观的竖版卡片（html2canvas 截的就是它）。

- [ ] **Step 2: 浏览器手动验证三档** — Run: `python3 -m http.server 8000`，DevTools 手机视图：
  - 🟢 wishes=120, pity=40, guaranteed=Yes
  - 🟡 wishes=55, pity=10, guaranteed=No
  - 🔴 wishes=15, pity=0, guaranteed=No
  - 检查：顶边配色随档变化、不溢出、文字清晰。

- [ ] **Step 3: 验证分享图观感** — 出结果点 "Save share image"，打开下载的 `shouldipull.png`：卡片完整美观、含结论+概率条+理由+`ShouldIPull.com` 水印、手机分辨率清晰。

- [ ] **Step 4: Commit**

```bash
git add style.css
git commit -m "style: 结果卡视觉打磨(三档配色+移动端+截图友好)"
```

---

## Task 3: 收尾验证 + 推送

- [ ] **Step 1: 全量验证**
  - Run: `npm test` → 全绿（gacha + copy + ui 全部）。
  - 浏览器：三档触发正确、表单校验、分享图下载、移动端正常。

- [ ] **Step 2: Push**

```bash
git push
```

- [ ] **Step 3: 部署提示（用户操作）** — Vercel 导入仓库 → 自动识别静态站 → 部署 → `shouldipull.vercel.app`；验证后把 `shouldipull.com` DNS 指过去；Google Search Console 提交 sitemap。

---

## 验收清单（对应 spec 第 5 节，两份计划合计）

- [ ] `npm test` 全绿：概率模型、精确解交叉验证(±2%)、阈值、理由、文案(≥5/档+占位填充)、输入校验。
- [ ] 边界：0 抽→0%；pity89+大保底→~100%；pity89+50/50→~50%。
- [ ] 三档 🟢🟡🔴 配色正确、文案对味。
- [ ] 表单校验：空/负数报错、pity/target 越界钳制。
- [ ] 分享图下载、含水印+网址、手机清晰、CDN 失败降级。
- [ ] 移动端布局正常。
- [ ] Vercel 部署后线上可访问。
