/* ============================================================
   PEDRINHO GESTÃO v9.0 — Script Completo
   ============================================================ */

// ===== AUTH =====
const USERS = {
  'ana':     { pass:'RDP@2026',    name:'Ana',     role:'admin', avatar:'A' },
  'anderson': { pass:'RDP@2026',    name:'Anderson', role:'admin', avatar:'A' },  // ← CORRIGIDO
  'waldeci': { pass:'RDP@789123',  name:'Waldeci', role:'user',  avatar:'W' }
};
let currentUser = null;

// ===== SETORES PADRÃO =====
const DEFAULT_SECTORS = ['TI','RH','Financeiro','Cartões','Fiscal','Prodac','XP',
  'Coordenadores','Comercial','Jurídico','Contas','Marketing','Programação',
  'Dpnet','Gestão Tec','Outros','Aluguéis','Diretoria','Supervisor',
  'Trabalhista','Engenharia'];

// ===== STORAGE =====
const SK = 'pedrinho_v9';
let D = { tasks:[], employees:[], sectors:[], units:[], lastBackup:null };
try { const s = localStorage.getItem(SK); if (s) D = {...D,...JSON.parse(s)}; } catch(e){}

// Seed default sectors if empty
if (!D.sectors.length) {
  D.sectors = DEFAULT_SECTORS.map(n => ({ id: uid0(), name: n, code: n.slice(0,3).toUpperCase(), unit:'' }));
  saveSilent();
}

function save()   { try { localStorage.setItem(SK, JSON.stringify(D)); } catch(e){} }
function saveSilent() { try { localStorage.setItem(SK, JSON.stringify(D)); } catch(e){} }
function uid0()   { return Math.random().toString(36).slice(2,10); }

// ===== UTILS =====
function p(n)  { return String(n).padStart(2,'0'); }
function ds(d) { return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
function fmtDate(s) { return s ? new Date(s+'T12:00').toLocaleDateString('pt-BR') : '—'; }
function isOverdue(date,status) { if(status==='done'||!date) return false; return new Date(date+'T23:59:59')<new Date(); }
function uid()  { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function escHtml(s) { if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function getGreet() { const h=new Date().getHours(); return h<12?'☀️ Bom dia':h<18?'🌤️ Boa tarde':'🌙 Boa noite'; }

// ===== FRASES MOTIVACIONAIS =====
const FRASES = [
  '"Tudo posso naquele que me fortalece." — Filipenses 4:13',
  '"O sucesso é a soma de pequenos esforços repetidos dia após dia."',
  '"Quem acha uma boa esposa acha o bem e alcança o favor do Senhor." — Pv 18:22',
  '"Nunca desista de um sonho por causa do tempo que levará para realizá-lo."',
  '"O Senhor é o meu pastor e nada me faltará." — Salmos 23:1 · Vai em frente!',
  '"A gratidão transforma o que temos em suficiente. Deus supre toda necessidade!"',
  '"Porque Deus não nos deu espírito de covardia, mas de poder, de amor e de equilíbrio." — 2Tm 1:7'
];

// ===== CLOCK =====
function updateClock() {
  const n=new Date(), h=n.getHours(), m=n.getMinutes(), s=n.getSeconds();
  const clk=document.getElementById('clock'); if(clk) clk.textContent=`${p(h)}:${p(m)}:${p(s)}`;
  const greet=document.getElementById('hdrGreet'); if(greet) greet.textContent=getGreet();
  const days=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const mons=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const fd=document.getElementById('footerDate'); if(fd) fd.textContent=`${days[n.getDay()]}, ${n.getDate()} de ${mons[n.getMonth()]} de ${n.getFullYear()}`;
  const lg=document.getElementById('loginGreet'); if(lg) lg.textContent=getGreet()+'!';
  const lf=document.getElementById('loginFrase'); if(lf) lf.textContent=FRASES[n.getDay()];
}
setInterval(updateClock,1000);
updateClock();

// ===== LOGIN =====
function doLogin() {
  const u=document.getElementById('loginUser').value.trim().toLowerCase();
  const pw=document.getElementById('loginPass').value;
  const err=document.getElementById('loginError');
  err.style.display='none';
  if(USERS[u]&&USERS[u].pass===pw) {
    currentUser={...USERS[u],key:u};
    document.getElementById('hdrUser').textContent=`👤 ${currentUser.name}`;
    document.getElementById('loginScreen').style.display='none';
    document.querySelector('.app').classList.add('visible');
    renderAll();
    checkFirstVisit();
  } else {
    err.textContent='❌ Usuário ou senha incorretos';
    err.style.display='block';
    const box=document.querySelector('.lb');
    box.style.animation='none';
    setTimeout(()=>{box.style.animation='shake .4s ease';},10);
  }
}
document.getElementById('loginPass')?.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
document.getElementById('loginUser')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('loginPass').focus();});

function checkFirstVisit() {
  localStorage.setItem('pg_lv',ds(new Date()));
  window.addEventListener('beforeunload',()=>{ if(new Date().getHours()>=17) showBackupReminder(); });
}
function showBackupReminder()  { document.getElementById('backupReminder').classList.add('open'); }
function closeBackupReminder() { document.getElementById('backupReminder').classList.remove('open'); }
function backupAndClose()      { exportBackup(); closeBackupReminder(); }

// ===== SECURITY =====
document.addEventListener('contextmenu',e=>{ if(currentUser?.role!=='admin') e.preventDefault(); });
document.addEventListener('keydown',e=>{ if(currentUser?.role!=='admin'){ if(e.key==='F12'||(e.ctrlKey&&e.shiftKey&&['I','J','C'].includes(e.key))||(e.ctrlKey&&e.key==='U')) e.preventDefault(); } });

// ===== MASKS =====
function maskPhone(el) {
  el.addEventListener('input',function(){
    let v=this.value.replace(/\D/g,'');
    if(v.length>11) v=v.slice(0,11);
    if(v.length>10) v=v.replace(/^(\d{2})(\d{5})(\d{4}).*/,'($1) $2-$3');
    else if(v.length>6) v=v.replace(/^(\d{2})(\d{4})(\d*)/,'($1) $2-$3');
    else if(v.length>2) v=v.replace(/^(\d{2})(\d*)/,'($1) $2');
    this.value=v;
  });
}
function maskCNPJ(el) {
  el.addEventListener('input',function(){
    let v=this.value.replace(/\D/g,'').slice(0,14);
    v=v.replace(/^(\d{2})(\d)/,'$1.$2');
    v=v.replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3');
    v=v.replace(/\.(\d{3})(\d)/,'.$1/$2');
    v=v.replace(/(\d{4})(\d)/,'$1-$2');
    this.value=v;
  });
}
function maskRamal(el){
  el.addEventListener('input',function(){ this.value=this.value.replace(/\D/g,'').slice(0,6); });
}
// Apply masks after DOM ready
setTimeout(()=>{
  maskPhone(document.getElementById('empPhone'));
  maskPhone(document.getElementById('empPhone2'));
  maskRamal(document.getElementById('empRamal'));
  maskCNPJ(document.getElementById('unitCnpj'));
},200);

// ===== NAV =====
function showTab(name) {
  document.querySelectorAll('.tc').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nt').forEach(n=>n.classList.remove('active'));
  const tab=document.getElementById('tc-'+name);
  if(tab) tab.classList.add('active');
  const lbl={dashboard:'Painel',demandas:'Demandas',nova:'Nova',funcionarios:'Funcionários',setores:'Setores',unidades:'Unidades',calendario:'Calendário',relatorios:'Relatórios',backup:'Backup'};
  document.querySelectorAll('.nt').forEach(n=>{ if(n.textContent.includes(lbl[name])) n.classList.add('active'); });
  if(name==='dashboard')    renderAll();
  if(name==='calendario')   renderCalendar();
  if(name==='relatorios')   gerarRelatorioGeral();
  if(name==='backup')       updateBackupInfo();
  if(name==='nova')         { atualizarSelects(); document.getElementById('taskDate').value=ds(new Date()); }
  if(name==='funcionarios') renderEmployees();
  if(name==='setores')      renderSectors();
}

// ===== RENDER ALL =====
function renderAll() {
  atualizarSelects();
  renderStats();
  renderTasks();
  renderEmployees();
  renderSectors();
  renderUnits();
  renderCalendar();
  renderMiniCal();
  renderAlerts();
  renderCharts();
}

// ===== SELECTS (Categoria = Setores cadastrados) =====
function getCategoryOptions(selectedVal) {
  const cats = D.sectors.map(s=>s.name);
  if(!cats.length) return '<option value="geral">Geral</option>';
  return cats.map(c=>`<option value="${escHtml(c)}" ${selectedVal===c?'selected':''}>${escHtml(c)}</option>`).join('');
}

function atualizarSelects() {
  // Responsável
  ['taskResponsible','editResponsibleSel'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur=el.value;
    el.innerHTML='<option value="">— Selecione —</option>'+D.employees.map(e=>`<option value="${escHtml(e.name)}" data-email="${escHtml(e.email||'')}" data-sector="${escHtml(e.sector||'')}">${escHtml(e.name)} (${escHtml(e.sector||'—')})</option>`).join('');
    if(cur) el.value=cur;
  });
  // Setor (select em nova demanda / funcionário)
  ['taskSector','empSector'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur=el.value;
    el.innerHTML='<option value="">— Selecione —</option>'+D.sectors.map(s=>`<option value="${escHtml(s.name)}">${escHtml(s.name)}</option>`).join('');
    if(cur) el.value=cur;
  });
  // Unidade
  ['empUnit'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur=el.value;
    el.innerHTML='<option value="">— Selecione —</option>'+D.units.map(u=>`<option value="${escHtml(u.name)}">${escHtml(u.name)}</option>`).join('');
    if(cur) el.value=cur;
  });
  // Categoria (nova demanda) = setores cadastrados
  const tc=document.getElementById('taskCategory'); if(tc) { const cv=tc.value; tc.innerHTML=getCategoryOptions(cv); if(!cv&&tc.options.length) tc.value=tc.options[0].value; }
}

