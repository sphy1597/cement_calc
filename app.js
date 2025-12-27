const $ = (id) => document.getElementById(id);

function parseNum(v) {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (s === "") return NaN;
  return Number(s);
}

function fmt(n) {
  return Number.isFinite(n) ? n.toFixed(6) : String(n);
}

function setText(id, text) {
  $(id).textContent = text;
}

function toggleSignById(id) {
  const el = $(id);
  const v = parseNum(el.value);
  const next = (Number.isFinite(v) ? -v : 0);
  el.value = String(next);
}

/* ------------------------
   탭 전환
------------------------ */
function setActiveTab(tabKey) {
  // buttons
  document.querySelectorAll(".tabBtn").forEach(btn => {
    const active = btn.dataset.tab === tabKey;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  // panels
  document.querySelectorAll(".tabPanel").forEach(panel => {
    const active = panel.id === `tab-${tabKey}`;
    panel.classList.toggle("active", active);
    panel.setAttribute("aria-hidden", active ? "false" : "true");
  });
}

/* ------------------------
   공기량 계산기
   result = 100 * (1 - (w/400) * ((337.5/C + 1350/S + 337.5*P*0.01) / (337.5 + 1350 + 337.5*P*0.01)))
------------------------ */
function computeAir() {
  const w = parseNum($("w").value);
  const C = parseNum($("C").value);
  const S = parseNum($("S_air").value);
  const P = parseNum($("P").value);

  setText("errAir", "");

  if (![w, C, S, P].every(Number.isFinite)) {
    setText("outAir", "—");
    setText("errAir", "숫자를 확인하세요. (예: 12.3 또는 1,234.5)");
    return;
  }
  if (C === 0) {
    setText("outAir", "—");
    setText("errAir", "C는 0이 될 수 없습니다. (337.5/C)");
    return;
  }
  if (S === 0) {
    setText("outAir", "—");
    setText("errAir", "S는 0이 될 수 없습니다. (1350/S)");
    return;
  }

  const pTerm = 337.5 * P * 0.01;
  const numerator = (337.5 / C) + (1350 / S) + pTerm;
  const denominator = 337.5 + 1350 + pTerm;

  if (denominator === 0) {
    setText("outAir", "—");
    setText("errAir", "분모가 0이라 계산할 수 없습니다.");
    return;
  }

  const result = 100 * (1 - (w / 400) * (numerator / denominator));
  setText("outAir", fmt(result));
}

function resetAir() {
  $("w").value = "0";
  $("C").value = "1";
  $("S_air").value = "1";
  $("P").value = "0";
  setText("outAir", "—");
  setText("errAir", "");
}

/* ------------------------
   비표면적 계산기
   S = S0 * (rho0/rho) * T * ((1-e0)/sqrt(e0^3)) * (sqrt(e^3)/(1-e))
   T = sqrt(t/t0)
------------------------ */
function computeSsa() {
  const S0   = parseNum($("S0").value);
  const rho0 = parseNum($("rho0").value);
  const rho  = parseNum($("rho").value);
  const e0   = parseNum($("e0").value);
  const e    = parseNum($("e").value);
  const t    = parseNum($("t").value);
  const t0   = parseNum($("t0").value);

  setText("errSsa", "");

  if (![S0, rho0, rho, e0, e, t, t0].every(Number.isFinite)) {
    setText("outSsa", "—");
    setText("errSsa", "숫자를 확인하세요. (예: 0.5, 1.2 등)");
    return;
  }
  if (rho === 0) {
    setText("outSsa", "—");
    setText("errSsa", "ρ는 0이 될 수 없습니다. (ρ₀/ρ)");
    return;
  }
  if (t0 === 0) {
    setText("outSsa", "—");
    setText("errSsa", "t₀는 0이 될 수 없습니다. (t/t₀)");
    return;
  }
  if (t / t0 < 0) {
    setText("outSsa", "—");
    setText("errSsa", "T = √(t/t₀) 이므로 t/t₀는 0 이상이어야 합니다.");
    return;
  }
  if (e0 <= 0) {
    setText("outSsa", "—");
    setText("errSsa", "e₀는 0보다 커야 합니다. (√(e₀³) 분모)");
    return;
  }
  if (e < 0) {
    setText("outSsa", "—");
    setText("errSsa", "e는 0 이상이어야 합니다. (√(e³))");
    return;
  }
  if (1 - e === 0) {
    setText("outSsa", "—");
    setText("errSsa", "(1−e)가 0이어서 계산할 수 없습니다.");
    return;
  }

  const T = Math.sqrt(t / t0);

  const termA = (1 - e0) / Math.sqrt(Math.pow(e0, 3));      // (1-e0)/sqrt(e0^3)
  const termB = Math.sqrt(Math.pow(e, 3)) / (1 - e);        // sqrt(e^3)/(1-e)

  const S = S0 * (rho0 / rho) * T * termA * termB;

  setText("outSsa", fmt(S));
}

function resetSsa() {
  $("S0").value = "1";
  $("rho0").value = "1";
  $("rho").value = "1";
  $("e0").value = "0.5";
  $("e").value = "0.5";
  $("t").value = "1";
  $("t0").value = "1";
  setText("outSsa", "—");
  setText("errSsa", "");
}

/* ------------------------
   이벤트 바인딩
------------------------ */
function wireEvents() {
  // 탭 클릭
  document.querySelectorAll(".tabBtn").forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  // ± 버튼 (두 계산기 공용)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".signBtn");
    if (!btn) return;
    const id = btn.dataset.target;
    toggleSignById(id);

    // 현재 활성 탭에 맞춰 재계산(원하면 주석 처리 가능)
    if (document.getElementById("tab-air").classList.contains("active")) computeAir();
    if (document.getElementById("tab-ssa").classList.contains("active")) computeSsa();
  });

  // 공기량
  $("calcAirBtn").addEventListener("click", computeAir);
  $("resetAirBtn").addEventListener("click", resetAir);

  // 비표면적
  $("calcSsaBtn").addEventListener("click", computeSsa);
  $("resetSsaBtn").addEventListener("click", resetSsa);
}

wireEvents();
computeAir();
