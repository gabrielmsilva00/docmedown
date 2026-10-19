---
title: Primitivas de UI Nativas
description: "Referencia completa y documentación interactiva de propiedades para los 20 elementos de interfaz nativos de Markdown: CardGrid, Card, Tabs, Tab, Badge, Callout, Button, Media, Kbd y más."
order: 5
category: Creación de Contenido
tags: [componentes, nativos, primitivas, card, tabs, badge, callout, button, media, kbd, ui]
---

# Primitivas de UI Nativas 🧩

DocMeDown incluye una completa biblioteca de **20 primitivas de UI nativas** que puedes usar directamente en Markdown estándar sin instalar paquetes adicionales ni escribir sentencias de importación.

Cada elemento se estiliza según la familia de temas activa (`atlas`, `blueprint`, `terminal`, `editorial`, `botanical`, `studio`) y se adapta automáticamente a los modos claro y oscuro.

---

## 1. Tarjetas y Cuadrículas (`<CardGrid>`, `<Card>`)

Organiza características, enlaces, guías y rutas de navegación en cuadrículas adaptables de múltiples columnas.

### Sintaxis
```html
<CardGrid cols={2}>
  <Card
    title="Configuración Zero-Config"
    description="Añade index.html y escribe Markdown. Sin empaquetadores ni pasos de compilación."
    href="#/getting-started"
    icon="⚡"
    badge="Rápido"
    badgeType="success"
  />
  <Card
    title="Offline Air-Gapped"
    description="HTML en archivo único autodescomprimible con cero peticiones de red externas."
    href="#/guides/offline-mode"
    icon="📦"
    badge="Autónomo"
    badgeType="warning"
  />
</CardGrid>
```

### Renderizado en Vivo
<CardGrid cols={2}>
  <Card
    title="Configuración Zero-Config"
    description="Añade index.html y escribe Markdown. Sin empaquetadores ni pasos de compilación."
    href="#/getting-started"
    icon="⚡"
    badge="Rápido"
    badgeType="success"
  />
  <Card
    title="Offline Air-Gapped"
    description="HTML en archivo único autodescomprimible con cero peticiones de red externas."
    href="#/guides/offline-mode"
    icon="📦"
    badge="Autónomo"
    badgeType="warning"
  />
</CardGrid>

### Propiedades de `<Card>`
| Prop | Tipo | Predeterminado | Descripción |
| :--- | :--- | :--- | :--- |
| `title` | `string` | *(opcional)* | Encabezado mostrado en la parte superior de la tarjeta. |
| `description`| `string` | *(opcional)* | Texto del cuerpo descriptivo. |
| `href` | `string` | *(opcional)* | Destino de navegación. Si se especifica, renderiza la tarjeta como enlace interactivo. |
| `icon` | `string` | *(opcional)* | Emoji o icono mostrado junto al título. |
| `badge` | `string` | *(opcional)* | Etiqueta corta renderizada como insignia de color. |
| `badgeType` | `string` | `"info"` | Variante de color de la insignia: `info`, `success`, `warning` o `new`. |
| `color` | `string` | `"blue"` | Color opcional de acento del borde (`blue`, `violet`, `amber`, `green`, `rose`). |

---

## 2. Pestañas y Paneles de Código (`<Tabs>`, `<Tab>`)

Muestra ejemplos de código alternativos (ej.: `npm` vs `pnpm` vs `bun`), guías paso a paso o variaciones entre plataformas.

DocMeDown admite 4 variantes visuales: `pills`, `underline`, `postit` y `recessed`.

### 2.1 Estilo Pills (`type="pills"`)
````html
<Tabs type="pills">
  <Tab label="npm" icon="📦">
```bash
npm install -g docmedown
```
  </Tab>
  <Tab label="pnpm" icon="⚡">
```bash
pnpm add -g docmedown
```
  </Tab>
  <Tab label="bun" icon="🥟">
```bash
bun add -g docmedown
```
  </Tab>
</Tabs>
````

<Tabs type="pills">
  <Tab label="npm" icon="📦">
```bash
npm install -g docmedown
```
  </Tab>
  <Tab label="pnpm" icon="⚡">
```bash
pnpm add -g docmedown
```
  </Tab>
  <Tab label="bun" icon="🥟">
```bash
bun add -g docmedown
```
  </Tab>
</Tabs>

---

### 2.2 Estilo Underline (`type="underline"`)
````html
<Tabs type="underline">
  <Tab label="JavaScript">
