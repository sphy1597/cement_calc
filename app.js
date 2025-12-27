// app.js
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
  const el = $(id);
  if (el) el.textContent = text;
}

function toggleSignById(id) {
  const el = $(id);
  if (!el) return;
  const v = parseNum(el.value);
  el.value = String(Number.isFinite(v) ? -v : 0);
}

/* ------------------------
   탭 전환
------------------------ */
function setActiveTab(tabKey) {
  document.querySelectorAll(".tabBtn").forEach((btn) => {
    const active = btn.dataset.tab === tabKey;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  document.querySelectorAll(".tabPanel").forEach((panel) => {
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
  const w = parseNum($("w")?.value);
  const C = parseNum($("C")?.value);
  const S = parseNum($("S_air")?.value);
  const P = parseNum($("P")?.value);

  setText("errAir", "");

  if (![w, C, S, P].every(Number.isFinite)) {
    setText("outAir", "—");
    setText("errAir", "숫자를 확인하세요.");
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
  const numerator = 337.5 / C + 1350 / S + pTerm;
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
  if ($("w")) $("w").value = "0";
  if ($("C")) $("C").value = "1";
  if ($("S_air")) $("S_air").value = "1";
  if ($("P")) $("P").value = "0";
  setText("outAir", "—");
  setText("errAir", "");
}

/* ------------------------
   비표면적 계산기
   S = S0 * (rho0/rho) * T * ((1-e0)/sqrt(e0^3)) * (sqrt(e^3)/(1-e))
   T = sqrt(t/t0)
------------------------ */
function computeSsa() {
  const S0 = parseNum($("S0")?.value);
  const rho0 = parseNum($("rho0")?.value);
  const rho = parseNum($("rho")?.value);
  const e0 = parseNum($("e0")?.value);
  const e = parseNum($("e")?.value);
  const t = parseNum($("t")?.value);
  const t0 = parseNum($("t0")?.value);

  setText("errSsa", "");

  if (![S0, rho0, rho, e0, e, t, t0].every(Number.isFinite)) {
    setText("outSsa", "—");
    setText("errSsa", "숫자를 확인하세요.");
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
  const termA = (1 - e0) / Math.sqrt(Math.pow(e0, 3));
  const termB = Math.sqrt(Math.pow(e, 3)) / (1 - e);

  const S = S0 * (rho0 / rho) * T * termA * termB;
  setText("outSsa", fmt(S));
}

function resetSsa() {
  if ($("S0")) $("S0").value = "1";
  if ($("rho0")) $("rho0").value = "1";
  if ($("rho")) $("rho").value = "1";
  if ($("e0")) $("e0").value = "0.5";
  if ($("e")) $("e").value = "0.5";
  if ($("t")) $("t").value = "1";
  if ($("t0")) $("t0").value = "1";
  setText("outSsa", "—");
  setText("errSsa", "");
}

/* ------------------------
   무수 황산 계산기
   G = [a/(a-b)]*c + d + c/2
   a = cs2 - cs1
   b = cs3 - cs2
   c = so3/100

   판정(재시험 조건):
   - a와 b 모두 + 이고, a/b < 2.00
   - a와 b 모두 - 이고, a/b > 0.500
   - a < 0 이고 b > 0
   나머지: 적정
------------------------ */
function updateAB() {
  const cs1 = parseNum($("cs1")?.value);
  const cs2 = parseNum($("cs2")?.value);
  const cs3 = parseNum($("cs3")?.value);

  const a = Number.isFinite(cs2) && Number.isFinite(cs1) ? cs2 - cs1 : NaN;
  const b = Number.isFinite(cs3) && Number.isFinite(cs2) ? cs3 - cs2 : NaN;

  if ($("aVal")) $("aVal").value = Number.isFinite(a) ? a : "";
  if ($("bVal")) $("bVal").value = Number.isFinite(b) ? b : "";

  return { a, b };
}

function getAsJudge(a, b) {
  // 3) a가 - 이고 b가 + 일때
  if (a < 0 && b > 0) return { text: "(재시험)", cls: "retest" };

  // b가 0이면 비율 조건은 평가 불가 -> 나머지(적정)
  if (b === 0) return { text: "(적정)", cls: "ok" };

  const ratio = a / b;

  // 1) a,b 모두 + 이고 ratio < 2.00
  if (a > 0 && b > 0 && ratio < 2.0) return { text: "(재시험)", cls: "retest" };

  // 2) a,b 모두 - 이고 ratio > 0.500  (음/음 => ratio 양수)
  if (a < 0 && b < 0 && ratio > 0.5) return { text: "(재시험)", cls: "retest" };

  return { text: "(적정)", cls: "ok" };
}

function computeAs() {
  const { a, b } = updateAB();
  const so3 = parseNum($("so3")?.value);
  const d = parseNum($("dVal")?.value);

  setText("errAs", "");
  setText("outAs", "—");

  const judgeEl = $("outAsJudge");
  if (judgeEl) {
    judgeEl.textContent = "";
    judgeEl.className = "judge";
  }

  if (![a, b, so3, d].every(Number.isFinite)) {
    setText("errAs", "숫자를 확인하세요.");
    return;
  }

  const denom = a - b;
  if (denom === 0) {
    setText("errAs", "a−b 가 0이라 계산할 수 없습니다.");
    return;
  }

  const c = so3 / 100;
  const G = (a / denom) * c + d + c / 2;

  setText("outAs", fmt(G));

  const judge = getAsJudge(a, b);
  if (judgeEl) {
    judgeEl.textContent = judge.text;
    judgeEl.classList.add(judge.cls);
  }
}

function resetAs() {
  if ($("cs1")) $("cs1").value = "0";
  if ($("cs2")) $("cs2").value = "0";
  if ($("cs3")) $("cs3").value = "0";
  if ($("so3")) $("so3").value = "0";
  if ($("dVal")) $("dVal").value = "0";
  if ($("aVal")) $("aVal").value = "0";
  if ($("bVal")) $("bVal").value = "0";

  setText("outAs", "—");
  setText("errAs", "");

  const judgeEl = $("outAsJudge");
  if (judgeEl) {
    judgeEl.textContent = "";
    judgeEl.className = "judge";
  }
}

/* ------------------------
   이벤트 바인딩
------------------------ */
function wireEvents() {
  // 탭 클릭
  document.querySelectorAll(".tabBtn").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  // ± 버튼 공용
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".signBtn");
    if (!btn) return;
    toggleSignById(btn.dataset.target);

    // 현재 활성 탭 자동 재계산
    if ($("tab-air")?.classList.contains("active")) computeAir();
    if ($("tab-ssa")?.classList.contains("active")) computeSsa();
    if ($("tab-as")?.classList.contains("active")) computeAs();
  });

  // 공기량
  $("calcAirBtn")?.addEventListener("click", computeAir);
  $("resetAirBtn")?.addEventListener("click", resetAir);

  // 비표면적
  $("calcSsaBtn")?.addEventListener("click", computeSsa);
  $("resetSsaBtn")?.addEventListener("click", resetSsa);

  // 무수 황산
  $("calcAsBtn")?.addEventListener("click", computeAs);
  $("resetAsBtn")?.addEventListener("click", resetAs);

  // 무수 황산: 시험결과 입력 바뀌면 a,b 업데이트(원하면 즉시 재계산도 가능)
  ["cs1", "cs2", "cs3"].forEach((id) => {
    $(id)?.addEventListener("input", () => {
      updateAB();
      // 실시간 판정/결과 갱신 원하면 아래 주석 해제
      computeAs();
    });
  });
}

wireEvents();

// 초기값 표시
setActiveTab("air");
computeAir();
computeSsa(); // 초기 렌더링에 값은 나와도 탭은 숨김
updateAB();
computeAs();
