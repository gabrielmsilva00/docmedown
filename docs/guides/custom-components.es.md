---
title: Componentes Personalizados (`.dmd/.components/`)
description: Crea componentes interactivos personalizados en Svelte 5, React TSX o Web Elements, y explora las primitivas de UI nativas.
order: 4
tags: [componentes, custom-elements, svelte, react, tsx, lit, primitivas, interactivo]
---

# Componentes Personalizados (`.dmd/.components/`) 🧩

DocMeDown proporciona una **Capa Universal de Compatibilidad de Componentes** que te permite incorporar widgets interactivos a tu documentación usando **Svelte 5**, **React con TypeScript (TSX)** o **Web Elements estándar (Lit)** — con registro automático, variables CSS compartidas y cero configuración de compilación.

---

## 🏗️ 1. El Directorio `.dmd/.components/`

Para crear un componente personalizado, coloca cualquier archivo `.svelte`, `.tsx` o `.ts` en `.dmd/.components/` dentro de tu directorio de documentación (el uso directo de `.dmd/` sigue funcionando como fallback):

```
docs/
├── .dmd/.config/docs.json
├── README.md
└── .dmd/.components/
    ├── StatusWidget.svelte       # Componente Svelte 5 -> <StatusWidget />
    ├── MetricCard.tsx            # Componente React TSX  -> <MetricCard />
    └── ClusterPill.ts            # Web Element / Lit   -> <ClusterPill />
```

Cualquier componente creado en `.dmd/.components/` queda **disponible inmediatamente como etiqueta tipo HTML en cualquier documento Markdown**:

```markdown
# Panel en Vivo

Revisa el estado de nuestro clúster a continuación:

<StatusWidget environment="production" />
<MetricCard label="Rendimiento" initial={4500} unit="req/s" />
<ClusterPill status="healthy" region="us-east-1" />
```

---

## 🎨 2. Creación en Svelte 5 (Runes Nativas)

Los componentes de Svelte 5 ofrecen el rendimiento más veloz y la huella de paquete más reducida. Utiliza runes modernas (`$state`, `$derived`, `$props`) y declara el nombre de etiqueta del custom element:

```svelte title="docs/.dmd/InteractiveCounter.svelte"
<svelte:options customElement="dmd-interactive-counter" />

<script lang="ts">
  let { title = "Contador", step = 1 }: { title?: string; step?: number } = $props();
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>

<div class="counter-box">
  <div class="readout">
    <strong>{title}</strong>: {count} (Doble: {doubled})
  </div>
  <div class="actions">
    <button onclick={() => count += step}>+{step}</button>
    <button onclick={() => count = 0}>Reiniciar</button>
  </div>
</div>

<style>
  .counter-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-radius: 8px;
    background: var(--dmd-bg-card, #1e1e2e);
    border: 1px solid var(--dmd-border-color, #333);
    margin: 1.5rem 0;
  }
  .readout {
    color: var(--dmd-text-primary, #fff);
    font-size: 0.95rem;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  button {
    padding: 6px 14px;
    border-radius: 6px;
    background: var(--dmd-primary, #6366f1);
    color: white;
    border: none;
    cursor: pointer;
    font-weight: 500;
  }
  button:hover {
    filter: brightness(1.1);
  }
</style>
```

---

## ⚛️ 3. Creación en React TSX (`.tsx`)

Puedes escribir componentes personalizados directamente en React usando TypeScript. DocMeDown analiza las propiedades, asocia escuchadores de eventos y monta el componente en la página de manera transparente:

```tsx title="docs/.dmd/ReactMetricCard.tsx"
import React, { useState } from "react";

export interface MetricCardProps {
  label?: string;
  initial?: number;
  unit?: string;
}

export default function ReactMetricCard({
  label = "Latencia",
  initial = 42,
  unit = "ms",
}: MetricCardProps) {
  const [val, setVal] = useState(initial);

  return (
    <div style={{
      padding: "1rem 1.25rem",
      borderRadius: "8px",
      background: "var(--dmd-bg-card, #1e1e2e)",
      border: "1px solid var(--dmd-border-color, #333)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      margin: "1.5rem 0"
    }}>
      <div>
        <span style={{ color: "var(--dmd-text-muted, #888)", fontSize: "0.85rem" }}>{label}</span>
        <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--dmd-text-primary, #fff)" }}>
          {val} <small style={{ fontSize: "0.85rem" }}>{unit}</small>
        </div>
      </div>
      <button
        onClick={() => setVal(val + 5)}
        style={{
          padding: "6px 14px",
          borderRadius: "6px",
          background: "var(--dmd-primary, #6366f1)",
          color: "#fff",
          border: "none",
          cursor: "pointer"
        }}
      >
        Simular Pico
      </button>
    </div>
  );
}
```

### Cómo se Compilan los Componentes React:
- **Conversión AOT en Tiempo de Compilación**: Durante `docmedown build`, los componentes React estándar se convierten directamente en **custom elements nativos de Svelte 5**. Esto elimina por completo el runtime de React de tu paquete de producción, ofreciendo cero sobrecarga de ejecución.
- **Puente React en Tiempo de Ejecución**: Para componentes complejos con dependencias externas del ecosistema React, DocMeDown utiliza un puente aislado mediante `createRoot()`, sincronizando propiedades hacia atributos HTML.

---

## 🌐 4. Creación de Web Elements / Lit (`.ts`, `.js`)

Cualquier Custom Element estándar puede registrarse directamente:

```ts title="docs/.dmd/LitStatusBadge.ts"
export class LitStatusBadgeElement extends HTMLElement {
  static get observedAttributes() {
    return ["status", "label"];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const status = this.getAttribute("status") || "operational";
    const label = this.getAttribute("label") || "Servicio";
    const isOk = status === "operational" || status === "healthy";

    this.innerHTML = `
      <div style="display:inline-flex; align-items:center; gap:8px; padding:4px 10px; border-radius:12px; background:${isOk ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}; border:1px solid ${isOk ? "#10b981" : "#ef4444"}; font-size:0.85rem; color:${isOk ? "#10b981" : "#ef4444"};">
        <span style="width:8px; height:8px; border-radius:50%; background:currentColor;"></span>
        <strong>${label}</strong>: ${status}
      </div>
    `;
  }
}

if (typeof customElements !== "undefined" && !customElements.get("dmd-lit-status-badge")) {
  customElements.define("dmd-lit-status-badge", LitStatusBadgeElement);
}

export default LitStatusBadgeElement;
```

---

## 🎬 5. Hooks de Animación Enfocados en Rendimiento (`docmedown/motion`)

DocMeDown incluye un motor de movimiento ligero acelerado por hardware impulsado por `motion/mini`. Permite animar componentes personalizados con acciones declarativas de Svelte, hooks de React o asistentes imperativos — con accesibilidad integrada.

<MotionDemoWidget />

### Características Principales:
- 🚀 **Presets Optimizados**: `fade`, `slide` y `scale` animan opacidad y transformaciones. Expandir/colapsar altura y desplazamiento aún requieren cálculos de diseño; úsalos solo cuando sea necesario.
- ♿ **Movimiento Reducido**: Se respeta la preferencia del sistema `prefers-reduced-motion`; `data-dmd-motion="reduced"`/`"full"` en `<html>` la sobrescribe, seguido de la configuración en localStorage `dmd-motion`.
- ⚡ **Runtime Compartido**: Los componentes personalizados reutilizan los asistentes de movimiento incluidos en DocMeDown en lugar de empaquetar una copia adicional.

---

### 1. Animación de Componentes Svelte (Actions)

Importa acciones declarativas de movimiento directamente desde `"docmedown/motion"`:

```svelte title="docs/.dmd/AnimatedCard.svelte"
<script lang="ts">
  import { motion, fade, slide, scale } from "docmedown/motion";
</script>

<!-- Acción de movimiento personalizada con opciones de initial, animate y transition -->
<div use:motion={{
  initial: { opacity: 0, transform: "translateY(20px)" },
  animate: { opacity: 1, transform: "translateY(0px)" },
  transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] }
}}>
  <h4>Tarjeta Fluida</h4>
</div>

<!-- O presets rápidos -->
<div use:fade={{ duration: 0.3 }}>Aparece suavemente</div>
<div use:slide={{ direction: "up", distance: 16 }}>Se desliza hacia arriba</div>
<div use:scale={{ from: 0.9 }}>Escala suavemente</div>
```

Los presets aceptan `duration` y `delay` en **segundos**; `slide` también admite `direction` y `distance` en píxeles. Las acciones admiten el ciclo de vida `update` de Svelte, por lo que cambiar sus opciones reinicia la animación y cancela la anterior. Usa `inView: true` con cualquier preset o `motion` para posponer la revelación hasta que el elemento entre en el viewport. En dispositivos con movimiento reducido, el estado final se muestra de inmediato.

---

### 2. Animación de Componentes React TSX (`useMotion`)

Para componentes React en `.dmd/`, usa el hook de callback `useMotion`:

```tsx title="docs/.dmd/ReactAnimatedStats.tsx"
import React from "react";
import { useMotion } from "docmedown/motion";

export default function ReactAnimatedStats() {
  const containerRef = useMotion({
    initial: { opacity: 0, transform: "scale(0.95)" },
    animate: { opacity: 1, transform: "scale(1)" },
    transition: { duration: 0.35, ease: "easeOut" }
  });

  return (
    <div ref={containerRef} className="stats-box">
      <h3>Clústeres Activos</h3>
      <p>99.99% Disponibilidad</p>
    </div>
  );
}
```

---

### 3. Asistentes Imperativos: Expand, Collapse, Smooth Scroll, Stagger

Para paneles desplegables, acordeones o desplazamiento suave, utiliza funciones utilitarias de alto rendimiento:

```ts
import { expand, collapse, smoothScroll, stagger, animate } from "docmedown/motion";

// Expansión/colapso suave de acordeón midiendo la altura real (¡sin el hack de max-height: 1000px!)
expand(panelElement, { duration: 250 });
collapse(panelElement, { duration: 200 });

// Desplazamiento suave cancelable e interrumpible para carruseles
smoothScroll(viewportElement, 480, { duration: 380, direction: "x" });

// Efecto escalonado en lista de elementos
stagger(badgeElements, { opacity: [0, 1], transform: ["scale(0.8)", "scale(1)"] }, {
  staggerDelay: 0.05,
  duration: 0.3
});
```

`expand`, `collapse` y `smoothScroll` aceptan duraciones en **milisegundos**. Cada uno devuelve `{ stop, finished }`; `stop()` cancela la operación y `finished` se resuelve tras finalizar o cancelarse. El scroll también se detiene si el usuario interactúa mediante rueda, pulsación táctil o teclado en el contenedor. `onComplete` se ejecuta únicamente para animaciones completadas.

---

## 🎯 6. Tokens de Diseño Compartidos (Variables CSS)

Para asegurar que los componentes personalizados armonicen con la familia de temas activa (`atlas`, `blueprint`, `terminal`, `editorial`, `botanical`, `studio`) y los modos claro/oscuro, usa los tokens CSS estándar de DocMeDown:

| Token | Descripción | Valor de Ejemplo |
| :--- | :--- | :--- |
| `var(--dmd-primary)` | Color de acento/acción de la familia activa | `#6366f1` / `#38bdf8` |
| `var(--dmd-bg-canvas)` | Color de fondo del lienzo | `#ffffff` / `#0f172a` |
| `var(--dmd-bg-card)` | Fondo de tarjeta o contenedor | `#f8fafc` / `#1e293b` |
| `var(--dmd-text-primary)` | Color principal del texto | `#0f172a` / `#f8fafc` |
| `var(--dmd-text-muted)` | Color secundario atenuado del texto | `#64748b` / `#94a3b8` |
| `var(--dmd-border-color)` | Trazo de borde estándar | `#e2e8f0` / `#334155` |
| `var(--dmd-font-sans)` | Pila tipográfica sans-serif principal | Sans del Sistema / Inter |
| `var(--dmd-font-mono)` | Pila tipográfica monoespaciada para código | JetBrains Mono / Fira Code |

