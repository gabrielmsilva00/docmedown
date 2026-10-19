---
title: Referencia de Configuración (docs.json)
description: Recetario completo y referencia de esquema para docs.json, familias de temas, navegación, imagen de marca, barras laterales personalizadas y opciones de runtime.
order: 13
category: Referencia y Herramientas
tags: [config, referencia, temas, json, personalización, marca, sidebar]
---

# Recetario y Referencia de Configuración (`docs.json`) ⚙️

Aunque DocMeDown funciona **sin ninguna configuración previa por defecto**, un archivo `docs.json` en tu directorio de documentación desbloquea el control total sobre temas, imagen de marca, navegación, búsqueda, barras laterales personalizadas y fuentes Git dinámicas.

Añade la definición del esquema al inicio de tu `docs.json` para obtener autocompletado instantáneo y validación en VS Code, Cursor e IDEs de JetBrains:

```json
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Mi Proyecto"
}
```

---

## 🍳 Arquetipos de Configuración (Copiar y Pegar)

Elige el arquetipo predefinido más cercano a tu proyecto:

<Tabs type="pills">
  <Tab label="1. Biblioteca Open-Source (Atlas)" icon="📦">
```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "SuperLib",
  "tagline": "Gestión de estado de última generación para aplicaciones web modernas",
  "version": "1.0.0",
  "url": "https://superlib.dev",
  "theme": {
    "family": "atlas",
    "density": "comfortable",
    "defaultMode": "auto",
    "favicon": "default"
  },
  "nav": [
    { "label": "Visión General", "href": "#/README" },
    { "label": "Inicio Rápido", "href": "#/getting-started" },
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
  "tagline": "Manual de orquestación de clústeres y respuesta a incidentes",
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
    { "label": "Arquitectura", "href": "#/architecture" }
  ],
  "search": {
    "placeholder": "Buscar runbooks y comandos del clúster..."
  }
}
```
  </Tab>

  <Tab label="3. Especificación de Arquitectura Técnica (Blueprint)" icon="📐">
```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "DataMesh Engine",
  "tagline": "Especificación del protocolo de telemetría distribuida",
  "theme": {
    "family": "blueprint",
    "density": "comfortable",
    "defaultMode": "auto",
    "favicon": "minimal"
  },
  "nav": [
    { "label": "Especificación", "href": "#/README" },
    { "label": "Esquemas", "href": "#/schemas" },
    { "label": "RFCs", "href": "#/rfcs" }
  ]
}
```
  </Tab>

  <Tab label="4. Manual de Producto y Guía del Equipo (Editorial)" icon="📖">
```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Manual de Ingeniería",
  "tagline": "Principios, prácticas recomendadas y plan de bienvenida",
  "theme": {
    "family": "editorial",
    "density": "comfortable",
    "defaultMode": "light",
    "favicon": "book"
  },
  "nav": [
    { "label": "Bienvenida", "href": "#/README" },
    { "label": "Valores", "href": "#/values" },
    { "label": "Ingeniería", "href": "#/engineering" }
  ]
}
```
  </Tab>

  <Tab label="5. Fuente Git Remota en Vivo (GitHub)" icon="🌐">
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

## 🎨 Familias de Temas y Estética

DocMeDown incluye **seis sistemas visuales completos**. Una familia de temas no es un simple cambio de paleta de colores: redefine la textura del lienzo, los bordes, la geometría, la jerarquía tipográfica y las paletas de diagramas:

| Familia | Estilo y Sensación Visual | Geometría | Tipografía | Ideal Para |
| :--- | :--- | :--- | :--- | :--- |
| **`atlas`** *(predeterminado)* | Textura mineral, rieles laterales en cobalto, jerarquía precisa | Esquinas medidas de 6–16px | Sans-serif del sistema local | Bibliotecas de código, productos SaaS, APIs |
| **`blueprint`** | Papel cuadriculado técnico, líneas de rejilla, señales vibrantes en coral | Esquinas cuadradas | Sans-serif técnica del sistema | Especificaciones de arquitectura, RFCs, frameworks |
| **`terminal`** | Consola de alto contraste, cursores en fósforo verde, marco compacto | Esquinas vivas de 0–2px | Monoespaciada local en títulos y utilidades | Herramientas de CLI, runbooks de DevOps, manuales |
| **`editorial`** | Papel cálido, acentos en ladrillo, líneas en tinta, ritmo de lectura amplio | Esquinas comedidas de 2–4px | Serifada local Palatino / Georgia | Manuales de equipo, ensayos, guías extensas, libros |
| **`botanical`** | Tela de libro en salvia, detalles en helecho, estilo cuaderno de campo | Notas asimétricas en forma de hoja | Títulos en Palatino, cuerpo en sans-serif | Notas de investigación, recursos de aprendizaje, guías |
| **`studio`** | Papel lila, tinta violeta, marcos estilo impresión offset | Paneles enmarcados, sombras duras | Arial Black local / display, sans en cuerpo | Sistemas de diseño, documentación de productos creativos |

