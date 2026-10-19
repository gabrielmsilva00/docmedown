---
title: Modo Offline e Arquivo Único
description: Crie pacotes de documentação HTML em arquivo único 100% autocontidos e isolados que abrem diretamente via file:/// sem precisar de servidor.
order: 3
tags: [offline, single-file, air-gapped, file-protocol, standalone, distribution]
---

# Pacotes Offline e de Arquivo Único 📦

O DocMeDown foi projetado para funcionar em qualquer lugar — incluindo redes isoladas de alta segurança (air-gapped), manuais de hardware embarcado, ambientes de defesa, computadores de campo e sistemas de arquivos locais.

---

## 💻 O Problema dos Geradores de Documentação Tradicionais

A maioria dos geradores estáticos modernos (Docusaurus, VitePress, MkDocs, etc.) produz centenas de arquivos HTML individuais, fragmentos de JavaScript e folhas de estilo CSS.

Ao tentar abrir esses arquivos diretamente no Windows Explorer ou macOS Finder com dois cliques via `file:///C:/meus-docs/index.html`:
- O navegador dispara **erros de segurança CORS e cross-origin**.
- Os navegadores bloqueiam requisições JavaScript `fetch()` direcionadas a arquivos locais vizinhos em URLs com protocolo `file:///`.
- A documentação é exibida como uma página em branco com falha, sem estilos e sem navegação funcional.

---

## ⚡ A Solução de Arquivo Único do DocMeDown

O DocMeDown empacota todo o seu site de documentação — incluindo todos os documentos Markdown, configurações, estilos, diagramas, componentes personalizados e o runtime em Svelte 5 — em **um único arquivo `index.html` independente e autoextraível**:

```bash
npx docmedown build ./docs
```

### O Pipeline de Build:
1. **Extração do Acervo**: Percorre todos os documentos Markdown, extrai cabeçalhos e indexa o conteúdo para busca aproximada.
2. **Compilação de Componentes**: Localiza componentes `.dmd/*.{svelte,tsx,ts}` e os pré-compila antecipadamente (Ahead-of-Time) em elementos customizados autocontidos.
3. **Incorporação de Mídia sem Perdas**: Examina todas as tags `<Media>` e imagens padrão do Markdown, convertendo imagens rasterizadas, vetores SVG, áudio e vídeo em URIs de dados Base64 sem perda de dados.
4. **Serialização do Envelope Gzip**: Comprime todo o acervo documental, o runtime, as mídias incorporadas e os recursos estáticos em uma carga gzip compacta codificada em base64.
5. **Inicialização Autoextraível**: Insere um script leve de inicialização que aproveita a API nativa `DecompressionStream` do navegador para descompactar e inicializar o DocMeDown localmente em milissegundos.

```
┌─────────────────────────────────────────────────────────────┐
│  index.html independente (~1.2 MB Gzip)                     │
│  ├─ Inicialização Autoextraível com DecompressionStream     │
│  ├─ Runtime de Produção e Roteador em Svelte 5              │
│  ├─ Tokens de Tema (Atlas, Blueprint, Terminal, Botanical…) │
│  ├─ Motor de Diagramas Mermaid Offline                      │
│  ├─ Componentes Personalizados .dmd Compilados              │
│  ├─ Mídia Incorporada sem Perdas (Imagens, SVGs, Áudio…)    │
│  └─ Acervo Markdown e Índice de Busca em Gzip Base64        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Como Distribuir e Usar Documentos em Arquivo Único

Após a compilação, distribua diretamente o arquivo `docs/.dmd/.singlefile/index.html` (o link simbólico `docs/index.html` aponta para o site servível de SEO, não para este pacote):

### 1. Garantia do Duplo Clique
- Clique duas vezes em `index.html` diretamente no Windows Explorer, macOS Finder ou gerenciador de arquivos do Linux.
- Abre perfeitamente em qualquer navegador moderno via `file:///.../index.html`.
- **Zero servidores web necessários**: Busca instantânea (<Kbd>⌘K</Kbd>), navegação completa, diagramas Mermaid interativos e alternância de temas funcionam **100% offline**.

