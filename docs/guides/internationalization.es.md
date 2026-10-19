---
title: Internacionalización (i18n)
description: Cómo estructurar, configurar y distribuir documentación multilingüe nativa con DocMeDown utilizando convenciones de sufijos de archivo.
order: 14
category: Referencia y Herramientas
tags: [i18n, internacionalización, idiomas, traducción, localización]
---

# Internacionalización (i18n) 🌐

DocMeDown agrupa las traducciones por el sufijo del nombre del archivo, y no por carpetas de idiomas.
Para un original en inglés, `guide.md` y `guide.en.md` representan el mismo documento;
`guide.es.md` y `guide.pt-br.md` son sus traducciones. Las categorías conservan su
estructura de carpetas existente. Se admiten extensiones tanto Markdown como MDX.

## Configuración

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

Solo los sufijos registrados se interpretan como idiomas. Nombres con puntos ordinarios,
como `guide.api.md`, siguen siendo nombres de documentos comunes. Las etiquetas de idioma
no distinguen entre mayúsculas y minúsculas en los sufijos; los slugs públicos traducidos usan sufijos en minúsculas.
El original explícito (`guide.en.md`) tiene prioridad sobre el archivo sin sufijo, con una
advertencia de validación. Las variantes explícitas equivalentes se rechazan como conflictos.

## Inicialización

```sh
npx docmedown init --yes --default-locale en --locales pt-BR,es
```

Las mismas opciones están disponibles durante el inicio rápido. La configuración interactiva pregunta
por los idiomas del proyecto mediante un menú de selección múltiple, seguido por el idioma original.
Los seis ajustes predefinidos son inglés (`en`), portugués de Brasil (`pt-BR`), español (`es`),
francés (`fr`), alemán (`de`) y chino simplificado (`zh-CN`).
Los seis están seleccionados inicialmente; se trata de una selección orientada al proyecto,
no de una clasificación global de popularidad. Con `--yes` y sin flags de idioma, estos seis quedan habilitados
y el inglés es el original. Un `--locales` explícito reemplaza esa selección; el original
siempre se incluye. Para añadir otro idioma, elige la opción de adición manual e
introduce su nombre para mostrar y la etiqueta de idioma (por ejemplo, `日本語`, luego `ja`). Introduce
la etiqueta, no `.ja.md`. Las etiquetas se canonizan y los duplicados seleccionados se rechazan.
Cancelar cualquier prompt de idioma cancela la creación sin guardar una configuración parcial.

`docmedown config` edita estas opciones, mantiene las sustituciones personalizadas por idioma
existentes y confirma cambios que reinterpretan documentos sin sufijo. Establecer un idioma
no traduce el texto fuente ni los archivos de ejemplo.

## Lectura y Reserva (Fallback)

El selector de idioma en la barra superior aparece para proyectos multilingües. Mantiene la
misma página lógica al cambiar de idioma. Las traducciones ausentes muestran el
original con un aviso, o un estado no disponible si la reserva está desactivada.
El idioma seleccionado se conserva en la ruta con sufijo, incluso durante la reserva.
La búsqueda y la navegación muestran una variante por documento lógico.

Una URL explícita tiene prioridad sobre una elección de idioma guardada. Sin una
elección previa, se utiliza el idioma original; el idioma del navegador no se infiere.
Los enlaces relativos de Markdown heredan el idioma de la página, mientras que los sufijos de idioma
explícitos se respetan. Editar una página de reserva edita su archivo físico original.

## Etiquetas de Sitio Localizadas

Cada entrada de idioma puede definir `overrides` para `nav`, `sidebar`, `tagline`,
`description`, `search` y `footer`. Estas heredan la configuración base.
Por ejemplo, añade `"overrides": { "search": { "placeholder": "Buscar…" } }`
a la entrada en español. Los mensajes integrados para el lector actualmente incluyen inglés,
portugués, español, francés, alemán y chino simplificado; otros idiomas recurren
al inglés para esos mensajes.

Las páginas estáticas declaran su idioma de contenido y hacen referencia a las traducciones publicadas.
Las exportaciones offline conservan el corpus y el selector. La lista y búsqueda vía MCP aceptan
un parámetro opcional `locale`; los documentos traducidos también pueden leerse por su slug con sufijo.

La salida de contexto para IA utiliza el idioma original por defecto. Los idiomas adicionales generan
`llms.<locale>.txt`, `llms-full.<locale>.txt` y `okf.<locale>.json` junto a los
artefactos originales, sin introducir carpetas de idiomas.

## Guías DMD Integradas

El pie de página abre `DMD` y su subpágina `DMD/for-developers`. Ambas vienen empaquetadas con
contenido en los seis idiomas predeterminados, incluyendo fuentes zero-config y remotas.
Las exportaciones del proyecto incluyen los idiomas configurados más el inglés incondicional.
Por ejemplo, `DMD.es` y `DMD/for-developers.es` son rutas en español.
Estas guías permanecen ocultas de la barra lateral/búsqueda y llevan metadatos `noindex`.
Las exportaciones estáticas prerenderizan las variantes de guías configuradas; las copias offline no requieren conexión a red.

Para un idioma personalizado sin traducción integrada, DMD usa **inglés**, incluso
si el idioma original del proyecto no es inglés o la reserva del proyecto está desactivada.
La ruta solicitada se mantiene y el aviso identifica el idioma efectivo.
Esta excepción se aplica únicamente a las guías DMD proporcionadas por el motor. Los documentos ordinarios
siguen usando `defaultLocale` y `fallbackToDefault`.

## Mantenimiento y Límites de la Documentación

Toda la documentación existente puede usar el mismo mecanismo de sufijo en el nombre de archivo, incluidos
los sitios de ejemplo anidados con su propio `docs.json`. Habilitar un idioma **no** es
una afirmación de que todas las páginas estén traducidas. Nunca copies texto en inglés a un archivo con sufijo
solo para aprobar una verificación de cobertura. Conserva comandos, claves de configuración,
etiquetas de componentes y destinos de enlaces al traducir; revisa los encabezados y anclas localizados.
Consulta `ROADMAP.md` para ver el trabajo pendiente de traducción completa del corpus y extracción de UI.

El catálogo de mensajes integrado cubre actualmente el selector de idiomas,
el aviso de fallback, enlace para saltar al contenido, marcador de búsqueda, enlaces anterior/siguiente y etiqueta de carga de documentos. Las acciones del editor,
algunos controles del lector y mensajes de componentes integrados siguen usando inglés.
Cambiar de idioma inicia en la parte superior del documento de destino; no se proporciona
mapeo automático entre anclas de encabezados traducidos.
