---
title: Características de Markdown y Matemáticas
description: Referencia completa para alertas de GitHub, resaltado avanzado de sintaxis, diagramas interactivos Mermaid, fórmulas matemáticas en KaTeX y tablas interactivas con CSV/TSV.
order: 5
tags: [markdown, sintaxis, prism, mermaid, katex, alertas, diagramas, matemáticas, tablas, csv]
---

# Características de Markdown, Diagramas y Matemáticas 📝

DocMeDown admite nativamente GitHub Flavored Markdown (GFM), resaltado inteligente de sintaxis con enfoque a nivel de línea, matemáticas en LaTeX mediante KaTeX, diagramas de arquitectura interactivos con Mermaid y tablas interactivas con controles de copia y bloques de datos CSV/TSV.

---

## 1. Alertas de Callout Estilo GitHub

Utiliza las citas de bloque estándar de GitHub para destacar notas importantes, consejos y advertencias:

```markdown
> [!NOTE]
> Contexto informativo y detalles útiles de fondo.

> [!TIP]
> Consejos profesionales, optimizaciones de rendimiento y buenas prácticas.

> [!IMPORTANT]
> Instrucciones críticas o pasos de configuración obligatorios.

> [!WARNING]
> Advertencias sobre problemas comunes, funciones obsoletas o cambios disruptivos.

> [!CAUTION]
> Operaciones de alto riesgo, posible pérdida de datos o precauciones de seguridad.
```

### Alertas Renderizadas en Vivo:

> [!NOTE]
> Contexto informativo y detalles útiles de fondo.

> [!TIP]
> Pulsa <Kbd>Alt+D</Kbd> o abre **Apariencia** en la barra superior para previsualizar el sitio entre las familias de temas Atlas, Blueprint, Terminal, Editorial, Botanical y Studio.

> [!IMPORTANT]
> Los archivos `.md` y `.mdx` se descubren e indexan automáticamente. Para componentes interactivos, coloca archivos `.svelte`, `.tsx` o `.ts` dentro de `.dmd/`.

> [!WARNING]
> No confirmes tokens de API privados ni credenciales en repositorios públicos.

> [!CAUTION]
> Sobrescribir archivos existentes durante la compilación reemplazará su contenido.

---

## 2. Bloques de Código Avanzados y Resaltado de Sintaxis

DocMeDown incluye un renderizador personalizado de bloques de código compatible con títulos, resaltado de líneas y controles de copia.

### 2.1 Títulos de Archivo y Extensiones Coloreadas
Prefija tu bloque de código con `title="ruta/al/archivo.ext"`. Las carpetas se atenúan y la extensión del archivo recibe un color distintivo según el lenguaje:

````markdown
```typescript title="src/runtime/router.ts"
export class HashRouter {
  constructor(public defaultDoc: string) {}

  public navigate(slug: string) {
    window.location.hash = `#/${slug}`;
  }
}
```
````

```typescript title="src/runtime/router.ts"
export class HashRouter {
  constructor(public defaultDoc: string) {}

  public navigate(slug: string) {
    window.location.hash = `#/${slug}`;
  }
}
```

### 2.2 Resaltado de Líneas `{n, n-m}`
Añade números de línea o rangos para destacar líneas específicas con una barra de acento y un fondo enfocado:

````markdown
```javascript {2,4-5} title="pipeline.js"
const input = "Raw Markdown";
const parsed = parseMarkdown(input); // ¡Resaltada!
const tree = buildNavigationTree(parsed);
const staticHtml = prerenderStatic(tree); // ¡Resaltada!
const offlineBundle = buildSingleFile();   // ¡Resaltada!
```
````

```javascript {2,4-5} title="pipeline.js"
const input = "Raw Markdown";
const parsed = parseMarkdown(input);
const tree = buildNavigationTree(parsed);
const staticHtml = prerenderStatic(tree);
const offlineBundle = buildSingleFile();
```

> [!TIP]
> **Copia Enfocada**: Cuando el resaltado de líneas está activo, aparece un segundo icono de copia en la barra de herramientas, lo que permite a los lectores copiar **únicamente las líneas resaltadas** con un solo clic.

---

## 3. Diagramas de Arquitectura Interactivos con Mermaid

Renderiza diagramas de flujo, diagramas de secuencia, diagramas de clases, diagramas de estado y modelos entidad-relación de forma nativa.

````markdown
```mermaid
graph TD
    subgraph Sources ["1. Fuentes"]
        A[Archivos Markdown Locales]
        B[Repositorio Git Remoto]
    end

    subgraph Engine ["2. Motor DocMeDown"]
        C[Autoindexador Zero-Config]
        D[Runtime Svelte 5 con Runes]
        E[Componentes Personalizados .dmd]
    end

    subgraph Targets ["3. Salidas Finales"]
        F[Servidor Dev en Vivo con HMR]
        G[Sitio Estático Prerenderizado (SEO)]
        H[HTML en Archivo Único 100% Offline]
    end

    A --> C
    B --> C
    C --> D
    E --> D
    D --> F
    D --> G
    D --> H
