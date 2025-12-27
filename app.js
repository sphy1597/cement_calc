const $ = id => document.getElementById(id);

function parseNum(v){
  return Number(String(v).replace(/,/g,""));
}

function toggleSign(id){
  const el = $(id);
  const v = parseNum(el.value) || 0;
  el.value = -v;
  compute();
}

function compute(){
  const w = parseNum($("w").value);
  const C = parseNum($("C").value);
  const S = parseNum($("S").value);
  const P = parseNum($("P").value);
  $("err").textContent = "";

  if(![w,C,S,P].every(Number.isFinite)){
    $("out").textContent = "—";
    $("err").textContent = "숫자를 확인하세요.";
    return;
  }
  if(C === 0 || S === 0){
    $("out").textContent = "—";
    $("err").textContent = "C 또는 S는 0이 될 수 없습니다.";
    return;
  }

  const pTerm = 337.5 * P * 0.01;
  const num = 337.5/C + 1350/S + pTerm;
  const den = 337.5 + 1350 + pTerm;
  const result = 100 * (1 - (w/400) * (num/den));

  $("out").textContent = result.toFixed(6);
}

function resetAll(){
  $("w").value = 0;
  $("C").value = 1;
  $("S").value = 1;
  $("P").value = 0;
  $("out").textContent = "—";
  $("err").textContent = "";
}
