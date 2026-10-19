---
title: Estrutura e Organização do Projeto
description: Anatomia completa de diretórios, esquema de frontmatter, regras de autoindexação, árvores manuais de sidebar e sites de documentação aninhados.
order: 1
category: Conceitos Centrais
tags: [estrutura-do-projeto, organização, frontmatter, sidebar, autoindex, navegação, diretório]
---

# Estrutura e Organização do Projeto 📁

O DocMeDown utiliza uma arquitetura baseada no sistema de arquivos projetada para ser previsível, transparente e simples de manter. Este guia explica como os documentos são organizados, como o frontmatter afeta a navegação, como funciona a autoindexação e como definir hierarquias manuais na barra lateral.

---

## 🗂️ Anatomia do Diretório do Workspace

Um workspace completo de documentação do DocMeDown normalmente se parece com isto:

```
meu-projeto/
├── docs/                               # Raiz da documentação: APENAS fontes + symlink index.html
│   ├── index.html                      # Symlink → .dmd/index.html (site SEO para servir)
│   ├── README.md                       # Documento inicial (serve em #/README ou /)
│   ├── getting-started.md              # Documento de primeiro nível (#/getting-started)
│   ├── configuration.md                # Documento de primeiro nível (#/configuration)
│   ├── guides/                         # Diretório aninhado de guias (cria categoria)
│   │   ├── project-structure.md        # Documento sob /guides/
│   │   ├── architecture.md             # Documento sob /guides/
│   │   ├── markdown-features.md        # Documento sob /guides/
│   │   └── cli-reference.md            # Documento sob /guides/
│   └── .dmd/                           # Workspace oculto de build (nunca linkado na navegação)
│       ├── index.html                  # Ponto de entrada do site servível
│       ├── _manifest.json              # Corpus indexado + cabeçalhos
│       ├── _docs.js                    # Dados de fallback para file:/// offline
│       ├── docmedown.web.js            # Runtime servível (+ docmedown-mermaid.js)
│       ├── .singlefile/index.html      # Pacote offline em arquivo único (distribuível explícito)
│       ├── .components/                # Componentes customizados (Svelte/TSX/Lit, autodescobertos)
│       │   ├── CounterWidget.svelte    # Componente Svelte 5 customizado (<CounterWidget />)
│       │   ├── MetricCard.tsx          # Componente React TSX (<MetricCard />)
│       │   └── ClusterBadge.ts         # Web Component Lit (<ClusterBadge />)
│       └── .config/docs.json           # Configuração do site, tema e identidade visual
├── package.json
└── tsconfig.json
```

### Explicação dos Arquivos e Diretórios Chave

| Caminho | Propósito | Comportamento |
| :--- | :--- | :--- |
| **`docs/index.html`** | Link Simbólico Distribuível | Aponta para `.dmd/index.html` (site SEO pronto para servidor); o ÚNICO distribuível na raiz de docs. |
| **`docs/README.md`** | Documento Inicial Padrão | Mapeado automaticamente para a rota raiz da documentação (`#/README` ou `/`). |
| **`docs/.dmd/`** | Workspace Oculto de Build | Site gerado, runtimes, páginas estáticas, arquivos de SEO/IA. Nunca exibido na navegação. |
| **`docs/.dmd/.singlefile/`** | Artefatos Offline | Pacote autocontido em arquivo único (`index.html`), executável por duplo clique via `file:///`; distribuível offline explícito. |
| **`docs/.dmd/.components/`** | Componentes Customizados | Arquivos colocados aqui (`.svelte`, `.tsx`, `.ts`) são pré-compilados e utilizáveis diretamente no Markdown sem imports. `.dmd/` direto ainda funciona como fallback de compatibilidade. |
| **`docs/.dmd/.config/`** | Configuração do Site | `docs.json` / `dmd.json` residem aqui por padrão; `docs/*.json` direto continua funcionando como fallback. |
| **`docs/.dmd/_manifest.json`** | Cache de Build e Índice | Emitido durante o `docmedown build`, contendo o corpus indexado da documentação e cabeçalhos. |
| **`docs/.dmd/_docs.js`** | Dados de Fallback Offline | Incorporado em builds estáticos locais para fallback quando visualizado via `file:///`. |

---

## 📑 Especificação do Frontmatter

Todo documento `.md` e `.mdx` suporta frontmatter YAML padrão entre delimitadores `---` no topo do arquivo:

```yaml
---
title: Arquitetura do Motor e Como Funciona
sidebar_label: Arquitetura
description: Imersão técnica detalhada no motor zero-config do DocMeDown.
order: 2
category: Conceitos Centrais
icon: 🏛️
badge: Imersão
badge_type: info
tags: [arquitetura, motor, svelte-5, runes]
hidden: false
noindex: false
---
```

### Campos Suportados no Frontmatter