```
````

```mermaid
graph TD
    subgraph Sources ["1. Fuentes"]
        A[Archivos Markdown Locales]
        B[Repositorio Git Remoto]
    end

    subgraph Engine ["2. Motor DocMeDown"]
        C[Autoindexador Zero-Config]
        D[Runtime Svelte 5 con Runes]
        E[Componentes Personalizados .dmd]
    end

    subgraph Targets ["3. Salidas Finales"]
        F[Servidor Dev en Vivo con HMR]
        G[Sitio Estático Prerenderizado (SEO)]
        H[HTML en Archivo Único 100% Offline]
    end

    A --> C
    B --> C
    C --> D
    E --> D
    D --> F
    D --> G
    D --> H
```

### Características de los Diagramas:
- **Estilo Adaptable al Tema**: Los diagramas adaptan su paleta de colores automáticamente a la familia de temas activa (`atlas`, `blueprint`, `terminal`, `editorial`, `botanical`, `studio`) y a los modos claro/oscuro.
- **Controles Interactivos de Cámara**: Arrastra el espacio vacío para moverte, usa la rueda del ratón o el gesto de pellizco para zoom, haz clic en 1:1 para restablecer o pulsa el icono de pantalla completa.
- **Copia de Subgrafos**: Pasa el cursor sobre los subgrafos para copiar secciones aisladas del diagrama directamente al portapapeles.
- **Autosuficiencia Offline**: Funciona de forma idéntica tanto en servidores de desarrollo locales como en manuales HTML de archivo único `file:///` aislados.

---

## 4. Matemáticas en LaTeX (KaTeX)

Renderiza fórmulas matemáticas en línea con `$ ... $` o ecuaciones en bloque con `$$ ... $$`:

### Matemáticas en Línea:
````markdown
La identidad de Euler es $e^{i\pi} + 1 = 0$, conectando las constantes fundamentales.
````
La identidad de Euler es $e^{i\pi} + 1 = 0$, conectando las constantes fundamentales.

### Ecuaciones Matemáticas en Bloque:
````markdown
$$
f(x) = \int_{-\infty}^\infty \hat f(\xi)\,e^{2 \pi i \xi x} \,d\xi
$$
````

$$
f(x) = \int_{-\infty}^\infty \hat f(\xi)\,e^{2 \pi i \xi x} \,d\xi
$$

> [!NOTE]
> La sintaxis matemática nunca se evalúa dentro de bloques de código o fragmentos de código en línea — expresiones como `` `$E = mc^2$` `` se mantienen como código literal.

---

## 5. Tablas Enriquecidas y Conjuntos de Datos CSV / TSV

DocMeDown convierte las tablas en bloques de datos interactivos. Cada tabla — ya sea escrita con la sintaxis habitual de barras verticales de GitHub Flavored Markdown (GFM) o mediante bloques compactos de CSV/TSV — ofrece tipografía limpia, desplazamiento horizontal adaptable y una barra de herramientas con menú **Copiar**.

### 5.1 Controles Interactivos de Copia de Tablas

Pasa el cursor o enfoca cualquier tabla para mostrar la barra de herramientas. El menú **Copiar** permite a los lectores exportar los datos exactos en un clic a su formato preferido:

- **Markdown**: Tabla con barras GFM y divisores alineados (`:---`, `:---:`, `---:`).
- **HTML**: Elementos semánticos limpios `<table>`, `<thead>` y `<tbody>` con atributos de alineación de texto.
- **CSV**: Valores separados por comas conformes con RFC 4180 con comillas cuando es necesario.

| Característica | Tablas Pipe | Bloques CSV / TSV | Tablas HTML |
| :--- | :---: | :---: | :---: |
| Sintaxis GFM Nativa | ✅ | ❌ | ❌ |
| Detección Automática de Delimitador | ❌ | ✅ (`,`, `;`, `\t`, `\|`) | ❌ |
| Alineación Numérica Automática | Manual | ✅ (Alineado a la derecha) | Manual |
| Menú Copiar (MD / HTML / CSV) | ✅ | ✅ | ❌ |

### 5.2 Declaración de Tablas Mediante Bloques CSV y TSV

En lugar de dar formato laboriosamente a barras ASCII, puedes expresar conjuntos de datos directamente usando bloques estándar ```` ```csv ```` o ```` ```tsv ````:

````markdown
```csv title="Benchmarks del Motor DocMeDown"
Tarea,Tiempo (ms),Rendimiento,Estado
Escaneo en Frío del Manifiesto,14.2,420 archivos/s,Verificado
Prerenderizado Estático SEO,48.6,120 páginas/s,Verificado
Empaquetado Archivo Único,82.1,1 paquete/s,Óptimo
```
````

```csv title="Benchmarks del Motor DocMeDown"
Tarea,Tiempo (ms),Rendimiento,Estado
Escaneo en Frío del Manifiesto,14.2,420 archivos/s,Verificado
Prerenderizado Estático SEO,48.6,120 páginas/s,Verificado
Empaquetado Archivo Único,82.1,1 paquete/s,Óptimo
```

### 5.3 Opciones de Bloques y Delimitadores

Personaliza bloques delimitados utilizando parámetros opcionales:

- `title="..."`: Muestra un título en la barra de herramientas de la tabla.
- `delimiter=";"` o `delimiter=tab` / `delimiter=pipe`: Define un delimitador explícito. Si se omite, DocMeDown detecta automáticamente `,`, `;`, `\t` o `|`.
- `header=false`: Trata la primera línea como datos normales en lugar de encabezado `<th>`.
- `markdown=true`: Analiza el contenido de las celdas con el parser de Markdown en línea (permitiendo negrita, fragmentos de código, enlaces e insignias dentro de las celdas).

````markdown
```csv delimiter=";" title="Semántica e Insignias" markdown=true
Componente;Tipo;Predeterminado;Descripción
`<Card />`;Componente Interactivo;Ninguno;Contenedor de tarjeta de contenido
`<Badge />`;Insignia Inline;`info`;Píldora de estado coloreada
`<Callout />`;Bloque de Alerta;`note`;Banner de alerta estilo GitHub
```
````

```csv delimiter=";" title="Semántica e Insignias" markdown=true
Componente;Tipo;Predeterminado;Descripción
`<Card />`;Componente Interactivo;Ninguno;Contenedor de tarjeta de contenido
`<Badge />`;Insignia Inline;`info`;Píldora de estado coloreada
`<Callout />`;Bloque de Alerta;`note`;Banner de alerta estilo GitHub
`<Media />`;Primitiva de Medios;`center`;Reproductor de imagen, vector, vídeo y audio
```

---

## 6. Integración de Medios y Audio/Vídeo (`<Media>`)

Aunque la sintaxis estándar de Markdown admite imágenes simples mediante `![alt](url)`, DocMeDown proporciona el componente **`<Media>`** para estilizado avanzado de medios, reproductores HTML5 de vídeo y audio, indicaciones de formato, reservas elegantes e **incrustación offline sin pérdidas**.

### 6.1 Comparación de Markdown Estándar vs `<Media>`

