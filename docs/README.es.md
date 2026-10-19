---
title: Bienvenido a DocMeDown
description: El documentador MarkDown más simple hasta ahora. Runtime reactivo en vivo, compilador de sitios estáticos, paquetes en archivo único air-gapped y distribución nativa con IA.
order: 1
tags: [visión-general, filosofía, características, inicio-rápido, svelte, ia, mcp, offline]
---

# Bienvenido a DocMeDown ⚡
### *¡El documentador MarkDown más simple hasta ahora!*

**DocMeDown** elimina por completo la fricción en la documentación. Proporciona a los desarrolladores el acabado estético y la potencia interactiva de plataformas modernas de documentación como **Docusaurus**, **VitePress** o **Mintlify** — sin archivos de configuración complejos, pipelines de compilación pesados ni boilerplate de enrutamiento estático.

Escribe archivos Markdown estándar, y DocMeDown gestiona automáticamente la autoindexación, montaje de componentes interactivos, resaltado de sintaxis, búsqueda aproximada (<Kbd>⌘K</Kbd>), cambio de temas, prerenderizado estático con SEO y distribución en archivo único para entornos aislados (air-gapped).

---

## ⚡ Inicio Rápido en 30 Segundos

Pon en marcha un sitio de documentación moderno en tres sencillos pasos:

<Tabs type="pills">
  <Tab label="1. Inicializar Docs" icon="🚀">
```bash
npx docmedown
```
Detecta automáticamente archivos markdown en la raíz (`README.md`, `CONTRIBUTING.md`, `ROADMAP.md`, etc.), vincula la raíz y `./docs/` al nivel superior sin subdivisión artificial de `./docs/`, e inicializa la configuración.
  </Tab>
  <Tab label="2. Vista Previa en Vivo" icon="🔥">
```bash
npx docmedown serve ./docs
```
Inicia un servidor de desarrollo ultrarrápido en `http://localhost:3000` con hot live-reload in situ mediante WebSocket.
  </Tab>
  <Tab label="3. Compilación de Producción" icon="📦">
```bash
npx docmedown build ./docs
```
Prerenderiza páginas estáticas para SEO, emite contexto para IA (`llms.txt`), y genera un archivo único `.dist/index.html` 100% offline.
  </Tab>
</Tabs>

---

## 🎨 Componentes Interactivos Multi-Framework

DocMeDown funciona como una capa universal de orquestación de componentes. Puedes crear widgets interactivos usando **Svelte 5 nativo (runes)**, **React con TypeScript (TSX)** o **Web Elements estándar (Lit)** — y usarlos directamente en Markdown sin necesidad de importaciones:

### 1. Svelte 5 Nativo (`.dmd/CounterWidget.svelte`)
<CounterWidget title="Widget Svelte 5 en Vivo en Markdown" />

### 2. React TSX (`.dmd/ReactMetricCard.tsx`)
<ReactMetricCard label="Rendimiento de Consultas" initial={1200} unit="req/s" />

### 3. Web Element / Lit (`.dmd/LitStatusBadge.ts`)
<LitStatusBadge label="Clúster de Producción" status="operational" />

### 4. Controlador de Tema y Apariencia en Vivo (`.dmd/InteractiveThemeDemo.svelte`)
<InteractiveThemeDemo />

---

## 🏛️ Los Cuatro Pilares de DocMeDown

<CardGrid cols={2}>
  <Card
    title="1. Documentación Local Sin Fricción"
    description="Añade index.html y escribe Markdown. Unifica archivos *.md de la raíz y ./docs/ automáticamente, sin empaquetadores y con búsqueda aproximada instantánea (⌘K)."
    href="#/getting-started"
    badge="Zero Config"
    badgeType="success"
    color="blue"
  />
  <Card
    title="2. Fuentes Git Remotas Dinámicas"
    description="Apunta directamente a cualquier repositorio GitHub o GitLab. Los lectores ven actualizaciones en vivo tan pronto como los commits se fusionan."
    href="#/guides/remote-github"
    badge="Cloud Git"
    badgeType="info"
    color="violet"
  />
  <Card
    title="3. HTML de Archivo Único 100% Offline"
    description="Paquetes HTML ejecutables con doble clic (file:///). Sin servidor web, sin errores de CORS, perfecto para sistemas aislados (air-gapped)."
    href="#/guides/offline-mode"
    badge="Air-Gapped"
    badgeType="warning"
    color="amber"
  />
  <Card
    title="4. Nativo para IA con MCP & llms.txt"
    description="Servidor Model Context Protocol integrado que conecta tu documentación directamente con Claude Desktop, Cursor y Windsurf."
    href="#/guides/mcp-server"
    badge="Listo para IA"
    badgeType="new"
    color="green"
  />
