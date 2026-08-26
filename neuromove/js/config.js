// config.js — configuração para salvar os cadastros de paciente direto no repositório GitHub.
//
// COMO GERAR O TOKEN:
// 1. github.com/settings/personal-access-tokens/new  (token do tipo "Fine-grained")
// 2. "Repository access" → Only select repositories → escolha só o repositório "sites"
// 3. "Permissions" → Contents → Read and write   (é a ÚNICA permissão necessária)
// 4. Gere o token e cole abaixo, entre aspas, no lugar de ''
//
// ATENÇÃO — leia antes de colar o token:
// Este projeto roda num repositório PÚBLICO no GitHub Pages. Isso significa que
// QUALQUER pessoa que abrir o site consegue ver este token (basta "Ver código-fonte"
// ou abrir o Console do navegador). Com esse token, essa pessoa consegue ler, criar
// e alterar arquivos neste repositório — incluindo os cadastros de pacientes.
// Foi uma decisão consciente sua manter assim. Se um dia desconfiar de uso indevido,
// revogue o token em github.com/settings/tokens e gere outro (o site para de gravar
// até você colar o novo).
const GITHUB_CONFIG = {
  owner: 'waldeciramos',
  repo: 'sites',
  branch: 'main',
  basePath: 'neuromove/data',
  token: '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',
};
