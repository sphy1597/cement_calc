// app.js
const $ = (id) => document.getElementById(id);

function parseNum(v) {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (s === "") return NaN;
  return Number(s);
}

function fmt(n) {
  return Number.isFinite(n) ? n.toFixed(2) : String(n);
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

  if ($("aVal")) $("aVal").value = Number.isFinite(a) ? a.toFixed(1) : "";
  if ($("bVal")) $("bVal").value = Number.isFinite(b) ? b.toFixed(1) : "";

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

const STORAGE_KEY = "cementCalcSnapshotsV1";
const SLOT_COUNT = 3;
const INPUT_IDS = [
  "w", "C", "S_air", "P",
  "S0", "rho0", "rho", "e0", "e", "t", "t0",
  "cs1", "cs2", "cs3", "so3", "dVal"
];

function getActiveTabKey() {
  return document.querySelector(".tabBtn.active")?.dataset.tab || "air";
}

function readSnapshots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return Array(SLOT_COUNT).fill(null);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Array(SLOT_COUNT).fill(null);
    return Array.from({ length: SLOT_COUNT }, (_, i) => parsed[i] || null);
  } catch {
    return Array(SLOT_COUNT).fill(null);
  }
}

function writeSnapshots(slots) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
}

function resetSnapshotsOnLoad() {
  localStorage.removeItem(STORAGE_KEY);
}

function setSaveMsg(text) {
  const el = $("saveMsg");
  if (el) el.textContent = text;
}

function collectInputs() {
  const values = {};
  INPUT_IDS.forEach((id) => {
    const el = $(id);
    if (el) values[id] = el.value;
  });
  return values;
}

function collectOutputs() {
  return {
    outAir: $("outAir")?.textContent || "—",
    outSsa: $("outSsa")?.textContent || "—",
    outAs: $("outAs")?.textContent || "—",
    outAsJudge: $("outAsJudge")?.textContent || "",
    outAsJudgeClass: $("outAsJudge")?.className || "judge",
    aVal: $("aVal")?.value || "0",
    bVal: $("bVal")?.value || "0"
  };
}

function formatSavedAt(isoText) {
  const d = new Date(isoText);
  if (Number.isNaN(d.getTime())) return "시간 정보 없음";
  return d.toLocaleString("ko-KR", { hour12: false });
}

