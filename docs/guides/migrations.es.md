---
title: Guías de Migración (Docusaurus, VitePress, Docsify)
description: Recetas paso a paso para migrar de Docusaurus, VitePress, Docsify y MkDocs a DocMeDown con mapeo de configuración y conversión de componentes.
order: 13
category: Migration & Ecosystem
tags: [migration, docusaurus, vitepress, docsify, mkdocs, guides, comparison]
---

# Guías de Migración 🔄

Migrar a DocMeDown simplifica drásticamente su infraestructura de documentación. Al reemplazar empaquetadores complejos y configuraciones pesadas de sitios estáticos por el motor sin configuración de DocMeDown, obtiene:
- **Servidor de Desarrollo Instantáneo**: Arranque en menos de 10ms sin esperas de empaquetado.
- **Paquetes Monofile para Entornos Aislados (Air-Gapped)**: Archivo único `.dist/index.html` ejecutable con doble clic y sin errores CORS.
- **Contexto Nativo para IA**: Servidor nativo Model Context Protocol (MCP), `llms.txt` y `SKILL.md`.
- **Componentes Multi-Framework**: Utilice Svelte 5, React TSX o Web Components sin configurar Babel ni complementos MDX.

Elija su framework de documentación actual a continuación:

---

## 🦖 Migración desde Docusaurus

Docusaurus requiere entornos de compilación basados en Node, `docusaurus.config.js`, archivos de barras laterales y procesamiento React MDX.

### Paso 1: Copie sus archivos Markdown
Copie su carpeta `docs/` en su nuevo proyecto DocMeDown:

```bash
# Conserve sus archivos Markdown tal cual:
cp -r mi-app-docusaurus/docs ./docs
```

DocMeDown interpreta de forma nativa GitHub Flavored Markdown, títulos en bloques de código y Frontmatter YAML.

### Paso 2: Mapee `docusaurus.config.js` a `docs.json`

| Propiedad en Docusaurus | Equivalente en DocMeDown (`docs.json`) |
| :--- | :--- |
| `title: "Mi Sitio"` | `"name": "Mi Sitio"` |
| `tagline: "La mejor documentación"` | `"tagline": "La mejor documentación"` |
| `url: "https://misitio.com"` | `"url": "https://misitio.com"` |
| `themeConfig.navbar.items` | `"nav": [...]` |
| `themeConfig.footer.copyright` | `"footer.copyright": "..."` |
| `themeConfig.colorMode.defaultMode` | `"theme.defaultMode": "auto"` |

### Paso 3: Migre las Barras Laterales
En Docusaurus, las barras laterales se declaran en `sidebars.js`. En DocMeDown:
- **Opción A (Sin Configuración)**: ¡Elimine `sidebars.js`! DocMeDown autoindexa la estructura de carpetas y el parámetro `order` del frontmatter.
- **Opción B (Explícita)**: Convierta al array `sidebar` en `docs.json`:

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

### Paso 4: Migre Componentes React MDX
En Docusaurus, los componentes se importan al inicio de los archivos MDX:
```mdx
import MyWidget from '@site/src/components/MyWidget';

<MyWidget />
```

En DocMeDown:
1. Coloque `MyWidget.tsx` dentro de `docs/.dmd/`.
2. ¡Elimine la sentencia `import` de su archivo Markdown!
3. Utilice `<MyWidget />` directamente en cualquier lugar.

---

## ⚡ Migración desde VitePress

VitePress se basa en Vue 3, Vite y `.vitepress/config.mts`.

### Paso 1: Mapee `.vitepress/config.mts` a `docs.json`

```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Mis Docs",
  "theme": {
    "family": "atlas",
    "density": "comfortable"
  },
  "nav": [
    { "label": "Guía", "href": "#/guide/getting-started" },
    { "label": "Configuración", "href": "#/config" }
  ]
}
```

### Paso 2: Migre Componentes Vue a Svelte 5 o React TSX
En lugar de componentes Vue en `.vitepress/theme/`, cree componentes livianos en **Svelte 5** (`.svelte`) o **React TSX** (`.tsx`) en la carpeta `.dmd/`. Se compilan automáticamente como Web Components estándar.

---

## 📄 Migración desde Docsify

Docsify es un visor de Markdown ejecutado en el cliente, pero carece de pre-renderizado estático (SEO), paquetes monofile sin conexión y soporte de componentes modernos.

### Paso 1: Reemplace el entorno `index.html`
En Docsify, se mantiene un `index.html` personalizado con configuraciones globales en window y scripts de CDN.

Con DocMeDown, sustitúyalo por un `docs.json` limpio:
```bash
npx docmedown init ./docs
```

### Por qué DocMeDown representa un avance notable respecto a Docsify:
1. **Search Engine Optimization (SEO)**: Docsify no es indexado por muchos rastreadores debido a su ejecución exclusiva en el cliente. DocMeDown pre-renderiza HTML semántico completo con Open Graph y JSON-LD.
2. **100% Offline con Doble Clic**: Docsify falla al abrirse mediante `file:///` porque los navegadores bloquean las llamadas `fetch()`. DocMeDown empaqueta todo en un sobre autoextraíble monofile.
3. **Reactividad con Svelte 5**: Motor moderno basado en runes en lugar de manipulación clásica del DOM.
4. **MCP Nativo para IA**: Conexión instantánea con Claude Desktop, Cursor y Windsurf.

---

## 🐍 Migración desde MkDocs (Material for MkDocs)

MkDocs requiere Python, `pip` y `mkdocs.yml`.

### Mapeo de `mkdocs.yml` a `docs.json`:

```yaml title="mkdocs.yml"
site_name: Manual del Proyecto
theme:
  name: material
  palette:
    scheme: default
nav:
  - Inicio: index.md
  - Guía: guides/start.md
```

Se traduce directamente a:

```json title="docs.json"
{
  "name": "Manual del Proyecto",
  "theme": {
    "family": "blueprint",
    "defaultMode": "auto"
  },
  "sidebar": [
    { "title": "Inicio", "path": "index.md" },
    { "title": "Guía", "path": "guides/start.md" }
  ]
}
```

¡Ahora puede prescindir de dependencias de compilación en Python en sus flujos de CI/CD!

---

## 🗺️ Próximos Pasos

Siga la ruta de documentación:

<CardGrid cols={2}>
  <Card
    title="Muestra de Componentes"
    description="Explore vistas previas interactivas en vivo y ejemplos de código para todos los elementos integrados."
    href="#/showcase"
    badge="Siguiente"
    badgeType="info"
  />
  <Card
    title="Referencia de CLI"
    description="Consulte opciones y comandos para init, serve, build, validate y doctor."
    href="#/guides/cli-reference"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
