// app.js — orquestra telas, cadastro, calibração, jogo e relatórios.
(function(){
"use strict";

const state = {
  wrapper: null,
  calibStep: 1,
  calibHandSeen: false,
  calibHandOpenSeen: false, calibHandCloseSeen: false,
  currentExerciseId: null,
  currentNivel: 1,
  sessionExercicios: [],
  sessionReps: 10,
  sessionRepsLocked: false,
};

// ---------- Som ----------
window.NM_SOUND = (function(){
  let ctx = null;
  function ac(){ if(!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)(); return ctx; }
  function beep(type){
    const toggle = document.getElementById('toggleSound');
    if(toggle && !toggle.checked) return;
    try{
      const c = ac();
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      const freqs = {grab:520, hit:780, miss:180};
      o.frequency.value = freqs[type]||440;
      g.gain.value = 0.06;
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime+0.18);
      o.stop(c.currentTime+0.2);
    }catch(e){}
  }
  return {beep};
})();

// ---------- Tela cheia + manter em primeiro plano ----------
// Obs.: por segurança dos navegadores, nenhum site consegue bloquear de fato
// notificações de outros apps (WhatsApp etc.) — isso depende do sistema
// (modo "Não perturbe", app fixado/kiosk). Aqui fazemos o que dá pra fazer
// via navegador: tela cheia + travar a tela pra não apagar (Wake Lock) +
// tentar voltar sozinho quando o usuário retorna ao app.
let wakeLock = null;
async function requestWakeLock(){
  try{
    if('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  }catch(e){ /* sem suporte ou permissão — segue sem travar a tela */ }
}
function releaseWakeLock(){
  if(wakeLock){ wakeLock.release().catch(()=>{}); wakeLock = null; }
}
function toggleFullscreen(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen?.().catch(()=>{});
  } else {
    document.exitFullscreen?.().catch(()=>{});
  }
}
document.getElementById('btnFullscreen').addEventListener('click', toggleFullscreen);
document.getElementById('btnFullscreenSettings').addEventListener('click', ()=>{ toggleFullscreen(); closeSettings(); });

let wasFullscreenBeforeHide = false;
document.addEventListener('fullscreenchange', ()=>{
  if(document.fullscreenElement) wasFullscreenBeforeHide = true;
});
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState==='visible'){
    const emGame = document.getElementById('screen-game').classList.contains('active');
    const emCalib = document.getElementById('screen-calib').classList.contains('active');
    if(emGame || emCalib){
      requestWakeLock();
      if(document.fullscreenElement===null && wasFullscreenBeforeHide){
        document.documentElement.requestFullscreen?.().catch(()=>{});
      }
    }
  }
});

// ---------- Navegação ----------
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('globalNav').style.display = (id==='screen-home'||id==='screen-login')?'none':'flex';
}

