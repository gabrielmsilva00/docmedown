---
title: Componentes Customizados (`.dmd/.components/`)
description: Crie componentes interativos customizados em Svelte 5, React TSX ou Web Elements, e explore primitivas de UI nativas.
order: 4
tags: [componentes, custom-elements, svelte, react, tsx, lit, primitivas, interativo]
---

# Componentes Customizados (`.dmd/.components/`) 🧩

O DocMeDown fornece uma **Camada Universal de Compatibilidade de Componentes** que permite trazer widgets interativos para a sua documentação usando **Svelte 5**, **React com TypeScript (TSX)** ou **Web Elements padrão (Lit)** — com registro automático, variáveis CSS compartilhadas e zero configuração de build.

---

## 🏗️ 1. O Diretório `.dmd/.components/`

Para criar um componente customizado, basta colocar qualquer arquivo `.svelte`, `.tsx` ou `.ts` em `.dmd/.components/` dentro do seu diretório de documentação (`.dmd/` direto ainda funciona como fallback de compatibilidade):

```
docs/
├── .dmd/.config/docs.json
├── README.md
└── .dmd/.components/
    ├── StatusWidget.svelte       # Componente Svelte 5 -> <StatusWidget />
    ├── MetricCard.tsx            # Componente React TSX  -> <MetricCard />
    └── ClusterPill.ts            # Web Element / Lit   -> <ClusterPill />
```

Qualquer componente criado em `.dmd/.components/` fica **imediatamente disponível como tag tipo HTML em qualquer documento Markdown**:

```markdown
# Painel ao Vivo

Confira o status do nosso cluster abaixo:

<StatusWidget environment="production" />
<MetricCard label="Vazão" initial={4500} unit="req/s" />
<ClusterPill status="healthy" region="us-east-1" />
```

---

## 🎨 2. Desenvolvendo em Svelte 5 (Runes Nativas)

Componentes Svelte 5 oferecem o mais alto desempenho e a menor pegada de bundle. Utilize runes modernas (`$state`, `$derived`, `$props`) e declare o nome da tag do custom element:

```svelte title="docs/.dmd/InteractiveCounter.svelte"
<svelte:options customElement="dmd-interactive-counter" />

<script lang="ts">
  let { title = "Contador", step = 1 }: { title?: string; step?: number } = $props();
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>

<div class="counter-box">
  <div class="readout">
    <strong>{title}</strong>: {count} (Dobrado: {doubled})
  </div>
  <div class="actions">
    <button onclick={() => count += step}>+{step}</button>
    <button onclick={() => count = 0}>Zerar</button>
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

## ⚛️ 3. Desenvolvendo em React TSX (`.tsx`)

Você pode escrever componentes customizados diretamente em React usando TypeScript. O DocMeDown analisa as propriedades, anexa ouvintes de eventos e monta o componente na página automaticamente:

```tsx title="docs/.dmd/ReactMetricCard.tsx"
import React, { useState } from "react";

export interface MetricCardProps {
  label?: string;
  initial?: number;
  unit?: string;
}

