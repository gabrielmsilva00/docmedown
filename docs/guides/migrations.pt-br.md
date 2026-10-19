---
title: Guias de Migração (Docusaurus, VitePress, Docsify)
description: Receitas passo a passo de migração do Docusaurus, VitePress, Docsify e MkDocs para o DocMeDown com mapeamento de configurações e conversão de componentes.
order: 13
category: Migration & Ecosystem
tags: [migration, docusaurus, vitepress, docsify, mkdocs, guides, comparison]
---

# Guias de Migração 🔄

Mudar para o DocMeDown simplifica drasticamente a sua pilha de documentação. Ao substituir empacotadores complexos e configurações pesadas de sites estáticos pelo motor zero-config do DocMeDown, você ganha:
- **Servidor Dev Instantâneo**: Inicialização em menos de 10ms sem pausas para empacotamento.
- **Pacotes Offline Isolados (Air-Gapped)**: Arquivo único `.dist/index.html` executável com duplo clique e sem erros de CORS.
- **Contexto Nativo para IA**: Servidor Model Context Protocol (MCP) nativo, `llms.txt` e `SKILL.md`.
- **Componentes Multi-Framework**: Utilize Svelte 5, React TSX ou Web Components sem precisar configurar Babel ou plugins MDX.

Escolha o seu framework de documentação atual abaixo:

---

## 🦖 Migrando do Docusaurus

O Docusaurus requer configurações de build com Node, `docusaurus.config.js`, arquivos de barras laterais e compilação React MDX.

### Passo 1: Copie seus arquivos Markdown
Copie sua pasta `docs/` para o seu novo projeto DocMeDown:

```bash
# Mantenha seus arquivos Markdown como estão:
cp -r meu-app-docusaurus/docs ./docs
```

O DocMeDown reconhece nativamente GitHub Flavored Markdown, títulos em blocos de código e Frontmatter YAML.

### Passo 2: Mapeie `docusaurus.config.js` para `docs.json`

| Propriedade no Docusaurus | Equivalente no DocMeDown (`docs.json`) |
| :--- | :--- |
| `title: "Meu Site"` | `"name": "Meu Site"` |
| `tagline: "A melhor documentação"` | `"tagline": "A melhor documentação"` |
| `url: "https://meusite.com"` | `"url": "https://meusite.com"` |
| `themeConfig.navbar.items` | `"nav": [...]` |
| `themeConfig.footer.copyright` | `"footer.copyright": "..."` |
| `themeConfig.colorMode.defaultMode` | `"theme.defaultMode": "auto"` |

### Passo 3: Migre as Barras Laterais
No Docusaurus, as barras laterais são definidas em `sidebars.js`. No DocMeDown:
- **Opção A (Zero-Config)**: Exclua o `sidebars.js`! O DocMeDown autoindexa a estrutura de pastas e a chave `order` do frontmatter.
- **Opção B (Explícita)**: Converta para a matriz `sidebar` no `docs.json`:

```json title="docs.json"
{
  "sidebar": [
    {
      "title": "Tutorial",
      "children": [
        { "title": "Intro", "path": "intro.md" },
        { "title": "Básico", "path": "basics.md" }
      ]
    }
  ]
}
```

### Passo 4: Migre Componentes React MDX
No Docusaurus, os componentes são importados no topo dos arquivos MDX:
```mdx
import MyWidget from '@site/src/components/MyWidget';

<MyWidget />
```

No DocMeDown:
1. Coloque `MyWidget.tsx` na pasta `docs/.dmd/`.
2. Remova a instrução `import` do seu Markdown!
3. Use `<MyWidget />` diretamente em qualquer lugar.

---

## ⚡ Migrando do VitePress

O VitePress utiliza Vue 3, Vite e `.vitepress/config.mts`.

### Passo 1: Mapeie `.vitepress/config.mts` para `docs.json`

```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Meus Docs",
  "theme": {
    "family": "atlas",
    "density": "comfortable"
  },
  "nav": [
    { "label": "Guia", "href": "#/guide/getting-started" },
    { "label": "Configuração", "href": "#/config" }
  ]
}
```

### Passo 2: Migre Componentes Vue para Svelte 5 ou React TSX
Em vez de componentes Vue em `.vitepress/theme/`, crie arquivos leves em **Svelte 5** (`.svelte`) ou **React TSX** (`.tsx`) em `.dmd/`. Eles são compilados automaticamente como Web Components padrão.

---

## 📄 Migrando do Docsify

O Docsify é um leitor de Markdown executado no cliente, mas carece de pré-renderização estática (SEO), pacotes offline de arquivo único e suporte a componentes modernos.

### Passo 1: Substitua o runtime `index.html`
No Docsify, você mantém um `index.html` customizado com configurações globais no window e scripts CDN.

Com o DocMeDown, substitua isso por um `docs.json` limpo:
```bash
npx docmedown init ./docs
```

### Por que o DocMeDown é um grande salto em relação ao Docsify:
1. **Search Engine Optimization (SEO)**: O Docsify é invisível para muitos rastreadores web por renderizar apenas no cliente. O DocMeDown pré-renderiza HTML semântico completo com Open Graph e JSON-LD.
2. **100% Offline com Duplo Clique**: O Docsify falha ao abrir via `file:///` porque os navegadores bloqueiam requisições `fetch()`. O DocMeDown empacota tudo em um envelope autoextraível em arquivo único.
3. **Reatividade com Svelte 5**: Motor moderno baseado em runes em vez de manipulação legada do DOM.
4. **MCP Nativo para IA**: Integração imediata com Claude Desktop, Cursor e Windsurf.

---

## 🐍 Migrando do MkDocs (Material for MkDocs)

O MkDocs depende de Python, `pip` e `mkdocs.yml`.

### Mapeando `mkdocs.yml` para `docs.json`:

```yaml title="mkdocs.yml"
site_name: Manual do Projeto
theme:
  name: material
  palette:
    scheme: default
nav:
  - Início: index.md
  - Guia: guides/start.md
```

Traduz-se diretamente para:

```json title="docs.json"
{
  "name": "Manual do Projeto",
  "theme": {
    "family": "blueprint",
    "defaultMode": "auto"
  },
  "sidebar": [
    { "title": "Início", "path": "index.md" },
    { "title": "Guia", "path": "guides/start.md" }
  ]
}
```

Agora você pode eliminar as dependências de compilação Python do seu pipeline de CI/CD!

---

## 🗺️ Próximos Passos

Continue a jornada linear da documentação:

<CardGrid cols={2}>
  <Card
    title="Vitrine de Componentes"
    description="Explore pré-visualizações interativas ao vivo e trechos de código para todos os elementos nativos."
    href="#/showcase"
    badge="A Seguir"
    badgeType="info"
  />
  <Card
    title="Referência da CLI"
    description="Revise parâmetros e comandos para init, serve, build, validate e doctor."
    href="#/guides/cli-reference"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
