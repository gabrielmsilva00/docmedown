---
title: Recursos de Markdown e Matemática
description: Referência completa para alertas do GitHub, realce avançado de sintaxe, diagramas interativos Mermaid, fórmulas matemáticas em KaTeX e tabelas interativas com CSV/TSV.
order: 5
tags: [markdown, sintaxe, prism, mermaid, katex, alertas, diagramas, matemática, tabelas, csv]
---

# Recursos de Markdown, Diagramas e Matemática 📝

O DocMeDown suporta nativamente GitHub Flavored Markdown (GFM), realce inteligente de sintaxe com foco em nível de linha, matemática em LaTeX via KaTeX, diagramas interativos de arquitetura com Mermaid e tabelas interativas com controles de cópia e blocos de dados CSV/TSV.

---

## 1. Alertas de Callout Estilo GitHub

Use os blockquotes padrão de alerta do GitHub para destacar notas importantes, dicas e avisos:

```markdown
> [!NOTE]
> Contexto informativo e detalhes úteis de segundo plano.

> [!TIP]
> Dicas profissionais, otimizações de desempenho e boas práticas.

> [!IMPORTANT]
> Instruções críticas ou etapas obrigatórias de configuração.

> [!WARNING]
> Avisos sobre armadilhas comuns, depreciações ou mudanças significativas.

> [!CAUTION]
> Operações de alto risco, possível perda de dados ou alertas de segurança.
```

### Alertas Renderizados ao Vivo:

> [!NOTE]
> Contexto informativo e detalhes úteis de segundo plano.

> [!TIP]
> Pressione <Kbd>Alt+D</Kbd> ou abra **Aparência** na barra superior para pré-visualizar o site entre as famílias de tema Atlas, Blueprint, Terminal, Editorial, Botanical e Studio.

> [!IMPORTANT]
> Ambos os arquivos `.md` e `.mdx` são descobertos e indexados automaticamente. Para componentes interativos, coloque arquivos `.svelte`, `.tsx` ou `.ts` dentro de `.dmd/`.

> [!WARNING]
> Não faça commit de tokens de API privados ou credenciais em repositórios públicos.

> [!CAUTION]
> Sobrescrever arquivos existentes durante o build substituirá seus conteúdos.

---

## 2. Blocos de Código Avançados & Realce de Sintaxe

O DocMeDown inclui um renderizador customizado de blocos de código com suporte a títulos, realce de linhas e controles de cópia.

### 2.1 Títulos de Arquivo & Extensões Coloridas
Prefixe seu bloco de código com `title="caminho/para/arquivo.ext"`. Diretórios aparecem atenuados e a extensão do arquivo recebe uma cor distinta de acordo com a linguagem:

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

### 2.2 Realce de Linhas `{n, n-m}`
Adicione números de linha ou intervalos para destacar linhas específicas com uma barra de destaque e fundo focalizado:

````markdown
```javascript {2,4-5} title="pipeline.js"
const input = "Raw Markdown";
const parsed = parseMarkdown(input); // Destacada!
const tree = buildNavigationTree(parsed);
const staticHtml = prerenderStatic(tree); // Destacada!
const offlineBundle = buildSingleFile();   // Destacada!
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
> **Cópia Focada**: Quando o realce de linha está ativo, um segundo ícone de cópia surge na barra de ferramentas, permitindo aos leitores copiar **apenas as linhas destacadas** com um único clique!

---

## 3. Diagramas de Arquitetura Interativos em Mermaid

Renderize fluxogramas, diagramas de sequência, diagramas de classes, diagramas de estado e modelos entidade-relacionamento de forma nativa.

````markdown
```mermaid
graph TD
    subgraph Sources ["1. Fontes"]
        A[Arquivos Markdown Locais]
        B[Repositório Git Remoto]
    end

    subgraph Engine ["2. Motor DocMeDown"]
        C[Autoindexador Zero-Config]
        D[Runtime Svelte 5 com Runes]
        E[Componentes Customizados .dmd]
    end

    subgraph Targets ["3. Saídas Finais"]
        F[Servidor Dev ao Vivo com HMR]
        G[Site Estático Pré-renderizado (SEO)]
        H[HTML de Arquivo Único 100% Offline]
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
    subgraph Sources ["1. Fontes"]
        A[Arquivos Markdown Locais]
        B[Repositório Git Remoto]
    end

    subgraph Engine ["2. Motor DocMeDown"]
        C[Autoindexador Zero-Config]
        D[Runtime Svelte 5 com Runes]
        E[Componentes Customizados .dmd]
    end

    subgraph Targets ["3. Saídas Finais"]
        F[Servidor Dev ao Vivo com HMR]
        G[Site Estático Pré-renderizado (SEO)]
        H[HTML de Arquivo Único 100% Offline]
    end

    A --> C
    B --> C
    C --> D
    E --> D
    D --> F
    D --> G
    D --> H