```javascript
console.log("¡Hola desde DocMeDown!");
```
  </Tab>
  <Tab label="TypeScript">
```typescript
const saludo: string = "¡Hola desde DocMeDown!";
console.log(saludo);
```
  </Tab>
</Tabs>
````

<Tabs type="underline">
  <Tab label="JavaScript">
```javascript
console.log("¡Hola desde DocMeDown!");
```
  </Tab>
  <Tab label="TypeScript">
```typescript
const saludo: string = "¡Hola desde DocMeDown!";
console.log(saludo);
```
  </Tab>
</Tabs>

---

## 3. Insignias (`<Badge>`)

Indicadores inline para control de versiones, estado o categorías.

```html
<Badge type="info">Estable</Badge>
<Badge type="success">Aprobado</Badge>
<Badge type="warning">Obsoleto</Badge>
<Badge type="new">v0.9.0 Nuevo</Badge>
```

### Renderizado en Vivo
<Badge type="info">Estable</Badge> &nbsp;
<Badge type="success">Aprobado</Badge> &nbsp;
<Badge type="warning">Obsoleto</Badge> &nbsp;
<Badge type="new">v0.9.0 Nuevo</Badge>

---

## 4. Atajos de Teclado (`<Kbd>`)

Muestra atajos de teclado limpios y adaptables a la plataforma.

```html
Pulsa <Kbd>⌘K</Kbd> o <Kbd>Ctrl+K</Kbd> para abrir la búsqueda global.
Pulsa <Kbd>Ctrl+E</Kbd> o <Kbd>⌘E</Kbd> para abrir el editor en pantalla dividida.
Pulsa <Kbd>Esc</Kbd> para cerrar modales.
```

### Renderizado en Vivo
Pulsa <Kbd>⌘K</Kbd> o <Kbd>Ctrl+K</Kbd> para abrir la búsqueda global.  
Pulsa <Kbd>Ctrl+E</Kbd> o <Kbd>⌘E</Kbd> para abrir el editor en pantalla dividida.  
Pulsa <Kbd>Esc</Kbd> para cerrar modales.

---

## 5. Callouts (`<Callout>`)

Complementando las citas de alerta de GitHub (`> [!NOTE]`), el componente `<Callout>` permite títulos personalizados explícitos y contenido colapsable.

```html
<Callout type="tip" title="Consejo Pro: Navegación Rápida">
Puedes saltar directamente a cualquier documento pulsando <Kbd>⌘K</Kbd> y escribiendo palabras clave de su título.
</Callout>
```

### Renderizado en Vivo
<Callout type="tip" title="Consejo Pro: Navegación Rápida">
Puedes saltar directamente a cualquier documento pulsando <Kbd>⌘K</Kbd> y escribiendo palabras clave de su título.
</Callout>

---

## 6. Botones de Acción (`<Button>`)

Botones destacados de llamada a la acción para descargas, enlaces a repositorios o herramientas externas.

```html
<Button href="https://github.com/gabrielmsilva00/docmedown" variant="primary">
  Estrella en GitHub ⭐
</Button>
<Button href="#/getting-started" variant="secondary">
  Leer Inicio Rápido 🚀
</Button>
```

### Renderizado en Vivo
<Button href="https://github.com/gabrielmsilva00/docmedown" variant="primary">
  Estrella en GitHub ⭐
</Button> &nbsp;
<Button href="#/getting-started" variant="secondary">
  Leer Inicio Rápido 🚀
</Button>

---

## 7. Componente de Medios (`<Media>`)

Aunque la sintaxis estándar de Markdown (`![alt](url)`) admite enlaces básicos a imágenes, la primitiva `<Media>` ofrece opciones avanzadas de estilo, detección automática de formato, gestión de reservas, reproductores de audio/vídeo e **incrustación en compilación offline**.

Al compilar el paquete offline en archivo único (`index.html`), todos los medios referenciados por `<Media>` (y las imágenes estándar de Markdown) se convierten automáticamente **sin pérdidas** en Data URIs Base64 compatibles offline, generando un distribuible 100% autocontenido.

### 7.1 Ejemplos de Imágenes y Vectores
```html
<!-- Imagen rasterizada con estilos -->
<Media
  src="./assets/hero.png"
  alt="Visión General de la Arquitectura"
  width="100%"
  maxWidth="720px"
  rounded="md"
  shadow="sm"
  align="center"
  caption="Pipeline de arquitectura de alto rendimiento de DocMeDown"
/>

<!-- Vector SVG con incrustación directa en el DOM -->
<Media
  src="./assets/diagram.svg"
  format="svg"
  embed="inline"
  width="480px"
  align="center"
/>
```

