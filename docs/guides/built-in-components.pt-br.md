---
title: Primitivas de UI Nativas
description: "Referência completa e documentação de propriedades ao vivo para todos os 20 elementos nativos de UI para Markdown: CardGrid, Card, Tabs, Tab, Badge, Callout, Button, Media, Kbd e mais."
order: 5
category: Autoria de Conteúdo
tags: [componentes, nativos, primitivas, card, tabs, badge, callout, button, media, kbd, ui]
---

# Primitivas de UI Nativas 🧩

O DocMeDown inclui uma biblioteca abrangente de **20 primitivas de UI nativas** que você pode utilizar diretamente dentro de Markdown padrão sem instalar dependências extras ou escrever declarações de importação.

Cada elemento é estilizado de acordo com a família de tema ativa (`atlas`, `blueprint`, `terminal`, `editorial`, `botanical`, `studio`) e se adapta perfeitamente aos modos claro e escuro.

---

## 1. Cards & Grids (`<CardGrid>`, `<Card>`)

Organize recursos, links, tutoriais e rotas de navegação em grades responsivas de múltiplas colunas.

### Sintaxe
```html
<CardGrid cols={2}>
  <Card
    title="Configuração Zero-Config"
    description="Adicione index.html e escreva Markdown. Sem empacotadores ou etapas de build."
    href="#/getting-started"
    icon="⚡"
    badge="Rápido"
    badgeType="success"
  />
  <Card
    title="Offline Air-Gapped"
    description="HTML em arquivo único autorrecuperável com zero requisições de rede externas."
    href="#/guides/offline-mode"
    icon="📦"
    badge="Autônomo"
    badgeType="warning"
  />
</CardGrid>
```

### Renderização ao Vivo
<CardGrid cols={2}>
  <Card
    title="Configuração Zero-Config"
    description="Adicione index.html e escreva Markdown. Sem empacotadores ou etapas de build."
    href="#/getting-started"
    icon="⚡"
    badge="Rápido"
    badgeType="success"
  />
  <Card
    title="Offline Air-Gapped"
    description="HTML em arquivo único autorrecuperável com zero requisições de rede externas."
    href="#/guides/offline-mode"
    icon="📦"
    badge="Autônomo"
    badgeType="warning"
  />
</CardGrid>

### Propriedades de `<Card>`
| Prop | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `title` | `string` | *(opcional)* | Título exibido no topo do card. |
| `description`| `string` | *(opcional)* | Texto descritivo no corpo do card. |
| `href` | `string` | *(opcional)* | Destino da navegação. Quando definido, renderiza o card como um link interativo. |
| `icon` | `string` | *(opcional)* | Emoji ou ícone exibido ao lado do título. |
| `badge` | `string` | *(opcional)* | Rótulo curto renderizado como uma badge colorida. |
| `badgeType` | `string` | `"info"` | Variante de cor da badge: `info`, `success`, `warning` ou `new`. |
| `color` | `string` | `"blue"` | Cor opcional de destaque da borda (`blue`, `violet`, `amber`, `green`, `rose`). |

---

## 2. Abas & Painéis de Código (`<Tabs>`, `<Tab>`)

Exiba amostras alternativas de código (ex.: `npm` vs `pnpm` vs `bun`), guias em várias etapas ou variações entre plataformas.