```

### Recursos dos Diagramas:
- **Estilização Sensível ao Tema**: Os diagramas adaptam sua paleta de cores automaticamente à família de tema ativa (`atlas`, `blueprint`, `terminal`, `editorial`, `botanical`, `studio`) e aos modos claro/escuro.
- **Controles Interativos de Câmera**: Arraste para mover, use a roda do mouse ou gesto de pinça para zoom, clique em 1:1 para redefinir ou expanda em tela cheia.
- **Cópia de Subgrafos**: Passe o mouse sobre subgrafos para copiar seções isoladas do gráfico diretamente para a área de transferência.
- **Autossuficiência Offline**: Funciona de forma idêntica tanto em servidores de desenvolvimento ao vivo quanto em manuais HTML de arquivo único `file:///` isolados.

---

## 4. Matemática em LaTeX (KaTeX)

Renderize fórmulas matemáticas em linha com `$ ... $` ou equações em bloco com `$$ ... $$`:

### Matemática em Linha:
````markdown
A identidade de Euler é $e^{i\pi} + 1 = 0$, conectando as constantes fundamentais.
````
A identidade de Euler é $e^{i\pi} + 1 = 0$, conectando as constantes fundamentais.

### Equações Matemáticas em Bloco:
````markdown
$$
f(x) = \int_{-\infty}^\infty \hat f(\xi)\,e^{2 \pi i \xi x} \,d\xi
$$
````

$$
f(x) = \int_{-\infty}^\infty \hat f(\xi)\,e^{2 \pi i \xi x} \,d\xi
$$

> [!NOTE]
> A sintaxe matemática nunca é avaliada dentro de blocos de código ou trechos de código em linha — expressões como `` `$E = mc^2$` `` permanecem código literal.

---

## 5. Tabelas Ricas & Conjuntos de Dados CSV / TSV

O DocMeDown eleva as tabelas a blocos de dados interativos. Cada tabela — seja escrita com a sintaxe padrão de pipes do GitHub Flavored Markdown (GFM) ou com blocos concisos de CSV/TSV — conta com tipografia limpa, rolagem horizontal responsiva e uma barra de ferramentas com menu **Copiar**.

### 5.1 Controles Interativos de Cópia de Tabelas

Passe o mouse ou focalize qualquer tabela para exibir a barra de ferramentas. O menu **Copiar** permite aos leitores exportar os dados exatos em um clique para seu formato de preferência:

- **Markdown**: Tabela de pipes GFM com divisores alinhados (`:---`, `:---:`, `---:`).
- **HTML**: Elementos semânticos e limpos de `<table>`, `<thead>` e `<tbody>` com atributos de alinhamento de texto.
- **CSV**: Valores separados por vírgula em conformidade com a RFC 4180 com aspas quando necessário.

| Recurso | Tabelas Pipe | Blocos CSV / TSV | Tabelas HTML |
| :--- | :---: | :---: | :---: |
| Sintaxe GFM Nativa | ✅ | ❌ | ❌ |
| Detecção Automática de Delimitador | ❌ | ✅ (`,`, `;`, `\t`, `\|`) | ❌ |
| Alinhamento Numérico Automático | Manual | ✅ (Alinhado à direita) | Manual |
| Menu Copiar (MD / HTML / CSV) | ✅ | ✅ | ❌ |

### 5.2 Declarando Tabelas via Blocos CSV e TSV

