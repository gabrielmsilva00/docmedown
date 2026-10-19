---
title: Referência de Comandos da CLI
description: Referência completa e prática para todos os comandos, opções, flags e receitas de automação em CI/CD da CLI do DocMeDown.
order: 1
tags: [cli, comandos, terminal, tui, ci-cd, automação]
---

# Referência de Comandos da CLI 🛠️

A interface de linha de comando do DocMeDown fornece tudo o que você precisa para estruturar, desenvolver, validar, empacotar e distribuir documentação.

Você pode executar qualquer comando diretamente com `npx -y docmedown <comando>` ou instalá-lo globalmente:

```bash
npm install -g docmedown
```

---

## ⚡ Visão Geral da Matriz de Comandos

| Comando | Atalho | Propósito | Principais Flags |
| :--- | :--- | :--- | :--- |
| **[`docmedown`](#0-docmedown-inicio-rapido-servidor-dev)** | `dmd` | Configuração rápida se vazio, ou inicia servidor de preview local | `-p, --port`, `-y, --yes`, `--no-open` |
| **[`init`](#1-init-assistente-interativo-de-configuracao)** | — | Assistente interativo para configurar e estruturar a documentação | `-y, --yes`, `-n, --name`, `-t, --theme`, `--no-start` |
| **[`serve`](#2-serve-alias-dev-hot-live-reload)** | `dev` | Servidor dev ultrarrápido com hot reload via WebSocket | `-p, --port`, `-H, --host`, `--no-open`, `--no-qr` |
| **[`build`](#3-build-compilador-estatico-e-bundler)** | — | Pré-renderiza HTML estático, SEO, contexto para IA e pacote offline | `-w, --watch`, `--no-single-file`, `-o, --out-dir` |
| **[`validate`](#4-validate-linter-de-links-e-frontmatter)** | — | Linter profundo para links quebrados, âncoras ausentes e erros de YAML | `--json` |
| **[`doctor`](#5-doctor-diagnosticos-de-sistema-e-componentes)** | — | Diagnóstico de ambiente, integridade de arquivos e componentes .dmd | `--json` |
| **[`mcp`](#6-mcp-servidor-model-context-protocol)** | — | Expõe docs para assistentes de IA (Cursor, Claude Desktop, Windsurf) | `-t, --transport`, `-p, --port`, `--allow-origins` |
| **[`config`](#7-config-tui-interativa-no-terminal)** | — | Assistente visual de terminal para tema, marca e navegação | — |

---

<a id="0-docmedown-inicio-rapido-servidor-dev"></a>
## 0. `docmedown` — Início Rápido & Servidor Dev

Ao ser executado em um diretório que já contém documentação, `docmedown` inicia imediatamente o servidor de desenvolvimento local.

Ao ser executado em um diretório vazio ou sem documentação, `docmedown` atua como o **Início Rápido**:
1. Utiliza padrões de início rápido (detectando o nome do projeto a partir de `package.json`).
2. Renderiza uma árvore de pré-visualização dos diretórios e arquivos a serem criados.
3. **Solicita confirmação ANTES de criar qualquer arquivo** (a menos que `-y, --yes` seja fornecido).

```bash
# Início rápido em ./docs (solicita confirmação antes de criar arquivos):
npx docmedown

# Início rápido sem confirmação:
npx docmedown -y
```

---

<a id="1-init-assistente-interativo-de-configuracao"></a>
## 1. `init` — Assistente Interativo de Configuração

O comando `init` inicia o assistente interativo, orientando você na personalização do seu site antes de gerar qualquer arquivo:

1. **Questionário Interativo**: Escolha o diretório da documentação, nome do projeto, slogan, família de tema, modo de cor padrão e se deseja incluir componentes customizados de exemplo.
2. **Visualização da Árvore de Diretórios**: Renderiza uma árvore completa mostrando cada arquivo que será criado ou vinculado a partir da raiz.
3. **Confirmação Prévia**: Solicita confirmação **antes** de gravar qualquer arquivo no disco.

```bash
# Inicia o assistente interativo de configuração:
npx docmedown init

# Inicia configuração interativa para um diretório específico:
npx docmedown init ./docs

# Modo não-interativo / CI com padrões:
npx docmedown init ./docs -y --no-start
```

### O que é criado:
```
docs/                        # Raiz da documentação: APENAS fontes + symlink index.html
├── index.html               # Symlink → .dmd/index.html (site SEO gerado via build)
├── README.md                # Página inicial principal da documentação (ou linkada da raiz)
├── getting-started.md       # Guia inicial (#/getting-started)
├── CHANGELOG.md             # Vinculado da raiz (se presente)
├── guides/
│   └── custom-components.md # Referência de componentes customizados
└── .dmd/
    ├── .config/docs.json         # Configuração central (tema, navegação, marca)
    └── .components/
        └── CounterWidget.svelte  # Componente inicial Svelte 5 com runes
```

---

## 2. `serve` (alias: `dev`) — Hot Live Reload

Inicie um servidor de desenvolvimento local ultrarrápido com recarregamento ao vivo instantâneo via WebSocket.

```bash
# Serve a pasta padrão ./docs em http://localhost:3000:
npx docmedown serve ./docs

# Use o atalho curto:
npx docmedown dev

# Porta e host customizados:
npx docmedown serve ./docs --port 8080 --host 0.0.0.0 --no-open
```

### Opções:
- `-p, --port <number>`: Porta na qual escutar (padrão: `3000`; incrementa automaticamente se em uso).
- `-H, --host <string>`: Host ao qual vincular o servidor (padrão: `0.0.0.0` para acesso na rede local).
- `--no-open`: Impede a abertura automática do navegador padrão ao iniciar.
- `--no-qr`: Oculta o QR code do terminal para a URL de rede.

Ao iniciar, o servidor exibe um banner compacto (`✔ Artifacts ready (N pages)`) em vez do checklist completo, além de URLs `Local:` e `Network:` com um QR escaneável para o endereço de rede.

> [!TIP]
> **Preservação de Posição de Leitura**: Ao editar qualquer arquivo Markdown ou componente `.dmd/`, o DocMeDown envia atualizações via WebSocket e renderiza novamente o documento **sem perder sua posição de rolagem**.

---

<a id="3-build-compilador-estatico-e-bundler"></a>
## 3. `build` — Compilador Estático e Bundler

Varre recursivamente todos os documentos Markdown, extrai cabeçalhos, gera árvores de navegação, pré-renderiza páginas estáticas com metadados de SEO, emite arquivos de contexto para IA e produz um pacote offline para ambientes isolados.

```bash
# Compila ativos de produção e pacote offline em ./docs/.dmd/.singlefile:
npx docmedown build ./docs

# Modo watch (recompila automaticamente a cada alteração):
npx docmedown build ./docs --watch

# Grava pacote offline em arquivo único em diretório customizado:
npx docmedown build ./docs --out-dir ./dist
```

### Artefatos Gerados:
1. **Páginas Estáticas Pré-renderizadas**: Compila cada arquivo Markdown para `<slug>/index.html` com HTML semântico completo, realce de sintaxe Prism embutido e esquema JSON-LD.
2. **Ativos de SEO**: Gera `sitemap.xml` e `robots.txt` quando `url` está configurada no `docs.json`.
3. **Arquivos de Contexto para IA**: Emite `llms.txt`, `llms-full.txt`, `SKILL.md` e `okf.json` em `.dmd/` para assistentes e agentes de codificação.
4. **Distribuível Offline Autônomo**: Comprime todos os documentos, componentes customizados e runtime em um único arquivo `.dmd/.singlefile/index.html` que funciona diretamente via URLs `file:///`. O link simbólico `docs/index.html` aponta para o site de SEO pronto para servidor (`.dmd/index.html`).

### Opções:
- `-w, --watch`: Monitora arquivos fonte e recompila ao detectar mudanças.
- `--no-single-file`: Compila apenas arquivos para servidor; ignora o pacote offline em arquivo único.
- `--no-static`: Pula a geração de páginas estáticas pré-renderizadas e arquivos de SEO/IA.
- `-o, --out-dir <path>`: Diretório de saída para o pacote offline (padrão: `<dir>/.dmd/.singlefile`).

---

## 4. `validate` — Linter de Links e Frontmatter

Executa verificação estrutural profunda em todo o site de documentação. Identifica links locais quebrados, âncoras ausentes, frontmatter YAML malformado e configurações inválidas do `docs.json` antes da publicação.

```bash
# Valida links e esquemas de documentação:
npx docmedown validate ./docs

# Emite JSON legível por máquina para pipelines de CI/CD:
npx docmedown validate ./docs --json
```

### Exemplo de Saída:
```text
🔍 Validating documentation in ./docs...
  📄 Documents scanned: 12
  🔗 Links verified:    21
  📑 Headings indexed:  148

✔ Validation passed! All documents, links, and schemas are valid.
```

Se um autor escrever um link quebrado ou referenciar uma âncora de título inexistente, o `validate` indica o arquivo e número de linha exatos:
```text
✖ Broken link in "guides/custom-components.md":
  Anchor "#missing-prop" not found in "guides/cli-reference.md"
```

---

<a id="5-doctor-diagnosticos-de-sistema-e-componentes"></a>
## 5. `doctor` — Diagnósticos de Sistema e Componentes

Executa diagnósticos abrangentes no seu ambiente de desenvolvimento, estrutura do projeto, referências a ativos e componentes customizados `.dmd`.

```bash
# Diagnostica o projeto local de documentação:
npx docmedown doctor ./docs

# Emite relatório em formato JSON:
npx docmedown doctor ./docs --json
```

### Relatório de Diagnóstico de Exemplo:
```text
🩺 DocMeDown Doctor — System & Documentation Diagnostics (./docs)
──────────────────────────────────────────────────────────────────────
✔ [PASS] Node.js Environment: v26.3.0 (satisfies requirement >=20.19.0)
✔ [PASS] Configuration File: Found valid configuration file: docs.json
✔ [PASS] Documentation Documents: Found 12 markdown document(s) with valid home page
✔ [PASS] Asset References: All local asset references verified
✔ [PASS] Custom Components (.dmd): All 4 custom component(s) compiled cleanly
──────────────────────────────────────────────────────────────────────
✨ Doctor found 0 critical issues (5 passed, 0 warning(s)). Ready to build/serve!
```

---

## 6. `mcp` — Servidor Model Context Protocol

Transforma sua documentação em uma base de conhecimento interativa consultável por assistentes de IA (Claude Desktop, Cursor, Windsurf, Copilot).

```bash
# Transporte Stdio (padrão, ideal para Cursor / Claude Desktop):
npx -y docmedown mcp ./docs

# Transporte HTTP Server-Sent Events (SSE) (para agentes remotos na rede):
npx -y docmedown mcp ./docs --transport sse --port 3001 --host 0.0.0.0
```

### Opções:
- `-t, --transport <type>`: Protocolo a utilizar: `stdio` (padrão) ou `sse`.
- `-p, --port <number>`: Número da porta para transporte SSE (padrão: `3001`).
- `-H, --host <string>`: Hostname/IP ao qual vincular (padrão: `localhost`).
- `--allow-origins <origins>`: Origens CORS permitidas para SSE (ex.: `*` ou `http://localhost:3000`).

---

## 7. `config` — TUI Interativa no Terminal

Inicie uma interface de usuário no próprio terminal para configurar temas, marca, densidade, links de navegação e repositórios Git remotos de forma visual.

```bash
npx docmedown config ./docs/docs.json
```

Salva diretamente no seu arquivo `docs.json` com validação de esquema completa.

---

## 🤖 Receita de Automação para CI/CD

Adicione este workflow do GitHub Actions em `.github/workflows/docs-check.yml` para validar links, checar integridade e compilar a documentação automaticamente a cada Pull Request:

```yaml title=".github/workflows/docs-check.yml"
name: Documentation Quality & Build
on: [push, pull_request]

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      with:
        node-version: 22

      - name: Validate Links & Frontmatter
        run: npx docmedown validate ./docs

      - name: Run Doctor Diagnostics
        run: npx docmedown doctor ./docs

      - name: Compile Production Site & Offline Bundle
        run: npx docmedown build ./docs
```

---

## 🗺️ Próximos Passos

Continue a jornada linear de documentação:

<CardGrid cols={2}>
  <Card
    title="Guias de Migração"
    description="Passo a passo prático para migrar a partir de Docusaurus, VitePress, Docsify e MkDocs."
    href="#/guides/migrations"
    badge="A Seguir"
    badgeType="info"
  />
  <Card
    title="Referência de Configuração"
    description="Revise o esquema do docs.json, famílias de tema, identidade visual e navegação."
    href="#/configuration"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