### 7.2 Reproductores de Vídeo y Audio con Reservas
```html
<!-- Reproductor de vídeo con imagen de reserva y controles personalizados -->
<Media
  src="./assets/demo.mp4"
  type="video/mp4"
  fallback="./assets/poster.jpg"
  poster="./assets/poster.jpg"
  controls={true}
  width="100%"
  maxWidth="800px"
  rounded="lg"
  shadow="md"
/>

<!-- Reproductor de audio con mensaje textual de reserva -->
<Media
  src="./assets/podcast.mp3"
  format="audio/mpeg"
  fallback="La reproducción de audio no es compatible con tu navegador."
  controls
  align="left"
/>
```

### Propiedades de `<Media>`
| Prop | Tipo | Predeterminado | Descripción |
| :--- | :--- | :--- | :--- |
| `src` | `string` | `""` | URL del medio, ruta relativa o Data URI. |
| `type` / `format` | `string` | `""` | Tipo MIME explícito (ej.: `video/mp4`, `image/png`) o indicación de formato (`image`, `vector`, `video`, `audio`, `svg`). |
| `fallback` | `string` | `""` | URL de reserva (imagen/vídeo/audio) o texto si el recurso principal falla. |
| `fallbackText` | `string` | `""` | Mensaje de error personalizado en la tarjeta de reserva ante fallos de carga. |
| `poster` | `string` | `""` | URL de la imagen de póster para reproductores de vídeo. |
| `alt` | `string` | `""` | Texto alternativo accesible. |
| `title` | `string` | `""` | Atributo tooltip de título. |
| `width` / `height` | `string \| number` | *(auto)* | Dimensiones (ej.: `"100%"`, `"480px"`, `480`). |
| `maxWidth` / `maxHeight` | `string \| number` | *(ninguno)* | Restricción de dimensión máxima. |
| `aspectRatio` | `string` | *(ninguno)* | Relación de aspecto CSS (ej.: `"16/9"`, `"4/3"`, `"1/1"`). |
| `objectFit` | `string` | *(inicial)* | Ajuste del objeto (`"contain"`, `"cover"`, `"fill"`, `"none"`, `"scale-down"`). |
| `align` | `string` | `"center"` | Alineación en el diseño: `"left"`, `"center"` o `"right"`. |
| `rounded` / `radius` | `boolean \| string` | *(ninguno)* | Radio de borde (`true`, `"sm"`, `"md"`, `"lg"`, `"full"` o valor `"12px"`). |
| `shadow` | `boolean \| string` | *(ninguno)* | Sombra (`true`, `"sm"`, `"md"`, `"lg"` o cadena CSS personalizada). |
| `border` | `boolean \| string` | *(ninguno)* | Borde (`true` para borde de tema o borde CSS personalizado). |
| `caption` | `string` | `""` | Texto del pie de foto renderizado en un `<figcaption>`. |
| `captionAlign` | `string` | `"center"` | Alineación del pie de foto (`"left"`, `"center"`, `"right"`). |
| `controls` | `boolean` | `true` | Muestra controles de reproducción para vídeo y audio. |
| `autoplay` | `boolean` | `false` | Reproducción automática. |
| `loop` | `boolean` | `false` | Reproducción continua en bucle. |
| `muted` | `boolean` | `false` | Silencia la salida de audio. |
| `playsinline` | `boolean` | `true` | Reproducción en línea en dispositivos móviles. |
| `preload` | `string` | `"metadata"` | Estrategia de precarga (`"auto"`, `"metadata"`, `"none"`). |
| `embed` | `string \| boolean` | *(auto)* | Modo de incrustación offline: `"base64"` (predeterminado), `"inline"` (SVG sin procesar) o `false` para desactivar. |
| `zoomable` | `boolean` | `false` | Zoom interactivo al hacer clic en imágenes. |

---

## 🗺️ Próximos Pasos

Continúa con el recorrido lineal de la documentación:

<CardGrid cols={2}>
  <Card
    title="Componentes Personalizados (.dmd)"
    description="Crea componentes interactivos con Svelte 5, React TSX o Web Elements."
    href="#/guides/custom-components"
    badge="Siguiente"
    badgeType="info"
  />
  <Card
    title="Diagramas Mermaid"
    description="Explora diagramas de arquitectura interactivos con sincronización automática de temas."
    href="#/guides/mermaid-diagrams"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