Em vez de formatar barras verticais manualmente em ASCII, você pode expressar conjuntos de dados diretamente usando blocos de código padrão ```` ```csv ```` ou ```` ```tsv ````!

````markdown
```csv title="Benchmarks do Motor DocMeDown"
Tarefa,Tempo (ms),Vazão,Status
Varredura a Frio do Manifesto,14.2,420 arquivos/s,Verificado
Pré-renderização Estática de SEO,48.6,120 páginas/s,Verificado
Pacote em Arquivo Único,82.1,1 pacote/s,Ótimo
```
````

```csv title="Benchmarks do Motor DocMeDown"
Tarefa,Tempo (ms),Vazão,Status
Varredura a Frio do Manifesto,14.2,420 arquivos/s,Verificado
Pré-renderização Estática de SEO,48.6,120 páginas/s,Verificado
Pacote em Arquivo Único,82.1,1 pacote/s,Ótimo
```

### 5.3 Opções de Blocos e Delimitadores

Personalize blocos delimitados usando parâmetros opcionais:

- `title="..."`: Exibe uma legenda na barra de ferramentas da tabela.
- `delimiter=";"` ou `delimiter=tab` / `delimiter=pipe`: Define um delimitador explícito. Quando omitido, o DocMeDown detecta automaticamente `,`, `;`, `\t` ou `|`.
- `header=false`: Trata a primeira linha como dados comuns em vez de cabeçalho `<th>`.
- `markdown=true`: Processa o conteúdo das células com o parser de Markdown em linha (permitindo negrito, trechos de código, links e badges dentro das células).

````markdown
```csv delimiter=";" title="Semântica & Badges" markdown=true
Componente;Tipo;Padrão;Descrição
`<Card />`;Componente Interativo;Nenhum;Container de card de conteúdo
`<Badge />`;Badge Inline;`info`;Pílula de status colorida
`<Callout />`;Bloco de Alerta;`note`;Banner de alerta estilo GitHub
```
````

```csv delimiter=";" title="Semântica & Badges" markdown=true
Componente;Tipo;Padrão;Descrição
`<Card />`;Componente Interativo;Nenhum;Container de card de conteúdo
`<Badge />`;Badge Inline;`info`;Pílula de status colorida
`<Callout />`;Bloco de Alerta;`note`;Banner de alerta estilo GitHub
`<Media />`;Primitiva de Mídia;`center`;Player de imagem, vetor, vídeo & áudio
```

---

## 6. Integração de Mídia & Áudio/Vídeo (`<Media>`)

Embora a sintaxe Markdown padrão suporte imagens simples via `![alt](url)`, o DocMeDown oferece o componente **`<Media>`** para estilização avançada de mídia, players HTML5 de vídeo/áudio, dicas de formato, fallbacks elegantes e **incorporação offline sem perdas**.

### 6.1 Comparando Markdown Padrão vs `<Media>`

| Capacidade | Markdown Padrão (`![]()`) | Componente `<Media />` |
| :--- | :---: | :---: |
| Imagens Raster (PNG, JPG, WebP, GIF) | ✅ | ✅ |
| Gráficos Vetoriais (SVG, DOM Inline) | ⚠️ *(limitado)* | ✅ |
| Players de Vídeo (MP4, WebM, OGG) | ❌ | ✅ *(controles HTML5, poster)* |
| Players de Áudio (MP3, WAV, FLAC) | ❌ | ✅ *(reprodução HTML5)* |
| Restrições de Largura / Altura / Máximo | ❌ | ✅ |
| Proporção (Aspect Ratio) & Object Fit | ❌ | ✅ |
| Alinhamento & Legendas Semânticas | ❌ | ✅ *(<figcaption>)* |
| Raio de Borda & Sombras de Elevação | ❌ | ✅ |
| Detecção de Formato & Dicas | ❌ | ✅ |
| Ativo de Fallback / Card de Recuperação | ❌ | ✅ |
| Incorporação Offline Sem Perdas | ✅ | ✅ *(com controle `embed`)* |