// Auto-fill email + sector when responsible selected
document.getElementById('taskResponsible')?.addEventListener('change',function(){
  const opt=this.options[this.selectedIndex];
  const email=opt?.getAttribute('data-email')||'';
  const sec=opt?.getAttribute('data-sector')||'';
  const ef=document.getElementById('taskEmail'); if(ef&&email) ef.value=email;
  const sf=document.getElementById('taskSector');
  if(sf&&sec) { sf.value=sec; if(!sf.value) { const o=document.createElement('option'); o.value=sec; o.textContent=sec+' (sem cadastro)'; sf.appendChild(o); sf.value=sec; } }
});

// ===== STATS =====
function renderStats() {
  const now=new Date(); const tm=`${now.getFullYear()}-${p(now.getMonth()+1)}`;
  const mt=D.tasks.filter(t=>t.date&&t.date.startsWith(tm));
  const open=mt.filter(t=>t.status==='open').length;
  const done=mt.filter(t=>t.status==='done').length;
  const pend=mt.filter(t=>t.status==='pending').length;
  const over=mt.filter(t=>t.status==='open'&&isOverdue(t.date,t.status)).length;
  const alta=mt.filter(t=>t.priority==='alta'&&t.status!=='done').length;
  const total=mt.length;
  ['sbOpen','kpiOpen'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=open;});
  ['sbDone','kpiDone'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=done;});
  ['sbPending','kpiPending'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=pend;});
  document.getElementById('sbOverdue').textContent=over;
  document.getElementById('sbAlta').textContent=alta;
  document.getElementById('sbTotal').textContent=total;
  const all=D.tasks.length; const allDone=D.tasks.filter(t=>t.status==='done').length;
  const rate=all?Math.round(allDone/all*100):0;
  document.getElementById('kpiRate').textContent=rate+'%';
  const tot=open+pend+done;
  document.getElementById('kpiOpenBar').style.width=tot?(open/tot*100)+'%':'0%';
  document.getElementById('kpiPendingBar').style.width=tot?(pend/tot*100)+'%':'0%';
  document.getElementById('kpiDoneBar').style.width=tot?(done/tot*100)+'%':'0%';
  document.getElementById('kpiRateBar').style.width=rate+'%';
}

// ===== TASKS =====
let curFilter='all';

function renderTasks(filter) {
  filter=filter||curFilter;
  const list=document.getElementById('taskList');
  const hoje=ds(new Date());
  let tasks=[...D.tasks].sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(filter==='open')    tasks=tasks.filter(t=>t.status==='open');
  else if(filter==='pending') tasks=tasks.filter(t=>t.status==='pending');
  else if(filter==='done')    tasks=tasks.filter(t=>t.status==='done');
  else if(filter==='overdue') tasks=tasks.filter(t=>t.status==='open'&&isOverdue(t.date,t.status));
  else if(filter==='alta')    tasks=tasks.filter(t=>t.priority==='alta'&&t.status!=='done');
  else if(filter==='hoje')    tasks=tasks.filter(t=>t.date===hoje);
  if(!tasks.length){ list.innerHTML=`<div style="text-align:center;padding:52px;color:var(--muted)"><div style="font-size:52px;margin-bottom:14px;opacity:.35">📋</div><p style="font-size:14px">Nenhuma demanda encontrada</p></div>`; return; }
  list.innerHTML=tasks.map(t=>buildTaskCard(t)).join('');
}

function buildTaskCard(t) {
  const sc=t.status==='done'?'tc-d':t.status==='pending'?'tc-p':'tc-o';
  const st=t.status==='done'?`<span class="tag tag-d">${svgIcon('check')} Concluída</span>`:t.status==='pending'?`<span class="tag tag-p">${svgIcon('clock')} Pendente</span>`:`<span class="tag tag-o">${svgIcon('zap')} Em Aberto</span>`;
  const ov=t.status!=='done'&&isOverdue(t.date,t.status)?'<span class="urg">VENCIDA</span>':'';
  const pr=t.priority==='alta'?`<span class="tag tag-o">${svgIcon('alert')} Alta</span>`:t.priority==='media'?`<span class="tag tag-c">Média</span>`:`<span class="tag tag-c">Baixa</span>`;
  const emailBtn=t.emailTo?`<button class="ib ib-mail" onclick="openEmailPopup('${t.id}')" title="Enviar e-mail">${svgIcon('mail')}</button>`:'';
  const waBtn=t.emailTo?`<button class="ib ib-wa" onclick="openWaPopup('${t.id}')" title="WhatsApp Web">${svgIcon('message')}</button>`:'';
  return `<div class="tcc ${sc}">
    <div class="tc-row">
      <div class="tc-info">
        <div class="tc-title">${escHtml(t.title)} ${ov}</div>
        <div class="tc-meta">
          ${st} ${pr}
          <span class="tag tag-c">${svgIcon('cal')} ${fmtDate(t.date)}</span>
          <span class="tag tag-c">${svgIcon('user')} ${escHtml(t.responsible||'—')}</span>
          <span class="tag tag-c">${svgIcon('folder')} ${escHtml(t.sector||'—')}</span>
          <span class="tag tag-b">${escHtml(t.category||'—')}</span>
          ${t.status!=='done'?`<button class="status-btn status-pending" onclick="quickStatus('${t.id}','pending')">${svgIcon('clock')} Pendente</button>`:''}
          ${t.status!=='done'?`<button class="status-btn status-done" onclick="quickStatus('${t.id}','done')">${svgIcon('check')} Concluir</button>`:''}
          ${t.status==='done'?`<button class="status-btn status-open" onclick="quickStatus('${t.id}','open')">${svgIcon('refresh')} Reabrir</button>`:''}
        </div>
        ${t.desc?`<div class="tc-desc">${escHtml(t.desc)}</div>`:''}
      </div>
      <div class="tc-acts">
        ${emailBtn}${waBtn}
        <button class="ib ib-edit" onclick="editTask('${t.id}')" title="Editar">${svgIcon('edit')}</button>
        <button class="ib ib-del" onclick="deleteTask('${t.id}')" title="Excluir">${svgIcon('trash')}</button>
        <button class="ib ib-print" onclick="printTask('${t.id}')" title="Imprimir">${svgIcon('print')}</button>
      </div>
    </div>
  </div>`;
}

