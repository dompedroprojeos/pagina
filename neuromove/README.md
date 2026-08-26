# NeuroMove Rehab — Sistema de Reabilitação Neuromotora (mão)

Sistema web (HTML/CSS/JS puro) de reabilitação com rastreamento de mão via câmera
(MediaPipe Hands, 21 pontos), gesto direto de agarrar (mão fechada) e soltar (mão
aberta), 4 exercícios terapêuticos, cadastro de paciente, histórico de sessões,
gráfico de evolução e relatório automático (impressão/PDF).

## Os 4 exercícios

1. **Basquete Cerebral** — mão aberta se aproxima da bola, fecha a mão pra agarrar,
   carrega até a tabela/aro e abre a mão pra soltar. 3 níveis (aro parado → aro se
   move → tempo limite).
2. **Abrir e Fechar** — o sistema manda "ABRA" ou "FECHE" e mede o tempo de reação;
   uma mãozinha na tela espelha o gesto em tempo real, e conta as repetições certas.
3. **Segue o Movimento** — acompanhar um alvo que se move em padrões (horizontal,
   vertical, diagonal, circular).
4. **4 Cantos** — 4 bolinhas nos cantos da tela; o paciente leva uma de cada vez até
   o alvo central com o mesmo gesto abrir/fechar. Cronômetro sempre visível.

A quantidade de repetições (padrão: 10) é definida pelo fisioterapeuta no menu,
antes do primeiro exercício da sessão — depois disso fica travada e vale pra todos
os exercícios daquela sessão. O relatório só é gerado ao final do **último**
exercício da sessão (quando a sessão é encerrada).

## Por que não funciona no preview do Claude.ai

O MediaPipe só é distribuído via jsDelivr/npm, e o sandbox de preview de artifacts
do Claude só carrega scripts de `cdnjs.cloudflare.com`. Por isso este projeto é
entregue como arquivos separados, pra rodar no seu próprio ambiente — local ou no
GitHub Pages — onde essa restrição não existe.

## Login

O sistema pede usuário e senha antes de mostrar qualquer coisa. Estão definidos em
`data/senha.json`:

```json
{ "usuario": "clinica", "senha": "fisio2026" }
```

Pra trocar, edite esse arquivo (direto no GitHub ou local) e suba de novo. O login
fica válido só durante a aba aberta — fecha o navegador, pede de novo.

## Como os dados são salvos

Ordem de tentativa, automática:

1. **API do GitHub** (se você configurar um token em `js/config.js`) — grava um
   `cadastro.json` de verdade dentro de `data/pacientes/Nome_do_Paciente_xxxxxxxx/`,
   direto no repositório, como um commit. Funciona no GitHub Pages.
2. **`api.php`** (se hospedado em servidor com PHP, tipo seu Debian/Nginx) — mesma
   ideia, mas grava no disco do servidor.
3. **`localStorage`** do navegador — se nenhum dos dois acima estiver disponível.

### Configurando a gravação via GitHub

Edite `js/config.js` e gere um token em
`github.com/settings/personal-access-tokens/new`:
- Tipo: **Fine-grained token**
- Repository access → **Only select repositories** → escolha só o `sites`
- Permissions → **Contents: Read and write** (só essa)
- Cole o token dentro das aspas em `token: ''`

## ⚠️ Sobre segurança (leia antes de usar com pacientes reais)

Este projeto está configurado do jeito que você pediu, mas é importante deixar
registrado o que isso significa na prática:

- O repositório **precisa ficar público** pro GitHub Pages funcionar no plano
  gratuito — não existe "Pages privado" fora do GitHub Enterprise.
- Sendo público, **o token do `config.js`, o `senha.json` e os `cadastro.json` de
  cada paciente (nome, diagnóstico, dados do terapeuta) ficam visíveis pra
  qualquer pessoa** que abrir o link do site e olhar "Ver código-fonte" ou o
  Console do navegador — não precisa nem saber programar.
- O login com usuário/senha impede acesso casual, mas não é proteção técnica: dá
  pra pular direto lendo o `senha.json`.
- O token tem permissão de escrita nesse repositório; se vazar, alguém pode
  alterar ou apagar arquivos. Revogue e gere outro em `github.com/settings/tokens`
  se desconfiar de algo.

Se em algum momento isso passar a incomodar — por exemplo, se o volume de dados de
paciente crescer e você quiser mais seriedade na proteção — o caminho mais simples
é migrar pro backend PHP no seu servidor Debian (`api.php`, já incluso neste
projeto): os dados passam a ficar na sua rede, não no GitHub. Não precisa
reescrever nada — só hospedar lá e deixar `token: ''` vazio no `config.js`.

## Rodar localmente (seu servidor Debian/Nginx com PHP)

```bash
# copie a pasta neuromove/ pra dentro do seu diretório servido pelo Nginx, ex.:
cp -r neuromove /var/www/neuromove
# garanta que o PHP-FPM está habilitado no Nginx para esse diretório
# e que a pasta data/ pode ser criada/escrita pelo usuário do servidor web (www-data):
sudo chown -R www-data:www-data /var/www/neuromove/data
```

Acesse via `http://192.168.2.155/neuromove/` (ou o domínio que você configurar).
A câmera do navegador só libera em **HTTPS ou `localhost`** — em rede interna sem
certificado, acesse pelo `localhost` na própria máquina do servidor, ou configure
um certificado (Let's Encrypt se tiver domínio público, ou autoassinado pra uso
interno).

## Publicar no GitHub Pages (sem PHP, mas HTTPS de graça)

```bash
cd neuromove
git init && git add . && git commit -m "NeuroMove Rehab v2 (só mão)"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

Depois: **Settings → Pages → Branch: main → Save**. Em 1-2 minutos o site fica em
`https://SEU_USUARIO.github.io/SEU_REPO/`, já em HTTPS — a câmera funciona direto.
Os dados dos pacientes ficam salvos no navegador (ver tabela acima).

## Estrutura

```
neuromove/
├── index.html            telas e estrutura da interface (inclui tela de login)
├── style.css              identidade visual
├── api.php                 backend PHP opcional (alternativa mais segura, ver acima)
├── data/
│   ├── senha.json           usuário/senha do login
│   └── pacientes/            onde os cadastros ficam salvos (criado automaticamente)
├── js/
│   ├── config.js             token do GitHub (você preenche)
│   ├── storage.js            GitHub → api.php → localStorage, nessa ordem
│   ├── tracking.js           MediaPipe Hands, gesto agarrar/soltar
│   ├── exercises.js          os 4 exercícios e a coleta de métricas
│   ├── report.js             relatório de sessão + gráfico de evolução
│   └── app.js                telas, login, navegação, configuração de repetições
└── README.md
```

## Limitações conhecidas

- A detecção de gesto (mão aberta/fechada) usa uma heurística geométrica sobre os
  21 pontos — funciona bem de frente para a câmera, com boa luz; pode falhar em
  ângulos muito inclinados ou contraluz forte.
- Isto **não é um dispositivo médico certificado**; é uma ferramenta de apoio a
  exercícios, sob supervisão do terapeuta responsável.
