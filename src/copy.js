// src/copy.js  —— 梗文案库 (Reddit gacha 黑话, 多档多条)
// 每行必须含 {pct}; skip 档若干条含 {short}。占位各最多用一次 (fill 单次 replace)。
export const VERDICT_LINES = {
  // 🟢 提气: gacha 神眷, 直接梭哈
  pull: [
    "PULL — {pct}%. The gacha gods smile upon you, anon. Go get your waifu.",
    "PULL — {pct}%. Pity's stacked, 50-50's in the bag. RNGesus already signed off.",
    "PULL — {pct}%. This is whale-tier odds without the whale wallet. Send it.",
    "PULL — {pct}%. Hopium fully justified. Spend those primos with a clear conscience.",
    "PULL — {pct}%. Even a hardstuck F2P clears this. No cope needed — just pull.",
    "PULL — {pct}%. Soft pity's right there, the math loves you. Click the banner.",
    "PULL — {pct}%. Statistically you'd have to be cursed to whiff. Yolo it, king.",
  ],
  // 🟡 纠结: 硬币正反, 自求多福
  wait: [
    "WAIT — {pct}%. Coinflip territory. Pray to RNGesus before you tap, anon.",
    "WAIT — {pct}%. This is 50-50 energy. One bad pull and it's copium o'clock.",
    "WAIT — {pct}%. Could go full hopium or full despair. Sleep on it, save the primos.",
    "WAIT — {pct}%. Not whale-safe, not F2P-doomed. Pure schrödinger's banner.",
    "WAIT — {pct}%. Dolphin-tier odds: enough to tempt you, not enough to trust. Wait for pity.",
    "WAIT — {pct}%. The RNG could bless or troll you. Touch grass, then decide.",
    "WAIT — {pct}%. Right on the knife's edge. Maybe farm primos one more patch first.",
  ],
  // 🔴 自嘲: 纯 copium, 早点收手
  skip: [
    "SKIP — {pct}%. You're {short} wishes short. Pure copium, anon. Save your wallet.",
    "SKIP — {pct}%. {short} pulls away from a dream. RNGesus has left the chat.",
    "SKIP — {pct}%. F2P reality check: {short} wishes short. Go farm, don't gamba.",
    "SKIP — {pct}%. This is whale-only territory and you're {short} short. Hard pass.",
    "SKIP — {pct}%. Hopium denied. The pity gods demand more primos before you dare.",
    "SKIP — {pct}%. Even maxed copium can't fix these odds. Close the app, king.",
    "SKIP — {pct}%. Account's not ready, anon. {short} wishes short of not crying.",
  ],
};
function fill(t, ctx) {
  return t.replace("{pct}", String(ctx.probabilityPct)).replace("{short}", String(ctx.shortBy ?? 0));
}
export function pickVerdictLine(tier, ctx, index) {
  const lines = VERDICT_LINES[tier];
  const i = index != null ? index : Math.floor(Math.random() * lines.length);
  return fill(lines[i], ctx);
}
