const $ = (id) => document.getElementById(id);

function parseNum(v) {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (s === "") return NaN;
  return Number(s);
}

function setError(msg) {
  $("err").textContent = msg || "";
}

function setOut(text) {
  $("out").textContent = text;
}

function toggleSignById(id) {
  const el = $(id);
  const v = parseNum(el.value);
  const next = (Number.isFinite(v) ? -v : 0);
  el.value = String(next);
  compute();
}

function compute() {
  const w = parseNum($("w").value);
  const C = parseNum($("C").value);
  const S = parseNum($("S").value);
  const P = parseNum($("P").value);

  setError("");

  if (![w, C, S, P].every(Number.isFinite)) {
    setOut("—");
    setError("숫자를 확인하세요. (예: 12.3 또는 1,234.5)");
    return;
  }
  if (C === 0) {
    setOut("—");
    setError("C는 0이 될 수 없습니다. (337.5/C)");
    return;
  }
  if (S === 0) {
    setOut("—");
    setError("S는 0이 될 수 없습니다. (1350/S)");
    return;
  }

  const pTerm = 337.5 * P * 0.01; // 337.5×P×0.01
  const numerator = (337.5 / C) + (1350 / S) + pTerm;
  const denominator = 337.5 + 1350 + pTerm;

  if (denominator === 0) {
    setOut("—");
    setError("분모가 0이라 계산할 수 없습니다.");
    return;
  }

  const result = 100 * (1 - (w / 400) * (numerator / denominator));
  setOut(Number.isFinite(result) ? result.toFixed(6) : String(result));
}

function resetAll() {
  $("w").value = "0";
  $("C").value = "1";
  $("S").value = "1";
  $("P").value = "0";
  setOut("—");
  setError("");
}

function wireEvents() {
  // ± 버튼 (인라인 onclick 제거, 이벤트 위임)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".signBtn");
    if (!btn) return;
    toggleSignById(btn.dataset.target);
  });

  $("calcBtn").addEventListener("click", compute);
  $("resetBtn").addEventListener("click", resetAll);

  // 입력 시 자동 계산 (원하면 주석 해제)
  ["w","C","S","P"].forEach(id => {
    $(id).addEventListener("input", () => {
      // 모바일에서 입력 중 NaN이 자주 나올 수 있어 "계산" 버튼 방식이 편하면 아래 줄을 주석 처리해도 됨
      compute();
    });
  });
}

wireEvents();
compute();