export default function ReactMetricCard({
  label = "Latência",
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

### Como Componentes React são Compilados:
- **Conversão AOT em Tempo de Build**: Durante o `docmedown build`, componentes React padrão são convertidos diretamente em **custom elements nativos do Svelte 5**. Isso remove completamente o runtime do React do seu bundle de produção, gerando zero sobrecarga de runtime!
- **Ponte React em Tempo de Execução**: Para componentes complexos com dependências externas do ecossistema React, o DocMeDown utiliza automaticamente uma ponte isolada via `createRoot()`, sincronizando propriedades para atributos HTML.

---

## 🌐 4. Desenvolvendo Web Elements / Lit (`.ts`, `.js`)

Qualquer Custom Element padrão pode ser registrado diretamente:

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
    const label = this.getAttribute("label") || "Serviço";
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

## 🎬 5. Hooks de Animação com Foco em Performance (`docmedown/motion`)

O DocMeDown inclui um motor de animação leve e acelerado por hardware, baseado em `motion/mini`. Ele permite animar componentes customizados com ações declarativas do Svelte, hooks do React ou funções utilitárias imperativas — com conformidade integrada para acessibilidade.

<MotionDemoWidget />

### Principais Destaques:
- 🚀 **Presets Otimizados**: `fade`, `slide` e `scale` animam opacidade e transformações. Expandir/recolher altura e rolagem ainda exigem cálculos de layout; use-os apenas quando necessário.
- ♿ **Movimento Reduzido**: A preferência do sistema `prefers-reduced-motion` é respeitada; `data-dmd-motion="reduced"`/`"full"` no `<html>` a sobrescreve, seguido pela configuração `dmd-motion` no localStorage.
- ⚡ **Runtime Compartilhado**: Componentes customizados reutilizam os utilitários de animação incluídos no DocMeDown em vez de empacotar outra cópia.

---

### 1. Animando Componentes Svelte (Actions)

Importe ações declarativas de animação diretamente de `"docmedown/motion"`:

```svelte title="docs/.dmd/AnimatedCard.svelte"
<script lang="ts">
  import { motion, fade, slide, scale } from "docmedown/motion";
</script>

<!-- Ação de motion customizada com opções de initial, animate e transition -->
<div use:motion={{
  initial: { opacity: 0, transform: "translateY(20px)" },
  animate: { opacity: 1, transform: "translateY(0px)" },
  transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] }
}}>
  <h4>Card Suave</h4>
</div>

<!-- Ou presets rápidos -->
<div use:fade={{ duration: 0.3 }}>Surge suavemente</div>
<div use:slide={{ direction: "up", distance: 16 }}>Desliza para cima</div>
<div use:scale={{ from: 0.9 }}>Escala suavemente</div>
```

Presets aceitam `duration` e `delay` em **segundos**; `slide` também aceita `direction` e `distance` em pixels. As ações suportam o ciclo de vida `update` do Svelte, de modo que alterar suas opções reinicia a animação e cancela a anterior. Use `inView: true` com qualquer preset ou `motion` para adiar a revelação até que o elemento entre no viewport. Em dispositivos com preferência de movimento reduzido, o estado final surge imediatamente.

---

### 2. Animando Componentes React TSX (`useMotion`)

Para componentes React em `.dmd/`, use o hook de callback `useMotion`:

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
      <h3>Clusters Ativos</h3>
      <p>99.99% Disponibilidade</p>
    </div>
  );
}
```

---

### 3. Utilitários Imperativos: Expand, Collapse, Smooth Scroll, Stagger

Para disclosures, sanfonas (accordions) ou rolagem suave, use funções utilitárias projetadas para alta performance:

```ts
import { expand, collapse, smoothScroll, stagger, animate } from "docmedown/motion";

// Expansão/recolhimento suave de accordion medindo a altura real (sem o hack de max-height: 1000px!)
expand(panelElement, { duration: 250 });
collapse(panelElement, { duration: 200 });

// Rolagem suave cancelável e interrompível para carrosséis
smoothScroll(viewportElement, 480, { duration: 380, direction: "x" });

// Efeito stagger em lista de elementos
stagger(badgeElements, { opacity: [0, 1], transform: ["scale(0.8)", "scale(1)"] }, {
  staggerDelay: 0.05,
  duration: 0.3
});
```

`expand`, `collapse` e `smoothScroll` recebem durações em **milissegundos**. Cada um retorna `{ stop, finished }`; `stop()` cancela a execução e `finished` resolve após a conclusão ou cancelamento. A rolagem também para se o usuário girar o scroll do mouse, tocar na tela ou pressionar teclas no container. `onComplete` executa apenas para animações concluídas com sucesso.

---

## 🎯 6. Tokens de Design de Tema Compartilhados (Variáveis CSS)

Para garantir que componentes customizados combinem perfeitamente com a família de tema ativa (`atlas`, `blueprint`, `terminal`, `editorial`, `botanical`, `studio`) e os modos claro/escuro, utilize os tokens CSS padrão do DocMeDown:

| Token | Descrição | Valor de Exemplo |
| :--- | :--- | :--- |
| `var(--dmd-primary)` | Cor de destaque/ação da família atual | `#6366f1` / `#38bdf8` |
| `var(--dmd-bg-canvas)` | Cor de fundo da tela (canvas) | `#ffffff` / `#0f172a` |
| `var(--dmd-bg-card)` | Fundo de container/card | `#f8fafc` / `#1e293b` |
| `var(--dmd-text-primary)` | Cor primária do texto | `#0f172a` / `#f8fafc` |
| `var(--dmd-text-muted)` | Cor secundária atenuada do texto | `#64748b` / `#94a3b8` |
| `var(--dmd-border-color)` | Traçado de borda padrão | `#e2e8f0` / `#334155` |
| `var(--dmd-font-sans)` | Pilha tipográfica principal em sans-serif | Sans do Sistema / Inter |
| `var(--dmd-font-mono)` | Pilha tipográfica monospaçada para código | JetBrains Mono / Fira Code |