O DocMeDown suporta 4 variantes visuais: `pills`, `underline`, `postit` e `recessed`.

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
console.log("Olá do DocMeDown!");
```
  </Tab>
  <Tab label="TypeScript">
```typescript
const saudacao: string = "Olá do DocMeDown!";
console.log(saudacao);
```
  </Tab>
</Tabs>
````

<Tabs type="underline">
  <Tab label="JavaScript">
```javascript
console.log("Olá do DocMeDown!");
```
  </Tab>
  <Tab label="TypeScript">
```typescript
const saudacao: string = "Olá do DocMeDown!";
console.log(saudacao);
```
  </Tab>
</Tabs>

---

## 3. Badges (`<Badge>`)

Indicadores em linha para controle de versão, status ou categorias.

```html
<Badge type="info">Estável</Badge>
<Badge type="success">Aprovado</Badge>
<Badge type="warning">Depreciado</Badge>
<Badge type="new">v0.9.0 Novo</Badge>
```

### Renderização ao Vivo
<Badge type="info">Estável</Badge> &nbsp;
<Badge type="success">Aprovado</Badge> &nbsp;
<Badge type="warning">Depreciado</Badge> &nbsp;
<Badge type="new">v0.9.0 Novo</Badge>

---

## 4. Atalhos de Teclado (`<Kbd>`)

Exiba atalhos de teclado limpos e adaptáveis à plataforma.

```html
Pressione <Kbd>⌘K</Kbd> ou <Kbd>Ctrl+K</Kbd> para abrir a busca global.
Pressione <Kbd>Ctrl+E</Kbd> ou <Kbd>⌘E</Kbd> para abrir o editor em tela dividida.
Pressione <Kbd>Esc</Kbd> para fechar modais.
```

### Renderização ao Vivo
Pressione <Kbd>⌘K</Kbd> ou <Kbd>Ctrl+K</Kbd> para abrir a busca global.  
Pressione <Kbd>Ctrl+E</Kbd> ou <Kbd>⌘E</Kbd> para abrir o editor em tela dividida.  
Pressione <Kbd>Esc</Kbd> para fechar modais.

---

## 5. Callouts (`<Callout>`)

Complementando as citações de alerta do GitHub (`> [!NOTE]`), o componente `<Callout>` permite títulos customizados explícitos e conteúdo recolhível.

```html
<Callout type="tip" title="Dica Pro: Navegação Rápida">
Você pode saltar diretamente para qualquer documento pressionando <Kbd>⌘K</Kbd> e digitando palavras-chave do título.
</Callout>
```

### Renderização ao Vivo
<Callout type="tip" title="Dica Pro: Navegação Rápida">
Você pode saltar diretamente para qualquer documento pressionando <Kbd>⌘K</Kbd> e digitando palavras-chave do título.
</Callout>

---

## 6. Botões de Ação (`<Button>`)

Botões proeminentes de chamada para ação destinados a downloads, links para repositórios ou ferramentas externas.

```html
<Button href="https://github.com/gabrielmsilva00/docmedown" variant="primary">
  Estrela no GitHub ⭐
</Button>
<Button href="#/getting-started" variant="secondary">
  Ler Início Rápido 🚀
</Button>
```

### Renderização ao Vivo
<Button href="https://github.com/gabrielmsilva00/docmedown" variant="primary">
  Estrela no GitHub ⭐
</Button> &nbsp;
<Button href="#/getting-started" variant="secondary">
  Ler Início Rápido 🚀
</Button>

---

## 7. Componente de Mídia (`<Media>`)

Enquanto a sintaxe padrão de Markdown (`![alt](url)`) suporta links básicos para imagens, a primitiva `<Media>` oferece ricas opções de estilo, detecção automática de formato, tratamento de fallback, reprodutores de áudio/vídeo e **incorporação offline na compilação**.

Ao compilar o pacote offline em arquivo único (`index.html`), toda mídia referenciada por `<Media>` (e imagens comuns do Markdown) é convertida automaticamente **sem perdas** em Data URIs Base64 compatíveis offline, criando um distribuível 100% autocontido.

### 7.1 Exemplos de Imagem & Vetor
```html
<!-- Imagem rasterizada com estilização -->
<Media
  src="./assets/hero.png"
  alt="Visão Geral da Arquitetura"
  width="100%"
  maxWidth="720px"
  rounded="md"
  shadow="sm"
  align="center"
  caption="Pipeline de arquitetura de alto desempenho do DocMeDown"
/>

<!-- Vetor SVG com incorporação direta no DOM -->
<Media
  src="./assets/diagram.svg"
  format="svg"
  embed="inline"
  width="480px"
  align="center"
