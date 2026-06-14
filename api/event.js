// api/event.js —— 匿名只写事件端点. 无 IP/PII, 只追加聚合字段.
import { kv } from "@vercel/kv";

const TIERS = new Set(["pull", "wait", "skip"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const game = typeof b.game === "string" ? b.game.slice(0, 40) : null;
    const character = b.character == null ? null : String(b.character).slice(0, 60);
    const tier = TIERS.has(b.tier) ? b.tier : null;
    const prob = typeof b.prob === "number" && b.prob >= 0 && b.prob <= 1 ? b.prob : null;

    if (!game || !tier || prob === null) {
      res.status(400).end();
      return;
    }

    const event = { game, character, tier, prob: Math.round(prob * 1000) / 1000, ts: Date.now() };
    await kv.rpush("events", JSON.stringify(event));

    res.status(204).end();
  } catch {
    res.status(204).end();
  }
}
