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
