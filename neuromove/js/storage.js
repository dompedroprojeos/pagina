// storage.js — persistência do paciente no schema JSON especificado.
// Ordem de tentativa: (1) API do GitHub, se houver token em config.js — grava cadastro.json
// de verdade no repositório; (2) api.php, se hospedado com PHP; (3) localStorage do navegador.
// Sempre guarda também uma cópia local, como cache/backup.

const NM_KEY = 'neuromove_pacientes_v1';
const API_BASE = 'api.php';

// ---------- utilidades ----------
function slugify(s){
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^A-Za-z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'');
}
function utf8ToB64(str){ return btoa(unescape(encodeURIComponent(str))); }
function b64ToUtf8(str){ return decodeURIComponent(escape(atob(str))); }

function localAll(){
  try{
    const raw = localStorage.getItem(NM_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ console.error('localAll', e); return []; }
}
function localSaveAll(list){
  try{ localStorage.setItem(NM_KEY, JSON.stringify(list)); }
  catch(e){ console.error('localSaveAll', e); }
}
function localUpsert(wrapper){
  const list = localAll();
  const i = list.findIndex(p=>p.paciente.id===wrapper.paciente.id);
  if(i>=0) list[i]=wrapper; else list.push(wrapper);
  localSaveAll(list);
}

// ---------- backend 1: API do GitHub ----------
function githubEnabled(){
  return typeof GITHUB_CONFIG !== 'undefined' && !!GITHUB_CONFIG.token;
}
async function ghRequest(path, opts){
  opts = opts || {};
  const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`
    + (opts.query ? ('?'+opts.query) : '');
  const headers = Object.assign({
    'Accept':'application/vnd.github+json',
    'Authorization':'token '+GITHUB_CONFIG.token
  }, opts.headers||{});
  return fetch(url, Object.assign({}, opts, {headers}));
}
async function ghGetJson(path){
  try{
    const r = await ghRequest(path, {query:'ref='+GITHUB_CONFIG.branch});
    if(r.status===404) return {data:null, sha:null};
    if(!r.ok) throw new Error('GitHub GET '+r.status);
    const j = await r.json();
    const content = b64ToUtf8(j.content.replace(/\n/g,''));
    return {data: JSON.parse(content), sha:j.sha};
  }catch(e){ console.warn('ghGetJson falhou', path, e); return {data:null, sha:null, error:true}; }
}
async function ghPutJson(path, obj, message){
  const current = await ghGetJson(path);
  const body = {
    message: message || ('Atualiza '+path),
    content: utf8ToB64(JSON.stringify(obj, null, 2)),
    branch: GITHUB_CONFIG.branch
  };
  if(current.sha) body.sha = current.sha;
  const r = await ghRequest(path, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  if(!r.ok){ const t=await r.text().catch(()=> ''); throw new Error('GitHub PUT '+r.status+': '+t); }
  return await r.json();
}

async function githubAll(){
  const idxPath = GITHUB_CONFIG.basePath+'/pacientes/index.json';
  const idx = await ghGetJson(idxPath);
  const list = idx.data || [];
  const wrappers = [];
  for(const item of list){
    const w = await ghGetJson(item.path);
    if(w.data) wrappers.push(w.data);
  }
  wrappers.forEach(localUpsert);
  return wrappers;
}
async function githubGet(id){
  const idxPath = GITHUB_CONFIG.basePath+'/pacientes/index.json';
  const idx = await ghGetJson(idxPath);
  const item = (idx.data||[]).find(p=>p.id===id);
  if(!item) return null;
  const w = await ghGetJson(item.path);
  if(w.data) localUpsert(w.data);
  return w.data;
}
async function githubUpsert(wrapper){
  const slug = slugify(wrapper.paciente.nome)+'_'+wrapper.paciente.id.slice(0,8);
  const path = GITHUB_CONFIG.basePath+'/pacientes/'+slug+'/cadastro.json';
  await ghPutJson(path, wrapper, 'Atualiza cadastro de '+wrapper.paciente.nome);

  const idxPath = GITHUB_CONFIG.basePath+'/pacientes/index.json';
  const idx = await ghGetJson(idxPath);
  const list = idx.data || [];
  const i = list.findIndex(p=>p.id===wrapper.paciente.id);
  const entry = {
    id: wrapper.paciente.id, nome: wrapper.paciente.nome, path,
    totalSessoes: wrapper.paciente.sessoes.length,
    ultimaSessao: wrapper.paciente.historico.ultimaSessao
  };
  if(i>=0) list[i]=entry; else list.push(entry);
  await ghPutJson(idxPath, list, 'Atualiza índice de pacientes');
}

// ---------- backend 2: api.php ----------
let phpApiAvailable = null;
async function checkPhpApi(){
  if(phpApiAvailable!==null) return phpApiAvailable;
  try{
    const r = await fetch(API_BASE+'?action=ping', {cache:'no-store'});
    if(!r.ok){ phpApiAvailable=false; return false; }
    const j = await r.json();
    phpApiAvailable = !!(j && j.ok);
  }catch(e){ phpApiAvailable = false; }
  return phpApiAvailable;
}

// ---------- fachada única ----------
const Storage = {
  async all(){
    if(githubEnabled()){
      try{ return await githubAll(); }
      catch(e){ console.warn('Storage.all via GitHub falhou, tentando outro backend', e); }
    }
    if(await checkPhpApi()){
      try{
        const r = await fetch(API_BASE+'?action=list', {cache:'no-store'});
        if(r.ok){ const list = await r.json(); if(Array.isArray(list)){ list.forEach(localUpsert); return list; } }
      }catch(e){ console.warn('Storage.all via api.php falhou, usando local', e); }
    }
    return localAll();
  },
  async get(id){
    if(githubEnabled()){
      try{ const w = await githubGet(id); if(w) return w; }
      catch(e){ console.warn('Storage.get via GitHub falhou, tentando outro backend', e); }
    }
    if(await checkPhpApi()){
      try{
        const r = await fetch(API_BASE+'?action=get&id='+encodeURIComponent(id), {cache:'no-store'});
        if(r.ok){ const w = await r.json(); if(w && w.paciente){ localUpsert(w); return w; } }
      }catch(e){ console.warn('Storage.get via api.php falhou, usando local', e); }
    }
    return localAll().find(p=>p.paciente.id===id) || null;
  },
  async upsert(wrapper){
    localUpsert(wrapper); // sempre guarda local como backup
    if(githubEnabled()){
      try{ await githubUpsert(wrapper); return; }
      catch(e){ console.warn('Storage.upsert via GitHub falhou, tentando outro backend', e); }
    }
    if(await checkPhpApi()){
      try{
        await fetch(API_BASE+'?action=save', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(wrapper)});
      }catch(e){ console.warn('Storage.upsert via api.php falhou, mantido só localmente', e); }
    }
  },
  usandoApi(){ return githubEnabled() ? 'github' : (phpApiAvailable ? 'php' : false); },
  novoPaciente(dados){
    const id = (crypto.randomUUID) ? crypto.randomUUID() : ('p-'+Date.now()+'-'+Math.random().toString(16).slice(2));
    const idade = dados.dataNascimento ? calcIdade(dados.dataNascimento) : null;
    return {
      paciente: {
        id,
        nome: dados.nome,
        dataNascimento: dados.dataNascimento || null,
        idade,
        sexo: dados.sexo || null,
        diagnostico: dados.diagnostico || null,
        dataCadastro: new Date().toISOString(),
        terapeuta: {
          nome: dados.terapeutaNome || null,
          registro: dados.terapeutaRegistro || null,
          especialidade: dados.terapeutaEspecialidade || null
        },
        configuracoes: {
          maoDominante: dados.maoDominante || 'Destra',
          dificuldadeInicial: dados.dificuldadeInicial || 1,
          sensibilidade: dados.sensibilidade || 1.0
        },
        sessoes: [],
        historico: { totalSessoes:0, mediaDesempenho:0, ultimaSessao:null }
      }
    };
  }
};

function calcIdade(dataNascISO){
  const nasc = new Date(dataNascISO);
  if(isNaN(nasc)) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear()-nasc.getFullYear();
  const m = hoje.getMonth()-nasc.getMonth();
  if(m<0 || (m===0 && hoje.getDate()<nasc.getDate())) idade--;
  return idade;
}

async function registrarSessao(wrapper, sessao){
  const p = wrapper.paciente;
  p.sessoes.unshift(sessao);
  p.sessoes = p.sessoes.slice(0,200);
  p.historico.totalSessoes = p.sessoes.length;
  const scores = p.sessoes.flatMap(s=>s.exerciciosRealizados.map(e=>e.pontuacao));
  p.historico.mediaDesempenho = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
  p.historico.ultimaSessao = sessao.data;
  await Storage.upsert(wrapper);
}

function ultimaExecucao(wrapper, nomeExercicio, excluirSessaoAtualIdx){
  const p = wrapper.paciente;
  for(let i=0;i<p.sessoes.length;i++){
    if(i===excluirSessaoAtualIdx) continue;
    const found = p.sessoes[i].exerciciosRealizados.find(e=>e.nome===nomeExercicio);
    if(found) return found;
  }
  return null;
}
