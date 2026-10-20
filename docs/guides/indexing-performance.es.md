---
title: Medir el Rendimiento de Indexación
description: Medidas reproducibles de encabezados y manifiestos con corpus sintéticos y reales.
order: 12
tags: [performance, indexing, benchmark]
---

# Medir el Rendimiento de Indexación

Ejecute estos comandos desde el repositorio de DocMeDown después de `npm ci`.
Son herramientas para colaboradores, no comandos de la CLI publicada.

```bash
npm run benchmark:headings
npm run benchmark:headings -- --corpus ./docs --rounds 5 --warmups 1
# Solo JSON, sin el anuncio del comando npm
node --import tsx ./scripts/benchmark-headings.mjs --corpus ./docs --rounds 5 --warmups 1
```

## Alcance y seguridad

El modo sintético usa corpus de prosa y Markdown enriquecido de 100 y 1.000
documentos. La extracción usa el renderizador; el manifiesto incluye escaneo,
YAML, metadatos, idiomas y barra lateral. No mide la compilación completa del
sitio, componentes ni el inicio del navegador.

`--corpus` lee una raíz existente sin generar archivos, crear enlaces ni ejecutar
scripts de configuración. Respeta idiomas, raíces anidadas y exclusión de archivos
de agentes. Mantenga las fuentes estables; raíces vacías o configuraciones
inválidas producen un error.

## Interpretar el informe

El JSON incluye muestras, mínimo/mediana/máximo, rendimiento, RSS máximo y entorno.
Los corpus reales incluyen huellas de fuentes/configuración y diez documentos
costosos medidos por separado. Revise las rutas locales antes de compartir el
informe y guárdelo fuera del árbol de trabajo.

Las medidas son en caliente: un manifiesto inicial establece los encabezados
esperados. RSS incluye preparación y verificación, no solo el analizador.
Las medidas por página no sustituyen un perfil de CPU. No hay umbral temporal de CI.

## Captura opcional de CPU

```powershell
node --import tsx ./scripts/benchmark-headings.mjs --corpus ./docs --rounds 5 --warmups 1 --cpu-profile "$env:TEMP/dmd-heading-cpu"
```

El directorio debe estar fuera del repositorio y del corpus, incluso mediante
enlaces simbólicos. También funciona con datos sintéticos. Pasadas adicionales
en caliente generan `.cpuprofile` y resúmenes JSON de funciones hoja; las muestras
normales no se perfilan. Abra los perfiles para inspeccionar las pilas completas.
Importaciones, preparación y comprobaciones quedan fuera de la captura.
El intervalo solicitado es 1.000 µs. Los recuentos no son costes inclusivos por
etapa ni porcentajes exactos; las funciones anónimas/transpiladas requieren
inspeccionar mapas de código fuente. El perfilado añade sobrecarga y afecta RSS.
Revise las rutas absolutas antes de compartir. La captura local no completa la
atribución por etapa ni la validación empresarial. El analizador no cambia.

### Interpretar la atribución por pila

`cpuProfile.attribution` agrupa módulos mediante pilas completas y un método
versionado. `leafSamples` cuenta funciones hoja reconocidas. `exclusiveSamples`
asigna cada muestra al módulo reconocido más cercano; trabajo nativo/desconocido
puede heredar el grupo del llamador. `inclusiveSamples` cuenta cada categoría
una vez por pila: los grupos se solapan y no deben sumarse. Las columnas hoja y
exclusiva suman cada una el total de muestras; GC, inactividad y muestras sin
atribución siguen explícitas. No se usan nombres ni líneas generadas para adivinar
etapas, ni se convierten recuentos en duraciones o porcentajes exactos. URL no
reconocidas reducen la atribución y cero muestras no demuestra coste cero.
La validación empresarial y las duraciones por etapa siguen pendientes.

## Referencia y trabajo pendiente

El 20 de octubre de 2026, una instantánea de 61 documentos y tres idiomas midió
165 ms de mediana para extracción y 190 ms para manifiesto: Windows x64, Node
v26.3.0, Intel Core Ultra 7 155H. Son observaciones locales, no garantías.
El changelog y los showcases traducidos fueron las páginas más costosas.

Consulte `scripts/benchmark-headings.md` en el repositorio para la metodología,
huella y resultados sintéticos. Las ediciones cambian la huella. Siguen pendientes
corpus empresariales grandes y duraciones exactas por etapa. El pipeline completo
del candidato pasó localmente con npm 11.16.0 en Node 20.19.0 y 22.14.0; no
sustituye los perfiles empresariales ni la evidencia de CI remoto.