Las seis familias admiten modos claro, oscuro y automático, además de densidad cómoda y compacta. Las fuentes utilizan pilas de fuentes del sistema local: no se realiza ninguna petición de red externa, incluso en exportaciones offline. Usa el menú de **Apariencia** para previsualizar y elegir una familia; tu preferencia se guarda en el origen del navegador actual.

### Colores de Marca Personalizados
Aunque cada familia define combinaciones armónicas de manera automática, puedes sobrescribir el color de acento principal de acción:

```json title="docs.json"
{
  "theme": {
    "family": "atlas",
    "accentColor": "#6366f1",
    "accentColorDark": "#818cf8"
  }
}
```

### Ajustes Preestablecidos de Favicon Integrados
Elige entre cinco favicons SVG nítidos y autocontenidos que se adaptan a temas claros y oscuros del navegador y se incrustan automáticamente en los paquetes offline:

| Favicon | Descripción | Estética |
| :--- | :--- | :--- |
| `"default"` | Documento moderno doblado con la flecha distintiva hacia abajo (`↓`) en gradiente índigo/violeta | Marca oficial de DocMeDown |
| `"markdown"` | Emblema redondeado oscuro con la `M` blanca y flecha azul celeste | Documentación centrada en Markdown |
| `"terminal"` | Consola obsidiana con controles de ventana y cursor esmeralda (`>_`) | CLIs de desarrollo y herramientas técnicas |
| `"book"` | Libro abierto en azul real vibrante | Guías, manuales y bibliotecas de referencia |
| `"minimal"` | Hexágono geométrico y destello en obsidiana y cian | Herramientas minimalistas o corporativas |

---

## 📖 Referencia Integral de Parámetros

### Propiedades de la Raíz

| Campo | Tipo | Predeterminado | Descripción |
| :--- | :--- | :--- | :--- |
| `name` | `string` | `"DocMeDown"` | Nombre del proyecto mostrado en la barra superior y título de las páginas. |
| `tagline` | `string` | `""` | Subtítulo mostrado en modales de búsqueda y metadatos. |
| `description` | `string` | `""` | Descripción global de reserva usada para SEO y tarjetas de redes sociales. |
| `version` | `string` | `""` | Versión de lanzamiento mostrada como insignia junto al logotipo. |
| `home` | `string` | `"README.md"` | Documento inicial que se abre al hacer clic en el nombre o icono de inicio. |
| `url` | `string` | `""` | URL canónica de producción (activa la generación de `sitemap.xml` y `robots.txt`). |

#### Página de Inicio de la Documentación (`"home"`)
Fija el documento de portada del sitio explícitamente con `"home"`:

```json title="docs.json"
{
  "home": "PROJECT.md"
}
```

Cuando `"home"` no está configurado explícitamente, DocMeDown lo resuelve automáticamente a partir de los archivos en la raíz de la documentación en este orden:
1. `README.md`, `PROJECT.md`, `ABOUT.md` o `INDEX.md` (respetando mayúsculas y minúsculas).
2. Los mismos nombres sin distinción de mayúsculas (`readme.md`, `index.md`).
3. En caso contrario, el primer documento Markdown en orden alfabético del corpus.

---

### Objeto `theme`

| Campo | Tipo | Predeterminado | Descripción |
| :--- | :--- | :--- | :--- |
| `family` | `"atlas" \| "blueprint" \| "terminal" \| "editorial" \| "botanical" \| "studio"` | `"atlas"` | Sistema de diseño visual. |
| `density` | `"comfortable" \| "compact"` | `"comfortable"` | Controla la altura de la barra superior, margen de la barra lateral y espaciado de contenido. |
| `defaultMode` | `"auto" \| "light" \| "dark"` | `"auto"` | Modo de color inicial para nuevos visitantes. |
| `codeTheme` | `"github" \| "one-dark" \| "dracula" \| "synthwave"` | `"github"` | Tema de color para el resaltado de sintaxis de código. |
| `favicon` | `string` | `"default"` | Nombre del ajuste preestablecido integrado o ruta relativa a un archivo SVG/PNG local. |
| `accentColor` | `string (CSS Hex)` | Valor de la familia | Color de acento para el modo claro. |
| `accentColorDark` | `string (CSS Hex)` | `accentColor` | Color de acento para el modo oscuro. |
| `logo.light` | `string` | `""` | Ruta a la imagen del logotipo para el modo claro. |
| `logo.dark` | `string` | `""` | Ruta a la imagen del logotipo para el modo oscuro. |