### 2. Principais Casos de Uso
- **Anexos de Lançamento de Software**: Anexe `meu-projeto-docs.html` diretamente aos lançamentos do GitHub ou GitLab para leitura offline pelos usuários.
- **Dispositivos e Equipamentos Embarcados**: Armazene na memória local do hardware (roteadores, unidades NAS, aparelhos médicos) com acesso sem conexão à internet.
- **Defesa e Redes Isoladas (Air-Gapped)**: Implante em infraestruturas protegidas onde conexões externas com a internet são rigorosamente proibidas.
- **Manuais de Engenharia de Campo**: Distribua em pendrives USB para operações remotas e trabalhos em campo.

---

## 📥 Exportação Offline no Navegador

Todo site de documentação construído com DocMeDown traz uma opção automática de **Download** na barra de navegação.

Quando um visitante clica em **Baixar Cópia Offline**:
1. O navegador lê o acervo ativo de documentação (`window.__DOCMEDOWN_DATA__`).
2. Comprime os dados no lado do cliente utilizando `CompressionStream("gzip")`.
3. Faz o download direto de um arquivo `<nome-do-doc>-offline.html` autocontido no computador do usuário.

> [!NOTE]
> A cópia baixada se identifica como um artefato offline; ao abri-la, uma indicação de "Cópia Offline" é exibida na barra de navegação e as ações duplicadas de download são desativadas.

---

## 🖼️ Incorporação de Mídia e Autossuficiência de Recursos Offline

Em sistemas de documentação convencionais, imagens vinculadas (`![alt](./imagem.png)`), arquivos de áudio e vídeos deixam de ser exibidos ao clicar duas vezes em um arquivo HTML offline devido a restrições de segurança do protocolo `file:///`.

O DocMeDown resolve essa limitação por meio de **incorporação offline sem perdas**:
- **Fidelidade sem Perdas**: Cada arquivo referenciado (imagens rasterizadas, vetores SVG, trechos de áudio e arquivos de vídeo) é convertido em URIs de dados Base64 sem recodificação ou compressão com perdas, preservando a fidelidade exata de cada byte.
- **Controle Fino de Incorporação**: O componente `<Media>` oferece controle explícito sobre a forma de empacotamento:
  - `embed="base64"` *(padrão)*: incorpora o conteúdo exato do arquivo como Data URI Base64 no pacote autocontido.
  - `embed="inline"`: decodifica vetores SVG diretamente em elementos `<svg>` inline no DOM para estilização CSS adaptável ao tema.
  - `embed="none"` ou `embed={false}`: desativa a incorporação, mantendo URLs de streaming externas ou endpoints remotos ao vivo.
- **Recuperação com Fallback**: Se determinado codec ou formato de vídeo não for suportado nativamente pelo navegador do usuário, `<Media fallback="...">` assegura a exibição elegante de fontes alternativas ou cartões de fallback informativos.

---

## ⚙️ Opções de Configuração

No arquivo `docs.json`, você pode personalizar o comportamento do pacote offline:

```json title="docs.json"
{
  "name": "Air-Gapped Reference",
  "offline": {
    "embedNestedDocs": true
  }
}
```

- `offline.embedNestedDocs`: Se definido como `true` (padrão), sites de documentação aninhados (diretórios com seu próprio `docs.json`) são inseridos diretamente dentro do arquivo único para que sub-sites sejam navegáveis sem referências externas. Defina como `false` para reduzir o tamanho final do arquivo.

### Opções de Build via CLI:
```bash
# Exportar o pacote offline para um diretório personalizado:
npx docmedown build ./docs --out-dir ./dist

# Pular a criação do pacote de arquivo único (compilar apenas ativos estáticos):
npx docmedown build ./docs --no-single-file
```

---

## 🗺️ Próximos Passos

Continue a jornada linear da documentação:

<CardGrid cols={2}>
  <Card
    title="Git Remoto Dinâmico"
    description="Transmita documentação em tempo real direto do GitHub ou GitLab sem etapas de build."
    href="#/guides/remote-github"
    badge="A Seguir"
    badgeType="info"
  />
  <Card
    title="Site Estático (SSG) e SEO"
    description="Descubra como páginas estáticas são pré-renderizadas com tags completas de SEO."
    href="#/guides/static-site"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