---

## 🧰 7. Componentes Interactivos Integrados

DocMeDown incluye **20 elementos integrados** que puedes usar de inmediato sin importar nada:

### 1. `<Tabs>` y `<Tab>`
Organiza comandos o instrucciones entre variantes (`recessed`, `pills`, `underline`, `postit`):

```html
<Tabs type="pills">
  <Tab label="npm" icon="📦">npm install docmedown</Tab>
  <Tab label="pnpm" icon="⚡">pnpm add docmedown</Tab>
  <Tab label="yarn" icon="🧶">yarn add docmedown</Tab>
</Tabs>
```

### 2. `<CardGrid>` y `<Card>`
Destaca características o enlaces en cuadrículas adaptables (se convierte en carrusel cuando los elementos superan las columnas):

```html
<CardGrid cols={2}>
  <Card
    title="Zero Config"
    description="Añade index.html y explora al instante."
    badge="Instantáneo"
    badgeType="success"
  />
  <Card
    title="100% Offline"
    description="Manual HTML ejecutable con doble clic en file:///."
    badge="Air-Gapped"
    badgeType="info"
  />
</CardGrid>
```

### 3. `<Steps>` y `<Step>`
Documenta tutoriales secuenciales con números autoincrementales:

```html
<Steps>
  <Step title="Ejecutar el Inicializador">Ejecuta <code>npx docmedown init ./docs</code></Step>
  <Step title="Previsualizar Cambios">Ejecuta <code>npx docmedown dev</code></Step>
  <Step title="Desplegar en Cualquier Lugar">Aloja en GitHub Pages o empaqueta en archivo único</Step>
</Steps>
```

### 4. `<Badge>`
Identifica estados de versión, estabilidad o categorías:

```html
<Badge type="success">ESTABLE</Badge>
<Badge type="warning">BETA</Badge>
<Badge type="danger">OBSOLETO</Badge>
<Badge type="new">v0.9.0</Badge>
```

### 5. Universal `<Item>`
`<Item>` funciona en todos los contenedores (`<Tabs>`, `<CardGrid>`, `<Steps>`, `<Accordion>`, `<Timeline>`, `<Columns>`), adaptándose automáticamente al contenedor padre más próximo.

```html
<Steps>
  <Item>Instalar con npm</Item>
  <Item>Escribir Markdown</Item>
  <Item>Desplegar</Item>
</Steps>
```

### 6. `<Media>`
Incrusta imágenes rasterizadas, vectores SVG y reproductores de audio y vídeo HTML5 con opciones completas de estilo, reservas y compilación offline sin pérdidas:

```html
<Media
  src="./assets/hero.png"
  alt="Visión General de la Arquitectura"
  width="100%"
  maxWidth="640px"
  rounded="md"
  shadow="sm"
  caption="Pipeline de alto rendimiento de DocMeDown"
/>
```

---

## 🚀 Explora el Showcase

Para demostraciones interactivas en vivo de los 20 elementos integrados, visita el **[Showcase de Sintaxis y Componentes](../showcase.md)**.

---

## 🗺️ Próximos Pasos

Continúa con el recorrido lineal de la documentación:

<CardGrid cols={2}>
  <Card
    title="DX de Última Generación y Editor"
    description="HMR in situ, editor en pantalla dividida en el navegador (Ctrl+E) y vistas previas en fase."
    href="#/guides/developer-experience"
    badge="Siguiente"
    badgeType="info"
  />
  <Card
    title="Primitivas de UI Nativas"
    description="Referencia de los 20 elementos: CardGrid, Tabs, Badges, Callouts, Media y Botones."
    href="#/guides/built-in-components"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
