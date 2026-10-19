---
title: Referência de Configuração (docs.json)
description: Guia prático e referência completa do esquema para docs.json, famílias de tema, navegação, identidade visual, sidebars customizadas e opções de runtime.
order: 13
category: Referência e Ferramentas
tags: [config, referência, temas, json, customização, identidade-visual, sidebar]
---

# Guia Prático e Referência de Configuração (`docs.json`) ⚙️

Embora o DocMeDown funcione **sem nenhuma configuração necessária por padrão**, um arquivo `docs.json` no seu diretório de documentação desbloqueia controle total sobre temas, identidade visual, navegação, busca, barras laterais customizadas e fontes Git dinâmicas.

Adicione a definição do esquema no topo do seu `docs.json` para obter autocompletar instantâneo e validação no VS Code, Cursor e IDEs JetBrains:

```json
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Meu Projeto"
}
```

---

## 🍳 Arquétipos de Configuração (Copiar & Colar)

Escolha o arquétipo predefinido mais próximo do seu projeto:

<Tabs type="pills">
  <Tab label="1. Biblioteca Open-Source (Atlas)" icon="📦">
```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "SuperLib",
  "tagline": "Gerenciamento de estado de última geração para aplicações web modernas",
  "version": "1.0.0",
  "url": "https://superlib.dev",
  "theme": {
    "family": "atlas",
    "density": "comfortable",
    "defaultMode": "auto",
    "favicon": "default"
  },
  "nav": [
    { "label": "Visão Geral", "href": "#/README" },
    { "label": "Início Rápido", "href": "#/getting-started" },
    { "label": "API", "href": "#/api" },
    { "label": "GitHub", "href": "https://github.com/my-org/superlib", "external": true }
  ],
  "socials": [
    { "type": "github", "url": "https://github.com/my-org/superlib" },
    { "type": "discord", "url": "https://discord.gg/superlib" }
  ]
}
```
  </Tab>

  <Tab label="2. CLI / Runbook de DevOps (Terminal)" icon="💻">
```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "KubeOps CLI",
  "tagline": "Manual de orquestração de clusters e resposta a incidentes",
  "theme": {
    "family": "terminal",
    "density": "compact",
    "defaultMode": "dark",
    "codeTheme": "one-dark",
    "favicon": "terminal"
  },
  "nav": [
    { "label": "Runbooks", "href": "#/README" },
    { "label": "Incidentes", "href": "#/incidents" },
    { "label": "Arquitetura", "href": "#/architecture" }
  ],
  "search": {
    "placeholder": "Buscar runbooks e comandos do cluster..."
  }
}
```
  </Tab>

  <Tab label="3. Especificação de Arquitetura Técnica (Blueprint)" icon="📐">
```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "DataMesh Engine",
  "tagline": "Especificação do protocolo de telemetria distribuída",
  "theme": {
    "family": "blueprint",
    "density": "comfortable",
    "defaultMode": "auto",
    "favicon": "minimal"
  },
  "nav": [
    { "label": "Especificação", "href": "#/README" },
    { "label": "Esquemas", "href": "#/schemas" },
    { "label": "RFCs", "href": "#/rfcs" }
  ]
}
```
  </Tab>

  <Tab label="4. Manual do Produto & Guia da Equipe (Editorial)" icon="📖">
```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Manual de Engenharia",
  "tagline": "Princípios, boas práticas e currículo de integração",
  "theme": {
    "family": "editorial",
    "density": "comfortable",
    "defaultMode": "light",
    "favicon": "book"
  },
  "nav": [
    { "label": "Boas-vindas", "href": "#/README" },
    { "label": "Valores", "href": "#/values" },
    { "label": "Engenharia", "href": "#/engineering" }
  ]
}
```
  </Tab>

  <Tab label="5. Fonte Git Remota ao Vivo (GitHub)" icon="🌐">
```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Docs Remotos",
  "source": {
    "type": "github",
    "repo": "owner/repository",
    "branch": "main",
    "docsDir": "docs"
  },
  "theme": {
    "family": "blueprint",
    "density": "comfortable"
  }
}
```
  </Tab>
</Tabs>

---

## 🎨 Famílias de Tema & Estética

O DocMeDown inclui **seis sistemas visuais completos**. Uma família de temas não é uma simples troca de cores: ela redefine textura de fundo, bordas, geometria, hierarquia tipográfica e paletas para diagramas:

