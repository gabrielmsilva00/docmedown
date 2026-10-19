---
title: Site Estático, SEO e Contexto para IA
description: Páginas estáticas pré-renderizadas, tags de cabeçalho SEO automatizadas, sitemap.xml, llms.txt, SKILL.md e distribuição de documentação nativa para IA.
order: 2
tags: [static, seo, sitemap, robots, llms, ai, mcp, agents, distribution]
---

# Site Estático, SEO e Contexto Nativo para IA 🌐🤖

O DocMeDown foi construído tanto para leitores humanos quanto para agentes de IA.

Cada comando `docmedown build` produz **duas saídas paralelas a partir de uma única fonte Markdown**:
1. O **runtime reativo em Svelte 5** para visitantes interativos na web (atualização a quente, busca aproximada, troca de temas).
2. Um **site estático totalmente pré-renderizado** com metatags de SEO, mapas do site e arquivos de contexto legíveis por máquina (`llms.txt`, `SKILL.md`).

---

## ⚡ Páginas HTML Estáticas Pré-renderizadas

Ao executar `npx docmedown build ./docs`, o DocMeDown pré-renderiza cada documento Markdown em um arquivo HTML correspondente:

```
docs/
├── index.html                   # Página inicial pré-renderizada (a partir de README.md)
├── getting-started/
│   └── index.html               # Pré-renderizado /getting-started/
├── guides/
│   ├── cli-reference/
│   │   └── index.html           # Pré-renderizado /guides/cli-reference/
│   └── custom-components/
│       └── index.html           # Pré-renderizado /guides/custom-components/
├── 404.html                     # Página de erro 404 personalizada
├── sitemap.xml                  # Mapa do site em XML automatizado
└── robots.txt                   # Diretrizes para indexadores de busca
```

### Principais Vantagens:
- **Instant First Contentful Paint (FCP)**: Visitantes visualizam o texto integral do artigo, caixas de aviso e blocos de código com destaque antes mesmo do carregamento do JavaScript.
- **Search Engine Optimization (SEO)**: Googlebot, Bing e indexadores da web realizam o rastreamento de HTML semântico completo sem depender de execução de JavaScript no cliente.
- **Hidratação via PushState**: Assim que o script do runtime é inicializado, ele hidrata automaticamente o DOM e processa transições subsequentes por meio da API de histórico do navegador (`pushState`), garantindo fluidez sem recarregamentos por hash.

---

## 🔍 Metadados de SEO Automatizados e Social Cards

O DocMeDown gera metadados `<head>` completos para cada página com base em seu frontmatter YAML e no `docs.json`:

```html
<!-- Gerado automaticamente em cada página pré-renderizada -->
<title>CLI Command Reference — DocMeDown</title>
<meta name="description" content="Complete guide to DocMeDown CLI commands..." />
<link rel="canonical" href="https://example.com/guides/cli-reference/" />

<!-- Open Graph / Facebook -->
<meta property="og:type" content="article" />
<meta property="og:title" content="CLI Command Reference — DocMeDown" />
<meta property="og:description" content="Complete guide to DocMeDown CLI commands..." />
<meta property="og:url" content="https://example.com/guides/cli-reference/" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="CLI Command Reference — DocMeDown" />

<!-- Dados Estruturados JSON-LD -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "CLI Command Reference",
  "description": "Complete guide to DocMeDown CLI commands..."
}
</script>
```

### Ativação de Geração de Sitemap e Robots:
Basta incluir o domínio canônico do seu site no `docs.json`:

```json title="docs.json"
{
  "name": "My Project Docs",
  "url": "https://my-docs-domain.com"
}
```

O DocMeDown gera automaticamente:
- `sitemap.xml` com prioridade e frequências de alteração para todos os documentos indexados.
- `robots.txt` apontando para o seu `sitemap.xml`.
- Exclui qualquer documento contendo `noindex: true` em seu frontmatter.

---

## 🤖 Distribuição de Contexto para IA (`llms.txt`, `SKILL.md`)

Desenvolvedores modernos consomem documentação com frequência crescente por meio de assistentes de codificação com IA (Cursor, Claude, Copilot, ChatGPT). O DocMeDown formata seus documentos automaticamente para ingestão por IA a cada build:

| Recurso de IA | Público-Alvo | Conteúdo e Finalidade |
| :--- | :--- | :--- |
| **`llms.txt`** | LLMs / Web Crawlers | Em conformidade com o padrão [llmstxt.org](https://llmstxt.org): índice conciso de todas as páginas com títulos, links e resumos. |
| **`llms-full.txt`** | Context Stuffing para IA | Todo o acervo documental compilado em um único arquivo Markdown limpo para colagem em conversas de chat. |
| **`SKILL.md`** | Assistentes Agênticos | Definição de skill Antigravity / Claude Agent permitindo que agentes de codificação descubram e utilizem a documentação nativamente. |
| **`okf.json`** | Indexação Automatizada | Pacote JSON no formato Open Knowledge Format contendo cabeçalhos estruturados, texto plano puro e metadados. |

---

## 🛠️ Opções de Personalização do Build

```bash
# Build de produção padrão (gera páginas estáticas, SEO, contexto para IA e pacote offline):
npx docmedown build ./docs

# Ignorar a pré-renderização de páginas estáticas (apenas ativos para servidor):
npx docmedown build ./docs --no-static

# Ignorar o pacote offline de arquivo único:
npx docmedown build ./docs --no-single-file
```

> [!NOTE]
> **Proteção do Shell Personalizado**: Se você mantém um shell `index.html` modificado com scripts customizados ou analytics, o DocMeDown identifica isso e **nunca sobrescreve seu shell customizado** durante as compilações.

---

## 🗺️ Próximos Passos

Continue a jornada linear da documentação:

<CardGrid cols={2}>
  <Card
    title="Pacotes de Arquivo Único 100% Offline"
    description="Pacotes HTML autocontidos e autoextraíveis para ambientes isolados sem erros de CORS."
    href="#/guides/offline-mode"
    badge="A Seguir"
    badgeType="info"
  />
  <Card
    title="DX e Editor de Última Geração"
    description="HMR in-place real, editor dividido no navegador (Ctrl+E) e pré-visualização de rascunhos."
    href="#/guides/developer-experience"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
