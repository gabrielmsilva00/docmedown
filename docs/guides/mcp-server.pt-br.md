---
title: Servidor Model Context Protocol (MCP)
description: Conecte sua documentação diretamente a assistentes de codificação com IA (Claude Desktop, Cursor, Windsurf, Copilot) com o servidor MCP nativo do DocMeDown.
order: 4
tags: [ai, mcp, model-context-protocol, claude, cursor, windsurf, llm, agents]
---

# Servidor Model Context Protocol (MCP) 🤖

O DocMeDown inclui um servidor nativo **Model Context Protocol (MCP)** pronto para produção.

Em vez de forçar assistentes de IA a raspar HTML renderizado ou ler trechos truncados, o DocMeDown transforma o acervo da sua documentação em um grafo de conhecimento interativo e de alta fidelidade, consultável diretamente pelo **Claude Desktop**, **Cursor**, **Windsurf** e qualquer assistente compatível com MCP.

---

## ⚡ 1. Início Rápido com Zero Instalação

O servidor MCP do DocMeDown pode ser executado instantaneamente via `npx` sem qualquer necessidade de instalação prévia:

```bash
# Transporte stdio (padrão, utilizado por Cursor, Claude Desktop e Windsurf):
npx -y docmedown mcp ./docs

# Transporte HTTP Server-Sent Events (SSE) (para agentes remotos ou em rede):
npx -y docmedown mcp ./docs --transport sse --port 3001 --host 0.0.0.0
```

> [!TIP]
> **Inicialização Sub-Milissegundo**: Executar `npx docmedown build ./docs` antes de iniciar o servidor MCP gera os arquivos `_manifest.json` e `_docs.js`. O servidor MCP passa a operar com zero sobrecarga de varredura no sistema de arquivos, inicializando em menos de 20ms!

---

## 🛠️ 2. Especificação das Ferramentas MCP

O DocMeDown disponibiliza quatro ferramentas especializadas em total conformidade com a especificação padrão JSON Schema:

| Ferramenta | Parâmetros | Descrição |
| :--- | :--- | :--- |
| **`list_docs`** | *(nenhum)* | Retorna o inventário de todas as páginas com `slug`, `title`, `path`, `category`, `readingTimeMinutes` e `lastModified`. |
| **`read_doc`** | `slug` *(string)* | Retorna o conteúdo Markdown bruto completo de uma página, árvore estruturada de cabeçalhos (`level`, `text`, `id`) e registro de data e hora. |
| **`search_docs`** | `query` *(string)*, `limit?` *(number)* | Busca ranqueada por palavras-chave em títulos, cabeçalhos e corpos de documentos com trechos de pré-visualização. |
| **`resolve_url`** | `slug` *(string)* | Calcula a URL pública canônica para qualquer documento no site publicado com base no campo `url` de `docs.json`. |

---

## 🔌 3. Receitas de Configuração para Clientes

<Tabs type="pills">
  <Tab label="Cursor (.cursor/mcp.json)" icon="🖱️">
Crie ou edite o arquivo `.cursor/mcp.json` na raiz do seu projeto:

```json title=".cursor/mcp.json"
{
  "mcpServers": {
    "project-docs": {
      "command": "npx",
      "args": ["-y", "docmedown", "mcp", "./docs"]
    }
  }
}
```
  </Tab>

  <Tab label="Claude Desktop" icon="🟣">
Adicione ao seu `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json title="claude_desktop_config.json"
{
  "mcpServers": {
    "docmedown": {
      "command": "npx",
      "args": ["-y", "docmedown", "mcp", "C:\\dev\\meu-projeto\\docs"]
    }
  }
}
```
  </Tab>

  <Tab label="Windsurf (Cascade)" icon="🏄">
No Windsurf, abra `~/.codeium/windsurf/mcp_config.json`:

```json title="mcp_config.json"
{
  "mcpServers": {
    "docs": {
      "command": "npx",
      "args": ["-y", "docmedown", "mcp", "./docs"]
    }
  }
}
```
  </Tab>

  <Tab label="HTTP SSE (Em Rede / Docker)" icon="🌐">
Para contêineres remotos, microsserviços ou ambientes de equipe compartilhados:

```bash
npx -y docmedown mcp ./docs --transport sse --port 3001 --host 0.0.0.0 --allow-origins "*"
```

Conecte os clientes via `http://localhost:3001/sse`.
  </Tab>
</Tabs>

---

## 🧪 4. Desenvolvimento Local e Testes

Ao desenvolver o DocMeDown ou integrá-lo à sua cadeia de ferramentas, você pode executar, inspecionar e testar o servidor MCP localmente com scripts dedicados:

### Servidor de Desenvolvimento Local (`dev:mcp`)
```bash
# Execução via stdio (padrão, para Cursor, Claude Desktop e Windsurf):
npm run dev:mcp

# Execução via SSE para navegadores e clientes HTTP:
npm run dev:mcp -- --transport sse --port 3001
```

### Conjunto Dedicado de Testes do MCP (`test:mcp`)
Execute a suíte automatizada de testes que valida esquemas de ferramentas, ordenação de buscas, filtragem por frontmatter YAML, pipes de subprocesso stdio e tratamento de CORS em SSE:
```bash
npm run test:mcp
```

### Cliente Interativo de Teste (`test:mcp:client`)
Teste as ferramentas de forma interativa direto no terminal sem precisar de um cliente de IA externo:
```bash
# Executa teste de fumaça automatizado validando as 4 ferramentas MCP:
npm run test:mcp:client

# Lista todas as páginas indexadas:
node ./scripts/test-mcp-client.mjs list

# Pesquisa na documentação com pontuação de relevância e trechos:
node ./scripts/test-mcp-client.mjs search "deploy"

# Lê o conteúdo Markdown e cabeçalhos de um slug específico:
node ./scripts/test-mcp-client.mjs read "guides/mcp-server"

# Resolve a URL pública canônica:
node ./scripts/test-mcp-client.mjs url "guides/mcp-server"
```

---

## 💬 5. Prompts e Fluxos Reais com IA

Uma vez conectado, o assistente de IA decide autonomamente quando consultar a documentação:

### Exemplo 1: Encontrando Guias e Detalhes de Implementação
> **Desenvolvedor:** *"Como configuro o DocMeDown para exibir documentação dinâmica de um repositório remoto do GitHub?"*
> 
> **Ação do Assistente de IA:**
> 1. Chama `search_docs(query: "remote github")` ➔ Encontra `guides/remote-github`.
> 2. Chama `read_doc(slug: "guides/remote-github")` ➔ Obtém o esquema exato de configuração.
> 3. Responde com o bloco exato de 12 linhas do `docs.json` e a URL de citação!

### Exemplo 2: Verificando Parâmetros de API
> **Desenvolvedor:** *"Quais são as opções suportadas pelo comando `build`?"*
> 
> **Ação do Assistente de IA:**
> 1. Chama `search_docs(query: "build options")` ➔ Encontra `guides/cli-reference`.
> 2. Retorna `--watch`, `--no-single-file`, `--no-static` e `--out-dir` diretamente da fonte primária da documentação.

---

## ⚖️ Por que o MCP Nativo Supera RAG Tradicional e Web Scraping

| Recurso | MCP do DocMeDown | Web Scraping / RAG com HTML |
| :--- | :---: | :---: |
| **Tempo de Inicialização** | **Instantâneo (< 20ms)** | Requer embeddings vetoriais |
| **Precisão do Conteúdo** | **100% Markdown Original** | Ruído e truncamento de HTML |
| **Navegação Estruturada** | **Árvore Hierárquica Completa** | Fragmentos planos de texto |
| **Suporte Offline** | **Processo 100% Local via Stdio** | Depende de APIs e modelos externos |
| **Custo** | **$0.00 (Zero Bancos Vetoriais)** | Custos contínuos de hospedagem vetorial |

---

## 🗺️ Próximos Passos

Continue a jornada linear da documentação:

<CardGrid cols={2}>
  <Card
    title="Referência de Configuração"
    description="Guia prático e referência de esquema para docs.json, famílias visuais e marca."
    href="#/configuration"
    badge="A Seguir"
    badgeType="info"
  />
  <Card
    title="Git Remoto Dinâmico"
    description="Transmita documentação em tempo real direto do GitHub ou GitLab sem etapas de build."
    href="#/guides/remote-github"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