// ---------- HOME / lista de pacientes ----------
async function renderPatientList(){
  const el = document.getElementById('patientList');
  el.innerHTML = '<div class="empty">Carregando…</div>';
  const list = await Storage.all();
  if(!list.length){ el.innerHTML = '<div class="empty">Nenhum paciente cadastrado ainda.</div>'; return; }
  el.innerHTML = '';
  list.sort((a,b)=> new Date(b.paciente.dataCadastro)-new Date(a.paciente.dataCadastro));
  list.forEach(w=>{
    const p = w.paciente;
    const div = document.createElement('div');
    div.className = 'patient-item';
    div.innerHTML = `<div><div class="pname">${escapeHtml(p.nome)}</div><div class="pmeta">${p.sessoes.length} sessão(ões) · média ${p.historico.mediaDesempenho} pts</div></div><div class="pmeta">›</div>`;
    div.addEventListener('click', ()=>openPatient(p.id));
    el.appendChild(div);
  });
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function openPatient(id){
  state.wrapper = await Storage.get(id);
  if(!state.wrapper) return;
  goToMenu();
}

document.getElementById('btnNewPatient').addEventListener('click', ()=>{
  clearCadastroForm();
  showScreen('screen-cadastro');
});

// ---------- CADASTRO ----------
function clearCadastroForm(){
  ['fNome','fDiagnostico','fTerapNome','fTerapRegistro','fTerapEsp'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('fNascimento').value='';
  document.getElementById('fSexo').value='';
  document.getElementById('fMaoDom').value='Destra';
  document.getElementById('fDificuldade').value=1;
  document.getElementById('fSensibilidade').value=1.0;
  document.getElementById('fSensibilidadeVal').textContent='1.00';
}
document.getElementById('fSensibilidade').addEventListener('input', (e)=>{
  document.getElementById('fSensibilidadeVal').textContent = parseFloat(e.target.value).toFixed(2);
});
document.getElementById('btnCancelCadastro').addEventListener('click', ()=>showScreen('screen-home'));
document.getElementById('btnSaveCadastro').addEventListener('click', async ()=>{
  const nome = document.getElementById('fNome').value.trim();
  if(!nome){ alert('Informe o nome do paciente.'); return; }
  const dados = {
    nome,
    dataNascimento: document.getElementById('fNascimento').value || null,
    sexo: document.getElementById('fSexo').value || null,
    diagnostico: document.getElementById('fDiagnostico').value || null,
    terapeutaNome: document.getElementById('fTerapNome').value || null,
    terapeutaRegistro: document.getElementById('fTerapRegistro').value || null,
    terapeutaEspecialidade: document.getElementById('fTerapEsp').value || null,
    maoDominante: document.getElementById('fMaoDom').value,
    dificuldadeInicial: parseInt(document.getElementById('fDificuldade').value)||1,
    sensibilidade: parseFloat(document.getElementById('fSensibilidade').value)||1.0,
  };
  state.wrapper = Storage.novoPaciente(dados);
  await Storage.upsert(state.wrapper); // já cria o cadastro.json (ou entrada local) na hora do cadastro
  startCalibration();
});

// ---------- CALIBRAÇÃO (só mão) ----------
let calibCtx, calibVideoEl;

async function startCalibration(){
  showScreen('screen-calib');
  requestWakeLock();
  state.calibStep = 1;
  state.calibHandSeen = false;
  state.calibHandOpenSeen = false; state.calibHandCloseSeen = false;
  renderCalibStep();

  calibVideoEl = document.getElementById('video');
  const overlay = document.getElementById('calibOverlay');
  calibCtx = overlay.getContext('2d');

  if(typeof Hands === 'undefined'){
    document.getElementById('calibStepText').textContent =
      'Não foi possível carregar o MediaPipe Hands. Isso acontece quando a página é aberta ' +
      'dentro do preview do Claude.ai. Rode local (http://localhost) ou publique no GitHub Pages.';
    return;
  }

  try{
    await Tracking.init(calibVideoEl);
  }catch(e){
    document.getElementById('calibStepText').textContent = 'Não foi possível acessar a câmera. Verifique as permissões do navegador.';
    return;
  }
  resizeCanvas(overlay, document.getElementById('calibStage'));
  Tracking.start(onCalibFrame);
}

function resizeCanvas(canvas, stage){
  canvas.width = stage.clientWidth; canvas.height = stage.clientHeight;
}

function onCalibFrame({hand}){
  const ctx = calibCtx, w=ctx.canvas.width, h=ctx.canvas.height;
  ctx.clearRect(0,0,w,h);

  document.getElementById('handChip').textContent = 'mão: ' + (hand ? (hand.open?'aberta ✋':'fechada ✊') : 'não detectada');

  if(hand){
    state.calibHandSeen = true;
    if(hand.open) state.calibHandOpenSeen = true; else state.calibHandCloseSeen = true;
    ctx.beginPath(); ctx.arc(hand.x*w, hand.y*h, 16, 0, Math.PI*2);
    ctx.strokeStyle = hand.open ? '#3E8E6B' : '#F2A93B'; ctx.lineWidth=3; ctx.stroke();
  }

  if(state.calibStep===1 && state.calibHandSeen){
    document.getElementById('calibStepText').textContent = 'Mão detectada. Toque em "Continuar".';
    document.getElementById('btnCalibNext').disabled = false;
  }
  if(state.calibStep===2 && state.calibHandOpenSeen && state.calibHandCloseSeen){
    document.getElementById('calibStepText').textContent = 'Gestos confirmados. Toque em "Continuar" para concluir.';
    document.getElementById('btnCalibNext').disabled = false;
  }
}

function renderCalibStep(){
  const title = document.getElementById('calibStepTitle');
  const text = document.getElementById('calibStepText');
  document.getElementById('btnCalibNext').disabled = true;
  if(state.calibStep===1){
    title.textContent = 'Passo 1 — Detecção';
    text.textContent = 'Posicione a mão dentro do quadro, com boa iluminação.';
  } else if(state.calibStep===2){
    title.textContent = 'Passo 2 — Confirmar gestos';
    text.textContent = 'Abra e feche a mão diante da câmera para confirmar a detecção do gesto de agarrar/soltar.';
  }
}

document.getElementById('btnCalibBack').addEventListener('click', ()=>{
  if(state.calibStep>1){ state.calibStep--; renderCalibStep(); }
  else { Tracking.stop(); releaseWakeLock(); showScreen('screen-home'); renderPatientList(); }
});
document.getElementById('btnCalibNext').addEventListener('click', ()=>{
  if(state.calibStep<2){ state.calibStep++; renderCalibStep(); }
  else {
    Tracking.stop();
    releaseWakeLock();
    goToMenu();
  }
});

// ---------- MENU DE EXERCÍCIOS ----------
function goToMenu(){
  showScreen('screen-menu');
  const p = state.wrapper.paciente;
  document.getElementById('menuPatientName').textContent = p.nome;
  document.getElementById('menuPatientMeta').textContent =
    `${p.sessoes.length} sessão(ões) registrada(s) · pontuação média ${p.historico.mediaDesempenho} pts` +
    (Storage.usandoApi() ? ' · salvando em arquivo no servidor' : ' · salvando neste navegador');

  const grid = document.getElementById('exerciseGrid');
  grid.innerHTML = '';
  EXERCISE_DEFS.forEach(ex=>{
    const card = document.createElement('div');
    card.className = 'ex-card';
    card.innerHTML = `<div class="ex-icon">${ex.icon}</div><div class="txt"><h3>${ex.nome}</h3><p>${ex.desc}</p></div>`;
    card.addEventListener('click', ()=>chooseNivelAndStart(ex));
    grid.appendChild(card);
  });

  if(state.sessionExercicios.length===0 && !state.sessionRepsLocked){
    state.sessionReps = EXERCISE_DEFS[0].repsDefault;
  }
  const repsInput = document.getElementById('sessionReps');
  repsInput.value = state.sessionReps;
  repsInput.disabled = state.sessionRepsLocked;
  document.getElementById('sessionRepsHint').textContent = state.sessionRepsLocked
    ? 'Repetições fixadas para esta sessão (definidas no primeiro exercício).'
    : 'Vale para todos os exercícios desta sessão. Pode ajustar antes do primeiro exercício.';
}
document.getElementById('sessionReps').addEventListener('change', (e)=>{
  const v = parseInt(e.target.value)||10;
  state.sessionReps = Math.max(3, Math.min(30, v));
  e.target.value = state.sessionReps;
});

document.getElementById('btnGoHistory').addEventListener('click', renderHistory);
document.getElementById('btnRecalibrate').addEventListener('click', startCalibration);
document.getElementById('btnGoHome').addEventListener('click', ()=>{
  state.wrapper = null;
  state.sessionExercicios = [];
  state.sessionRepsLocked = false;
  renderPatientList(); showScreen('screen-home');
});

function chooseNivelAndStart(ex){
  const nivel = Math.max(1, Math.min(ex.niveis, state.wrapper.paciente.configuracoes.dificuldadeInicial));
  state.sessionRepsLocked = true; // a partir do 1º exercício, trava a config de repetições da sessão
  startExercise(ex.id, nivel);
}

// ---------- JOGO ----------
let gameVideoEl, gameCtx, gameStage, gameStartWallTime=0, lastFrameT=0;

async function startExercise(id, nivel){
  state.currentExerciseId = id;
  state.currentNivel = nivel;
  showScreen('screen-game');
  requestWakeLock();
  gameVideoEl = document.getElementById('videoGame');
  const overlay = document.getElementById('gameOverlay');
  gameCtx = overlay.getContext('2d');
  gameStage = document.getElementById('gameStage');
  document.getElementById('gamePrompt').innerHTML='';

  if(typeof Hands==='undefined'){ return; }
  try{ await Tracking.init(gameVideoEl); }catch(e){ return; }
  resizeCanvas(overlay, gameStage);

  const sens = state.wrapper.paciente.configuracoes.sensibilidade || 1.0;
  const inst = ExerciseEngine.start(id, nivel, sens, state.sessionReps);
  inst.onFeedback = showFeedback;
  inst.onFinish = ()=>endExercise(inst);
  gameStartWallTime = performance.now();
  lastFrameT = performance.now();

  document.getElementById('statHits').textContent='0';
  document.getElementById('statErr').textContent='0';
  document.getElementById('statReact').textContent='—';
  document.getElementById('statRep').textContent='0/'+state.sessionReps;

  Tracking.start(onGameFrame);
}

function onGameFrame({hand}){
  const inst = ExerciseEngine.instance;
  if(!inst || inst.done) return;
  const now = performance.now();
  const dt = (now-lastFrameT)/1000; lastFrameT = now;

  const w = gameCtx.canvas.width, h = gameCtx.canvas.height;
  gameCtx.clearRect(0,0,w,h);
  inst.update(hand, dt, gameCtx, w, h);

  document.getElementById('handStateChip').textContent = hand ? (hand.open?'✋ aberta':'✊ fechada') : '— sem mão';
  document.getElementById('gameTimer').textContent = fmtTimer((now-gameStartWallTime)/1000);
  document.getElementById('gameScore').textContent = inst.score+' pts';
  document.getElementById('statHits').textContent = inst.correct;
  document.getElementById('statErr').textContent = inst.incorrect;
  document.getElementById('statReact').textContent = inst.reactionTimes.length ? Math.round(inst.reactionTimes[inst.reactionTimes.length-1]) : '—';
  const repDisplay = inst.roundProgress!=null ? inst.roundProgress : (inst.correct+inst.incorrect);
  document.getElementById('statRep').textContent = repDisplay+'/'+state.sessionReps;
  const roundEl = document.getElementById('gameRound');
  if(roundEl) roundEl.textContent = inst.roundProgress!=null ? ('Série '+inst.rodada) : '';
}

function fmtTimer(sec){
  const m = Math.floor(sec/60), s = Math.floor(sec%60), ms = Math.floor((sec%1)*10);
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+ms;
}

let feedbackTimeout=null;
function showFeedback(msg, tipo){
  const el = document.getElementById('feedbackToast');
  el.textContent = msg;
  el.className = 'feedback-toast show' + (tipo==='bad'?' bad':'');
  clearTimeout(feedbackTimeout);
  feedbackTimeout = setTimeout(()=>el.classList.remove('show'), 1600);
}

document.getElementById('btnEndSession').addEventListener('click', ()=>{
  const inst = ExerciseEngine.instance;
  if(inst) inst.finish('Encerrado manualmente pelo terapeuta/paciente.');
});

function endExercise(inst){
  Tracking.stop();
  releaseWakeLock();
  const def = ExerciseEngine.def(state.currentExerciseId);
  const registro = {
    nome: def.nome,
    duracao: inst.metricas().duracao,
    pontuacao: inst.score,
    nivel: state.currentNivel,
    metricas: (({duracao,pontuacao,nivel, ...m})=>m)(inst.metricas()),
  };
  state.sessionExercicios.push(registro);
  askContinueOrFinish();
}

function askContinueOrFinish(){
  const cont = confirm('Exercício concluído! Deseja realizar outro exercício nesta sessão?\n\nOK = escolher outro exercício\nCancelar = encerrar sessão e ver o relatório final');
  if(cont){ goToMenu(); }
  else { finalizeSession(); }
}

async function finalizeSession(){
  if(!state.sessionExercicios.length){ goToMenu(); return; }
  const duracaoTotal = state.sessionExercicios.reduce((a,e)=>a+e.duracao,0);
  const scoresAnteriores = state.wrapper.paciente.sessoes.flatMap(s=>s.exerciciosRealizados.map(e=>e.pontuacao));
  const mediaAnterior = scoresAnteriores.length ? scoresAnteriores.reduce((a,b)=>a+b,0)/scoresAnteriores.length : null;
  const novaMedia = state.sessionExercicios.reduce((a,e)=>a+e.pontuacao,0)/state.sessionExercicios.length;

  const sessao = {
    data: new Date().toISOString(),
    duracaoTotal,
    exerciciosRealizados: state.sessionExercicios,
    repeticoesConfiguradas: state.sessionReps,
    progresso: { melhoriaPrecisao: null, nivelAtual: state.currentNivel }
  };
  if(mediaAnterior!=null){
    sessao.progresso.melhoriaPrecisao = Math.round(((novaMedia-mediaAnterior)/Math.max(1,mediaAnterior))*100);
  }

  await registrarSessao(state.wrapper, sessao);

  if(mediaAnterior!=null && novaMedia>mediaAnterior){
    setTimeout(()=>alert(`Parabéns! Desempenho médio melhorou ${sessao.progresso.melhoriaPrecisao}% em relação às sessões anteriores.`), 100);
  }

  document.getElementById('reportBody').innerHTML = Report.build(state.wrapper, sessao);
  state.lastSessao = sessao;
  state.sessionExercicios = [];
  state.sessionRepsLocked = false;
  showScreen('screen-report');
}

document.getElementById('btnPrintReport').addEventListener('click', ()=>window.print());
document.getElementById('btnExportSessionJson').addEventListener('click', ()=>{
  downloadJson(state.lastSessao, `sessao_${state.wrapper.paciente.nome.replace(/\s+/g,'_')}_${Date.now()}.json`);
});
document.getElementById('btnBackFromReport').addEventListener('click', goToMenu);

function downloadJson(obj, filename){
  const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

// ---------- HISTÓRICO ----------
function renderHistory(){
  showScreen('screen-history');
  const p = state.wrapper.paciente;
  document.getElementById('histPatientName').textContent = p.nome;
  const list = document.getElementById('historyList');
  if(!p.sessoes.length){ list.innerHTML = '<div class="empty">Ainda não há sessões registradas.</div>'; return; }
  list.innerHTML = '';
  p.sessoes.forEach(s=>{
    const div = document.createElement('div');
    div.className = 'history-item';
    const total = s.exerciciosRealizados.reduce((a,e)=>a+e.pontuacao,0);
    div.innerHTML = `<div class="hname">${new Date(s.data).toLocaleString('pt-BR')}</div>
      <div class="hmeta">${s.exerciciosRealizados.length} exercício(s) · ${total} pts · ${fmtDurMin(s.duracaoTotal)}</div>`;
    list.appendChild(div);
  });
}
function fmtDurMin(sec){ sec=Math.round(sec||0); return Math.floor(sec/60)+'min '+(sec%60)+'s'; }

document.getElementById('btnHistoryBack').addEventListener('click', goToMenu);
document.getElementById('btnExportPatientJson').addEventListener('click', ()=>{
  downloadJson(state.wrapper, `paciente_${state.wrapper.paciente.nome.replace(/\s+/g,'_')}.json`);
});

// ---------- Configurações de acessibilidade ----------
document.getElementById('btnSettings').addEventListener('click', ()=>{
  document.getElementById('settingsPanel').classList.add('open');
  document.getElementById('settingsBackdrop').classList.add('open');
});
document.getElementById('btnCloseSettings').addEventListener('click', closeSettings);
document.getElementById('settingsBackdrop').addEventListener('click', closeSettings);
function closeSettings(){
  document.getElementById('settingsPanel').classList.remove('open');
  document.getElementById('settingsBackdrop').classList.remove('open');
}
document.getElementById('toggleContrast').addEventListener('change', (e)=>document.body.classList.toggle('contrast', e.target.checked));
document.getElementById('toggleFontSize').addEventListener('change', (e)=>document.body.classList.toggle('bigfont', e.target.checked));

// ---------- Login ----------
const NM_LOGIN_KEY = 'neuromove_logado';

async function checkCredenciais(usuario, senha){
  // 1) Tenta o api.php (servidor com PHP) — a senha fica no servidor, nunca
  //    aparece no navegador nem precisa de token do GitHub.
  try{
    const r = await fetch('api.php?action=login', {
      method:'POST', cache:'no-store',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({usuario, senha})
    });
    if(r.ok){
      const j = await r.json();
      return !!j.ok;
    }
  }catch(e){ /* sem PHP disponível (ex.: GitHub Pages) — tenta o fallback abaixo */ }

  // 2) Fallback: GitHub Pages (estático, sem PHP) — só funciona se GITHUB_CONFIG
  //    estiver preenchido em config.js.
  try{
    const url = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.basePath}/senha.json`;
    const r = await fetch(url, {cache:'no-store'});
    if(!r.ok) return false;
    const j = await r.json();
    return j.usuario===usuario && j.senha===senha;
  }catch(e){ console.warn('checkCredenciais falhou', e); return false; }
}

document.getElementById('btnLogin').addEventListener('click', doLogin);
document.getElementById('loginPass').addEventListener('keydown', (e)=>{ if(e.key==='Enter') doLogin(); });

async function doLogin(){
  const btn = document.getElementById('btnLogin');
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  btn.disabled = true; btn.textContent = 'Verificando…';
  const ok = await checkCredenciais(user, pass);
  btn.disabled = false; btn.textContent = 'Entrar';
  if(ok){
    sessionStorage.setItem(NM_LOGIN_KEY, '1');
    showScreen('screen-home');
    renderPatientList();
  } else {
    errEl.textContent = 'Usuário ou senha incorretos.';
  }
}

document.getElementById('btnLogout').addEventListener('click', ()=>{
  sessionStorage.removeItem(NM_LOGIN_KEY);
  closeSettings();
  state.wrapper = null;
  document.getElementById('loginUser').value='';
  document.getElementById('loginPass').value='';
  showScreen('screen-login');
});

// ---------- Init ----------
window.addEventListener('resize', ()=>{
  if(document.getElementById('screen-calib').classList.contains('active')){
    resizeCanvas(document.getElementById('calibOverlay'), document.getElementById('calibStage'));
  }
  if(document.getElementById('screen-game').classList.contains('active')){
    resizeCanvas(document.getElementById('gameOverlay'), gameStage);
  }
});

if(sessionStorage.getItem(NM_LOGIN_KEY)==='1'){
  showScreen('screen-home');
  renderPatientList();
} else {
  showScreen('screen-login');
}
})();