| Família | Estilo & Sensação Visual | Geometria | Tipografia | Ideal Para |
| :--- | :--- | :--- | :--- | :--- |
| **`atlas`** *(padrão)* | Textura mineral, guias laterais em cobalto, hierarquia precisa | Cantos medidos de 6–16px | Sans-serif do sistema local | Bibliotecas de código, produtos SaaS, APIs |
| **`blueprint`** | Papel quadriculado de engenharia, linhas de grade, destaques em coral | Cantos retos e angulares | Sans-serif técnica do sistema | Especificações de arquitetura, RFCs, frameworks |
| **`terminal`** | Console de alto contraste, prompts em fósforo verde, moldura compacta | Cantos vivos de 0–2px | Monospaçada local em títulos e utilitários | Ferramentas de CLI, runbooks de DevOps, manuais de sistemas |
| **`editorial`** | Papel aquecido, detalhes em tijolo, linhas em tinta, ritmo de leitura generoso | Cantos contidos de 2–4px | Serifada local Palatino / Georgia | Manuais de equipe, ensaios, guias extensos, livros |
| **`botanical`** | Tecido de encadernação em sálvia, detalhes em samambaia, estilo herbário | Notas em formato de folha | Títulos em Palatino, corpo em sans-serif | Notas de pesquisa, recursos de aprendizado, guias de campo |
| **`studio`** | Papel lilás, tinta violeta, quadros estilo impressão offset | Painéis emoldurados, sombras duras | Arial Black local / display, corpo em sans-serif | Sistemas de design, documentação de produtos criativos |

Todas as seis famílias suportam modos claro, escuro e automático, além de densidade confortável e compacta. As fontes utilizam pilhas do sistema local: nenhuma requisição de rede para fontes externas é necessária, inclusive nas exportações offline. Use o menu de **Aparência** para visualizar e selecionar uma família; sua preferência fica gravada na origem do navegador atual.

### Cores de Marca Customizadas
Embora cada família defina cores harmoniosas automaticamente, você pode sobrescrever a cor de destaque principal de ação:

```json title="docs.json"
{
  "theme": {
    "family": "atlas",
    "accentColor": "#6366f1",
    "accentColorDark": "#818cf8"
  }
}
```

### Predefinições de Favicon Nativas
Escolha entre cinco favicons SVG nítidos e autocontidos que se adaptam a temas claros e escuros de navegadores e se incorporam automaticamente em pacotes offline:

| Favicon | Descrição | Estética |
| :--- | :--- | :--- |
| `"default"` | Documento moderno dobrado com a seta para baixo característica (`↓`) em gradiente índigo/violeta | Marca oficial do DocMeDown |
| `"markdown"` | Emblema arredondado escuro com o `M` branco e seta azul para baixo | Documentação centrada em Markdown |
| `"terminal"` | Console obsidiana com controles de janela e prompt esmeralda (`>_`) | CLIs para desenvolvedores e ferramentas técnicas |
| `"book"` | Livro aberto em azul royal vibrante | Guias, manuais e bibliotecas de referência |
| `"minimal"` | Hexágono geométrico e centelha em obsidiana e ciano | Conjuntos de ferramentas minimalistas ou corporativos |

---

## 📖 Referência Abrangente de Parâmetros

### Propriedades da Raiz

| Campo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `name` | `string` | `"DocMeDown"` | Nome do projeto exibido na barra superior e título das páginas. |
| `tagline` | `string` | `""` | Subtítulo exibido em modais de busca e metatags. |
| `description` | `string` | `""` | Descrição global de fallback usada para SEO e cards de compartilhamento social. |
| `version` | `string` | `""` | Versão de lançamento exibida como badge ao lado do logotipo. |
| `home` | `string` | `"README.md"` | Documento inicial aberto quando os usuários clicam no nome da marca ou no ícone de início. |
| `url` | `string` | `""` | URL canônica de produção (ativa geração de `sitemap.xml` e `robots.txt`). |

#### Página Inicial da Documentação (`"home"`)
Fixe o documento inicial do site explicitamente com `"home"`:

```json title="docs.json"
{
  "home": "PROJECT.md"
}
```

Quando `"home"` não é configurado explicitamente, o DocMeDown o resolve automaticamente a partir de arquivos na raiz da documentação nesta ordem:
1. `README.md`, `PROJECT.md`, `ABOUT.md` ou `INDEX.md` (respeitando maiúsculas/minúsculas).
2. Os mesmos nomes sem distinção de maiúsculas (`readme.md`, `index.md`).
3. Caso contrário, o primeiro documento Markdown em ordem alfabética no corpus.

---

### Objeto `theme`