/>
```

### 7.2 Reprodutores de Vídeo e Áudio com Fallbacks
```html
<!-- Reprodutor de vídeo com imagem de fallback e controles customizados -->
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

<!-- Reprodutor de áudio com mensagem de fallback textual -->
<Media
  src="./assets/podcast.mp3"
  format="audio/mpeg"
  fallback="A reprodução de áudio não é suportada no seu navegador."
  controls
  align="left"
/>
```

### Propriedades de `<Media>`
| Prop | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `src` | `string` | `""` | URL da mídia, caminho relativo ou Data URI. |
| `type` / `format` | `string` | `""` | Tipo MIME explícito (ex.: `video/mp4`, `image/png`) ou formato (`image`, `vector`, `video`, `audio`, `svg`). |
| `fallback` | `string` | `""` | URL de mídia de fallback (imagem/vídeo/áudio) ou texto de fallback caso a mídia falhe. |
| `fallbackText` | `string` | `""` | Mensagem de erro customizada exibida no card de fallback quando a carga falha. |
| `poster` | `string` | `""` | URL da imagem de poster para reprodutores de vídeo. |
| `alt` | `string` | `""` | Texto alternativo de acessibilidade. |
| `title` | `string` | `""` | Atributo de tooltip de título. |
| `width` / `height` | `string \| number` | *(auto)* | Dimensões (ex.: `"100%"`, `"480px"`, `480`). |
| `maxWidth` / `maxHeight` | `string \| number` | *(nenhum)* | Restrição máxima de dimensão. |
| `aspectRatio` | `string` | *(nenhum)* | Proporção CSS (ex.: `"16/9"`, `"4/3"`, `"1/1"`). |
| `objectFit` | `string` | *(inicial)* | Ajuste do objeto (`"contain"`, `"cover"`, `"fill"`, `"none"`, `"scale-down"`). |
| `align` | `string` | `"center"` | Alinhamento do layout: `"left"`, `"center"` ou `"right"`. |
| `rounded` / `radius` | `boolean \| string` | *(nenhum)* | Raio de borda (`true`, `"sm"`, `"md"`, `"lg"`, `"full"` ou valor `"12px"`). |
| `shadow` | `boolean \| string` | *(nenhum)* | Sombra (`true`, `"sm"`, `"md"`, `"lg"` ou string CSS personalizada). |
| `border` | `boolean \| string` | *(nenhum)* | Borda (`true` para borda do tema ou borda CSS personalizada). |
| `caption` | `string` | `""` | Texto da legenda renderizado em um `<figcaption>`. |
| `captionAlign` | `string` | `"center"` | Alinhamento da legenda (`"left"`, `"center"`, `"right"`). |
| `controls` | `boolean` | `true` | Exibe controles de reprodução para vídeo e áudio. |
| `autoplay` | `boolean` | `false` | Reprodução automática. |
| `loop` | `boolean` | `false` | Reprodução em loop contínuo. |
| `muted` | `boolean` | `false` | Silencia a saída de áudio. |
| `playsinline` | `boolean` | `true` | Reprodução inline em dispositivos móveis. |
| `preload` | `string` | `"metadata"` | Estratégia de pré-carregamento (`"auto"`, `"metadata"`, `"none"`). |
| `embed` | `string \| boolean` | *(auto)* | Modo de incorporação offline: `"base64"` (padrão), `"inline"` (SVG bruto) ou `false` para desativar. |
| `zoomable` | `boolean` | `false` | Zoom interativo por clique em imagens. |

---

## 🗺️ Próximos Passos

Continue a jornada linear de documentação:

<CardGrid cols={2}>
  <Card
    title="Componentes Customizados (.dmd)"
    description="Crie componentes interativos usando Svelte 5, React TSX ou Web Elements."
    href="#/guides/custom-components"
    badge="A Seguir"
    badgeType="info"
  />
  <Card
    title="Diagramas Mermaid"
    description="Explore diagramas de arquitetura interativos com sincronização automática de tema."
    href="#/guides/mermaid-diagrams"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
