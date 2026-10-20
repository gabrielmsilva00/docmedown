---
title: Sitio Estático, SEO y Contexto para IA
description: Páginas estáticas pre-renderizadas, etiquetas de encabezado SEO automatizadas, sitemap.xml, llms.txt, SKILL.md y distribución de documentación nativa para IA.
order: 2
tags: [static, seo, sitemap, robots, llms, ai, mcp, agents, distribution]
---

# Sitio Estático, SEO y Contexto Nativo para IA 🌐🤖

DocMeDown está diseñado tanto para lectores humanos como para agentes de inteligencia artificial.

Cada ejecución del comando `docmedown build` genera **dos salidas paralelas a partir de una única fuente Markdown**:
1. El **entorno de ejecución reactivo en Svelte 5** para usuarios web interactivos (recarga rápida, búsqueda difusa, cambio de tema).
2. Un **sitio estático totalmente pre-renderizado** con etiquetas SEO en el encabezado, mapas de sitio y archivos de contexto estructurados para IA (`llms.txt`, `SKILL.md`).

---

## ⚡ Páginas HTML Estáticas Pre-renderizadas

Al ejecutar `npx docmedown build ./docs`, DocMeDown pre-renderiza cada archivo Markdown en un archivo HTML correspondiente:

```
docs/
├── index.html                   # Página de inicio pre-renderizada (desde README.md)
├── getting-started/
│   └── index.html               # Pre-renderizado /getting-started/
├── guides/
│   ├── cli-reference/
│   │   └── index.html           # Pre-renderizado /guides/cli-reference/
│   └── custom-components/
│       └── index.html           # Pre-renderizado /guides/custom-components/
├── 404.html                     # Página de error 404 personalizada
├── sitemap.xml                  # Mapa del sitio XML automatizado
└── robots.txt                   # Directivas para rastreadores de búsqueda
```

### Principales Ventajas:
- **Instant First Contentful Paint (FCP)**: Los usuarios visualizan el texto completo del artículo, avisos y bloques de código con resaltado antes de que cargue JavaScript.
- **Search Engine Optimization (SEO)**: Googlebot, Bing y motores de indexación rastrean HTML semántico íntegro sin necesidad de ejecutar JavaScript en el cliente.
- **Hidratación mediante PushState**: Una vez que el script del runtime arranca, hidrata el DOM y gestiona las transiciones posteriores mediante la API de historial del navegador (`pushState`) sin recargas por hash.

---

## 🔍 Metadatos SEO Automatizados y Tarjetas Sociales

DocMeDown genera la cabecera `<head>` completa para cada documento a partir de su frontmatter YAML y el archivo `docs.json`:

```html
<!-- Generado automáticamente en cada página pre-renderizada -->
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

<!-- Datos estructurados JSON-LD -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "CLI Command Reference",
  "description": "Complete guide to DocMeDown CLI commands..."
}
</script>
```

### Habilitar Generación de Sitemap y Robots:
Agregue el dominio canónico de su sitio a `docs.json`:

```json title="docs.json"
{
  "name": "My Project Docs",
  "url": "https://my-docs-domain.com"
}
```

DocMeDown genera de forma automática:
- `sitemap.xml` con las URL de los documentos y las fechas de última modificación disponibles.
- `robots.txt` apuntando a su archivo `sitemap.xml`.
- Excluye cualquier página que contenga `noindex: true` en su frontmatter.

---

### Paridad de URL canónicas

Configure `url` con la raíz del sitio publicado, incluido el subdirectorio del
proyecto, por ejemplo `https://docs.example.com/project`. Los metadatos canónicos
y sociales, sitemap, enlaces de IA y MCP `resolve_url` comparten la generación de URL.
`README` corresponde a `/project/`; `guides/start` a `/project/guides/start/`;
`README.fr` conserva `/project/README.fr/`. Solo el slug exacto `README` es la raíz.

Las URL terminan en `/`. Cada segmento del slug lógico se codifica una vez:
`guides/café` produce `/project/guides/caf%C3%A9/`. No codifique previamente los
slugs; espacios, `%`, `#` y `?` se tratan como caracteres del nombre, no como sintaxis de URL.
Sin `url`, IA y MCP usan rutas relativas a la raíz como `/guides/start/`; se omiten
los metadatos canónicos absolutos, sitemap y robots. La navegación interactiva
basada en hash no cambia.

### Las preferencias de descubrimiento no controlan el acceso

| Salida | `hidden: true` | `noindex: true` |
| :--- | :--- | :--- |
| Barra lateral automática | Excluido | Incluido |
| Búsqueda del navegador y sitemap | Excluido | Excluido |
| Metadatos robots estáticos | `noindex, nofollow` | `noindex, nofollow` |
| Exportaciones de IA y búsqueda MCP | Excluido | Incluido |

La barra lateral manual se conserva tal como se configuró. Ninguna opción elimina
la página del HTML generado, del contenido integrado/sin conexión, de MCP
`list_docs` o del acceso directo mediante `read_doc`. `noindex` no excluye las
exportaciones de IA. Estas preferencias no proporcionan autenticación ni privacidad:
no distribuya material confidencial en el corpus público.

---

## 🤖 Distribución de Contexto para IA (`llms.txt`, `SKILL.md`)

Los desarrolladores consultan documentación de manera continua mediante asistentes de programación con IA (Cursor, Claude, Copilot, ChatGPT). DocMeDown formatea el contenido para ingestión por modelos en cada compilación:

| Recurso de IA | Destinatarios | Contenido y Propósito |
| :--- | :--- | :--- |
| **`llms.txt`** | LLMs / Rastreadores web | Sigue el estándar de [llmstxt.org](https://llmstxt.org): índice conciso de cada página con títulos, enlaces y resúmenes. |
| **`llms-full.txt`** | Empaquetado de contexto | Toda la base documental recopilada en un único archivo Markdown limpio para transferir a sesiones de chat. |
| **`SKILL.md`** | Asistentes basados en agentes | Definición de habilidad para Antigravity / Claude Agent que permite a los agentes descubrir y usar la documentación de manera nativa. |
| **`okf.json`** | Indexación automatizada | Paquete JSON en formato Open Knowledge Format con encabezados estructurados, texto sin formato y metadatos. |

---

## 🛠️ Parámetros de Personalización de Build

```bash
# Compilación estándar de producción (genera páginas estáticas, SEO, contexto IA y paquete offline):
npx docmedown build ./docs

# Omitir la pre-renderización de páginas estáticas (únicamente recursos servibles):
npx docmedown build ./docs --no-static

# Omitir el paquete monofile offline:
npx docmedown build ./docs --no-single-file
```

> [!NOTE]
> **Protección de la Plantilla Personalizada**: Si mantiene un archivo `index.html` con scripts o analíticas personalizadas, DocMeDown lo detecta y **nunca sobrescribe su plantilla personalizada** durante las compilaciones.

---

## 🗺️ Próximos Pasos

Siga la ruta de documentación:

<CardGrid cols={2}>
  <Card
    title="Paquetes Monofile 100% Offline"
    description="Paquetes HTML autoextraíbles y autocontenidos para entornos aislados sin fallos de CORS."
    href="#/guides/offline-mode"
    badge="Siguiente"
    badgeType="info"
  />
  <Card
    title="Experiencia de Desarrollo y Editor de Última Generación"
    description="HMR real in situ, editor dividido en navegador (Ctrl+E) y previsualizaciones organizadas."
    href="#/guides/developer-experience"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
