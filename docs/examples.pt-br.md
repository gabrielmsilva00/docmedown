---
title: Exemplos Executáveis
description: Explore três sites de documentação de referência completos e prontos para produção aninhados dentro do DocMeDown.
order: 5
tags: [examples, reference-sites, nested-docs, architecture, showcase]
---

# Exemplos de Referência Executáveis 🧪

O DocMeDown inclui **três sites de referência independentes e totalmente funcionais** diretamente dentro deste repositório.

Cada exemplo é um site de documentação autocontido com seu próprio `.dmd/.config/docs.json`, família visual, componentes personalizados, índice de busca e pacote offline. Você pode abrir e inspecionar cada um deles agora mesmo:

---

## 🏗️ Matriz de Exemplos Interativos

| Site de Exemplo | Família Visual | Principal Caso de Uso | Destaques | Abrir |
| :--- | :--- | :--- | :--- | :--- |
| **[Documentação de Engenharia Local](#1-docs-engenharia-local)** | `terminal` (escuro) | APIs de desenvolvedores e ferramentas internas | Estilo monoespaçado, `.dmd/.components/OrbitCounter.svelte`, guias aninhados | [Abrir Site](examples/local-docs/index.html) |
| **[Portal Git Remoto Dinâmico](#2-portal-git-remoto-dinamico)** | `blueprint` | Bibliotecas de código aberto e repositórios | Zero arquivos Markdown locais, varredura dinâmica via API, sincronização ao vivo | [Abrir Site](examples/remote-github/index.html) |
| **[Manual Offline Isolado](#3-manual-offline-isolado)** | `editorial` | Manuais de hardware e guias de campo | Distribuível HTML em arquivo único, zero chamadas de rede, layout de livro | [Abrir Site](examples/single-file-offline/index.html) |

---

<a id="1-docs-engenharia-local"></a>
## 1. Documentação de Engenharia Local

> **Pré-visualização ao Vivo:** [Abrir Exemplo de Docs Locais (examples/local-docs/index.html)](examples/local-docs/index.html)

Este site de referência ilustra uma documentação operacional voltada para desenvolvedores, estilizada com a família visual **`terminal`**.

```
examples/local-docs/
├── .dmd/.config/docs.json    # Tema terminal com densidade compacta
├── README.md                 # Visão geral do sistema e referência rápida
├── getting-started.md        # CLI e configuração do ambiente
├── guides/
│   ├── deployment.md         # Procedimentos operacionais de deploy
│   └── monitoring.md         # Observabilidade e limites de alerta
└── .dmd/.components/
    └── OrbitCounter.svelte   # Widget interativo de órbita de partículas
```

### Configuração (`examples/local-docs/.dmd/.config/docs.json`)
```json title="examples/local-docs/.dmd/.config/docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Local Reference Docs",
  "tagline": "Compact operational documentation",
  "theme": {
    "family": "terminal",
    "density": "compact",
    "defaultMode": "dark"
  },
  "nav": [
    { "label": "Overview", "href": "#/README" },
    { "label": "Getting Started", "href": "#/getting-started" }
  ]
}
```

### Widget Svelte 5 Interativo (`.dmd/OrbitCounter.svelte`)
Este site demonstra o uso de runes do Svelte 5 (`$state`, `$derived`, `$props`) interagindo com as variáveis do tema terminal do DocMeDown (`--dmd-primary`, `--dmd-bg-card`):

```svelte title="examples/local-docs/.dmd/OrbitCounter.svelte"
<svelte:options customElement="dmd-orbit-counter" />

<script>
  let count = $state(0);
  let speed = $derived(count * 2 + 1);
</script>

<div class="orbit-panel">
  <div class="orbit-center">
    <span>Orbital Velocity: {speed}x</span>
    <button onclick={() => count++}>Accelerate ({count})</button>
  </div>
</div>
```

---

<a id="2-portal-git-remoto-dinamico"></a>
## 2. Portal Git Remoto Dinâmico

> **Pré-visualização ao Vivo:** [Abrir Exemplo Remoto do GitHub (examples/remote-github/index.html)](examples/remote-github/index.html)

Este site demonstra a capacidade de **zero hospedagem** do DocMeDown. Ele **não contém nenhum arquivo Markdown no disco**! Em vez disso, seu arquivo `docs.json` aponta diretamente para um repositório upstream no GitHub.

```
examples/remote-github/
├── docs.json                 # Aponta para repositório remoto no GitHub
└── index.html                # Shell HTML leve importando docmedown.web.js
```

### Configuração (`examples/remote-github/docs.json`)
```json title="examples/remote-github/docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Dynamic GitHub Reader",
  "tagline": "Live remote repository documentation",
  "source": {
    "type": "github",
    "repo": "facebook/react",
    "branch": "main",
    "docsDir": "docs"
  },
  "theme": {
    "family": "blueprint",
    "density": "comfortable",
    "defaultMode": "auto"
  }
}
```

### Como o runtime se comporta:
1. Quando um leitor abre `index.html`, o DocMeDown consulta a API do GitHub para varrer a árvore de diretórios de `facebook/react`.
2. A navegação da barra lateral, a tabela de rotas e o índice de busca são construídos **dinamicamente no lado do cliente**.
3. Clicar em uma página busca o conteúdo Markdown bruto em `raw.githubusercontent.com` e o renderiza com realce de sintaxe completo e notas visuais.
4. Qualquer commit mesclado no repositório remoto do GitHub torna-se imediatamente visível ao atualizar o navegador.

---

<a id="3-manual-offline-isolado"></a>
## 3. Manual Offline Isolado

> **Pré-visualização ao Vivo:** [Abrir Exemplo Offline (examples/single-file-offline/index.html)](examples/single-file-offline/index.html)

Este site é estilizado com a elegante família visual **`editorial`** (fundo em tom de papel quente, cabeçalhos sofisticados com serifa, detalhes em tijolo). Ele demonstra como o DocMeDown empacota um acervo completo de documentação de várias páginas em um arquivo único e autoextraível `.dist/index.html`.

```
examples/single-file-offline/
├── docs.json                 # Família visual editorial
├── README.md                 # Introdução do manual
├── chapters/
│   ├── chapter-1.md          # Guia aprofundado
│   └── chapter-2.md          # Apêndice técnico
└── .dist/
    └── index.html            # Distribuível 100% autocontido (duplo clique)
```

### Configuração (`examples/single-file-offline/docs.json`)
```json title="examples/single-file-offline/docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Field Engineering Manual",
  "tagline": "100% Offline Single-File Distributable",
  "theme": {
    "family": "editorial",
    "density": "comfortable",
    "defaultMode": "light"
  },
  "offline": {
    "embedNestedDocs": false
  }
}
```

### A Garantia do Duplo Clique:
Abrir `examples/single-file-offline/.dist/index.html` via `file:///`:
- Utiliza a API nativa `DecompressionStream` do navegador para descompactar o acervo Markdown e o runtime embutidos.
- Executa busca aproximada completa no cliente em todos os capítulos.
- Funciona sem qualquer chamada de rede, fontes externas ou servidor HTTP local.

---

## 🧩 A Arquitetura de Documentação Aninhada

Como três sites de documentação completamente distintos podem coexistir na mesma pasta de documentação sem conflitos?

```
DocMeDown Root (./docs/docs.json) ─── Família Atlas (Site Principal)
  │
  ├── README.md, getting-started.md, guides/
  │
  └── examples/
      ├── local-docs/docs.json ──────── Família Terminal (Site Isolado)
      │     └── OrbitCounter.svelte
      │
      ├── remote-github/docs.json ───── Família Blueprint (Site Isolado)
      │     └── Fonte Dinâmica do GitHub
      │
      └── single-file-offline/docs.json  Família Editorial (Site Isolado)
            └── HTML de Arquivo Único Offline
```

### O Contrato de Isolamento:
1. **Qualquer pasta contendo um `docs.json` constitui uma Raiz de Documentação distinta**.
2. O scanner pai detecta arquivos `docs.json` aninhados e **interrompe a varredura naquele subdiretório**. Isso assegura que o índice de busca e a árvore de navegação do site pai nunca vazem páginas ou componentes dos sites filhos.
3. Ao executar `npx docmedown build ./docs`, o DocMeDown constrói recursivamente o site principal e, em seguida, compila de forma independente cada site aninhado com seu próprio manifesto, páginas estáticas pré-renderizadas e artefato offline `.dist/`.
4. **Ideal para**:
   - Monorepositórios com múltiplos pacotes.
   - Documentação versionada (ex.: `docs/v1/`, `docs/v2/`).
   - Microdocumentações incorporadas em portais de produto maiores.

---

## 🚀 Recrie Estes Exemplos no Seu Projeto

Para experimentar uma dessas configurações no seu próprio repositório:

<Tabs type="postit">
  <Tab label="1. Docs de API Terminal">
```bash
npx docmedown init ./api-docs
# Edite docs.json -> defina "theme": { "family": "terminal", "density": "compact" }
npx docmedown serve ./api-docs
```
  </Tab>
  <Tab label="2. Portal Remoto do GitHub">
```bash
mkdir my-github-docs && cd my-github-docs
echo '{"name":"Remote Docs","source":{"type":"github","repo":"sua-org/seu-repo","branch":"main"}}' > docs.json
npx docmedown serve .
```
  </Tab>
  <Tab label="3. Distribuível em Arquivo Único">
```bash
npx docmedown build ./docs -o ./dist
# Distribua ./dist/index.html diretamente!
```
  </Tab>
</Tabs>

---

## 🗺️ Próximos Passos

Você explorou a jornada completa da documentação! Retorne à visão geral ou continue a criação de conteúdo:

<CardGrid cols={2}>
  <Card
    title="Visão Geral e Filosofia"
    description="Revise os quatro pilares, a arquitetura do motor e a comparação de recursos."
    href="#/README"
    badge="Início"
    badgeType="info"
  />
  <Card
    title="Vitrine de Componentes"
    description="Explore pré-visualizações interativas ao vivo e trechos de código para todos os elementos nativos."
    href="#/showcase"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
