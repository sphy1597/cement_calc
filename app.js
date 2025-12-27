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

function setVal(id, value) {
  $(id).value = value;
}

function toggleSignById(id) {
  const el = $(id);
  const v = parseNum(el.value);
  el.value = String(Number.isFinite(v) ? -v : 0);
}

/* ------------------------
   탭 전환
------------------------ */
function setActiveTab(tabKey) {
  document.querySelectorAll(".tabBtn").forEach(btn => {
    const active = btn.dataset.tab === tabKey;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  document.querySelectorAll(".tabPanel").forEach(panel => {
    const active = panel.id === `tab-${tabKey}`;
    panel.classList.toggle("active", active);
    panel.setAttribute("aria-hidden", active ? "false" : "true");
  });
}

/* ------------------------
   공기량 계산기
------------------------ */
function computeAir() {
  const w = parseNum($("w").value);
  const C = parseNum($("C").value);
  const S = parseNum($("S_air").value);
  const P = parseNum($("P").value);

  setText("errAir", "");

  if (![w, C, S, P].every(Number.isFinite)) {
    setText("outAir", "—");
    setText("errAir", "숫자를 확인하세요.");
    return;
  }
  if (C === 0) { setText("outAir", "—"); setText("errAir", "C는 0 불가"); return; }
  if (S === 0) { setText("outAir", "—"); setText("errAir", "S는 0 불가"); return; }

  const pTerm = 337.5 * P * 0.01;
  const numerator = (337.5 / C) + (1350 / S) + pTerm;
  const denominator = 337.5 + 1350 + pTerm;

  if (denominator === 0) { setText("outAir", "—"); setText("errAir", "분모 0"); return; }

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
    setText("errSsa", "숫자를 확인하세요.");
    return;
  }
  if (rho === 0) { setText("outSsa", "—"); setText("errSsa", "ρ는 0 불가"); return; }
  if (t0 === 0) { setText("outSsa", "—"); setText("errSsa", "t₀는 0 불가"); return; }
  if (t / t0 < 0) { setText("outSsa", "—"); setText("errSsa", "t/t₀ ≥ 0 필요"); return; }
  if (e0 <= 0) { setText("outSsa", "—"); setText("errSsa", "e₀ > 0 필요"); return; }
  if (e < 0) { setText("outSsa", "—"); setText("errSsa", "e ≥ 0 필요"); return; }
  if (1 - e === 0) { setText("outSsa", "—"); setText("errSsa", "1−e ≠ 0"); return; }

  const T = Math.sqrt(t / t0);
  const termA = (1 - e0) / Math.sqrt(Math.pow(e0, 3));
  const termB = Math.sqrt(Math.pow(e, 3)) / (1 - e);

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
   무수 황산 계산기
   G = [a/(a-b)]*c + d + c/2
   a = cs2 - cs1
   b = cs3 - cs2
   c = so3/100
------------------------ */
function updateAB() {
  const cs1 = parseNum($("cs1").value);
  const cs2 = parseNum($("cs2").value);
  const cs3 = parseNum($("cs3").value);

  const a = (Number.isFinite(cs2) && Number.isFinite(cs1)) ? (cs2 - cs1) : NaN;
  const b = (Number.isFinite(cs3) && Number.isFinite(cs2)) ? (cs3 - cs2) : NaN;

  setVal("aVal", Number.isFinite(a) ? a : "");
  setVal("bVal", Number.isFinite(b) ? b : "");
  return { a, b };
}

function computeAs() {
  const { a, b } = updateAB();
  const so3 = parseNum($("so3").value);
  const d   = parseNum($("dVal").value);

  setText("errAs", "");

  if (![a, b, so3, d].every(Number.isFinite)) {
    setText("outAs", "—");
    setText("errAs", "숫자를 확인하세요.");
    return;
  }

  const denom = (a - b);
  if (denom === 0) {
    setText("outAs", "—");
    setText("errAs", "a−b 가 0이라 계산할 수 없습니다.");
    return;
  }

  const c = so3 / 100;
  const G = (a / denom) * c + d + (c / 2);

  setText("outAs", fmt(G));
}

function resetAs() {
  $("cs1").value = "0";
  $("cs2").value = "0";
  $("cs3").value = "0";
  $("so3").value = "0";
  $("dVal").value = "0";
  setVal("aVal", "0");
  setVal("bVal", "0");
  setText("outAs", "—");
  setText("errAs", "");
}

/* ------------------------
   이벤트 바인딩
------------------------ */
function wireEvents() {
  // 탭 클릭
  document.querySelectorAll(".tabBtn").forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  // ± 버튼(공용)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".signBtn");
    if (!btn) return;
    toggleSignById(btn.dataset.target);

    // 탭별 자동 재계산(원하면 지워도 됨)
    if ($("tab-air").classList.contains("active")) computeAir();
    if ($("tab-ssa").classList.contains("active")) computeSsa();
    if ($("tab-as").classList.contains("active")) { updateAB(); computeAs(); }
  });

  // 공기량
  $("calcAirBtn").addEventListener("click", computeAir);
  $("resetAirBtn").addEventListener("click", resetAir);

  // 비표면적
  $("calcSsaBtn").addEventListener("click", computeSsa);
  $("resetSsaBtn").addEventListener("click", resetSsa);

  // 무수 황산
  $("calcAsBtn").addEventListener("click", computeAs);
  $("resetAsBtn").addEventListener("click", resetAs);

  // 강도 입력 바뀌면 a,b 업데이트
  ["cs1","cs2","cs3"].forEach(id => {
    $(id).addEventListener("input", () => updateAB());
  });
}

wireEvents();
setActiveTab("air");
computeAir();
updateAB();
