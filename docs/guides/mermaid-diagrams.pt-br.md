---
title: Diagramas Mermaid Interativos
description: Motor nativo de diagramação Mermaid com sincronização automática de tema, controle interativo de câmera com pan e zoom, visualização em tela cheia e ações de cópia.
order: 4
category: Autoria de Conteúdo
tags: [mermaid, diagramas, arquitetura, gráficos, sequência, fluxogramas, interativo]
---

# Diagramas Mermaid Interativos 📊

O DocMeDown inclui um motor de diagramação **Mermaid** profundamente integrado. Em vez de gerar imagens estáticas em PNG ou SVG que destoam do tema da sua documentação, o DocMeDown compila os diagramas Mermaid diretamente no navegador, estilizando-os dinamicamente conforme a família de tema e o modo de cor ativos.

---

## ⚡ 1. Controles Interativos ao Vivo

Todo diagrama Mermaid renderizado no DocMeDown traz controles interativos de câmera nativos:

- **Mover & Arrastar (Pan)**: Clique e arraste na área do diagrama para navegar por topologias complexas de arquitetura.
- **Rolar para Zoom**: Use a roda do mouse ou gesto de pinça no trackpad para aproximar ou afastar.
- **Ajustar à Visualização (Fit)**: Clique no botão **Ajustar** (<Kbd>⛶</Kbd>) para enquadrar o diagrama perfeitamente dentro da janela sem cortes.
- **Modal em Tela Cheia**: Clique no ícone de expandir para abrir um visualizador imersivo em alta resolução em tela cheia.
- **Copiar Código-Fonte do Diagrama**: Clique no botão de cópia para transferir o código Mermaid portátil diretamente para a área de transferência.

---

## 🎨 2. Sincronização Automática com o Tema

O DocMeDown recalcula e injeta variáveis CSS customizadas do Mermaid automaticamente sempre que o usuário alterna entre:
- **Modos Claro & Escuro**
- **Famílias de Tema** (`atlas`, `blueprint`, `terminal`, `editorial`, `botanical`, `studio`)

Por exemplo, no tema **`terminal`**, os diagramas são renderizados com bordas monospaçadas verdes e tons em fósforo; no **`blueprint`**, adotam grades em ciano arquitetônico e cantos retos; e no **`editorial`**, utilizam paletas clássicas e aquecidas em tons de tinta sobre papel.

---

## 📐 3. Tipos de Diagramas & Exemplos ao Vivo

### 3.1 Pipeline de Arquitetura (Fluxograma)

````markdown
```mermaid
graph TD
    subgraph Input ["1. Fontes da Documentação"]
        A[Arquivos Markdown / MDX]
        B[Configuração docs.json]
        C[Componentes Customizados .dmd]
    end

    subgraph Compiler ["2. Motor DocMeDown"]
        D[Scanner de Cabeçalhos & Conteúdo]
        E[Runtime Svelte 5 com Runes]
        F[Envelope DecompressionStream]
    end

    subgraph Distribution ["3. Formatos de Entrega"]
        G[HTML Estático + SEO]
        H[Arquivo Único Offline .dist]
        I[Grafo de Conhecimento MCP para IA]
    end

    A --> D
    B --> D
    C --> E
    D --> E
    E --> F
    F --> G
    F --> H
    D --> I
```
````

```mermaid
graph TD
    subgraph Input ["1. Fontes da Documentação"]
        A[Arquivos Markdown / MDX]
        B[Configuração docs.json]
        C[Componentes Customizados .dmd]
    end

    subgraph Compiler ["2. Motor DocMeDown"]
        D[Scanner de Cabeçalhos & Conteúdo]
        E[Runtime Svelte 5 com Runes]
        F[Envelope DecompressionStream]
    end

    subgraph Distribution ["3. Formatos de Entrega"]
        G[HTML Estático + SEO]
        H[Arquivo Único Offline .dist]
        I[Grafo de Conhecimento MCP para IA]
    end

    A --> D
    B --> D
    C --> E
    D --> E
    E --> F
    F --> G
    F --> H
    D --> I
```

---

### 3.2 Diagrama de Sequência (Hot Module Replacement)