### 6.2 Sintaxe & Uso
```html
<!-- Imagem raster ou vetorial aprimorada com legenda e sombra -->
<Media
  src="./assets/architecture.png"
  alt="Diagrama do Sistema"
  width="100%"
  maxWidth="640px"
  rounded="md"
  shadow="md"
  align="center"
  caption="Pipeline de renderização de alto desempenho do DocMeDown"
/>

<!-- Player de Vídeo HTML5 com poster e fallback -->
<Media
  src="./assets/demo.mp4"
  type="video/mp4"
  poster="./assets/poster.jpg"
  controls
  maxWidth="720px"
  aspectRatio="16/9"
/>

<!-- Player de Áudio com mensagem de erro customizada -->
<Media
  src="./assets/narrative.mp3"
  format="audio/mpeg"
  controls
  fallbackText="O arquivo de áudio não está acessível."
/>
```

---

## 7. Referência de Frontmatter YAML

Adicione frontmatter YAML no topo de qualquer arquivo `.md` para personalizar título da página, ordenação na barra lateral, tags e metadados de SEO:

```yaml
---
title: Guia Avançado de Arquitetura
sidebar_label: Arquitetura
order: 1
icon: 🏛️
badge: v0.9.0
badge_type: success
description: Imersão técnica abrangente no pipeline de compilação do DocMeDown.
tags: [arquitetura, core, svelte]
hidden: false
noindex: false
---
```

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `title` | `string` | Título do documento exibido na barra superior, breadcrumbs e aba do navegador. |
| `sidebar_label` | `string` | Rótulo encurtado usado na árvore de navegação da barra lateral. |
| `order` | `number` | Posição de ordenação dentro da sua categoria / seção (crescente). |
| `icon` | `string` | Emoji ou ícone exibido ao lado do nome da página na barra lateral. |
| `badge` | `string` | Etiqueta de texto exibida junto ao link da página na barra lateral. |
| `badge_type` | `string` | Variante da badge: `info`, `success`, `warning` ou `danger`. |
| `description` | `string` | Descrição da página usada para tags de SEO e cards de redes sociais. |
| `tags` | `string[]` | Palavras-chave indexadas na busca aproximada. |
| `hidden` | `boolean` | Se `true`, oculta o documento da navegação e do índice de busca. |
| `noindex` | `boolean` | Se `true`, adiciona a metatag `noindex` para robôs e omite de `sitemap.xml`. |

---

### Identidade dos títulos e validação de links

O manifesto e `docmedown validate` reutilizam os IDs do renderizador, incluindo
Setext, níveis 1–6 e sufixos únicos para duplicatas. Exemplos de código não são
indexados como títulos. O sumário visível mantém três níveis. `{#custom-id}` não
é uma sintaxe aceita; use o ID gerado no HTML para criar links.

### Comportamento YAML na CLI e no navegador

O navegador e o indexador CLI usam o mesmo esquema YAML seguro. São aceitos
descrições multilinha, listas de tags, comentários, escapes entre aspas e aliases YAML:

```yaml
---
title: "Arquitetura: motor principal"
description: >-
  Uma descrição dobrada consistente
  no leitor e nos metadados gerados.
tags:
  - architecture
  - "core: engine"
hidden: false # manter visível
---
```

Use linhas completas `---` no início e no fim do bloco. Coloque entre aspas
valores que devem continuar como strings, como `"true"` ou `"2026-10-20"`.
Tags YAML específicas de JavaScript não são aceitas. Durante a edição, um bloco
incompleto permanece como Markdown. Se um bloco completo tiver YAML inválido,
o corpo é exibido sem seus metadados até a correção. `docmedown validate` informa
o erro e a indexação CLI o rejeita; valide antes de publicar.

---

## 🗺️ Próximos Passos

Continue a jornada linear de documentação:

<CardGrid cols={2}>
  <Card
    title="Diagramas Mermaid"
    description="Explore diagramas de arquitetura interativos com sincronização automática de tema."
    href="#/guides/mermaid-diagrams"
    badge="A Seguir"
    badgeType="info"
  />
  <Card
    title="Arquitetura do Motor"
    description="Entenda o virtual loader, o runtime Svelte 5 e o roteamento em modo duplo."
    href="#/guides/architecture"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
