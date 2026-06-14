export function pull5StarRate(pity, rules) {
  if (pity >= rules.hardPity) return 1.0;
  if (pity >= rules.softPityStart) return rules.baseRate + rules.softPityRamp * (pity - (rules.softPityStart - 1));
  return rules.baseRate;
}

export function exactProbabilitySingle(wishes, pity, guaranteed, rules) {
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
      const r = pull5StarRate(newPity, rules);
      add(newPity, curGuar, mass * (1 - r));
      if (!curGuar) add(0, true, mass * r * rules.fiftyFifty);
    }
    dp = next;
  }
  let remaining = 0;
  for (const mass of dp.values()) remaining += mass;
  return 1 - remaining;
}

function simulateOnce(wishes, pity, guaranteed, target, rules) {
  let curPity = pity, curGuar = guaranteed, limited = 0;
  for (let i = 1; i <= wishes; i++) {
    curPity += 1;
    if (Math.random() < pull5StarRate(curPity, rules)) {
      let isLimited;
      if (curGuar) isLimited = true;
      else if (Math.random() < rules.fiftyFifty) isLimited = true;
      else isLimited = false;
      if (isLimited) { limited += 1; curGuar = false; }
      else curGuar = true;
      curPity = 0;
      if (limited >= target) return { gotTarget: true, wishesUsedToReachTarget: i };
    }
  }
  return { gotTarget: false, wishesUsedToReachTarget: null };
}

export function simulate({ wishes, pity, guaranteed, target, rules, sims = 10000 }) {
  let success = 0, usedSum = 0;
  for (let s = 0; s < sims; s++) {
    const r = simulateOnce(wishes, pity, guaranteed, target, rules);
    if (r.gotTarget) { success += 1; usedSum += r.wishesUsedToReachTarget; }
  }
  return {
    probability: success / sims,
    avgWishesUsedOnSuccess: success > 0 ? usedSum / success : null,
  };
}

export function verdict(probability) {
  if (probability >= 0.70) return "pull";
  if (probability >= 0.40) return "wait";
  return "skip";
}

export function buildReasons({ wishes, pity, guaranteed, tier, probability, avgWishesUsedOnSuccess, wantWeapon, weaponAvgCost }) {
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
    const weaponShort = Math.max(0, weaponAvgCost + 80 - wishes);
    reasons.push(`Want the weapon too? Roughly ~${weaponShort} more wishes needed (rough estimate).`);
  }
  return reasons.slice(0, 3);
}
