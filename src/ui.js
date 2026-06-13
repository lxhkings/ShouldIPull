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
  initShare();
}

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

if (typeof document !== "undefined") init();
