export function pull5StarRate(pity) {
  if (pity >= 90) return 1.0;
  if (pity >= 74) return 0.006 + 0.06 * (pity - 73);
  return 0.006;
}

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

// 追加到 src/gacha.js
export function verdict(probability) {
  if (probability >= 0.70) return "pull";
  if (probability >= 0.40) return "wait";
  return "skip";
}