````markdown
```mermaid
sequenceDiagram
    autonumber
    actor Dev as Autor da Documentação
    participant Watcher as Chokidar do Servidor Dev
    participant WS as Hub WebSocket
    participant Client as Runtime Svelte 5

    Dev->>Watcher: Edita e salva guide.md
    Watcher->>WS: Transmite payload hmr:update
    WS->>Client: Entrega AST do Markdown atualizada
    Client->>Client: Invalidação de cache em memória
    Client->>Client: Re-renderização in-place do MarkdownBody
    Note over Client: Preserva posição de rolagem e callouts abertos
```
````

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Autor da Documentação
    participant Watcher as Chokidar do Servidor Dev
    participant WS as Hub WebSocket
    participant Client as Runtime Svelte 5

    Dev->>Watcher: Edita e salva guide.md
    Watcher->>WS: Transmite payload hmr:update
    WS->>Client: Entrega AST do Markdown atualizada
    Client->>Client: Invalidação de cache em memória
    Client->>Client: Re-renderização in-place do MarkdownBody
    Note over Client: Preserva posição de rolagem e callouts abertos
```

---

### 3.3 Grafo Git (Branch de Recurso & Previews em Estágio)

````markdown
```mermaid
gitGraph
    commit id: "Lançamento v0.8.0"
    branch stage-preview
    checkout stage-preview
    commit id: "Rascunho: Editor no Navegador"
    commit id: "Rascunho: Modo .preview/ em Estágio"
    checkout main
    commit id: "Correção de Segurança 0.8.1"
    merge stage-preview id: "Publicar Preview na Main"
    commit id: "v0.9.0 GA"
```
````

```mermaid
gitGraph
    commit id: "Lançamento v0.8.0"
    branch stage-preview
    checkout stage-preview
    commit id: "Rascunho: Editor no Navegador"
    commit id: "Rascunho: Modo .preview/ em Estágio"
    checkout main
    commit id: "Correção de Segurança 0.8.1"
    merge stage-preview id: "Publicar Preview na Main"
    commit id: "v0.9.0 GA"
```

---

### 3.4 Diagrama de Estados (Ciclo de Vida de um Documento Offline)

````markdown
```mermaid
stateDiagram-v2
    [*] --> SourceCorpus: docmedown build
    SourceCorpus --> GzipCompression: Varredura & Indexação
    GzipCompression --> Base64Envelope: Gzip Nível 9
    Base64Envelope --> SingleFileHTML: Runtime Svelte 5 Injetado
    SingleFileHTML --> InBrowserDecompress: Duplo clique em file:///
    InBrowserDecompress --> ActiveDocumentation: DecompressionStream
    ActiveDocumentation --> [*]
```
````

```mermaid
stateDiagram-v2
    [*] --> SourceCorpus: docmedown build
    SourceCorpus --> GzipCompression: Varredura & Indexação
    GzipCompression --> Base64Envelope: Gzip Nível 9
    Base64Envelope --> SingleFileHTML: Runtime Svelte 5 Injetado
    SingleFileHTML --> InBrowserDecompress: Duplo clique em file:///
    InBrowserDecompress --> ActiveDocumentation: DecompressionStream
    ActiveDocumentation --> [*]
```

---

## 🛠️ Dicas para Escrever Ótimos Diagramas

> [!TIP]
> **Use Subgrafos para Agrupamento**: Agrupe componentes relacionados usando `subgraph Nome ["Rótulo"]` para criar hierarquia visual e evitar fiações emaranhadas.

> [!NOTE]
> **Suporte Completo a Unicode & Emojis**: O DocMeDown suporta integralmente caracteres Unicode e emojis dentro dos rótulos de nós (ex.: `A["🚀 Nós de Borda Ultrarrápidos"]`).

---

## 🗺️ Próximos Passos

Continue a jornada linear de documentação:

<CardGrid cols={2}>
  <Card
    title="Primitivas de UI Nativas"
    description="Explore os 20 elementos nativos: CardGrid, Tabs, Badges, Callouts, Media e muito mais."
    href="#/guides/built-in-components"
    badge="A Seguir"
    badgeType="info"
  />
  <Card
    title="Markdown, Sintaxe & Matemática"
    description="Revise callouts do GitHub, realce de código e fórmulas KaTeX."
    href="#/guides/markdown-features"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