---

## 🧰 7. Componentes Interativos Nativos

O DocMeDown inclui **20 elementos nativos** que você pode usar diretamente sem importar nada:

### 1. `<Tabs>` e `<Tab>`
Organize comandos ou instruções entre variantes (`recessed`, `pills`, `underline`, `postit`):

```html
<Tabs type="pills">
  <Tab label="npm" icon="📦">npm install docmedown</Tab>
  <Tab label="pnpm" icon="⚡">pnpm add docmedown</Tab>
  <Tab label="yarn" icon="🧶">yarn add docmedown</Tab>
</Tabs>
```

### 2. `<CardGrid>` e `<Card>`
Destaque recursos ou links em grades responsivas (converte automaticamente em carrossel quando os itens excedem as colunas):

```html
<CardGrid cols={2}>
  <Card
    title="Zero Config"
    description="Adicione index.html e navegue instantaneamente."
    badge="Instantâneo"
    badgeType="success"
  />
  <Card
    title="100% Offline"
    description="Manual HTML utilizável por duplo clique em file:///."
    badge="Air-Gapped"
    badgeType="info"
  />
</CardGrid>
```

### 3. `<Steps>` e `<Step>`
Documente tutoriais sequenciais com números autoincrementais:

```html
<Steps>
  <Step title="Executar o Inicializador">Execute <code>npx docmedown init ./docs</code></Step>
  <Step title="Pré-visualizar Mudanças">Execute <code>npx docmedown dev</code></Step>
  <Step title="Distribuir em Qualquer Lugar">Hospede no GitHub Pages ou empacote em arquivo único</Step>
</Steps>
```

### 4. `<Badge>`
Identifique status de versão, estabilidade ou categorias:

```html
<Badge type="success">ESTÁVEL</Badge>
<Badge type="warning">BETA</Badge>
<Badge type="danger">DEPRECIADO</Badge>
<Badge type="new">v0.9.0</Badge>
```

### 5. Universal `<Item>`
O `<Item>` funciona em todos os contêineres (`<Tabs>`, `<CardGrid>`, `<Steps>`, `<Accordion>`, `<Timeline>`, `<Columns>`), adaptando-se automaticamente ao contêiner pai mais próximo!

```html
<Steps>
  <Item>Instalar com npm</Item>
  <Item>Escrever Markdown</Item>
  <Item>Distribuir</Item>
</Steps>
```

### 6. `<Media>`
Incorpore imagens rasterizadas, vetores SVG, players de áudio e vídeo HTML5 com estilos completos, fallbacks e compilação offline sem perdas:

```html
<Media
  src="./assets/hero.png"
  alt="Visão Geral da Arquitetura"
  width="100%"
  maxWidth="640px"
  rounded="md"
  shadow="sm"
  caption="Pipeline de alto desempenho do DocMeDown"
/>
```

---

## 🚀 Conheça o Showcase

Para demonstrações interativas lado a lado de todos os 20 elementos nativos, visite o **[Showcase de Sintaxe e Componentes](../showcase.md)**!

---

## 🗺️ Próximos Passos

Continue a jornada linear de documentação:

<CardGrid cols={2}>
  <Card
    title="DX de Última Geração & Editor"
    description="HMR autêntico no local, editor em tela dividida no navegador (Ctrl+E) e previews em estágio."
    href="#/guides/developer-experience"
    badge="A Seguir"
    badgeType="info"
  />
  <Card
    title="Primitivas de UI Nativas"
    description="Referência para os 20 elementos: CardGrid, Tabs, Badges, Callouts, Media e Botões."
    href="#/guides/built-in-components"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
