---
title: Bem-vindo ao DocMeDown
description: O documentador MarkDown mais simples de todos. Runtime reativo ao vivo, compilador de sites estáticos, pacotes em arquivo único air-gapped e distribuição nativa com IA.
order: 1
tags: [visão-geral, filosofia, recursos, início-rápido, svelte, ia, mcp, offline]
---

# Bem-vindo ao DocMeDown ⚡
### *O documentador MarkDown mais simples de todos!*

O **DocMeDown** elimina completamente o atrito na documentação. Ele oferece aos desenvolvedores o refinamento estético e o poder interativo de plataformas modernas como **Docusaurus**, **VitePress** ou **Mintlify** — sem arquivos de configuração complexos, pipelines pesados de build ou boilerplate de roteamento estático.

Escreva arquivos Markdown padrão, e o DocMeDown gerencia autoindexação, montagem de componentes interativos, realce de sintaxe, busca aproximada (<Kbd>⌘K</Kbd>), troca de temas, pré-renderização estática com SEO e distribuição em arquivo único para ambientes isolados (air-gapped) de forma 100% automática.

---

## ⚡ Início Rápido em 30 Segundos

Coloque um site de documentação moderno no ar em três passos:

<Tabs type="pills">
  <Tab label="1. Inicializar Docs" icon="🚀">
```bash
npx docmedown
```
Detecta automaticamente arquivos markdown na raiz (`README.md`, `CONTRIBUTING.md`, `ROADMAP.md`, etc.), conecta a raiz e `./docs/` no nível superior sem subdivisão artificial de `./docs/`, e inicializa a configuração.
  </Tab>
  <Tab label="2. Preview ao Vivo" icon="🔥">
```bash
npx docmedown serve ./docs
```
Inicia um servidor de desenvolvimento ultrarrápido em `http://localhost:3000` com hot live-reload no próprio local via WebSocket.
  </Tab>
  <Tab label="3. Build de Produção" icon="📦">
```bash
npx docmedown build ./docs
```
Pré-renderiza páginas estáticas com SEO, emite contexto para IA (`llms.txt`), e gera um arquivo único `.dist/index.html` 100% offline.
  </Tab>
</Tabs>

---

## 🎨 Componentes Interativos Multi-Framework

O DocMeDown atua como uma camada universal de orquestração de componentes. Você pode criar widgets interativos usando **Svelte 5 nativo (runes)**, **React com TypeScript (TSX)** ou **Web Elements padrão (Lit)** — e usá-los diretamente em Markdown sem necessidade de imports:

### 1. Svelte 5 Nativo (`.dmd/CounterWidget.svelte`)
<CounterWidget title="Widget Svelte 5 ao Vivo em Markdown" />

### 2. React TSX (`.dmd/ReactMetricCard.tsx`)
<ReactMetricCard label="Vazão de Consultas" initial={1200} unit="req/s" />

### 3. Web Element / Lit (`.dmd/LitStatusBadge.ts`)
<LitStatusBadge label="Cluster de Produção" status="operational" />

### 4. Controlador de Tema e Aparência ao Vivo (`.dmd/InteractiveThemeDemo.svelte`)
<InteractiveThemeDemo />

---

## 🏛️ Os Quatro Pilares do DocMeDown

<CardGrid cols={2}>
  <Card
    title="1. Documentação Local Sem Atrito"
    description="Adicione index.html e escreva Markdown. Unifica arquivos *.md da raiz e ./docs/ automaticamente, sem bundlers e com busca aproximada instantânea (⌘K)."
    href="#/getting-started"
    badge="Zero Config"
    badgeType="success"
    color="blue"
  />
  <Card
    title="2. Fontes Git Remotas Dinâmicas"
    description="Aponte diretamente para qualquer repositório GitHub ou GitLab. Leitores visualizam atualizações ao vivo assim que os commits entram na branch."
    href="#/guides/remote-github"
    badge="Cloud Git"
    badgeType="info"
    color="violet"
  />
  <Card
    title="3. HTML de Arquivo Único 100% Offline"
    description="Pacotes HTML utilizáveis com clique duplo (file:///). Sem servidor web, sem erros de CORS, perfeito para sistemas isolados (air-gapped)."
    href="#/guides/offline-mode"
    badge="Air-Gapped"
    badgeType="warning"
    color="amber"
  />
  <Card
    title="4. Nativo para IA com MCP & llms.txt"
    description="Servidor Model Context Protocol nativo que conecta sua documentação diretamente ao Claude Desktop, Cursor e Windsurf."
    href="#/guides/mcp-server"
    badge="Pronto para IA"
    badgeType="new"
    color="green"
  />
