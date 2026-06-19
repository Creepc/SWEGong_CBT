const state = { view: "notes", unit: 0, query: "" };
const $ = (s) => document.querySelector(s);
const data = window.STUDY_DATA;

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
  return `<article class="card question">
    <div><span class="badge">${esc(q.type)}</span>${q.calculation?'<span class="badge">계산</span>':''}<span class="muted">${esc(q.unit)}</span></div>
    <h3>문제 ${i}</h3><p>${esc(q.stem)}</p>
    <ol class="options">${q.options.map(o=>`<li>${esc(o)}</li>`).join("")}</ol>
    <button onclick="this.nextElementSibling.classList.toggle('show')">정답/해설 보기</button>
    <div class="answer"><p class="ok">정답: ${ans}</p><p><b>정답 이유:</b> ${esc(q.correctReason)}</p><p><b>오답 이유:</b> ${esc(q.wrongReason)}</p><p><b>시험 포인트:</b> ${esc(q.examPoint)}</p></div>
  </article>`;
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