| Propriedade | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| **`title`** | `string` | Derivado do nome do arquivo | O título principal do documento exibido no `<h1>` da página e na aba do navegador. |
| **`sidebar_label`** | `string` | `title` ou nome do arquivo | Rótulo alternativo mais curto para exibição na árvore de navegação lateral. |
| **`description`** | `string` | *(vazio)* | Metadescrição da página para SEO e indexação de contexto de IA (`llms.txt`). |
| **`order`** | `number` | `0` (`-999` para o README) | Posição explícita de ordenação na barra lateral quando em autoindexação. |
| **`category`** | `string` | Nome do diretório pai | Badge de categoria legível exibida no breadcrumbs da barra de navegação superior. |
| **`icon`** | `string` | *(nenhum)* | Emoji ou caractere de ícone exibido ao lado do link na sidebar (ex.: `⚡`, `🚀`). |
| **`badge`** | `string` | *(nenhum)* | Etiqueta curta exibida ao lado do título na sidebar (ex.: `Novo`, `v0.9.0`). |
| **`badge_type`** | `string` | `info` | Variante de cor da badge: `info`, `success`, `warning` ou `new`. |
| **`tags`** | `string[]` | `[]` | Array de palavras-chave. Ativa pílulas de tags clicáveis na barra superior e modal de filtragem. |
| **`hidden`** | `boolean` | `false` | Quando `true`, oculta o documento da navegação na barra lateral (permanece acessível via URL). |
| **`noindex`** | `boolean` | `false` | Quando `true`, adiciona `<meta name="robots" content="noindex">` ao HTML pré-renderizado. |

---

## 🧭 Navegação: Autoindexação vs Barra Lateral Manual

O DocMeDown oferece total flexibilidade na geração da navegação:

### Opção A: Indexação Automática (`autoIndex`)

Por padrão, o DocMeDown varre todos os arquivos Markdown e constrói a árvore da barra lateral automaticamente com base no sistema de arquivos:

```
docs/
├── README.md               -> Slug: README (Visão Geral)
├── getting-started.md      -> Slug: getting-started
└── guides/
    ├── installation.md     -> Categoria: Guides > Installation (Slug: guides/installation)
    └── advanced.md         -> Categoria: Guides > Advanced (Slug: guides/advanced)
```

No `docs.json`, você pode configurar como a autoindexação ordena os itens:

```json title="docs.json"
{
  "autoIndex": {
    "enabled": true,
    "sort": "natural",
    "defaultCollapsed": false,
    "exclude": ["drafts", "internal"]
  }
}
```

- **`sort: "natural"`**: Respeita primeiro o `order` do frontmatter e recorre à ordenação alfabética natural como desempate.
- **`sort: "frontmatter"`**: Ordena estritamente pela propriedade `order`.
- **`sort: "alphabetical"`**: Ordena estritamente em ordem alfabética pelo título do documento.

---

### Opção B: Barra Lateral Manual Explícita (`sidebar`)

Para controle absoluto sobre agrupamento, categorias, ordem customizada e badges, defina o array `sidebar` no `docs.json`:

```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Documentação do Meu Projeto",
  "sidebar": [
    {
      "title": "Primeiros Passos",
      "icon": "🚀",
      "children": [
        { "title": "Visão Geral", "path": "README.md", "icon": "⚡" },
        { "title": "Início Rápido", "path": "getting-started.md", "icon": "🚀", "badge": "Comece Aqui", "badgeType": "success" },
        { "title": "Estrutura do Projeto", "path": "guides/project-structure.md", "icon": "📁" }
      ]
    },
    {
      "title": "Conceitos Centrais",
      "icon": "🏛️",
      "children": [
        { "title": "Arquitetura", "path": "guides/architecture.md", "icon": "⚙️" },
        { "title": "Recursos de Markdown", "path": "guides/markdown-features.md", "icon": "📝" }
      ]
    },
    {
      "title": "Avançado",
      "icon": "⚡",
      "collapsed": true,
      "children": [
        { "title": "Referência de CLI", "path": "guides/cli-reference.md", "icon": "💻" },
        { "title": "Componentes Customizados", "path": "guides/custom-components.md", "icon": "🧩", "badge": "Novo", "badgeType": "new" }
      ]
    }
  ]
}
```

> [!TIP]
> **Grupos Recolhíveis**: Defina `"collapsed": true` em qualquer nó de categoria para que ele inicie recolhido por padrão. Os leitores podem clicar na seta para expandi-lo a qualquer momento.

---

## 🪆 Sites de Documentação Aninhados

O DocMeDown suporta **sites de documentação aninhados**. Se qualquer subdiretório dentro da sua pasta de documentação contiver seu próprio `docs.json`, o DocMeDown o reconhece como um projeto de documentação isolado e independente:

```
docs/
├── docs.json                 # Site de documentação principal (pai)
├── README.md
└── examples/
    ├── local-docs/
    │   ├── docs.json         # Sub-site 1 (possui tema e navegação independentes)
    │   └── README.md
    └── remote-github/
        ├── docs.json         # Sub-site 2 (possui tema e navegação independentes)
        └── index.html
```

### Por que isso é poderoso:
1. **Manifestos Isolados**: As buscas e barras laterais do site principal não se misturam com os documentos dos sub-sites.
2. **Temas Independentes**: Sites aninhados podem adotar famílias de temas distintas (ex.: o pai usa `atlas`, o sub-site usa `terminal`).
3. **Incorporação Offline**: Ao compilar pacotes em arquivo único offline, o site principal embute os sub-sites automaticamente no mesmo arquivo distribuível!

---

## 🗺️ Próximos Passos

Continue a jornada linear de documentação:

<CardGrid cols={2}>
  <Card
    title="Arquitetura do Motor"
    description="Entenda como operam o virtual loader, o runtime Svelte 5 e os envelopes offline."
    href="#/guides/architecture"
    badge="A Seguir"
    badgeType="info"
  />
  <Card
    title="Início Rápido & Configuração"
    description="Revise a configuração inicial, scripts de pacote e comandos da CLI."
    href="#/getting-started"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