| Capacidad | Markdown Estándar (`![]()`) | Componente `<Media />` |
| :--- | :---: | :---: |
| Imágenes Rasterizadas (PNG, JPG, WebP, GIF) | ✅ | ✅ |
| Gráficos Vectoriales (SVG, DOM Inline) | ⚠️ *(limitado)* | ✅ |
| Reproductores de Vídeo (MP4, WebM, OGG) | ❌ | ✅ *(controles HTML5, póster)* |
| Reproductores de Audio (MP3, WAV, FLAC) | ❌ | ✅ *(reproducción HTML5)* |
| Restricciones de Ancho / Alto / Máximo | ❌ | ✅ |
| Relación de Aspecto y Ajuste de Objeto | ❌ | ✅ |
| Alineación y Subtítulos Semánticos | ❌ | ✅ *(<figcaption>)* |
| Radio de Esquina y Sombras de Elevación | ❌ | ✅ |
| Detección de Formato e Indicaciones | ❌ | ✅ |
| Recurso de Reserva / Tarjeta de Error | ❌ | ✅ |
| Incrustación Offline Sin Pérdidas | ✅ | ✅ *(con control `embed`)* |

### 6.2 Sintaxis y Uso
```html
<!-- Imagen rasterizada o vectorial mejorada con pie de foto y sombra -->
<Media
  src="./assets/architecture.png"
  alt="Diagrama del Sistema"
  width="100%"
  maxWidth="640px"
  rounded="md"
  shadow="md"
  align="center"
  caption="Pipeline de renderizado de alto rendimiento de DocMeDown"
/>

<!-- Reproductor de Vídeo HTML5 con póster y reserva -->
<Media
  src="./assets/demo.mp4"
  type="video/mp4"
  poster="./assets/poster.jpg"
  controls
  maxWidth="720px"
  aspectRatio="16/9"
/>

<!-- Reproductor de Audio con mensaje de error personalizado -->
<Media
  src="./assets/narrative.mp3"
  format="audio/mpeg"
  controls
  fallbackText="El archivo de audio no está accesible."
/>
```

---

## 7. Referencia de Frontmatter YAML

Añade frontmatter YAML al inicio de cualquier archivo `.md` para personalizar el título de la página, el orden en la barra lateral, las etiquetas y los metadatos SEO:

```yaml
---
title: Guía Avanzada de Arquitectura
sidebar_label: Arquitectura
order: 1
icon: 🏛️
badge: v0.9.0
badge_type: success
description: Inmersión técnica integral en el pipeline de compilación de DocMeDown.
tags: [arquitectura, core, svelte]
hidden: false
noindex: false
---
```

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `title` | `string` | Título del documento mostrado en la barra superior, migas de pan y pestaña del navegador. |
| `sidebar_label` | `string` | Etiqueta abreviada usada en la barra lateral de navegación. |
| `order` | `number` | Posición de ordenación dentro de su categoría / sección (ascendente). |
| `icon` | `string` | Emoji o icono mostrado junto al nombre de la página en la barra lateral. |
| `badge` | `string` | Píldora de texto mostrada junto al enlace de la página en la barra lateral. |
| `badge_type` | `string` | Variante de la insignia: `info`, `success`, `warning` o `danger`. |
| `description` | `string` | Descripción de la página utilizada para metadatos SEO y tarjetas sociales. |
| `tags` | `string[]` | Palabras clave indexadas en la búsqueda aproximada. |
| `hidden` | `boolean` | Si es `true`, oculta el documento de la navegación y de la búsqueda. |
| `noindex` | `boolean` | Si es `true`, añade la etiqueta `noindex` para motores de búsqueda y lo omite de `sitemap.xml`. |

---

## 🗺️ Próximos Pasos

Continúa con el recorrido lineal de la documentación:

<CardGrid cols={2}>
  <Card
    title="Diagramas Mermaid"
    description="Explora diagramas de arquitectura interactivos con sincronización automática de temas."
    href="#/guides/mermaid-diagrams"
    badge="Siguiente"
    badgeType="info"
  />
  <Card
    title="Arquitectura del Motor"
    description="Comprende el cargador virtual, el runtime Svelte 5 y el enrutamiento en modo dual."
    href="#/guides/architecture"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
