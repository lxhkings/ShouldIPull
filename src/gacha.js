// src/gacha.js
export function pull5StarRate(pity) {
  if (pity >= 90) return 1.0;
  if (pity >= 74) return 0.006 + 0.06 * (pity - 73);
  return 0.006;
}
