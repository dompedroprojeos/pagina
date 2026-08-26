// report.js — relatório de sessão (impressão/PDF) + gráfico de evolução entre sessões.

const Report = {
  build(wrapper, sessao){
    const p = wrapper.paciente;
    const exs = sessao.exerciciosRealizados;
    const melhor = exs.slice().sort((a,b)=>b.pontuacao-a.pontuacao)[0];
    const pontuacaoTotal = exs.reduce((a,e)=>a+e.pontuacao,0);
    const precisaoMedia = avg(exs.map(e=>e.metricas.precisaoMedia).filter(v=>v!=null));
    const reacaoMedia = avg(exs.map(e=>e.metricas.tempoReacaoMedio).filter(v=>v!=null));
    const areaMelhoria = exs.slice().sort((a,b)=> (a.metricas.precisaoMedia||0)-(b.metricas.precisaoMedia||0))[0];

    const chartImg = buildEvolutionChart(p);

    return `
      <h2>Relatório de Sessão — NeuroMove Rehab</h2>
      <h3>Dados do paciente</h3>
      <div class="rline"><span>Nome</span><span>${esc(p.nome)}</span></div>
      <div class="rline"><span>Data da sessão</span><span>${new Date(sessao.data).toLocaleString('pt-BR')}</span></div>
      <div class="rline"><span>Duração total</span><span>${fmtDur(sessao.duracaoTotal)}</span></div>
      <div class="rline"><span>Terapeuta</span><span>${esc(p.terapeuta.nome||'—')}</span></div>
      <div class="rline"><span>Sessão nº</span><span>${p.sessoes.findIndex(s=>s.data===sessao.data)>=0 ? (p.sessoes.length - p.sessoes.findIndex(s=>s.data===sessao.data)) : p.sessoes.length}</span></div>

      <h3>Resumo de desempenho</h3>
      <div class="rgrid">
        <div class="rline"><span>Exercícios realizados</span><span>${exs.length}</span></div>
        <div class="rline"><span>Pontuação total</span><span>${pontuacaoTotal}</span></div>
        <div class="rline"><span>Melhor resultado</span><span>${esc(melhor?melhor.nome:'—')}</span></div>
        <div class="rline"><span>Área de melhoria</span><span>${esc(areaMelhoria?areaMelhoria.nome:'—')}</span></div>
      </div>

      <h3>Análise de métricas — Mão</h3>
      <div class="rgrid">
        <div class="rline"><span>Precisão média</span><span>${precisaoMedia!=null?precisaoMedia+'%':'—'}</span></div>
        <div class="rline"><span>Tempo de reação médio</span><span>${reacaoMedia!=null?reacaoMedia+' ms':'—'}</span></div>
      </div>

      <h3>Exercícios da sessão</h3>
      ${exs.map(e=>`
        <div class="rline"><span>${esc(e.nome)} (nível ${e.nivel})</span><span>${e.pontuacao} pts · ${e.metricas.movimentosCorretos}✓/${e.metricas.movimentosIncorretos}✗</span></div>
      `).join('')}

      <h3>Progresso comparativo (vs. sessão anterior)</h3>
      ${exs.map(e=>{
        const anterior = ultimaExecucao(wrapper, e.nome, 0);
        if(!anterior) return `<div class="rline"><span>${esc(e.nome)}</span><span>primeira execução registrada</span></div>`;
        const deltaScore = e.pontuacao - anterior.pontuacao;
        return `<div class="rline"><span>${esc(e.nome)}</span><span>${deltaScore>=0?'+':''}${deltaScore} pts vs. sessão anterior</span></div>`;
      }).join('')}

      <h3>Evolução entre sessões</h3>
      ${chartImg ? `<img src="${chartImg}" style="width:100%;border-radius:8px;margin:6px 0;" alt="Gráfico de evolução">`
                 : `<p style="font-size:12px;color:#5a6f6a;">O gráfico aparece a partir da 2ª sessão registrada.</p>`}

      <h3>Recomendações</h3>
      <div class="rline"><span>Foco sugerido</span><span>${esc(areaMelhoria?areaMelhoria.nome:'—')}</span></div>

      <h3>Observações do terapeuta</h3>
      <div style="border:1px dashed #c4d3cd;border-radius:8px;height:70px;"></div>
    `;
  }
};

// Gera um gráfico de linha simples (pontuação total por sessão, da mais antiga pra mais nova)
function buildEvolutionChart(p){
  const sessoes = p.sessoes.slice().reverse(); // mais antiga primeiro
  if(sessoes.length < 2) return null;
  const pontos = sessoes.map(s => s.exerciciosRealizados.reduce((a,e)=>a+e.pontuacao,0));

  const w=640, h=260, pad=40;
  const canvas = document.createElement('canvas');
  canvas.width=w; canvas.height=h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);

  const maxV = Math.max(...pontos, 10);
  const minV = 0;
  const stepX = (w-pad*2)/Math.max(1,pontos.length-1);
  const toY = (v)=> h-pad - (v-minV)/(maxV-minV)*(h-pad*2);

  // eixos
  ctx.strokeStyle='#c4d3cd'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.stroke();

  // linha
  ctx.beginPath();
  pontos.forEach((v,i)=>{ const x=pad+i*stepX, y=toY(v); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.strokeStyle='#F2A93B'; ctx.lineWidth=3; ctx.stroke();

  // pontos + rótulos
  pontos.forEach((v,i)=>{
    const x=pad+i*stepX, y=toY(v);
    ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fillStyle='#0B2E2C'; ctx.fill();
    ctx.font='11px sans-serif'; ctx.fillStyle='#0B2E2C'; ctx.textAlign='center';
    ctx.fillText(String(v), x, y-10);
    ctx.fillText('S'+(i+1), x, h-pad+16);
  });

  ctx.font='13px sans-serif'; ctx.fillStyle='#0B2E2C'; ctx.textAlign='left';
  ctx.fillText('Pontuação total por sessão', pad, 20);

  return canvas.toDataURL('image/png');
}

function avg(arr){ return arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null; }
function esc(s){ return String(s==null?'—':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDur(sec){ sec=Math.round(sec||0); const m=Math.floor(sec/60), s=sec%60; return `${m}min ${s}s`; }