</CardGrid>

---

## 🏗️ Pipeline de Arquitetura

```mermaid
graph TD
    subgraph Sources ["1. Fontes de Documentação"]
        A[Arquivos Locais .md / .mdx]
        B[Repositório Remoto GitHub]
        C[Repositório Remoto GitLab]
    end

    subgraph DocMeDown ["2. Motor DocMeDown"]
        D[Autoindexador Zero-Config]
        E[Parser de Markdown & Matemática]
        F[Runtime Svelte 5 com Runes]
        G[Componentes Customizados .dmd]
    end

    subgraph TargetOutputs ["3. Saídas Finais"]
        H[Servidor Dev com Hot Reload]
        I[Site Estático Pré-renderizado (SSG/SEO)]
        J[HTML Único 100% Offline]
        K[Servidor Model Context Protocol MCP]
    end

    Sources --> D
    D --> E
    E --> F
    G --> F
    F --> TargetOutputs
```

---

## ⚡ Matriz Comparativa de Recursos

| Recurso | **DocMeDown** | Docusaurus | Docsify | VitePress | Mintlify |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Tempo de Configuração** | **< 10 segundos** ⚡ | ~5-10 min | ~2 min | ~3 min | ~5 min |
| **Modo Zero-Config** | **Sim** ✅ | Não ❌ | Parcial ⚠️ | Não ❌ | Não ❌ |
| **Sincronização Dinâmica com Git Remoto** | **Sim (GitHub/GitLab)** 🌐 | Não ❌ | Parcial ⚠️ | Não ❌ | Não ❌ |
| **HTML de Arquivo Único Air-Gapped** | **Sim (Duplo Clique)** 📦 | Não ❌ | Não ❌ | Não ❌ | Não ❌ |
| **Componentes Customizados Multi-Framework** | **Sim (Svelte, React, Lit)** 🧩 | Apenas React MDX | Plugins | Apenas Vue 3 | Apenas React MDX |
| **Busca Aproximada Nativa (<Kbd>⌘K</Kbd>)** | **Sim (Zero Config)** 🔍 | Requer plugin | Requer plugin | Integrada | Hospedada em nuvem |
| **Editor Bidirecional no Navegador (<Kbd>Ctrl+E</Kbd>)** | **Sim (Integrado)** ✏️ | Não ❌ | Não ❌ | Não ❌ | Apenas Web |
| **Previews em Estágio (`--preview`)** | **Sim (Integrado)** 🎭 | Não ❌ | Não ❌ | Não ❌ | Não ❌ |
| **Mermaid & KaTeX Interativos** | **Integrados** 📊 | Plugins | Plugins | Integrado | Integrado |
| **Model Context Protocol (MCP) Nativo** | **Integrado (Stdio & SSE)** 🤖 | Não ❌ | Não ❌ | Não ❌ | Não ❌ |
| **`llms.txt` & `SKILL.md` Automatizados** | **Integrados** 🧠 | Não ❌ | Não ❌ | Não ❌ | Não ❌ |

---

## 🗺️ Jornada Guiada pela Documentação

Siga o currículo linear abaixo ou navegue diretamente para o tópico de seu interesse:

<CardGrid cols={3}>
  <Card
    title="1. Primeiros Passos"
    description="Tutorial passo a passo de configuração, scripts de pacote e seu primeiro site de documentação."
    href="#/getting-started"
    icon="🚀"
    badge="Tutorial"
    badgeType="success"
  />
  <Card
    title="2. Estrutura do Projeto"
    description="Estrutura de diretórios, opções de frontmatter, regras de autoindexação e sidebars customizadas."
    href="#/guides/project-structure"
    icon="📁"
    badge="Guia"
    badgeType="info"
  />
  <Card
    title="3. Arquitetura do Motor"
    description="Por dentro do motor: runtime reativo com Svelte 5 runes, loader virtual e compressão offline."
    href="#/guides/architecture"
    icon="🏛️"
    badge="Imersão"
    badgeType="info"
  />
  <Card
    title="4. Markdown e Matemática"
    description="Alertas do GitHub, realce de sintaxe com foco em nível de linha e fórmulas matemáticas em LaTeX."
    href="#/guides/markdown-features"
    icon="📝"
    badge="Autoria"
    badgeType="info"
  />
  <Card
    title="5. Diagramas Mermaid"
    description="Fluxogramas interativos, diagramas de sequência e sincronização automática de tema."
    href="#/guides/mermaid-diagrams"
    icon="📊"
    badge="Visual"
    badgeType="info"
  />
  <Card
    title="6. Primitivas de UI Nativas"
    description="Referência para os 20 elementos: CardGrid, Tabs, Badges, Callouts, Media e Botões."
    href="#/guides/built-in-components"
    icon="🧩"
    badge="20 Elementos"
    badgeType="info"
  />
  <Card
    title="7. Componentes Customizados"
    description="Crie componentes interativos em Svelte 5, React TSX ou Web Elements dentro de .dmd/."
    href="#/guides/custom-components"
    icon="⚡"
    badge="Multi-FW"
    badgeType="new"
  />
  <Card
    title="8. DX de Última Geração e Editor"
    description="HMR autêntico no local, editor no navegador com visualização dividida (Ctrl+E) e previews em estágio."
    href="#/guides/developer-experience"
    icon="🔥"
    badge="v0.9.0"
    badgeType="new"
  />
  <Card
    title="9. Site Estático e SEO"
    description="SSG pré-renderizado, hidratação com pushState, sitemaps, robots.txt e tutoriais de hospedagem."
    href="#/guides/static-site"
    icon="🌐"
    badge="Implantação"
    badgeType="info"
  />
  <Card
    title="10. Arquivo Único Offline"
    description="Pacotes HTML autorrecuperáveis para ambientes isolados com zero dependências e zero erros de CORS."
    href="#/guides/offline-mode"
    icon="📦"
    badge="Air-Gapped"
    badgeType="warning"
  />
  <Card
    title="11. Git Remoto Dinâmico"
    description="Documentação ao vivo sem hospedagem própria consumida via streaming direto do GitHub ou GitLab."
    href="#/guides/remote-github"
    icon="☁️"
    badge="Cloud Git"
    badgeType="info"
  />
  <Card
    title="12. Servidor MCP Nativo para IA"
    description="Conecte Cursor, Claude Desktop e Windsurf ao repositório de conhecimento da sua documentação."
    href="#/guides/mcp-server"
    icon="🤖"
    badge="Pronto para IA"
    badgeType="success"
  />
  <Card
    title="13. Referência de Configuração"
    description="Guia prático e referência de esquema para docs.json, famílias de tema e identidade visual."
    href="#/configuration"
    icon="⚙️"
    badge="Referência"
    badgeType="info"
  />
  <Card
    title="14. Matriz de Comandos da CLI"
    description="Guia abrangente de flags para init, serve, build, validate, doctor e mcp."
    href="#/guides/cli-reference"
    icon="💻"
    badge="CLI"
    badgeType="info"
  />
  <Card
    title="15. Guias de Migração"
    description="Passo a passo prático para migrar a partir de Docusaurus, VitePress, Docsify ou MkDocs."
    href="#/guides/migrations"
    icon="🔄"
    badge="Migração"
    badgeType="info"
  />
</CardGrid>

---

## 🗺️ Comece a Jornada

Pronto para começar? Vá direto para o tutorial passo a passo:

<CardGrid cols={1}>
  <Card
    title="Passo 1: Tutorial de Início Rápido"
    description="Do zero à documentação de nível de produção em segundos. Passo a passo prático para projetos locais, componentes e builds."
    href="#/getting-started"
    icon="🚀"
    badge="Comece Aqui"
    badgeType="success"
  />
</CardGrid>