function buildInputsTooltip(inputs = {}, outputs = {}) {
  const get = (id) => (inputs[id] ?? "");
  const outAs = outputs.outAs ?? "—";
  const outAsJudge = outputs.outAsJudge ?? "";
  return [
    "[무수황산] 시험결과1=" + get("cs1"),
    "[무수황산] 시험결과2=" + get("cs2"),
    "[무수황산] 시험결과3=" + get("cs3"),
    "[무수황산] 석고SO₃함량=" + get("so3"),
    "[무수황산] 시멘트SO₃함량=" + get("dVal"),
    "[무수황산] 결과값=" + outAs + (outAsJudge ? " " + outAsJudge : "")
  ].join("\n");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAsSlotRowHtml(snap, idx) {
  if (!snap) {
    return `
      <tr>
        <td>${idx + 1}</td>
        <td colspan="6">비어 있음</td>
      </tr>
    `;
  }

  const inputs = snap.inputs || {};
  const outputs = snap.outputs || {};
  const judge = outputs.outAsJudge ? ` ${outputs.outAsJudge}` : "";
  const resultText = `${outputs.outAs ?? "—"}${judge}`;

  return `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(inputs.cs1 ?? "")}</td>
      <td>${escapeHtml(inputs.cs2 ?? "")}</td>
      <td>${escapeHtml(inputs.cs3 ?? "")}</td>
      <td>${escapeHtml(inputs.so3 ?? "")}</td>
      <td>${escapeHtml(inputs.dVal ?? "")}</td>
      <td>${escapeHtml(resultText)}</td>
    </tr>
  `;
}

function generateAsReport() {
  const section = $("asReportSection");
  const body = $("asReportBody");
  if (!section || !body) return;

  const slots = readSnapshots();
  const rows = slots.map((snap, idx) => getAsSlotRowHtml(snap, idx)).join("");

  body.innerHTML = `
    <table class="reportTable">
      <thead>
        <tr>
          <th>슬롯</th>
          <th>시험결과1</th>
          <th>시험결과2</th>
          <th>시험결과3</th>
          <th>석고SO₃</th>
          <th>시멘트SO₃</th>
          <th>결과값</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  section.classList.add("active");
  section.scrollIntoView({ behavior: "smooth", block: "end" });
}

function pickSheetByName(workbook, wantedName) {
  const name = (workbook?.SheetNames || []).find((n) => String(n).trim() === wantedName);
  return { name: name || "", ws: name ? workbook.Sheets[name] : null };
}

function toNumOrText(v) {
  const n = parseNum(v);
  return Number.isFinite(n) ? n : String(v ?? "");
}

async function fetchTemplateArrayBuffer() {
  const res = await fetch("SO3_report.xlsx", { cache: "no-store" });
  if (!res.ok) throw new Error("template_not_found");
  return await res.arrayBuffer();
}

function setCell(ws, addr, value) {
  XLSX.utils.sheet_add_aoa(ws, [[value]], { origin: addr });
}

function hasInputValue(v) {
  return String(v ?? "").trim() !== "";
}

function setCellIfFilled(ws, addr, value) {
  if (!hasInputValue(value)) return;
  setCell(ws, addr, toNumOrText(value));
}

async function downloadAsReportFromTemplate(sheetNameWanted) {
  if (typeof XLSX === "undefined") {
    setSaveMsg("엑셀 라이브러리를 불러오지 못했습니다.");
    return;
  }

  const slots = readSnapshots();
  const s1 = slots[0]?.inputs || {};
  const s2 = slots[1]?.inputs || {};
  const s3 = slots[2]?.inputs || {};

  try {
    const buf = await fetchTemplateArrayBuffer();
    const workbook = XLSX.read(buf, { type: "array" });
    const { name: sheetName, ws } = pickSheetByName(workbook, sheetNameWanted);
    if (!ws) {
      setSaveMsg(`"${sheetNameWanted}" 시트를 찾지 못했습니다.`);
      return;
    }

    // 시험 결과 저장 1 매핑
    setCellIfFilled(ws, "D18", s1.cs1);
    setCellIfFilled(ws, "D19", s1.cs2);
    setCellIfFilled(ws, "D20", s1.cs3);
    setCellIfFilled(ws, "D21", s1.so3);
    setCellIfFilled(ws, "D22", s1.dVal);

    // 시험 결과 저장 2 매핑
    setCellIfFilled(ws, "D35", s2.cs1);
    setCellIfFilled(ws, "D36", s2.cs2);
    setCellIfFilled(ws, "D37", s2.cs3);

    // 시험 결과 저장 3 매핑
    setCellIfFilled(ws, "D53", s3.cs1);
    setCellIfFilled(ws, "D54", s3.cs2);
    setCellIfFilled(ws, "D55", s3.cs3);

    const resultNums = slots
      .map((snap) => parseNum(snap?.outputs?.outAs ?? ""))
      .filter(Number.isFinite);

    const measuredText = resultNums.length ? resultNums.map((n) => fmt(n)).join(", ") : "-";
    const b69Text = `1) 슬롯2, 3 비어있지 않은 N차 결과 최적 SO3는 ${measuredText}로 측정됨`;
    setCell(ws, "B69", b69Text);

    const expr = resultNums.length ? `(${resultNums.map((n) => fmt(n)).join(" + ")}) / ${resultNums.length}` : "-";
    const avgText = resultNums.length ? fmt(resultNums.reduce((acc, cur) => acc + cur, 0) / resultNums.length) : "계산 불가";
    const cementType = sheetNameWanted === "1종" ? "1종 시멘트" : "3종 시멘트";
    const b70Text = `2) 따라서 ${cementType} 최적 SO3는 ${expr} = ${avgText}으로 결정`;
    setCell(ws, "B70", b70Text);

    const target = $("asTargetSo3")?.value?.trim() || "-";
    const b71Text = `3) 관리의 편의성을 위해 ${target}을 최적 SO3 기준으로 관리`;
    setCell(ws, "B71", b71Text);

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const outName = `${cementType} SO3 도출시험 결과_${y}${m}${d}.xlsx`;
    XLSX.writeFile(workbook, outName);
    setSaveMsg(`보고서를 다운로드했습니다. (시트: ${sheetName})`);
  } catch (err) {
    setSaveMsg("다운로드에 실패했습니다. SO3_report.xlsx 경로와 접속 방식(http/https)을 확인해 주세요.");
    console.error(err);
  }
}

function refreshAsReportIfVisible() {
  if ($("asReportSection")?.classList.contains("active")) {
    generateAsReport();
  }
}

function renderSnapshotSlots() {
  const slots = readSnapshots();
  slots.forEach((snap, idx) => {
    const metaEl = $(`slot${idx + 1}Meta`);
    const tooltipEl = $(`slot${idx + 1}Tooltip`);
    if (!metaEl) return;
    if (!snap) {
      metaEl.textContent = "비어 있음";
      if (tooltipEl) tooltipEl.textContent = "저장된 입력값이 없습니다.";
      return;
    }
    const at = formatSavedAt(snap.savedAt);
    const air = snap.outputs?.outAir || "—";
    const ssa = snap.outputs?.outSsa || "—";
    const as = snap.outputs?.outAs || "—";
    metaEl.textContent = `${at} | 공기량 ${air} | 비표면적 ${ssa} | 무수황산 ${as}`;
    if (tooltipEl) tooltipEl.textContent = buildInputsTooltip(snap.inputs, snap.outputs);
  });
}

function saveSnapshot(slotIdx) {
  computeAir();
  computeSsa();
  computeAs();

  const slots = readSnapshots();
  slots[slotIdx] = {
    savedAt: new Date().toISOString(),
    activeTab: getActiveTabKey(),
    inputs: collectInputs(),
    outputs: collectOutputs()
  };
  writeSnapshots(slots);
  renderSnapshotSlots();
  refreshAsReportIfVisible();
  setSaveMsg(`슬롯 ${slotIdx + 1}에 저장했습니다.`);
}

function loadSnapshot(slotIdx) {
  const slots = readSnapshots();
  const snap = slots[slotIdx];
  if (!snap) {
    setSaveMsg(`슬롯 ${slotIdx + 1}이 비어 있습니다.`);
    return;
  }

  const inputs = snap.inputs || {};
  Object.entries(inputs).forEach(([id, val]) => {
    const el = $(id);
    if (el) el.value = String(val);
  });

  setActiveTab(snap.activeTab || "air");
  computeAir();
  computeSsa();
  updateAB();
  computeAs();

  if (snap.outputs) {
    if ($("outAir")) $("outAir").textContent = snap.outputs.outAir ?? $("outAir").textContent;
    if ($("outSsa")) $("outSsa").textContent = snap.outputs.outSsa ?? $("outSsa").textContent;
    if ($("outAs")) $("outAs").textContent = snap.outputs.outAs ?? $("outAs").textContent;
    if ($("aVal")) $("aVal").value = snap.outputs.aVal ?? $("aVal").value;
    if ($("bVal")) $("bVal").value = snap.outputs.bVal ?? $("bVal").value;

    const judgeEl = $("outAsJudge");
    if (judgeEl) {
      judgeEl.textContent = snap.outputs.outAsJudge ?? judgeEl.textContent;
      judgeEl.className = snap.outputs.outAsJudgeClass || "judge";
    }
  }

  setSaveMsg(`슬롯 ${slotIdx + 1}을 불러왔습니다.`);
}

function clearSnapshot(slotIdx) {
  const slots = readSnapshots();
  slots[slotIdx] = null;
  writeSnapshots(slots);
  renderSnapshotSlots();
  refreshAsReportIfVisible();
  setSaveMsg(`슬롯 ${slotIdx + 1}을 삭제했습니다.`);
}

function handleSnapshotAction(action, slotIdx) {
  if (!Number.isInteger(slotIdx) || slotIdx < 0 || slotIdx >= SLOT_COUNT) return;
  if (action === "save") saveSnapshot(slotIdx);
  if (action === "load") loadSnapshot(slotIdx);
  if (action === "clear") clearSnapshot(slotIdx);
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

  // 임시 저장 슬롯
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".slotBtn");
    if (!btn) return;
    const action = btn.dataset.action;
    const slotIdx = Number(btn.dataset.slot);
    handleSnapshotAction(action, slotIdx);
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
  $("genAsReportBtn")?.addEventListener("click", generateAsReport);
  $("downloadAsReportSheet1Btn")?.addEventListener("click", () => {
    downloadAsReportFromTemplate("1종");
  });
  $("downloadAsReportSheet2Btn")?.addEventListener("click", () => {
    downloadAsReportFromTemplate("3종");
  });

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
resetSnapshotsOnLoad();

// 초기값 표시
setActiveTab("air");
computeAir();
computeSsa(); // 초기 렌더링에 값은 나와도 탭은 숨김
updateAB();
computeAs();
renderSnapshotSlots();
