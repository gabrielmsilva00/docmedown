---
title: Internacionalização (i18n)
description: Como estruturar, configurar e distribuir documentação multilíngue nativa com DocMeDown usando convenções de sufixo de arquivo.
order: 14
category: Referência e Ferramentas
tags: [i18n, internacionalização, idiomas, tradução, localização]
---

# Internacionalização (i18n) 🌐

O DocMeDown agrupa traduções pelo sufixo do nome do arquivo, e não por diretórios de idiomas.
Para um original em inglês, `guide.md` e `guide.en.md` representam o mesmo documento;
`guide.pt-br.md` e `guide.es.md` são suas traduções. As categorias mantêm sua
estrutura de diretórios existente. Ambas as extensões Markdown e MDX são suportadas.

## Configuração

```json
{
  "i18n": {
    "defaultLocale": "en",
    "locales": [
      { "code": "en", "label": "English" },
      { "code": "pt-BR", "label": "Português (Brasil)" },
      { "code": "es", "label": "Español" }
    ],
    "fallbackToDefault": true
  }
}
```

Apenas sufixos registrados são interpretados como idiomas. Nomes pontuados comuns,
como `guide.api.md`, permanecem nomes de documentos normais. As tags de idioma
não diferenciam maiúsculas de minúsculas nos sufixos; slugs públicos traduzidos usam sufixos em minúsculas.
O original explícito (`guide.en.md`) tem precedência sobre o arquivo sem sufixo, com um
aviso de validação. Variantes explícitas equivalentes são rejeitadas como conflitos.

## Inicialização

```sh
npx docmedown init --yes --default-locale en --locales pt-BR,es
```

As mesmas opções estão disponíveis durante o início rápido. A configuração interativa pergunta
pelos idiomas do projeto usando um menu de múltipla escolha, seguido pelo idioma original.
Os seis presets curados são inglês (`en`), português do Brasil (`pt-BR`), espanhol (`es`),
francês (`fr`), alemão (`de`) e chinês simplificado (`zh-CN`).
Todos os seis vêm selecionados inicialmente; trata-se de uma seleção orientada ao projeto,
não de um ranking global de popularidade. Com `--yes` e sem flags de idioma, esses seis são habilitados
e o inglês é o original. Um `--locales` explícito substitui essa seleção; o idioma original
sempre é incluído. Para adicionar outro idioma, escolha o prompt de adição manual e
digite seu nome de exibição e tag de idioma (por exemplo, `日本語`, e depois `ja`). Digite
a tag, não `.ja.md`. As tags são canonizadas e duplicatas selecionadas são rejeitadas.
Cancelar qualquer prompt de idioma cancela a criação sem salvar uma configuração parcial.

`docmedown config` edita essas configurações, preserva as substituições personalizadas por idioma
existentes e confirma alterações que reinterpretam documentos sem sufixo. Definir um idioma
não traduz o texto-fonte nem os arquivos de amostra.

## Leitura e Fallback

O seletor de idiomas na barra de navegação aparece automaticamente para projetos multilíngues. Ele mantém a
mesma página lógica ao alternar idiomas. Traduções ausentes mostram o
original com um aviso, ou um estado indisponível se o fallback estiver desativado.
O idioma selecionado é preservado na rota com sufixo, mesmo durante o fallback.
A busca e a navegação exibem uma variante por documento lógico.

Uma URL explícita tem precedência sobre a escolha de idioma salva. Sem uma
escolha prévia, o idioma original é usado; o idioma do navegador não é inferido.
Links relativos em Markdown herdam o idioma da página, enquanto sufixos de idioma
explícitos são respeitados. Editar uma página de fallback edita seu arquivo físico original.

## Rótulos de Site Localizados

Cada entrada de idioma pode definir `overrides` para `nav`, `sidebar`, `tagline`,
`description`, `search` e `footer`. Essas propriedades herdam a configuração base.
Por exemplo, adicione `"overrides": { "search": { "placeholder": "Buscar…" } }`
à entrada em português. As mensagens internas do leitor atualmente incluem inglês,
português, espanhol, francês, alemão e chinês simplificado; outros idiomas utilizam
o inglês como fallback para essas mensagens.

Páginas estáticas declaram seu idioma de conteúdo e referenciam as traduções publicadas.
Exportações offline mantêm o corpus e o seletor. Listagem e busca via MCP aceitam
um parâmetro opcional `locale`; documentos traduzidos também podem ser lidos pelo slug com sufixo.

A saída de contexto para IA usa o idioma original por padrão. Idiomas adicionais produzem
`llms.<locale>.txt`, `llms-full.<locale>.txt` e `okf.<locale>.json` lado a lado com os
artefatos originais, sem criar pastas adicionais de idiomas.

## Guias DMD Embutidos

O rodapé abre o `DMD` e sua subpágina `DMD/for-developers`. Ambos são empacotados com
conteúdo autoral nos seis idiomas pré-configurados, incluindo fontes zero-config e remotas.
Exportações do projeto incluem os idiomas configurados mais o inglês incondicional.
Por exemplo, `DMD.pt-br` e `DMD/for-developers.pt-br` são rotas em português.
Esses guias permanecem ocultos da barra lateral/busca e possuem metadados `noindex`.
Exportações estáticas pré-renderizam as variantes de guias configuradas; cópias offline não necessitam de rede.

Para um idioma personalizado sem tradução embutida, o DMD utiliza o **inglês**, mesmo
se o idioma original do projeto não for inglês ou o fallback do projeto estiver desativado.
A rota solicitada é mantida e o aviso identifica o idioma efetivo.
Essa exceção se aplica apenas aos guias DMD fornecidos pelo motor. Documentos comuns
continuam seguindo `defaultLocale` e `fallbackToDefault`.

## Manutenção e Limites da Documentação

Toda a documentação existente pode usar o mesmo mecanismo de sufixo no nome do arquivo, incluindo
sites de exemplos aninhados com seu próprio `docs.json`. Habilitar um idioma **não** é
uma garantia de que todas as páginas estejam traduzidas. Nunca copie texto em inglês para um arquivo com sufixo
apenas para fazer passar uma checagem de cobertura. Preserve comandos, chaves de configuração,
tags de componentes e destinos de links ao traduzir; verifique títulos e âncoras localizados.
Consulte o `ROADMAP.md` para o trabalho pendente de tradução de todo o corpus e extração de UI.

O catálogo de mensagens embutido atualmente abrange o seletor de idioma,
aviso de fallback, link de pular para o conteúdo, placeholder de busca, links anterior/próximo e rótulo de carregamento de documentos. Ações do editor,
alguns controles do leitor e mensagens de componentes embutidos continuam usando o inglês.
Trocar de idioma inicia no topo do documento de destino; o mapeamento automático
entre âncoras de títulos traduzidos não é fornecido.