| Campo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `family` | `"atlas" \| "blueprint" \| "terminal" \| "editorial" \| "botanical" \| "studio"` | `"atlas"` | Sistema de design visual. |
| `density` | `"comfortable" \| "compact"` | `"comfortable"` | Controla altura da barra de navegação, preenchimento da sidebar e espaçamento de conteúdo. |
| `defaultMode` | `"auto" \| "light" \| "dark"` | `"auto"` | Modo de cor inicial para novos visitantes. |
| `codeTheme` | `"github" \| "one-dark" \| "dracula" \| "synthwave"` | `"github"` | Tema de realce de sintaxe de código. |
| `favicon` | `string` | `"default"` | Nome do preset nativo ou caminho relativo para um arquivo SVG/PNG local. |
| `accentColor` | `string (CSS Hex)` | Padrão da família | Cor de destaque no modo claro. |
| `accentColorDark` | `string (CSS Hex)` | `accentColor` | Cor de destaque no modo escuro. |
| `logo.light` | `string` | `""` | Caminho para a imagem do logotipo no modo claro. |
| `logo.dark` | `string` | `""` | Caminho para a imagem do logotipo no modo escuro. |

---

### Array `nav`

Define os links exibidos na barra de navegação superior:

```json title="docs.json"
"nav": [
  { "label": "Guias", "href": "#/guides/installation" },
  { "label": "API", "href": "#/api" },
  { "label": "GitHub", "href": "https://github.com/my-org/my-project", "external": true }
]
```

---

### Array `sidebar` (Hierarquia Customizada Explícita)

Define agrupamentos de categoria exatos, ícones e badges:

```json title="docs.json"
"sidebar": [
  {
    "title": "Primeiros Passos",
    "icon": "🚀",
    "children": [
      { "title": "Visão Geral", "path": "README.md", "icon": "⚡" },
      { "title": "Início Rápido", "path": "getting-started.md", "icon": "🚀", "badge": "Essencial", "badgeType": "success" }
    ]
  },
  {
    "title": "Avançado",
    "icon": "⚙️",
    "collapsed": true,
    "children": [
      { "title": "CLI", "path": "guides/cli-reference.md", "icon": "💻" }
    ]
  }
]
```

---

### Objeto `source` (Repositórios Git Remotos)

| Campo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `type` | `"github" \| "gitlab"` | `"github"` | Provedor de hospedagem Git. |
| `repo` | `string` | *(obrigatório)* | Repositório no formato `"proprietario/nome-repositorio"`. |
| `branch` | `string` | `"main"` | Branch alvo de onde puxar os documentos. |
| `docsDir` | `string` | `""` | Subdiretório contendo a documentação (ex.: `"docs"`). |
| `token` | `string` | `""` | Token de acesso opcional para repositórios privados. |

---

### Objeto `autoIndex`

| Campo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Descobre e indexa automaticamente todos os arquivos Markdown. |
| `sort` | `"natural" \| "alphabetical" \| "frontmatter"` | `"natural"` | Estratégia de ordenação para a barra lateral. |
| `defaultCollapsed`| `boolean` | `false` | Se categorias de pastas aninhadas iniciam recolhidas na sidebar. |
| `exclude` | `string[]` | `["node_modules", ".git", ".dmd"]` | Diretórios ignorados durante a varredura. |

---

### Objeto `search`

| Campo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Habilita a paleta de comandos de busca aproximada (<Kbd>⌘K</Kbd>). |
| `placeholder` | `string` | `"Buscar na documentação (⌘K)..."` | Texto de placeholder no campo de busca. |
| `maxResults` | `number` | `10` | Quantidade máxima de resultados exibidos na busca. |

---

### Objeto `offline`

| Campo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `embedNestedDocs` | `boolean` | `true` | Se deve incorporar sub-sites de documentação dentro do arquivo único offline. |

---

### Objeto `footer`

```json title="docs.json"
{
  "footer": {
    "copyright": "© 2026 Minha Equipe. Lançado sob a Licença MIT.",
    "showBuiltWith": true,
    "links": [
      { "label": "Política de Privacidade", "href": "https://example.com/privacy", "external": true },
      { "label": "Termos de Uso", "href": "https://example.com/terms", "external": true }
    ]
  }
}
```

---

## 🗺️ Próximos Passos

Continue a jornada linear de documentação:

<CardGrid cols={2}>
  <Card
    title="Matriz de Comandos da CLI"
    description="Conheça todas as opções e flags de comando para init, serve, build, validate e doctor."
    href="#/guides/cli-reference"
    badge="A Seguir"
    badgeType="info"
  />
  <Card
    title="Model Context Protocol (MCP)"
    description="Conecte Cursor, Claude Desktop e Windsurf ao repositório de conhecimento da documentação."
    href="#/guides/mcp-server"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
