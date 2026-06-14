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

const EMOJI = { pull: "✨", wait: "⏳", skip: "💀" };

function readGameData() {
  const el = document.getElementById("game-data");
  if (!el) return null;
  try { return JSON.parse(el.textContent); } catch { return null; }
}

function reportEvent(payload) {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/event/", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/event/", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* fire-and-forget, never block UI */ }
}

function renderResult(values) {
  const gd = readGameData();
  const rules = gd ? gd.rules : { baseRate: 0.006, hardPity: 90, softPityStart: 74, softPityRamp: 0.06, fiftyFifty: 0.5 };
  const weaponAvgCost = gd ? gd.weaponAvgCost : 80;
  const sim = simulate({ ...values, sims: 10000, rules });
  const tier = verdict(sim.probability);
  const pct = Math.round(sim.probability * 100);
  const reasons = buildReasons({ ...values, tier, probability: sim.probability, avgWishesUsedOnSuccess: sim.avgWishesUsedOnSuccess, weaponAvgCost });
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

  reportEvent({ game: gd ? gd.game : "genshin", character: gd ? gd.character : null, tier, prob: sim.probability });
}

function initToggles() {
  const form = document.getElementById("calc");
  if (!form) return;
  const wire = (selector, hiddenName, dataKey) => {
    const hidden = form.querySelector(`input[name="${hiddenName}"]`);
    form.querySelectorAll(selector).forEach((btn) => {
      btn.addEventListener("click", () => {
        form.querySelectorAll(selector).forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        if (hidden) hidden.value = btn.dataset[dataKey];
      });
    });
  };
  wire(".seg-btn", "guaranteed", "guar");
  wire(".chip", "target", "target");
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
  initToggles();
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
