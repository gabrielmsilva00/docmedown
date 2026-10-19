---
title: Estructura y Organización del Proyecto
description: Anatomía completa de directorios, esquema de frontmatter, reglas de autoindexación, barras laterales manuales y sitios de documentación anidados.
order: 1
category: Conceptos Centrales
tags: [estructura-del-proyecto, organización, frontmatter, sidebar, autoindex, navegación, directorio]
---

# Estructura y Organización del Proyecto 📁

DocMeDown utiliza una arquitectura basada en el sistema de archivos diseñada para ser predecible, transparente y fácil de mantener. Esta guía cubre cómo se organizan los documentos, cómo el frontmatter afecta la navegación, cómo funciona la autoindexación y cómo definir jerarquías manuales en la barra lateral.

---

## 🗂️ Anatomía del Directorio del Workspace

Un workspace completo de documentación en DocMeDown normalmente tiene este aspecto:

```
mi-proyecto/
├── docs/                               # Raíz de la documentación: SOLO fuentes + symlink index.html
│   ├── index.html                      # Symlink → .dmd/index.html (sitio SEO para servir)
│   ├── README.md                       # Documento de inicio (sirve en #/README o /)
│   ├── getting-started.md              # Documento de primer nivel (#/getting-started)
│   ├── configuration.md                # Documento de primer nivel (#/configuration)
│   ├── guides/                         # Directorio anidado de guías (crea categoría)
│   │   ├── project-structure.md        # Documento bajo /guides/
│   │   ├── architecture.md             # Documento bajo /guides/
│   │   ├── markdown-features.md        # Documento bajo /guides/
│   │   └── cli-reference.md            # Documento bajo /guides/
│   └── .dmd/                           # Workspace oculto de compilación (nunca enlazado en navegación)
│       ├── index.html                  # Punto de entrada del sitio para servir
│       ├── _manifest.json              # Corpus indexado + encabezados
│       ├── _docs.js                    # Datos de reserva para file:/// offline
│       ├── docmedown.web.js            # Runtime para servir (+ docmedown-mermaid.js)
│       ├── .singlefile/index.html      # Paquete offline en un solo archivo (distribuible explícito)
│       ├── .components/                # Componentes personalizados (Svelte/TSX/Lit, autodescubiertos)
│       │   ├── CounterWidget.svelte    # Componente Svelte 5 personalizado (<CounterWidget />)
│       │   ├── MetricCard.tsx          # Componente React TSX (<MetricCard />)
│       │   └── ClusterBadge.ts         # Web Component Lit (<ClusterBadge />)
│       └── .config/docs.json           # Configuración del sitio, tema e imagen de marca
├── package.json
└── tsconfig.json
```

### Explicación de Archivos y Directorios Clave

| Ruta | Propósito | Comportamiento |
| :--- | :--- | :--- |
| **`docs/index.html`** | Symlink Distribuible | Apunta a `.dmd/index.html` (sitio SEO listo para servir); el ÚNICO archivo distribuible en la raíz de docs. |
| **`docs/README.md`** | Documento de Inicio Predeterminado | Mapeado automáticamente a la ruta raíz de la documentación (`#/README` o `/`). |
| **`docs/.dmd/`** | Workspace Oculto de Compilación | Sitio generado, runtimes, páginas estáticas, archivos SEO/IA. Nunca visible en la navegación. |
| **`docs/.dmd/.singlefile/`** | Artefactos Offline | Paquete autocontenido en archivo único (`index.html`), ejecutable con doble clic mediante `file:///`; distribuible offline explícito. |
| **`docs/.dmd/.components/`** | Componentes Personalizados | Los archivos colocados aquí (`.svelte`, `.tsx`, `.ts`) se precompilan y están disponibles directamente en Markdown sin importaciones. `.dmd/` directo aún funciona como fallback. |
| **`docs/.dmd/.config/`** | Configuración del Sitio | `docs.json` / `dmd.json` residen aquí por defecto; `docs/*.json` directo sigue funcionando como fallback. |
| **`docs/.dmd/_manifest.json`** | Caché de Compilación e Índice | Emitido durante `docmedown build`, contiene el corpus indexado de documentación y encabezados. |
| **`docs/.dmd/_docs.js`** | Datos de Reserva Offline | Incrustado en compilaciones estáticas locales para carga de reserva al visualizar mediante `file:///`. |

---

## 📑 Especificación del Frontmatter

Todo documento `.md` y `.mdx` admite frontmatter YAML estándar entre delimitadores `---` en la parte superior del archivo:

```yaml
---
title: Arquitectura del Motor y Cómo Funciona
sidebar_label: Arquitectura
description: Inmersión técnica profunda en el motor zero-config de DocMeDown.
order: 2
category: Conceptos Centrales
icon: 🏛️
badge: Inmersión
badge_type: info
tags: [arquitectura, motor, svelte-5, runes]
hidden: false
noindex: false
---
```

### Campos Compatibles en el Frontmatter

