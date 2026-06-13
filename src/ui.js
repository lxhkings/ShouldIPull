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