---

### Array `nav`

Define los enlaces que aparecen en la barra de navegación superior:

```json title="docs.json"
"nav": [
  { "label": "Guías", "href": "#/guides/installation" },
  { "label": "API", "href": "#/api" },
  { "label": "GitHub", "href": "https://github.com/my-org/my-project", "external": true }
]
```

---

### Array `sidebar` (Jerarquía Personalizada Explícita)

Define agrupaciones de categorías exactas, iconos e insignias:

```json title="docs.json"
"sidebar": [
  {
    "title": "Primeros Pasos",
    "icon": "🚀",
    "children": [
      { "title": "Visión General", "path": "README.md", "icon": "⚡" },
      { "title": "Inicio Rápido", "path": "getting-started.md", "icon": "🚀", "badge": "Esencial", "badgeType": "success" }
    ]
  },
  {
    "title": "Avanzado",
    "icon": "⚙️",
    "collapsed": true,
    "children": [
      { "title": "CLI", "path": "guides/cli-reference.md", "icon": "💻" }
    ]
  }
]
```

---

### Objeto `source` (Repositorios Git Remotos)

| Campo | Tipo | Predeterminado | Descripción |
| :--- | :--- | :--- | :--- |
| `type` | `"github" \| "gitlab"` | `"github"` | Proveedor de alojamiento Git. |
| `repo` | `string` | *(requerido)* | Repositorio en formato `"propietario/nombre-repo"`. |
| `branch` | `string` | `"main"` | Rama de la que extraer los documentos. |
| `docsDir` | `string` | `""` | Subdirectorio que contiene la documentación (ej.: `"docs"`). |
| `token` | `string` | `""` | Token de acceso opcional para repositorios privados. |

---

### Objeto `autoIndex`

| Campo | Tipo | Predeterminado | Descripción |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Descubre e indexa automáticamente todos los archivos Markdown. |
| `sort` | `"natural" \| "alphabetical" \| "frontmatter"` | `"natural"` | Estrategia de ordenación para la barra lateral. |
| `defaultCollapsed`| `boolean` | `false` | Si las carpetas anidadas comienzan colapsadas en la barra lateral. |
| `exclude` | `string[]` | `["node_modules", ".git", ".dmd"]` | Directorios ignorados durante el escaneo. |

---

### Objeto `search`

| Campo | Tipo | Predeterminado | Descripción |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Habilita la paleta de comandos de búsqueda aproximada (<Kbd>⌘K</Kbd>). |
| `placeholder` | `string` | `"Buscar en la documentación (⌘K)..."` | Texto de marcador de posición en el buscador. |
| `maxResults` | `number` | `10` | Cantidad máxima de resultados mostrados. |

---

### Objeto `offline`

| Campo | Tipo | Predeterminado | Descripción |
| :--- | :--- | :--- | :--- |
| `embedNestedDocs` | `boolean` | `true` | Si se deben incrustar subsitios de documentación en el archivo único offline. |

---

### Objeto `footer`

```json title="docs.json"
{
  "footer": {
    "copyright": "© 2026 Mi Equipo. Publicado bajo la Licencia MIT.",
    "showBuiltWith": true,
    "links": [
      { "label": "Política de Privacidad", "href": "https://example.com/privacy", "external": true },
      { "label": "Términos de Servicio", "href": "https://example.com/terms", "external": true }
    ]
  }
}
```

---

## 🗺️ Próximos Pasos

Continúa con el recorrido lineal de la documentación:

<CardGrid cols={2}>
  <Card
    title="Matriz de Comandos de CLI"
    description="Aprende todas las opciones y flags de comandos para init, serve, build, validate y doctor."
    href="#/guides/cli-reference"
    badge="Siguiente"
    badgeType="info"
  />
  <Card
    title="Model Context Protocol (MCP)"
    description="Conecta Cursor, Claude Desktop y Windsurf a tu base de conocimiento de documentación."
    href="#/guides/mcp-server"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
