const state = { view: "notes", unit: 0, query: "" };
const $ = (s) => document.querySelector(s);
const data = window.STUDY_DATA;
const questionMap = new Map();
const shortMap = new Map();
const selectedMap = new Map();
data.bank.flatMap(section => section.questions).forEach(q => questionMap.set(q.id, q));
data.mocks.flatMap(mock => mock.questions).forEach(q => questionMap.set(q.id, q));
data.shortBank.flatMap(section => section.questions).forEach(q => shortMap.set(q.id, q));

function esc(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function matchText(obj){
  const q = state.query.trim().toLowerCase();
  if(!q) return true;
  return JSON.stringify(obj).toLowerCase().includes(q);
}
function renderUnits(){
  const box = $("#unitList");
  if(state.view === "mock"){
    box.innerHTML = data.mocks.map((m,i)=>`<button class="unit-btn ${state.unit===i?'active':''}" onclick="state.unit=${i};render()">${m.title}</button>`).join("");
  } else {
    box.innerHTML = data.units.map((u,i)=>`<button class="unit-btn ${state.unit===i?'active':''}" onclick="state.unit=${i};render()">${u.title}</button>`).join("");
  }
}
function noteCard(unit){
  return `<article class="card"><h2>${esc(unit.title)}</h2><p class="muted">자료: ${unit.sources.map(esc).join(", ")}</p>
  <h3>주요 학습 주제</h3><ul>${unit.focus.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
  ${unit.notes.map(([h,b])=>`<h3>${esc(h)}</h3><p>${esc(b).replaceAll("\n","</p><p>")}</p>`).join("")}
  <h3>핵심 세부 개념</h3><ul>${unit.concepts.map(c=>`<li><b>${esc(c[0])}</b>: ${esc(c[1])} <span class="muted">${esc(c[2])}</span></li>`).join("")}</ul>
  </article>`;
}
function questionCard(q, i){
  const ans = q.answer.map(a=>a+1).join(", ");
  const multi = q.answer.length > 1 || q.type.includes("복수");
  return `<article class="card question">
    <div><span class="badge">${esc(q.type)}</span>${q.calculation?'<span class="badge">계산</span>':''}<span class="muted">${esc(q.unit)}</span></div>
    <h3>문제 ${i}</h3><p>${esc(q.stem)}</p>
    ${multi ? '<p class="muted">복수정답형: 해당 선지를 모두 선택한 뒤 채점하세요.</p>' : '<p class="muted">선지를 클릭하면 바로 채점됩니다.</p>'}
    <ol class="options">${q.options.map((o,idx)=>`<li><button class="option-btn" data-qid="${q.id}" data-opt="${idx}" onclick="${multi ? `toggleChoice('${q.id}', ${idx})` : `gradeSingle('${q.id}', ${idx})`}">${idx+1}. ${esc(o)}</button></li>`).join("")}</ol>
    ${multi ? `<button onclick="gradeMulti('${q.id}')">선택한 답 채점</button> <button onclick="resetQuestion('${q.id}')">다시 풀기</button>` : `<button onclick="resetQuestion('${q.id}')">다시 풀기</button>`}
    <div class="answer" id="answer-${q.id}">
      <p class="result-line" id="result-${q.id}"></p>
      <p class="ok">정답: ${ans}</p>
      <p><b>전체 해설:</b> ${esc(q.correctReason)}</p>
      <p><b>선지별 해설:</b></p>
      <ol class="option-explain">${(q.optionExplanations || q.options.map((_,idx)=>`${idx+1}번: 강의자료의 기준과 비교해 판단합니다.`)).map(exp=>`<li>${esc(exp)}</li>`).join("")}</ol>
      <p><b>시험 포인트:</b> ${esc(q.examPoint)}</p>
    </div>
  </article>`;
}
function shortCard(q, i){
  return `<article class="card question">
    <div><span class="badge">단답형</span><span class="muted">${esc(q.unit)}</span></div>
    <h3>문제 ${i}</h3><p>${esc(q.prompt)}</p>
    <div class="short-form">
      <input class="short-input" id="short-input-${q.id}" data-qid="${q.id}" placeholder="정답 입력">
      <button onclick="gradeShort('${q.id}')">채점</button>
      <button onclick="resetShort('${q.id}')">다시 풀기</button>
    </div>
    <div class="answer" id="short-answer-${q.id}">
      <p class="result-line" id="short-result-${q.id}"></p>
      <p class="accepted"><b>허용 정답:</b> ${q.answers.map(esc).join(", ")}</p>
      <p><b>해설:</b> ${esc(q.explanation)}</p>
      <p><b>시험 포인트:</b> ${esc(q.examPoint)}</p>
    </div>
  </article>`;
}
function normalizeAnswer(s){
  return String(s)
    .toLowerCase()
    .replace(/[\s\-_/()\[\]{}·,.:;'"`]+/g, "")
    .replace(/×/g, "x")
    .replace(/＋/g, "+")
    .trim();
}
function gradeShort(qid){
  const q = shortMap.get(qid);
  if(!q) return;
  const input = document.getElementById(`short-input-${qid}`);
  const value = input ? input.value : "";
  const normalized = normalizeAnswer(value);
  const ok = normalized.length > 0 && q.answers.some(a => normalizeAnswer(a) === normalized);
  const result = document.getElementById(`short-result-${qid}`);
  result.className = `result-line ${ok ? 'ok' : 'bad'}`;
  result.textContent = ok ? "정답입니다." : `오답입니다. 입력한 답: ${value || "없음"}`;
  document.getElementById(`short-answer-${qid}`).classList.add("show");
}
function resetShort(qid){
  const input = document.getElementById(`short-input-${qid}`);
  if(input) input.value = "";
  const answer = document.getElementById(`short-answer-${qid}`);
  if(answer) answer.classList.remove("show");
}
function buttonsFor(qid){
  return Array.from(document.querySelectorAll(`.option-btn[data-qid="${qid}"]`));
}
function sameSet(a, b){
  if(a.length !== b.length) return false;
  const as = [...a].sort((x,y)=>x-y);
  const bs = [...b].sort((x,y)=>x-y);
  return as.every((v,i)=>v===bs[i]);
}
function markQuestion(qid, chosen){
  const q = questionMap.get(qid);
  if(!q) return;
  const correct = q.answer;
  const ok = sameSet(chosen, correct);
  buttonsFor(qid).forEach(btn => {
    const opt = Number(btn.dataset.opt);
    btn.classList.remove("selected", "correct", "wrong");
    if(correct.includes(opt)) btn.classList.add("correct");
    if(chosen.includes(opt) && !correct.includes(opt)) btn.classList.add("wrong");
    if(chosen.includes(opt) && correct.includes(opt)) btn.classList.add("correct");
  });
  const result = document.getElementById(`result-${qid}`);
  result.className = `result-line ${ok ? 'ok' : 'bad'}`;
  result.textContent = ok ? "정답입니다." : `오답입니다. 선택한 답: ${chosen.map(x=>x+1).join(", ") || "없음"}`;
  document.getElementById(`answer-${qid}`).classList.add("show");
}
function gradeSingle(qid, opt){
  selectedMap.set(qid, new Set([opt]));
  markQuestion(qid, [opt]);
}
function toggleChoice(qid, opt){
  const set = selectedMap.get(qid) || new Set();
  if(set.has(opt)) set.delete(opt); else set.add(opt);
  selectedMap.set(qid, set);
  buttonsFor(qid).forEach(btn => {
    const selected = set.has(Number(btn.dataset.opt));
    btn.classList.toggle("selected", selected);
    btn.classList.remove("correct", "wrong");
  });
  const answer = document.getElementById(`answer-${qid}`);
  if(answer) answer.classList.remove("show");
}
function gradeMulti(qid){
  const chosen = Array.from(selectedMap.get(qid) || new Set());
  markQuestion(qid, chosen);
}
function resetQuestion(qid){
  selectedMap.delete(qid);
  buttonsFor(qid).forEach(btn => btn.classList.remove("selected", "correct", "wrong"));
  const answer = document.getElementById(`answer-${qid}`);
  if(answer) answer.classList.remove("show");
}
function render(){
  renderUnits();
  const content = $("#content");
  if(state.view === "notes"){
    const units = data.units.filter(matchText);
    content.innerHTML = units.map(noteCard).join("");
  } else if(state.view === "bank"){
    const section = data.bank[state.unit] || data.bank[0];
    const qs = section.questions.filter(q=>!q.calculation).filter(matchText);
    content.innerHTML = `<div class="card"><h2>${esc(section.unit)} 문제은행</h2><p>${qs.length}문제</p></div>` + qs.map(questionCard).join("");
  } else if(state.view === "short"){
    const section = data.shortBank[state.unit] || data.shortBank[0];
    const qs = section.questions.filter(matchText);
    content.innerHTML = `<div class="card"><h2>${esc(section.unit)} 단답형</h2><p>${qs.length}문제</p><p class="muted">약어와 한글 명칭은 가능한 경우 모두 허용 정답으로 처리했습니다.</p></div>` + qs.map(shortCard).join("");
  } else if(state.view === "calc"){
    const qs = data.bank.flatMap(s=>s.questions).filter(q=>q.calculation).filter(matchText);
    content.innerHTML = `<div class="card"><h2>계산 문제 모음</h2><p>${qs.length}문제</p></div>` + qs.map(questionCard).join("");
  } else {
    const mock = data.mocks[state.unit] || data.mocks[0];
    const qs = mock.questions.filter(matchText);
    content.innerHTML = `<div class="card"><h2>${esc(mock.title)}</h2><p>객관식 ${qs.length}문항</p></div>` + qs.map(questionCard).join("");
  }
}
document.querySelectorAll("nav button").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll("nav button").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  state.view = btn.dataset.view;
  state.unit = 0;
  render();
}));
$("#search").addEventListener("input", e => { state.query = e.target.value; render(); });
render();