| Propiedad | Tipo | Predeterminado | Descripción |
| :--- | :--- | :--- | :--- |
| **`title`** | `string` | Derivado del nombre del archivo | Título principal del documento mostrado en el `<h1>` de la página y la pestaña del navegador. |
| **`sidebar_label`** | `string` | `title` o nombre del archivo | Etiqueta opcional más corta usada en el árbol de navegación de la barra lateral. |
| **`description`** | `string` | *(vacío)* | Metadescripción de la página para SEO e indexación de contexto de IA (`llms.txt`). |
| **`order`** | `number` | `0` (`-999` para README) | Posición explícita de ordenación en la barra lateral cuando se usa autoindexación. |
| **`category`** | `string` | Nombre del directorio padre | Insignia de categoría legible que se muestra en las migas de pan de la barra superior. |
| **`icon`** | `string` | *(ninguno)* | Emoji o carácter de icono mostrado junto al enlace en la barra lateral (ej.: `⚡`, `🚀`). |
| **`badge`** | `string` | *(ninguno)* | Etiqueta corta mostrada junto al título en la barra lateral (ej.: `Nuevo`, `v0.9.0`). |
| **`badge_type`** | `string` | `info` | Variante de color de la insignia: `info`, `success`, `warning` o `new`. |
| **`tags`** | `string[]` | `[]` | Array de palabras clave. Habilita píldoras de etiquetas clicables en la barra superior y modal de filtros. |
| **`hidden`** | `boolean` | `false` | Cuando es `true`, oculta el documento de la barra lateral (sigue accesible mediante URL). |
| **`noindex`** | `boolean` | `false` | Cuando es `true`, añade `<meta name="robots" content="noindex">` al HTML prerenderizado. |

---

## 🧭 Navegación: Autoindexación vs Barra Lateral Manual

DocMeDown ofrece total flexibilidad en cómo se genera la navegación:

### Opción A: Indexación Automática (`autoIndex`)

Por defecto, DocMeDown escanea todos los archivos Markdown y construye el árbol de la barra lateral automáticamente basándose en el sistema de archivos:

```
docs/
├── README.md               -> Slug: README (Visión General)
├── getting-started.md      -> Slug: getting-started
└── guides/
    ├── installation.md     -> Categoría: Guides > Installation (Slug: guides/installation)
    └── advanced.md         -> Categoría: Guides > Advanced (Slug: guides/advanced)
```

En `docs.json`, puedes configurar cómo la autoindexación ordena los elementos:

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

- **`sort: "natural"`**: Respeta primero el `order` del frontmatter y recurre al orden alfabético natural como desempate.
- **`sort: "frontmatter"`**: Ordena estrictamente por la propiedad `order`.
- **`sort: "alphabetical"`**: Ordena estrictamente en orden alfabético por el título del documento.

---

### Opción B: Barra Lateral Manual Explícita (`sidebar`)

Para un control absoluto sobre agrupación, categorías, orden personalizado e insignias, define el array `sidebar` en `docs.json`:

```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Documentación de Mi Proyecto",
  "sidebar": [
    {
      "title": "Primeros Pasos",
      "icon": "🚀",
      "children": [
        { "title": "Visión General", "path": "README.md", "icon": "⚡" },
        { "title": "Inicio Rápido", "path": "getting-started.md", "icon": "🚀", "badge": "Comienza Aquí", "badgeType": "success" },
        { "title": "Estructura del Proyecto", "path": "guides/project-structure.md", "icon": "📁" }
      ]
    },
    {
      "title": "Conceptos Centrales",
      "icon": "🏛️",
      "children": [
        { "title": "Arquitectura", "path": "guides/architecture.md", "icon": "⚙️" },
        { "title": "Características de Markdown", "path": "guides/markdown-features.md", "icon": "📝" }
      ]
    },
    {
      "title": "Avanzado",
      "icon": "⚡",
      "collapsed": true,
      "children": [
        { "title": "Referencia de CLI", "path": "guides/cli-reference.md", "icon": "💻" },
        { "title": "Componentes Personalizados", "path": "guides/custom-components.md", "icon": "🧩", "badge": "Nuevo", "badgeType": "new" }
      ]
    }
  ]
}
```

> [!TIP]
> **Grupos Colapsables**: Establece `"collapsed": true` en cualquier nodo de categoría para que inicie cerrado por defecto. Los lectores pueden hacer clic en la flecha para desplegarlo en cualquier momento.

---

## 🪆 Sitios de Documentación Anidados

DocMeDown admite **sitios de documentación anidados**. Si cualquier subdirectorio dentro de tu carpeta de documentación contiene su propio `docs.json`, DocMeDown lo reconoce como un proyecto de documentación independiente y aislado:

```
docs/
├── docs.json                 # Sitio de documentación principal (padre)
├── README.md
└── examples/
    ├── local-docs/
    │   ├── docs.json         # Subsitio 1 (tiene tema y navegación independientes)
    │   └── README.md
    └── remote-github/
        ├── docs.json         # Subsitio 2 (tiene tema y navegación independientes)
        └── index.html
```

### Por qué esto es potente:
1. **Manifiestos Aislados**: Las búsquedas y barras laterales del sitio principal no se mezclan con los documentos de los subsitios.
2. **Temas Independientes**: Los sitios anidados pueden utilizar familias de temas diferentes (ej.: el padre usa `atlas`, el subsitio usa `terminal`).
3. **Incrustación Offline**: ¡Al compilar paquetes offline en archivo único, el sitio principal incrusta automáticamente los subsitios en el mismo archivo distribuible!

---

## 🗺️ Próximos Pasos

Continúa con el recorrido lineal de la documentación:

<CardGrid cols={2}>
  <Card
    title="Arquitectura del Motor"
    description="Comprende cómo funcionan el cargador virtual, el runtime de Svelte 5 y los paquetes offline."
    href="#/guides/architecture"
    badge="Siguiente"
    badgeType="info"
  />
  <Card
    title="Inicio Rápido y Configuración"
    description="Revisa la configuración inicial, scripts de paquetes y comandos de CLI."
    href="#/getting-started"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