</CardGrid>

---

## 🏗️ Pipeline de Arquitectura

```mermaid
graph TD
    subgraph Sources ["1. Fuentes de Documentación"]
        A[Archivos Locales .md / .mdx]
        B[Repositorio Remoto GitHub]
        C[Repositorio Remoto GitLab]
    end

    subgraph DocMeDown ["2. Motor DocMeDown"]
        D[Autoindexador Zero-Config]
        E[Parser de Markdown y Matemáticas]
        F[Runtime Svelte 5 con Runes]
        G[Componentes Personalizados .dmd]
    end

    subgraph TargetOutputs ["3. Salidas Finales"]
        H[Servidor Dev con Hot Reload]
        I[Sitio Estático Prerenderizado (SSG/SEO)]
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

## ⚡ Matriz Comparativa de Características

| Característica | **DocMeDown** | Docusaurus | Docsify | VitePress | Mintlify |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Tiempo de Configuración** | **< 10 segundos** ⚡ | ~5-10 min | ~2 min | ~3 min | ~5 min |
| **Modo Zero-Config** | **Sí** ✅ | No ❌ | Parcial ⚠️ | No ❌ | No ❌ |
| **Sincronización Dinámica con Git Remoto** | **Sí (GitHub/GitLab)** 🌐 | No ❌ | Parcial ⚠️ | No ❌ | No ❌ |
| **HTML de Archivo Único Air-Gapped** | **Sí (Doble Clic)** 📦 | No ❌ | No ❌ | No ❌ | No ❌ |
| **Componentes Personalizados Multi-Framework** | **Sí (Svelte, React, Lit)** 🧩 | Solo React MDX | Plugins | Solo Vue 3 | Solo React MDX |
| **Búsqueda Aproximada Integrada (<Kbd>⌘K</Kbd>)** | **Sí (Zero Config)** 🔍 | Requiere plugin | Requiere plugin | Integrada | Alojada en la nube |
| **Editor Bidireccional en Navegador (<Kbd>Ctrl+E</Kbd>)** | **Sí (Integrado)** ✏️ | No ❌ | No ❌ | No ❌ | Solo Web |
| **Vistas Previas en Fase (`--preview`)** | **Sí (Integrado)** 🎭 | No ❌ | No ❌ | No ❌ | No ❌ |
| **Mermaid y KaTeX Interactivos** | **Integrados** 📊 | Plugins | Plugins | Integrado | Integrado |
| **Model Context Protocol (MCP) Nativo** | **Integrado (Stdio & SSE)** 🤖 | No ❌ | No ❌ | No ❌ | No ❌ |
| **`llms.txt` y `SKILL.md` Automatizados** | **Integrados** 🧠 | No ❌ | No ❌ | No ❌ | No ❌ |

---

## 🗺️ Recorrido Guiado por la Documentación

Sigue el currículo lineal a continuación o salta directamente al tema de tu interés:

<CardGrid cols={3}>
  <Card
    title="1. Primeros Pasos"
    description="Tutorial paso a paso de configuración, scripts de paquetes y tu primer sitio de documentación."
    href="#/getting-started"
    icon="🚀"
    badge="Tutorial"
    badgeType="success"
  />
  <Card
    title="2. Estructura del Proyecto"
    description="Distribución de directorios, opciones de frontmatter, reglas de autoindexación y barras laterales personalizadas."
    href="#/guides/project-structure"
    icon="📁"
    badge="Guía"
    badgeType="info"
  />
  <Card
    title="3. Arquitectura del Motor"
    description="Bajo el capó: runtime reactivo de Svelte 5 con runes, cargador virtual y compresión offline."
    href="#/guides/architecture"
    icon="🏛️"
    badge="Inmersión"
    badgeType="info"
  />
  <Card
    title="4. Markdown y Matemáticas"
    description="Alertas de GitHub, resaltado de sintaxis con enfoque a nivel de línea y fórmulas matemáticas en LaTeX."
    href="#/guides/markdown-features"
    icon="📝"
    badge="Creación"
    badgeType="info"
  />
  <Card
    title="5. Diagramas Mermaid"
    description="Diagramas de flujo interactivos, diagramas de secuencia y sincronización automática de temas."
    href="#/guides/mermaid-diagrams"
    icon="📊"
    badge="Visuales"
    badgeType="info"
  />
  <Card
    title="6. Primitivas de UI Nativas"
    description="Referencia de los 20 elementos: CardGrid, Tabs, Badges, Callouts, Media y Botones."
    href="#/guides/built-in-components"
    icon="🧩"
    badge="20 Elementos"
    badgeType="info"
  />
  <Card
    title="7. Componentes Personalizados"
    description="Crea componentes interactivos en Svelte 5, React TSX o Web Elements en .dmd/."
    href="#/guides/custom-components"
    icon="⚡"
    badge="Multi-FW"
    badgeType="new"
  />
  <Card
    title="8. DX de Última Generación y Editor"
    description="HMR auténtico in situ, editor en navegador con vista dividida (Ctrl+E) y vistas previas en fase."
    href="#/guides/developer-experience"
    icon="🔥"
    badge="v0.9.0"
    badgeType="new"
  />
  <Card
    title="9. Sitio Estático y SEO"
    description="SSG prerenderizado, hidratación con pushState, sitemaps, robots.txt y tutoriales de alojamiento."
    href="#/guides/static-site"
    icon="🌐"
    badge="Despliegue"
    badgeType="info"
  />
  <Card
    title="10. Archivo Único Offline"
    description="Paquetes HTML autoejecutables para entornos aislados sin dependencias y sin errores de CORS."
    href="#/guides/offline-mode"
    icon="📦"
    badge="Air-Gapped"
    badgeType="warning"
  />
  <Card
    title="11. Git Remoto Dinámico"
    description="Documentación en vivo sin alojamiento propio transmitida directamente desde GitHub o GitLab."
    href="#/guides/remote-github"
    icon="☁️"
    badge="Cloud Git"
    badgeType="info"
  />
  <Card
    title="12. Servidor MCP Nativo para IA"
    description="Conecta Cursor, Claude Desktop y Windsurf a la base de conocimiento de tu documentación."
    href="#/guides/mcp-server"
    icon="🤖"
    badge="Listo para IA"
    badgeType="success"
  />
  <Card
    title="13. Referencia de Configuración"
    description="Recetario completo y referencia de esquema para docs.json, familias de temas e imagen de marca."
    href="#/configuration"
    icon="⚙️"
    badge="Referencia"
    badgeType="info"
  />
  <Card
    title="14. Matriz de Comandos de CLI"
    description="Guía integral de flags para init, serve, build, validate, doctor y mcp."
    href="#/guides/cli-reference"
    icon="💻"
    badge="CLI"
    badgeType="info"
  />
  <Card
    title="15. Guías de Migración"
    description="Recetas paso a paso para migrar desde Docusaurus, VitePress, Docsify o MkDocs."
    href="#/guides/migrations"
    icon="🔄"
    badge="Migración"
    badgeType="info"
  />
</CardGrid>

---

## 🗺️ Comienza el Recorrido

¿Listo para comenzar? Dirígete directamente al tutorial paso a paso:

<CardGrid cols={1}>
  <Card
    title="Paso 1: Tutorial de Inicio Rápido"
    description="De cero a documentación de nivel de producción en segundos. Guía paso a paso para proyectos locales, componentes y compilaciones."
    href="#/getting-started"
    icon="🚀"
    badge="Comienza Aquí"
    badgeType="success"
  />
</CardGrid>