// SVG Icons
function svgIcon(n){
  const icons={
    check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>`,
    clock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    zap:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    alert:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="m10.29 3.86-8.27 14.3A1 1 0 0 0 3 20h18a1 1 0 0 0 .86-1.52l-8.27-14.3a1 1 0 0 0-1.7 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    cal:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    user:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    folder:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    edit:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    trash:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    print:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
    mail:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    message:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    send:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    refresh:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.31"/></svg>`,
    search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    plus:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    home:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    people:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    building:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    save:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    download:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`
  };
  return icons[n]||'';
}

function quickStatus(id,status) {
  const t=D.tasks.find(t=>t.id===id); if(!t) return;
  t.status=status; if(status==='done'&&!t.closedAt) t.closedAt=new Date().toISOString();
  save(); renderAll();
  const lbl={done:'Concluída ✅',pending:'Pendente ⏳',open:'Reaberta ⚡'};
  toast(lbl[status]||'Atualizado','success');
}

function filterTasks(f,btn) {
  curFilter=f;
  document.querySelectorAll('#tc-demandas .fb').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); renderTasks(f);
}

// ===== EMAIL POPUP =====
function openEmailPopup(taskId) {
  const t=D.tasks.find(t=>t.id===taskId); if(!t) return;
  const emp=D.employees.find(e=>e.name===t.responsible);
  const email=t.emailTo||(emp?emp.email:'')||'';
  if(!email){ toast('Nenhum e-mail cadastrado para esta demanda','info'); return; }
  const h=new Date().getHours();
  const grt=h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
  const nome=t.responsible||'';
  document.getElementById('emailTo').value=email;
  document.getElementById('emailSubject').value=`Demanda: ${t.title}`;
  document.getElementById('emailBody').value=`${grt}${nome?', '+nome:''}!\n\nInformamos que a demanda "${t.title}" ${t.status==='open'?'foi aberta e requer atenção':t.status==='done'?'foi concluída com sucesso':'está pendente de ação'}.\n\nData: ${fmtDate(t.date)}\nSetor: ${t.sector||'—'}\nPrioridade: ${t.priority||'—'}\n${t.desc?'\nDetalhes:\n'+t.desc+'\n':''}\nAtenciosamente,\n${currentUser?.name||'Equipe de Gestão'}\nPedrinho Gestão`;
  openModal('modalEmail');
}

function sendEmail() {
  const to=document.getElementById('emailTo').value.trim();
  const sub=encodeURIComponent(document.getElementById('emailSubject').value);
  const body=encodeURIComponent(document.getElementById('emailBody').value);
  if(!to){ toast('Informe o e-mail destinatário','error'); return; }
  window.location.href=`mailto:${to}?subject=${sub}&body=${body}`;
  closeModal('modalEmail');
  toast('Abrindo gerenciador de e-mail...','info');
}

// ===== WHATSAPP POPUP =====
function openWaPopup(taskId) {
  const t=D.tasks.find(t=>t.id===taskId); if(!t) return;
  const emp=D.employees.find(e=>e.name===t.responsible);
  const phone=(emp?.phone||'').replace(/\D/g,'');
  const h=new Date().getHours();
  const grt=h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
  const msg=`${grt}${t.responsible?', '+t.responsible:''}!\n\nSobre a demanda *${t.title}*:\nData: ${fmtDate(t.date)}\nStatus: ${t.status==='open'?'Em Aberto':t.status==='done'?'Concluída':'Pendente'}\nSetor: ${t.sector||'—'}\n${t.desc?'\n'+t.desc:''}`;
  document.getElementById('waPhone').value=phone?`+55${phone}`:'';
  document.getElementById('waMsg').value=msg;
  document.getElementById('waTaskRef').value=taskId;
  openModal('modalWa');
}

function sendWa() {
  const phone=document.getElementById('waPhone').value.replace(/\D/g,'');
  const msg=encodeURIComponent(document.getElementById('waMsg').value);
  const url=phone?`https://web.whatsapp.com/send?phone=${phone}&text=${msg}`:`https://web.whatsapp.com/send?text=${msg}`;
  window.open(url,'_blank');
  closeModal('modalWa');
  toast('Abrindo WhatsApp Web...','info');
}

// ===== NOVA TAREFA =====
function openAddTask() { clearTaskForm(); showTab('nova'); }
function clearTaskForm() {
  ['taskTitle','taskDesc','taskEmail'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const d=document.getElementById('taskDate'); if(d) d.value=ds(new Date());
  const pr=document.getElementById('taskPriority'); if(pr) pr.value='media';
  const resp=document.getElementById('taskResponsible'); if(resp) resp.value='';
  const sec=document.getElementById('taskSector'); if(sec) sec.value='';
  const ov=document.getElementById('taskOverdue'); if(ov) ov.checked=false;
  atualizarSelects();
  // auto-set category to first sector
  const tc=document.getElementById('taskCategory'); if(tc&&tc.options.length) tc.value=tc.options[0].value;
}

function saveTask() {
  const title=document.getElementById('taskTitle').value.trim();
  if(!title){ toast('Informe o título!','error'); return; }
  const cat=document.getElementById('taskCategory').value||'Geral';
  const resp=document.getElementById('taskResponsible').value;
  let email=document.getElementById('taskEmail').value.trim();
  if(!email&&resp){ const emp=D.employees.find(e=>e.name===resp); if(emp) email=emp.email||''; }
  let sector=document.getElementById('taskSector').value;
  if(!sector&&resp){ const emp=D.employees.find(e=>e.name===resp); sector=emp?.sector||''; }
  const t={ id:uid(), title, desc:document.getElementById('taskDesc').value.trim(),
    date:document.getElementById('taskDate').value, category:cat,
    priority:document.getElementById('taskPriority').value, responsible:resp,
    sector:sector, emailTo:email, status:'open',
    overdueManual:document.getElementById('taskOverdue').checked,
    createdAt:new Date().toISOString(), createdBy:currentUser?.name||'Sistema' };
  D.tasks.unshift(t); save(); renderAll(); showTab('demandas');
  toast('Demanda criada! ✅','success');
}

let editingId=null;
function editTask(id) {
  const t=D.tasks.find(t=>t.id===id); if(!t) return;
  editingId=id;
  document.getElementById('editTitle').value=t.title||'';
  document.getElementById('editDesc').value=t.desc||'';
  document.getElementById('editDate').value=t.date||ds(new Date());
  document.getElementById('editPriority').value=t.priority||'media';
  document.getElementById('editStatus').value=t.status||'open';
  document.getElementById('editSector').value=t.sector||'';
  // populate responsible select
  atualizarSelects();
  setTimeout(()=>{ const rs=document.getElementById('editResponsibleSel'); if(rs&&t.responsible) rs.value=t.responsible; },60);
  document.getElementById('editSector').value=t.sector||'';
  document.getElementById('editEmail').value=t.emailTo||'';
  document.getElementById('editOverdue').checked=t.overdueManual||false;
  // Category select for edit
  const ec=document.getElementById('editCategory');
  if(ec){ ec.innerHTML=getCategoryOptions(t.category); ec.value=t.category||ec.options[0]?.value; }
  openModal('modalTask');
}

function updateTask() {
  if(!editingId) return;
  const idx=D.tasks.findIndex(t=>t.id===editingId); if(idx===-1) return;
  const status=document.getElementById('editStatus').value;
  const cat=document.getElementById('editCategory')?.value||D.tasks[idx].category;
  const respSel=document.getElementById('editResponsibleSel');
  const resp=respSel?respSel.value:document.getElementById('editResponsible')?.value||D.tasks[idx].responsible;
  D.tasks[idx]={...D.tasks[idx],
    title:document.getElementById('editTitle').value.trim(),
    desc:document.getElementById('editDesc').value.trim(),
    date:document.getElementById('editDate').value,
    priority:document.getElementById('editPriority').value,
    category:cat, status, responsible:resp,
    sector:document.getElementById('editSector').value,
    emailTo:document.getElementById('editEmail').value.trim(),
    overdueManual:document.getElementById('editOverdue').checked
  };
  if(status==='done'&&!D.tasks[idx].closedAt) D.tasks[idx].closedAt=new Date().toISOString();
  save(); renderAll(); closeModal('modalTask'); toast('Demanda atualizada!','success');
}

function deleteTask(id) {
  if(!confirm('Excluir esta demanda?')) return;
  D.tasks=D.tasks.filter(t=>t.id!==id); save(); renderAll(); toast('Demanda excluída','info');
}

function printTask(id) {
  const t=D.tasks.find(t=>t.id===id); if(!t) return;
  const html=`<div class="ph"><div class="ph-title">Demanda</div><div class="ph-sub">Pedrinho Gestão v9.0 — ${new Date().toLocaleDateString('pt-BR',{dateStyle:'full'})}</div></div>
  <div class="ptask"><strong style="font-size:15px">${escHtml(t.title)}</strong>
  <table style="width:100%;margin-top:10px;font-size:12px;border-collapse:collapse">
    <tr><td style="padding:4px 8px;width:110px;color:#555">Data:</td><td style="padding:4px 8px">${fmtDate(t.date)}</td><td style="padding:4px 8px;width:110px;color:#555">Status:</td><td style="padding:4px 8px">${t.status}</td></tr>
    <tr><td style="padding:4px 8px;color:#555">Responsável:</td><td style="padding:4px 8px">${escHtml(t.responsible||'—')}</td><td style="padding:4px 8px;color:#555">Setor:</td><td style="padding:4px 8px">${escHtml(t.sector||'—')}</td></tr>
    <tr><td style="padding:4px 8px;color:#555">Categoria:</td><td style="padding:4px 8px">${escHtml(t.category||'—')}</td><td style="padding:4px 8px;color:#555">Prioridade:</td><td style="padding:4px 8px">${t.priority}</td></tr>
    <tr><td style="padding:4px 8px;color:#555">E-mail:</td><td colspan="3" style="padding:4px 8px">${escHtml(t.emailTo||'—')}</td></tr>
    ${t.desc?`<tr><td style="padding:4px 8px;color:#555;vertical-align:top">Descrição:</td><td colspan="3" style="padding:4px 8px">${escHtml(t.desc)}</td></tr>`:''}
  </table></div>
  <div class="pfoot">Gerado por Pedrinho Gestão v9.0 — ${new Date().toLocaleString('pt-BR')}</div>`;
  doPrint(html);
}

// ===== EMPLOYEES =====
function renderEmployees() {
  const list=document.getElementById('employeeList'); if(!list) return;
  const q=document.getElementById('searchEmployee')?.value.toLowerCase()||'';
  let emps=D.employees;
  if(q) emps=emps.filter(e=>e.name.toLowerCase().includes(q)||e.email?.toLowerCase().includes(q)||(e.sector||'').toLowerCase().includes(q)||(e.clientChat||'').toLowerCase().includes(q));
  if(!emps.length){ list.innerHTML=`<div style="text-align:center;padding:52px;color:var(--muted)"><div style="font-size:52px;opacity:.35;margin-bottom:14px">👥</div><p style="font-size:14px">Nenhum funcionário encontrado</p></div>`; return; }
  list.innerHTML=emps.map(e=>{
    const tc=D.tasks.filter(t=>t.responsible===e.name).length;
    const oc=D.tasks.filter(t=>t.responsible===e.name&&t.status!=='done').length;
    const chatId=e.clientChat||(e.email?(e.email.split('@')[0]):'—');
    return `<div class="ecard">
      <div class="ecard-h">
        <div class="av">${e.name.charAt(0).toUpperCase()}</div>
        <div style="flex:1">
          <div class="en">${escHtml(e.name)}</div>
          <div class="er">${escHtml(e.sector||'—')} · ${escHtml(e.unit||'—')}</div>
        </div>
        <button class="ib ib-edit" onclick="editEmployee('${e.id}')" title="Editar">${svgIcon('edit')}</button>
        <button class="ib ib-del" onclick="deleteEmployee('${e.id}')" title="Excluir">${svgIcon('trash')}</button>
      </div>
      <div class="emp-detail-grid">
        <div class="emp-detail-item"><div class="emp-detail-label">E-mail</div><div class="emp-detail-val">${escHtml(e.email||'—')}</div></div>
        <div class="emp-detail-item"><div class="emp-detail-label">Telefone</div><div class="emp-detail-val">${escHtml(e.phone||'—')}</div></div>
        <div class="emp-detail-item"><div class="emp-detail-label">Ramal</div><div class="emp-detail-val">${escHtml(e.ramal||'—')}</div></div>
        <div class="emp-detail-item"><div class="emp-detail-label">WhatsApp</div><div class="emp-detail-val">${escHtml(e.phone2||e.phone||'—')}</div></div>
        <div class="emp-detail-item"><div class="emp-detail-label">Setor</div><div class="emp-detail-val">${escHtml(e.sector||'—')}</div></div>
        <div class="emp-detail-item"><div class="emp-detail-label">Unidade</div><div class="emp-detail-val">${escHtml(e.unit||'—')}</div></div>
      </div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:8px">
        <span style="font-size:10px;color:var(--muted);font-family:var(--mono);text-transform:uppercase">Client Chat:</span>
        <span class="emp-chat-badge">@${escHtml(chatId)}</span>
      </div>
      <div class="estats">
        <div class="est"><div class="est-n">${oc}</div><div class="est-l">Em aberto</div></div>
        <div class="est"><div class="est-n">${tc}</div><div class="est-l">Total</div></div>
        <div class="est"><button class="btn btn-s btn-sm" onclick="showTab('demandas')">Ver tarefas</button></div>
      </div>
    </div>`;
  }).join('');
}

// Busca rápida de funcionário
function buscarFuncionario() {
  const q=document.getElementById('empSearchQuery').value.trim().toLowerCase();
  const res=document.getElementById('empSearchResult'); if(!res) return;
  if(!q){ res.innerHTML=''; return; }
  const found=D.employees.filter(e=>e.name.toLowerCase().includes(q)||e.sector?.toLowerCase().includes(q)||(e.clientChat||'').toLowerCase().includes(q));
  if(!found.length){ res.innerHTML='<div style="padding:12px;color:var(--muted);font-size:13px">Nenhum funcionário encontrado</div>'; return; }
  res.innerHTML=found.map(e=>`<div style="padding:10px 0;border-bottom:1px solid var(--border)">
    <div style="font-weight:700;font-size:14px">${escHtml(e.name)}</div>
    <div style="font-size:12px;color:var(--muted);margin-top:4px">${svgIcon('folder')} ${escHtml(e.sector||'—')} &nbsp;·&nbsp; ${svgIcon('building')} ${escHtml(e.unit||'—')} &nbsp;·&nbsp; ${svgIcon('mail')} ${escHtml(e.email||'—')} &nbsp;·&nbsp; Ramal: ${escHtml(e.ramal||'—')}</div>
    <div style="margin-top:5px"><span class="emp-chat-badge">@${escHtml(e.clientChat||(e.email?e.email.split('@')[0]:'—'))}</span></div>
  </div>`).join('');
}

function addEmployee()  { openEmployeeModal(null); }
function editEmployee(id) { openEmployeeModal(D.employees.find(e=>e.id===id)); }
function openEmployeeModal(emp) {
  document.getElementById('empId').value=emp?.id||'';
  document.getElementById('empName').value=emp?.name||'';
  document.getElementById('empEmail').value=emp?.email||'';
  document.getElementById('empPhone').value=emp?.phone||'';
  document.getElementById('empPhone2').value=emp?.phone2||'';
  document.getElementById('empRamal').value=emp?.ramal||'';
  document.getElementById('empClientChat').value=emp?.clientChat||(emp?.email?emp.email.split('@')[0]:'')||'';
  document.getElementById('modalEmpTitle').textContent=emp?'✎ Editar Funcionário':'➕ Novo Funcionário';
  atualizarSelects();
  setTimeout(()=>{
    const se=document.getElementById('empSector'); if(se&&emp?.sector) se.value=emp.sector;
    const ue=document.getElementById('empUnit'); if(ue&&emp?.unit) ue.value=emp.unit;
  },50);
  openModal('modalEmployee');
}

// Auto-fill clientChat from email
document.getElementById('empEmail')?.addEventListener('blur',function(){
  const cc=document.getElementById('empClientChat');
  if(cc&&!cc.value&&this.value) cc.value=this.value.split('@')[0];
});

function saveEmployee() {
  const name=document.getElementById('empName').value.trim();
  const email=document.getElementById('empEmail').value.trim();
  if(!name){ toast('Informe o nome','error'); return; }
  const id=document.getElementById('empId').value;
  const chatVal=document.getElementById('empClientChat').value.trim()||(email?email.split('@')[0]:'');
  const obj={
    id:id||uid(), name, email,
    phone:document.getElementById('empPhone').value.trim(),
    phone2:document.getElementById('empPhone2').value.trim(),
    ramal:document.getElementById('empRamal').value.trim(),
    sector:document.getElementById('empSector').value,
    unit:document.getElementById('empUnit').value,
    clientChat:chatVal
  };
  if(id){ const i=D.employees.findIndex(e=>e.id===id); if(i>-1) D.employees[i]=obj; }
  else D.employees.push(obj);
  save(); renderAll(); closeModal('modalEmployee'); toast('Funcionário salvo!','success');
}
function deleteEmployee(id) {
  if(!confirm('Excluir funcionário?')) return;
  D.employees=D.employees.filter(e=>e.id!==id); save(); renderAll();
}
function filterEmployees() { renderEmployees(); }

// ===== SECTORS =====
function renderSectors() {
  const list=document.getElementById('sectorList'); if(!list) return;
  if(!D.sectors.length){ list.innerHTML=`<div style="text-align:center;padding:52px;color:var(--muted)"><div style="font-size:52px;opacity:.35;margin-bottom:14px">🗂</div><p>Nenhum setor cadastrado</p></div>`; return; }
  list.innerHTML=D.sectors.map(s=>{
    const emps=D.employees.filter(e=>e.sector===s.name);
    const tasks=D.tasks.filter(t=>t.sector===s.name).length;
    const open=D.tasks.filter(t=>t.sector===s.name&&t.status!=='done').length;
    return `<div class="ecard">
      <div class="ecard-h">
        <div class="av" style="background:linear-gradient(135deg,var(--purple),var(--blue))">${svgIcon('folder')}</div>
        <div style="flex:1"><div class="en">${escHtml(s.name)}</div><div class="er">Código: ${escHtml(s.code||'—')}</div></div>
        <button class="ib ib-edit" onclick="editSector('${s.id}')">${svgIcon('edit')}</button>
        <button class="ib ib-del" onclick="deleteSector('${s.id}')">${svgIcon('trash')}</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px">
        ${emps.map(e=>`<span class="tag tag-c">${svgIcon('user')} ${escHtml(e.name)}</span>`).join('')||'<span class="tag tag-c">Sem funcionários</span>'}
      </div>
      <div class="estats">
        <div class="est"><div class="est-n">${open}</div><div class="est-l">Em aberto</div></div>
        <div class="est"><div class="est-n">${tasks}</div><div class="est-l">Total</div></div>
        <div class="est"><div class="est-n">${emps.length}</div><div class="est-l">Pessoas</div></div>
      </div>
    </div>`;
  }).join('');
}

function addSector()  { openSectorModal(null); }
function editSector(id) { openSectorModal(D.sectors.find(s=>s.id===id)); }
function openSectorModal(sec) {
  document.getElementById('secId').value=sec?.id||'';
  document.getElementById('secName').value=sec?.name||'';
  document.getElementById('secCode').value=sec?.code||'';
  document.getElementById('secUnit').value=sec?.unit||'';
  document.getElementById('modalSecTitle').textContent=sec?'✎ Editar Setor':'➕ Novo Setor';
  openModal('modalSector');
}
function saveSector() {
  const name=document.getElementById('secName').value.trim();
  if(!name){ toast('Informe o nome','error'); return; }
  const id=document.getElementById('secId').value;
  const obj={ id:id||uid(), name, code:document.getElementById('secCode').value.trim()||name.slice(0,3).toUpperCase(), unit:document.getElementById('secUnit').value.trim() };
  if(id){ const i=D.sectors.findIndex(s=>s.id===id); if(i>-1) D.sectors[i]=obj; }
  else D.sectors.push(obj);
  save(); renderAll(); closeModal('modalSector'); toast('Setor salvo!','success');
}
function deleteSector(id) {
  if(!confirm('Excluir setor?')) return;
  D.sectors=D.sectors.filter(s=>s.id!==id); save(); renderAll();
}

// ===== UNITS =====
function renderUnits() {
  const list=document.getElementById('unitList'); if(!list) return;
  if(!D.units.length){ list.innerHTML=`<div style="text-align:center;padding:52px;color:var(--muted)"><div style="font-size:52px;opacity:.35;margin-bottom:14px">🏢</div><p>Nenhuma unidade cadastrada</p></div>`; return; }
  list.innerHTML=D.units.map(u=>{
    const emps=D.employees.filter(e=>e.unit===u.name).length;
    return `<div class="ecard">
      <div class="ecard-h">
        <div class="av" style="background:linear-gradient(135deg,var(--blue),var(--purple))">${svgIcon('building')}</div>
        <div style="flex:1"><div class="en">${escHtml(u.name)}</div><div class="er">CNPJ: ${escHtml(u.cnpj||'—')}</div></div>
        <button class="ib ib-edit" onclick="editUnit('${u.id}')">${svgIcon('edit')}</button>
        <button class="ib ib-del" onclick="deleteUnit('${u.id}')">${svgIcon('trash')}</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;font-size:13px;margin-top:10px">
        <div class="emp-detail-item"><div class="emp-detail-label">Endereço</div><div class="emp-detail-val">${escHtml(u.address||'—')}</div></div>
        <div class="emp-detail-item"><div class="emp-detail-label">Telefone</div><div class="emp-detail-val">${escHtml(u.phone||'—')}</div></div>
      </div>
      <div class="estats"><div class="est"><div class="est-n">${emps}</div><div class="est-l">Funcionários</div></div></div>
    </div>`;
  }).join('');
}
function addUnit()  { openUnitModal(null); }
function editUnit(id) { openUnitModal(D.units.find(u=>u.id===id)); }
function openUnitModal(unit) {
  document.getElementById('unitId').value=unit?.id||'';
  document.getElementById('unitName').value=unit?.name||'';
  document.getElementById('unitCnpj').value=unit?.cnpj||'';
  document.getElementById('unitAddress').value=unit?.address||'';
  document.getElementById('unitPhone').value=unit?.phone||'';
  document.getElementById('modalUnitTitle').textContent=unit?'✎ Editar Unidade':'➕ Nova Unidade';
  openModal('modalUnit');
}
function saveUnit() {
  const name=document.getElementById('unitName').value.trim();
  if(!name){ toast('Informe o nome','error'); return; }
  const id=document.getElementById('unitId').value;
  const obj={ id:id||uid(), name, cnpj:document.getElementById('unitCnpj').value.trim(), address:document.getElementById('unitAddress').value.trim(), phone:document.getElementById('unitPhone').value.trim() };
  if(id){ const i=D.units.findIndex(u=>u.id===id); if(i>-1) D.units[i]=obj; }
  else D.units.push(obj);
  save(); renderAll(); closeModal('modalUnit'); toast('Unidade salva!','success');
}
function deleteUnit(id) {
  if(!confirm('Excluir unidade?')) return;
  D.units=D.units.filter(u=>u.id!==id); save(); renderAll();
}

// ===== CALENDAR =====
let calY=new Date().getFullYear(), calM=new Date().getMonth();
function renderCalendar() {
  const grid=document.getElementById('calGrid'); if(!grid) return;
  const mns=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('calTitle').textContent=mns[calM]+' '+calY;
  const dw=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  let h=dw.map(d=>`<div class="cal-dh">${d}</div>`).join('');
  const fd=new Date(calY,calM,1).getDay(); const off=fd===0?6:fd-1;
  const dim=new Date(calY,calM+1,0).getDate(); const pmd=new Date(calY,calM,0).getDate();
  const today=ds(new Date()); let day=1,nday=1;
  for(let i=0;i<42;i++) {
    let dn,mo,yr,isO=false;
    if(i<off){ dn=pmd-off+i+1; mo=calM-1; yr=calY; if(mo<0){mo=11;yr--;} isO=true; }
    else if(day<=dim){ dn=day++; mo=calM; yr=calY; }
    else{ dn=nday++; mo=calM+1; yr=calY; if(mo>11){mo=0;yr++;} isO=true; }
    const ds_=`${yr}-${p(mo+1)}-${p(dn)}`;
    const tasks=D.tasks.filter(t=>t.date===ds_);
    let chips=tasks.slice(0,3).map(t=>{ const cc=t.status==='done'?'chip-d':t.status==='pending'?'chip-p':'chip-o'; return `<span class="chip ${cc}">${t.title.length>11?t.title.slice(0,11)+'…':t.title}</span>`; }).join('');
    if(tasks.length>3) chips+=`<span style="font-size:9px;color:var(--muted)">+${tasks.length-3}</span>`;
    const cls=`cal-c${isO?' other':''}${ds_===today?' today':''}`;
    h+=`<div class="${cls}" onclick="openDay('${ds_}')"><div class="cdn">${dn}</div>${chips}</div>`;
  }
  grid.innerHTML=h;
}
function calChange(dir) { if(dir===0){const n=new Date();calY=n.getFullYear();calM=n.getMonth();}else{calM+=dir;if(calM<0){calM=11;calY--;}if(calM>11){calM=0;calY++;}} renderCalendar(); }
function openDay(date) {
  const tasks=D.tasks.filter(t=>t.date===date);
  const dn=new Date(date+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  let h=`<div style="margin-bottom:15px;font-weight:700;font-size:15px">${svgIcon('cal')} ${dn}</div>`;
  h+=tasks.length?tasks.map(t=>buildTaskCard(t)).join(''):`<div style="text-align:center;padding:32px;color:var(--muted)">Nenhuma demanda neste dia</div>`;
  document.getElementById('modalResumoTitle').textContent='Demandas do Dia';
  document.getElementById('modalResumoBody').innerHTML=h;
  openModal('modalResumo');
}

// Mini calendar
let mY=new Date().getFullYear(), mM=new Date().getMonth();
function renderMiniCal() {
  const mns=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  document.getElementById('miniMonth').textContent=mns[mM]+' '+mY;
  const grid=document.getElementById('miniGrid'); if(!grid) return;
  const dw=['S','T','Q','Q','S','S','D'];
  let h=dw.map(d=>`<div class="mcdh">${d}</div>`).join('');
  const fd=new Date(mY,mM,1).getDay(); const off=fd===0?6:fd-1;
  const dim=new Date(mY,mM+1,0).getDate(); const pmd=new Date(mY,mM,0).getDate();
  const today=ds(new Date()); let day=1,nday=1;
  for(let i=0;i<35;i++){
    let dn,mo,yr,isO=false;
    if(i<off){dn=pmd-off+i+1;mo=mM-1;yr=mY;if(mo<0){mo=11;yr--;}isO=true;}
    else if(day<=dim){dn=day++;mo=mM;yr=mY;}
    else{dn=nday++;mo=mM+1;yr=mY;if(mo>11){mo=0;yr++;}isO=true;}
    const ds_=`${yr}-${p(mo+1)}-${p(dn)}`;
    const has=D.tasks.some(t=>t.date===ds_);
    const cls=`mcd${isO?' oth':''}${ds_===today?' today':''}${has?' has':''}`;
    h+=`<div class="${cls}" onclick="miniGoTo('${ds_}')">${dn}</div>`;
  }
  grid.innerHTML=h;
}
function miniPrev(){mM--;if(mM<0){mM=11;mY--;}renderMiniCal();}
function miniNext(){mM++;if(mM>11){mM=0;mY++;}renderMiniCal();}
function miniGoTo(date){const[y,m]=date.split('-').map(Number);calY=y;calM=m-1;renderCalendar();openDay(date);}

// ===== ALERTS =====
function renderAlerts() {
  const now=new Date();
  const alerts=D.tasks.filter(t=>t.status!=='done'&&(isOverdue(t.date,t.status)||t.priority==='alta'||t.date===ds(now))).slice(0,5);
  document.getElementById('alertCount').textContent=alerts.length;
  const list=document.getElementById('alertList');
  list.innerHTML=alerts.length?alerts.map(a=>`<div class="alrt" onclick="editTask('${a.id}')"><div class="alrt-t">⚠️ ${escHtml(a.title)}</div><div class="alrt-m">${fmtDate(a.date)} · ${escHtml(a.responsible||'—')}</div></div>`).join(''):'<div style="color:var(--muted);font-size:12px;text-align:center;padding:14px">✅ Tudo em dia!</div>';
}

// ===== CHARTS =====
let donut=null;
function renderCharts() {
  if(donut){donut.destroy();donut=null;}
  const open=D.tasks.filter(t=>t.status==='open').length;
  const pend=D.tasks.filter(t=>t.status==='pending').length;
  const done=D.tasks.filter(t=>t.status==='done').length;
  const ctx=document.getElementById('doughnutChart'); if(!ctx) return;
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const tc=isDark?'#7A8FA6':'#6B7A8D';
  donut=new Chart(ctx,{type:'doughnut',data:{labels:['Em Aberto','Pendentes','Concluídas'],datasets:[{data:[open,pend,done],backgroundColor:['#DC2626','#D97706','#059669'],borderColor:'transparent',hoverOffset:10,borderRadius:10,spacing:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'66%',plugins:{legend:{position:'bottom',labels:{color:tc,font:{family:'Plus Jakarta Sans',size:11},padding:12,usePointStyle:true}}}}});
  const cats={};
  D.tasks.filter(t=>t.status!=='done').forEach(t=>{const c=t.category||'Geral';cats[c]=(cats[c]||0)+1;});
  const catList=document.getElementById('categoryList');
  const max=Math.max(1,...Object.values(cats));
  const colors=['#000BFA','#059669','#D97706','#7C3AED','#DC2626','#0891B2','#DB2777','#65a30d'];
  catList.innerHTML=Object.entries(cats).map(([c,n],i)=>`<div class="pi"><div class="pi-l"><span style="font-size:12px;font-weight:600">${escHtml(c)}</span><span style="font-weight:700">${n}</span></div><div class="pi-b"><div class="pi-f" style="width:${n/max*100}%;background:${colors[i%colors.length]}"></div></div></div>`).join('')||'<div style="color:var(--muted);font-size:12px;padding:14px;text-align:center">Sem demandas ativas</div>';
  const acts=[...D.tasks].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,8);
  const aList=document.getElementById('activityList');
  aList.innerHTML=acts.length?acts.map(a=>{const col=a.status==='done'?'#059669':a.status==='pending'?'#D97706':'#DC2626';const dt=a.createdAt?new Date(a.createdAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):'';return`<div class="ai" onclick="editTask('${a.id}')"><div class="ai-d" style="background:${col}"></div><div style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:12px">${escHtml(a.title)}</div><div style="color:var(--muted);font-size:10px">${dt}</div></div>`;}).join(''):'<div style="color:var(--muted);font-size:12px;padding:14px;text-align:center">Sem atividade</div>';
  const urgent=D.tasks.filter(t=>t.status!=='done'&&(isOverdue(t.date,t.status)||t.priority==='alta')).slice(0,5);
  document.getElementById('urgentList').innerHTML=urgent.length?urgent.map(t=>buildTaskCard(t)).join(''):'<div style="text-align:center;padding:22px;color:var(--muted);font-size:13px">✅ Nenhuma demanda urgente</div>';
}

// ===== RESUMO MODAL =====
function abrirResumoModal(tipo) {
  const now=new Date(); const tm=`${now.getFullYear()}-${p(now.getMonth()+1)}`;
  const mt=D.tasks.filter(t=>t.date&&t.date.startsWith(tm));
  const map={open:['⚡ Em Aberto',mt.filter(t=>t.status==='open')],done:['✅ Concluídas',mt.filter(t=>t.status==='done')],pending:['⏳ Pendentes',mt.filter(t=>t.status==='pending')],overdue:['🔴 Vencidas',mt.filter(t=>t.status==='open'&&isOverdue(t.date,t.status))],alta:['🔴 Alta Prioridade',mt.filter(t=>t.priority==='alta'&&t.status!=='done')],all:['📋 Todas do Mês',mt]};
  const[title,tasks]=map[tipo]||['',[]];
  document.getElementById('modalResumoTitle').textContent=title;
  let h=`<div style="margin-bottom:12px;color:var(--muted);font-size:12px">Total: ${tasks.length} itens</div>`;
  h+=tasks.length?tasks.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(t=>buildTaskCard(t)).join(''):'<div style="text-align:center;padding:44px;color:var(--muted)">Nenhuma demanda</div>';
  document.getElementById('modalResumoBody').innerHTML=h;
  openModal('modalResumo');
}

function printResumo() {
  const title=document.getElementById('modalResumoTitle').textContent;
  const tasks=D.tasks; // simplify: use visible tasks
  let rows='';
  tasks.forEach(t=>{ rows+=`<div class="ptask"><strong>${escHtml(t.title)}</strong><div style="font-size:11px;color:#555;margin-top:4px">${fmtDate(t.date)} · ${escHtml(t.responsible||'—')} · ${escHtml(t.sector||'—')} · ${t.status} · ${t.priority}</div>${t.desc?`<div style="font-size:11px;margin-top:3px">${escHtml(t.desc)}</div>`:''}</div>`; });
  const html=`<div class="ph"><div class="ph-title">${title}</div><div class="ph-sub">${new Date().toLocaleDateString('pt-BR',{dateStyle:'full'})}</div></div>${rows}<div class="pfoot">Pedrinho Gestão v9.0</div>`;
  doPrint(html);
}

// ===== REPORTS =====
let curReportHtml='';

function gerarRelatorioGeral() {
  const total=D.tasks.length,open=D.tasks.filter(t=>t.status==='open').length,pend=D.tasks.filter(t=>t.status==='pending').length,done=D.tasks.filter(t=>t.status==='done').length,over=D.tasks.filter(t=>t.status!=='done'&&isOverdue(t.date,t.status)).length;
  const rate=total?Math.round(done/total*100):0;
  const byCat={},byResp={},bySec={};
  D.tasks.forEach(t=>{const c=t.category||'Geral';byCat[c]=(byCat[c]||0)+1;if(t.responsible)byResp[t.responsible]=(byResp[t.responsible]||0)+1;if(t.sector)bySec[t.sector]=(bySec[t.sector]||0)+1;});
  curReportHtml=`<div class="rep-s"><div class="rep-sh">RESUMO GERAL</div><div class="rep-r"><span>Total</span><strong>${total}</strong></div><div class="rep-r"><span>Em Aberto</span><strong style="color:var(--danger)">${open}</strong></div><div class="rep-r"><span>Pendentes</span><strong style="color:var(--warn)">${pend}</strong></div><div class="rep-r"><span>Concluídas</span><strong style="color:var(--success)">${done}</strong></div><div class="rep-r"><span>Vencidas</span><strong style="color:var(--danger)">${over}</strong></div><div class="rep-r"><span>Taxa de Sucesso</span><strong style="color:var(--blue)">${rate}%</strong></div></div><div class="rep-s"><div class="rep-sh">POR CATEGORIA / SETOR</div>${Object.entries(byCat).map(([c,n])=>`<div class="rep-r"><span>${escHtml(c)}</span><strong>${n}</strong></div>`).join('')||'<div class="rep-r">—</div>'}</div><div class="rep-s"><div class="rep-sh">POR RESPONSÁVEL</div>${Object.entries(byResp).sort((a,b)=>b[1]-a[1]).map(([r,n])=>`<div class="rep-r"><span>${escHtml(r)}</span><strong>${n}</strong></div>`).join('')||'<div class="rep-r">—</div>'}</div>`;
  document.getElementById('reportContent').innerHTML=curReportHtml; setAR('geral');
}

function gerarRelatorioPendencias() {
  const pend=D.tasks.filter(t=>t.status!=='done'),over=pend.filter(t=>isOverdue(t.date,t.status)),alta=pend.filter(t=>t.priority==='alta');
  let h=`<div class="rep-s"><div class="rep-sh">RESUMO PENDÊNCIAS</div><div class="rep-r"><span>Total</span><strong>${pend.length}</strong></div><div class="rep-r"><span>Vencidas</span><strong style="color:var(--danger)">${over.length}</strong></div><div class="rep-r"><span>Alta Prioridade</span><strong style="color:var(--danger)">${alta.length}</strong></div></div>`;
  if(pend.length) h+=`<div class="rep-s"><div class="rep-sh">LISTA</div>${pend.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(t=>`<div class="rep-r"><span>${isOverdue(t.date,t.status)?'🔴':'⚡'} ${escHtml(t.title)}</span><span style="color:var(--muted);font-size:12px">${fmtDate(t.date)} · ${escHtml(t.responsible||'—')}</span></div>`).join('')}</div>`;
  curReportHtml=h; document.getElementById('reportContent').innerHTML=h; setAR('pendencias');
}

function gerarRelatorioResolvidos() {
  const res=D.tasks.filter(t=>t.status==='done');
  let h=`<div class="rep-s"><div class="rep-sh">RESOLVIDOS</div><div class="rep-r"><span>Total</span><strong style="color:var(--success)">${res.length}</strong></div></div>`;
  if(res.length) h+=`<div class="rep-s"><div class="rep-sh">LISTA</div>${res.sort((a,b)=>new Date(b.closedAt||b.date)-new Date(a.closedAt||a.date)).map(t=>`<div class="rep-r"><span>✅ ${escHtml(t.title)}</span><span style="color:var(--muted);font-size:12px">${fmtDate(t.closedAt?t.closedAt.slice(0,10):t.date)} · ${escHtml(t.responsible||'—')}</span></div>`).join('')}</div>`;
  curReportHtml=h; document.getElementById('reportContent').innerHTML=h; setAR('resolvidos');
}

function gerarRelatorioFuncionarios() {
  const byE={};
  D.tasks.forEach(t=>{ if(!t.responsible) return; if(!byE[t.responsible]) byE[t.responsible]={total:0,done:0,open:0,pend:0}; byE[t.responsible].total++; if(t.status==='done')byE[t.responsible].done++;else if(t.status==='pending')byE[t.responsible].pend++;else byE[t.responsible].open++; });
  let h=`<div class="rep-s"><div class="rep-sh">POR FUNCIONÁRIO</div>${Object.entries(byE).sort((a,b)=>b[1].total-a[1].total).map(([n,s])=>{const r=s.total?Math.round(s.done/s.total*100):0;return`<div class="rep-r"><span><strong>${escHtml(n)}</strong> <span style="color:var(--muted);font-size:11px">(⚡${s.open}|⏳${s.pend}|✅${s.done})</span></span><strong style="color:${r>70?'var(--success)':r>40?'var(--warn)':'var(--danger)'}">${r}%</strong></div>`;}).join('')||'<div class="rep-r">—</div>'}</div>`;
  curReportHtml=h; document.getElementById('reportContent').innerHTML=h; setAR('funcionarios');
}

function gerarRelatorioSetores() {
  const byS={};
  D.tasks.forEach(t=>{ const s=t.sector||'Geral'; if(!byS[s]) byS[s]={total:0,done:0,open:0,pend:0}; byS[s].total++; if(t.status==='done')byS[s].done++;else if(t.status==='pending')byS[s].pend++;else byS[s].open++; });
  let h=`<div class="rep-s"><div class="rep-sh">POR SETOR</div>${Object.entries(byS).sort((a,b)=>b[1].total-a[1].total).map(([s,st])=>`<div class="rep-r"><span><strong>${escHtml(s)}</strong> <span style="color:var(--muted);font-size:11px">(⚡${st.open}|⏳${st.pend}|✅${st.done})</span></span><strong>${st.total}</strong></div>`).join('')||'<div class="rep-r">—</div>'}</div>`;
  curReportHtml=h; document.getElementById('reportContent').innerHTML=h; setAR('setores');
}

function gerarRelatorioVencidas() {
  const venc=D.tasks.filter(t=>t.status!=='done'&&isOverdue(t.date,t.status));
  let h=`<div class="rep-s"><div class="rep-sh">VENCIDAS</div><div class="rep-r"><span>Total</span><strong style="color:var(--danger)">${venc.length}</strong></div></div>`;
  if(venc.length) h+=`<div class="rep-s"><div class="rep-sh">LISTA</div>${venc.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(t=>{const d=Math.floor((new Date()-new Date(t.date+'T23:59:59'))/(1000*60*60*24));return`<div class="rep-r"><span>🔴 ${escHtml(t.title)}</span><span style="color:var(--danger);font-size:12px">${fmtDate(t.date)} · ${d}d atraso · ${escHtml(t.responsible||'—')}</span></div>`;}).join('')}</div>`;
  curReportHtml=h; document.getElementById('reportContent').innerHTML=h; setAR('vencidas');
}

function gerarRelatorioPorDia() {
  const byD={};
  D.tasks.forEach(t=>{ if(t.date){if(!byD[t.date])byD[t.date]={total:0,done:0,open:0,pend:0};byD[t.date].total++;if(t.status==='done')byD[t.date].done++;else if(t.status==='pending')byD[t.date].pend++;else byD[t.date].open++;}});
  let h=`<div class="rep-s"><div class="rep-sh">POR DIA</div>${Object.entries(byD).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,30).map(([d,s])=>`<div class="rep-r"><span><strong>${fmtDate(d)}</strong> <span style="color:var(--muted);font-size:11px">(⚡${s.open}|⏳${s.pend}|✅${s.done})</span></span><strong>${s.total}</strong></div>`).join('')||'<div class="rep-r">—</div>'}</div>`;
  curReportHtml=h; document.getElementById('reportContent').innerHTML=h; setAR('pordia');
}

function gerarRelatorioPorMes() {
  const byM={};
  const mn={'01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun','07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez'};
  D.tasks.forEach(t=>{ if(t.date){const m=t.date.slice(0,7);if(!byM[m])byM[m]={total:0,done:0,open:0,pend:0};byM[m].total++;if(t.status==='done')byM[m].done++;else if(t.status==='pending')byM[m].pend++;else byM[m].open++;}});
  let h=`<div class="rep-s"><div class="rep-sh">POR MÊS</div>${Object.entries(byM).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,s])=>{const[yr,mo]=m.split('-');return`<div class="rep-r"><span><strong>${mn[mo]}/${yr}</strong> <span style="color:var(--muted);font-size:11px">(⚡${s.open}|⏳${s.pend}|✅${s.done})</span></span><strong>${s.total}</strong></div>`;}).join('')||'<div class="rep-r">—</div>'}</div>`;
  curReportHtml=h; document.getElementById('reportContent').innerHTML=h; setAR('pormes');
}

function setAR(type) {
  document.querySelectorAll('#tc-relatorios .fb').forEach(b=>{
    b.classList.remove('active');
    const t=b.textContent;
    if((type==='geral'&&t.includes('Geral'))||(type==='pendencias'&&t.includes('Pendências'))||(type==='resolvidos'&&t.includes('Resolvidos'))||(type==='funcionarios'&&t.includes('Funcionários'))||(type==='setores'&&t.includes('Setores'))||(type==='vencidas'&&t.includes('Vencidas'))||(type==='pordia'&&t.includes('Dia'))||(type==='pormes'&&t.includes('Mês')))
      b.classList.add('active');
  });
}

function filterReport(type,btn) {
  const map={geral:gerarRelatorioGeral,pendencias:gerarRelatorioPendencias,resolvidos:gerarRelatorioResolvidos,funcionarios:gerarRelatorioFuncionarios,setores:gerarRelatorioSetores,vencidas:gerarRelatorioVencidas,pordia:gerarRelatorioPorDia,pormes:gerarRelatorioPorMes};
  if(map[type]) map[type]();
}

function imprimirRelatorio() {
  if(!curReportHtml){ toast('Gere um relatório primeiro','info'); return; }
  const title=document.querySelector('#tc-relatorios .fb.active')?.textContent||'Relatório';
  // strip glassmorphism backgrounds for print
  const cleanHtml=curReportHtml.replace(/background:[^;]+;/g,'').replace(/backdrop-filter:[^;]+;/g,'');
  const html=`<div class="ph"><div class="ph-title">${title}</div><div class="ph-sub">${new Date().toLocaleDateString('pt-BR',{dateStyle:'full'})}</div></div><div>${cleanHtml}</div><div class="pfoot">Pedrinho Gestão v9.0 — ${new Date().toLocaleString('pt-BR')}</div>`;
  doPrint(html);
}

// ===== PRINT =====
function doPrint(html) {
  const el=document.getElementById('print-content');
  el.innerHTML=html; el.style.left='0';
  window.print(); el.style.left='-9999px';
}

// ===== BACKUP =====
function exportBackup() {
  D.lastBackup=new Date().toISOString(); save();
  const now=new Date();
  const ts=`${now.getFullYear()}${p(now.getMonth()+1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}`;
  const blob=new Blob([JSON.stringify(D,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=`pedrinho_backup_${ts}.json`; a.click(); URL.revokeObjectURL(url);
  toast('Backup exportado! 💾','success'); updateBackupInfo();
}
function restoreBackup(event) {
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{ try{D={...D,...JSON.parse(e.target.result)};save();renderAll();toast('Backup restaurado! ✅','success');updateBackupInfo();}catch(err){toast('Erro ao restaurar','error');} };
  reader.readAsText(file); event.target.value='';
}
function clearAllData() {
  if(!confirm('ATENÇÃO: Apagar TODOS os dados?')) return;
  D={tasks:[],employees:[],sectors:[],units:[],lastBackup:null};
  // Re-seed sectors
  D.sectors=DEFAULT_SECTORS.map(n=>({id:uid0(),name:n,code:n.slice(0,3).toUpperCase(),unit:''}));
  save(); renderAll(); toast('Dados apagados','info'); updateBackupInfo();
}
function updateBackupInfo() {
  const size=(JSON.stringify(D).length/1024).toFixed(1);
  const lb=D.lastBackup?new Date(D.lastBackup).toLocaleString('pt-BR'):'Nunca';
  document.getElementById('backupInfo').textContent=`Tarefas: ${D.tasks.length}\nFuncionários: ${D.employees.length}\nSetores: ${D.sectors.length}\nUnidades: ${D.units.length}\nTamanho: ~${size} KB\nÚltimo backup: ${lb}`;
}

// ===== MODALS =====
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(m=>{ m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('open'); }); });

// ===== TOAST =====
function toast(msg,type='info') {
  const el=document.getElementById('toast');
  const icons={success:'✅',error:'❌',info:'ℹ️'};
  el.className=`show t-${type}`;
  el.innerHTML=`<span>${icons[type]}</span><span>${msg}</span>`;
  clearTimeout(el._t); el._t=setTimeout(()=>el.className='',3500);
}

// ===== THEME =====
function toggleTheme() {
  const t=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',t);
  document.getElementById('themeBtn').textContent=t==='dark'?'☀️':'🌙';
  setTimeout(renderCharts,120);
}
