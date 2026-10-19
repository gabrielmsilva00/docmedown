---
title: Ejemplos Ejecutables
description: Explore tres sitios de documentación de referencia completos y listos para producción integrados dentro de DocMeDown.
order: 5
tags: [examples, reference-sites, nested-docs, architecture, showcase]
---

# Ejemplos de Referencia Ejecutables 🧪

DocMeDown incluye **tres sitios de referencia independientes y totalmente funcionales** directamente en este repositorio.

Cada ejemplo es un sitio de documentación autocontenido con su propio `.dmd/.config/docs.json`, familia visual, componentes personalizados, índice de búsqueda y paquete sin conexión. Puede abrir e inspeccionar cada uno de ellos ahora mismo:

---

## 🏗️ Matriz de Ejemplos Interactivos

| Sitio de Ejemplo | Familia Visual | Caso de Uso Principal | Aspectos Destacados | Abrir |
| :--- | :--- | :--- | :--- | :--- |
| **[Documentación de Ingeniería Local](#1-docs-ingenieria-local)** | `terminal` (oscuro) | APIs para desarrolladores y herramientas internas | Tipografía monoespaciada, `.dmd/.components/OrbitCounter.svelte`, guías anidadas | [Abrir Sitio](examples/local-docs/index.html) |
| **[Portal Git Remoto Dinámico](#2-portal-git-remoto-dinamico)** | `blueprint` | Bibliotecas de código abierto y repositorios | Cero archivos Markdown locales, rastreo dinámico vía API, sincronización en vivo | [Abrir Sitio](examples/remote-github/index.html) |
| **[Manual Offline Aislado](#3-manual-offline-aislado)** | `editorial` | Manuales de hardware y guías de campo | Distribuible HTML monofile, cero peticiones de red, diseño editorial de libro | [Abrir Sitio](examples/single-file-offline/index.html) |

---

<a id="1-docs-ingenieria-local"></a>
## 1. Documentación de Ingeniería Local

> **Vista Previa en Vivo:** [Abrir Ejemplo de Docs Locales (examples/local-docs/index.html)](examples/local-docs/index.html)

Este sitio de referencia ilustra una documentación operativa orientada a desarrolladores, diseñada con la familia visual **`terminal`**.

```
examples/local-docs/
├── .dmd/.config/docs.json    # Tema terminal con densidad compacta
├── README.md                 # Visión general del sistema y referencia rápida
├── getting-started.md        # CLI y preparación del entorno
├── guides/
│   ├── deployment.md         # Guías de despliegue operacional
│   └── monitoring.md         # Observabilidad y umbrales de alerta
└── .dmd/.components/
    └── OrbitCounter.svelte   # Widget interactivo de órbita de partículas
```

### Configuración (`examples/local-docs/.dmd/.config/docs.json`)
```json title="examples/local-docs/.dmd/.config/docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Local Reference Docs",
  "tagline": "Compact operational documentation",
  "theme": {
    "family": "terminal",
    "density": "compact",
    "defaultMode": "dark"
  },
  "nav": [
    { "label": "Overview", "href": "#/README" },
    { "label": "Getting Started", "href": "#/getting-started" }
  ]
}
```

### Widget Interactivo Svelte 5 (`.dmd/OrbitCounter.svelte`)
Este sitio demuestra el uso de runes de Svelte 5 (`$state`, `$derived`, `$props`) en interacción directa con las variables de tema de DocMeDown (`--dmd-primary`, `--dmd-bg-card`):

```svelte title="examples/local-docs/.dmd/OrbitCounter.svelte"
<svelte:options customElement="dmd-orbit-counter" />

<script>
  let count = $state(0);
  let speed = $derived(count * 2 + 1);
</script>

<div class="orbit-panel">
  <div class="orbit-center">
    <span>Orbital Velocity: {speed}x</span>
    <button onclick={() => count++}>Accelerate ({count})</button>
  </div>
</div>
```

---

<a id="2-portal-git-remoto-dinamico"></a>
## 2. Portal Git Remoto Dinámico

> **Vista Previa en Vivo:** [Abrir Ejemplo Remoto de GitHub (examples/remote-github/index.html)](examples/remote-github/index.html)

Este sitio demuestra la capacidad de **cero alojamiento** de DocMeDown. ¡No contiene **ningún archivo Markdown en disco**! En su lugar, el archivo `docs.json` apunta directamente a un repositorio upstream en GitHub.

```
examples/remote-github/
├── docs.json                 # Apunta al repositorio remoto en GitHub
└── index.html                # Plantilla HTML liviana importando docmedown.web.js
```

### Configuración (`examples/remote-github/docs.json`)
```json title="examples/remote-github/docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Dynamic GitHub Reader",
  "tagline": "Live remote repository documentation",
  "source": {
    "type": "github",
    "repo": "facebook/react",
    "branch": "main",
    "docsDir": "docs"
  },
  "theme": {
    "family": "blueprint",
    "density": "comfortable",
    "defaultMode": "auto"
  }
}
```

### Comportamiento del runtime:
1. Al abrir `index.html`, DocMeDown consulta la API de GitHub para rastrear el árbol de directorios de `facebook/react`.
2. La barra de navegación lateral, el enrutamiento y el índice de búsqueda se compilan **dinámicamente en el cliente**.
3. Al hacer clic en un enlace se solicita el contenido Markdown sin procesar desde `raw.githubusercontent.com` y se renderiza con resaltado de código y notas.
4. Cualquier confirmación fusionada en el repositorio remoto se refleja de inmediato al recargar el navegador.

---

<a id="3-manual-offline-aislado"></a>
## 3. Manual Offline Aislado

> **Vista Previa en Vivo:** [Abrir Ejemplo Offline (examples/single-file-offline/index.html)](examples/single-file-offline/index.html)

Este sitio utiliza la elegante familia visual **`editorial`** (fondo cálido tipo papel, encabezados con serifa y detalles en color terracota). Muestra cómo DocMeDown empaqueta una base de documentación de múltiples páginas en un único archivo autoextraíble `.dist/index.html`.

```
examples/single-file-offline/
├── docs.json                 # Familia visual editorial
├── README.md                 # Introducción del manual
├── chapters/
│   ├── chapter-1.md          # Guía detallada
│   └── chapter-2.md          # Apéndice técnico
└── .dist/
    └── index.html            # Paquete 100% autocontenido (doble clic)
```

### Configuración (`examples/single-file-offline/docs.json`)
```json title="examples/single-file-offline/docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Field Engineering Manual",
  "tagline": "100% Offline Single-File Distributable",
  "theme": {
    "family": "editorial",
    "density": "comfortable",
    "defaultMode": "light"
  },
  "offline": {
    "embedNestedDocs": false
  }
}
```

### La Garantía de Doble Clic:
Al abrir `examples/single-file-offline/.dist/index.html` mediante `file:///`:
- Utiliza la API nativa `DecompressionStream` del navegador para descomprimir el contenido y el runtime integrados.
- Ejecuta búsqueda difusa completa en el cliente a través de todos los capítulos.
- Funciona sin peticiones de red, tipografías externas ni servidores locales.

---

## 🧩 La Arquitectura de Documentación Anidada

¿Cómo pueden convivir tres sitios de documentación totalmente distintos en la misma carpeta sin interferir entre sí?

```
DocMeDown Root (./docs/docs.json) ─── Familia Atlas (Sitio Principal)
  │
  ├── README.md, getting-started.md, guides/
  │
  └── examples/
      ├── local-docs/docs.json ──────── Familia Terminal (Sitio Aislado)
      │     └── OrbitCounter.svelte
      │
      ├── remote-github/docs.json ───── Familia Blueprint (Sitio Aislado)
      │     └── Fuente Dinámica de GitHub
      │
      └── single-file-offline/docs.json  Familia Editorial (Sitio Aislado)
            └── HTML Monofile Offline
```

### El Contrato de Aislamiento:
1. **Cualquier carpeta que contenga un `docs.json` constituye una Raíz de Documentación independiente**.
2. El escáner principal detecta archivos `docs.json` anidados y **detiene el rastreo en ese subdirectorio**. Esto garantiza que el índice de búsqueda y la barra de navegación del sitio principal nunca incluyan contenido de los sitios secundarios.
3. Al ejecutar `npx docmedown build ./docs`, DocMeDown compila de forma recursiva el sitio principal y luego procesa cada sitio anidado por separado con su propio manifiesto, páginas estáticas y paquete offline `.dist/`.
4. **Ideal para**:
   - Monorrepositorios con múltiples paquetes.
   - Documentación versionada (ej.: `docs/v1/`, `docs/v2/`).
   - Microdocumentación insertada en portales de mayor envergadura.

---

## 🚀 Recree Estos Ejemplos en Su Proyecto

Para probar una de estas arquitecturas en su propio proyecto:

<Tabs type="postit">
  <Tab label="1. Docs de API Terminal">
```bash
npx docmedown init ./api-docs
# Edite docs.json -> asigne "theme": { "family": "terminal", "density": "compact" }
npx docmedown serve ./api-docs
```
  </Tab>
  <Tab label="2. Portal Remoto de GitHub">
```bash
mkdir my-github-docs && cd my-github-docs
echo '{"name":"Remote Docs","source":{"type":"github","repo":"tu-org/tu-repo","branch":"main"}}' > docs.json
npx docmedown serve .
```
  </Tab>
  <Tab label="3. Distribuible Monofile">
```bash
npx docmedown build ./docs -o ./dist
# ¡Distribuya ./dist/index.html directamente!
```
  </Tab>
</Tabs>

---

## 🗺️ Próximos Pasos

¡Ha completado el recorrido completo por la documentación! Vuelva a la página principal o retome la redacción de contenidos:

<CardGrid cols={2}>
  <Card
    title="Visión General y Filosofía"
    description="Repase los cuatro pilares, la arquitectura del motor y la comparativa de características."
    href="#/README"
    badge="Inicio"
    badgeType="info"
  />
  <Card
    title="Muestra de Componentes"
    description="Explore vistas previas interactivas en vivo y ejemplos de código para todos los elementos integrados."
    href="#/showcase"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
