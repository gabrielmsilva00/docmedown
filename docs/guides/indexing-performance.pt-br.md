---
title: Medindo o Desempenho da Indexação
description: Medições reproduzíveis de títulos e manifestos em corpus sintéticos e reais.
order: 12
tags: [performance, indexing, benchmark]
---

# Medindo o Desempenho da Indexação

Execute estes comandos no repositório do DocMeDown após `npm ci`. São ferramentas
para contribuidores, não comandos da CLI publicada.

```bash
npm run benchmark:headings
npm run benchmark:headings -- --corpus ./docs --rounds 5 --warmups 1
# Apenas JSON, sem o anúncio do comando npm
node --import tsx ./scripts/benchmark-headings.mjs --corpus ./docs --rounds 5 --warmups 1
```

## Escopo e segurança

O modo sintético usa corpus de prosa e Markdown rico com 100 e 1.000 documentos.
A extração usa o renderizador; o manifesto inclui varredura, YAML, metadados,
idiomas e sidebar. Não mede o build completo do site, componentes ou inicialização
do navegador.

`--corpus` lê uma raiz existente sem gerar arquivos, criar links ou executar
scripts de configuração. Respeita idiomas, raízes aninhadas e exclusões de arquivos
de agentes. Mantenha as fontes estáveis; raízes vazias ou configurações inválidas
geram erro.

## Interpretando o relatório

O JSON inclui amostras, mínimo/mediana/máximo, vazão, RSS máximo e ambiente.
Corpus reais incluem fingerprints das fontes/configuração e dez documentos
custosos medidos separadamente. Revise caminhos locais antes de compartilhar e
salve os relatórios fora da árvore de trabalho.

As medições são aquecidas: um manifesto inicial estabelece os títulos esperados.
RSS inclui preparação e verificação, não apenas o parser. Tempos por página não
substituem um perfil de CPU. Não existe limite de tempo como gate de CI.

## Captura opcional de CPU

```powershell
node --import tsx ./scripts/benchmark-headings.mjs --corpus ./docs --rounds 5 --warmups 1 --cpu-profile "$env:TEMP/dmd-heading-cpu"
```

O diretório deve ficar fora do repositório e do corpus, inclusive por links
simbólicos. Também funciona com dados sintéticos. Passadas aquecidas adicionais
geram `.cpuprofile` e resumos JSON de funções folha; as amostras normais não são
perfiladas. Abra os perfis para inspecionar as pilhas completas. Importações,
preparação e verificações ficam fora da captura. O intervalo solicitado é
1.000 µs. Contagens não são custos inclusivos por etapa nem porcentagens exatas;
funções anônimas/transpiladas exigem inspeção dos mapas de código-fonte.
O perfil adiciona overhead e afeta RSS. Revise caminhos absolutos antes de
compartilhar. A captura local não completa a atribuição por etapa nem a validação
empresarial. O parser permanece inalterado.

### Interpretando a atribuição por pilha

`cpuProfile.attribution` agrupa módulos por pilhas completas e método versionado.
`leafSamples` conta funções folha reconhecidas. `exclusiveSamples` atribui cada
amostra ao módulo reconhecido mais próximo; trabalho nativo/desconhecido pode
herdar o grupo do chamador. `inclusiveSamples` conta cada categoria uma vez por
pilha: grupos se sobrepõem e não devem ser somados. As colunas folha e exclusiva
somam, cada uma, o total de amostras; GC, inatividade e amostras sem atribuição
continuam explícitos. Nomes e linhas geradas não são usados para adivinhar etapas,
nem contagens convertidas em durações ou porcentagens exatas. URLs desconhecidas
reduzem a atribuição e zero amostras não comprova custo zero. Validação empresarial
e durações por etapa permanecem pendentes.

## Referência e trabalho pendente

Em 20 de outubro de 2026, um snapshot de 61 documentos e três idiomas mediu
165 ms de mediana na extração e 190 ms no manifesto: Windows x64, Node v26.3.0,
Intel Core Ultra 7 155H. São observações locais, não garantias.
O changelog e os showcases traduzidos foram as páginas mais custosas.

Consulte `scripts/benchmark-headings.md` no repositório para metodologia,
fingerprint e resultados sintéticos. Edições alteram o fingerprint. Permanecem
pendentes corpus empresariais grandes e durações exatas por etapa. O pipeline
completo do candidato passou localmente com npm 11.16.0 em Node 20.19.0 e
22.14.0; isso não substitui perfis empresariais nem evidência de CI remoto.