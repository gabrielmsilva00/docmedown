---
title: Referencia de Comandos de CLI
description: Referencia completa y práctica para todos los comandos, opciones, flags y recetas de automatización en CI/CD de la CLI de DocMeDown.
order: 1
tags: [cli, comandos, terminal, tui, ci-cd, automatización]
---

# Referencia de Comandos de CLI 🛠️

La interfaz de línea de comandos de DocMeDown proporciona todo lo necesario para estructurar, desarrollar, validar, empaquetar y distribuir documentación.

Puedes ejecutar cualquier comando directamente con `npx -y docmedown <comando>` o instalarlo globalmente:

```bash
npm install -g docmedown
```

---

## ⚡ Visión General de la Matriz de Comandos

| Comando | Abreviatura | Propósito | Flags Clave |
| :--- | :--- | :--- | :--- |
| **[`docmedown`](#0-docmedown-inicio-rapido-servidor-dev)** | `dmd` | Configuración rápida si está vacío, o inicia servidor de previsualización | `-p, --port`, `-y, --yes`, `--no-open` |
| **[`init`](#1-init-asistente-interactivo-de-configuracion)** | — | Asistente interactivo para configurar y estructurar documentación | `-y, --yes`, `-n, --name`, `-t, --theme`, `--no-start` |
| **[`serve`](#2-serve-alias-dev-hot-live-reload)** | `dev` | Servidor dev ultrarrápido con recarga en caliente por WebSocket | `-p, --port`, `-H, --host`, `--no-open`, `--no-qr` |
| **[`build`](#3-build-compilador-estatico-y-bundler)** | — | Prerenderiza HTML estático, SEO, contexto para IA y paquete offline | `-w, --watch`, `--no-single-file`, `-o, --out-dir` |
| **[`validate`](#4-validate-linter-de-enlaces-y-frontmatter)** | — | Linter exhaustivo para enlaces rotos, anclas faltantes y errores de YAML | `--json` |
| **[`doctor`](#5-doctor-diagnosticos-de-sistema-y-componentes)** | — | Diagnóstico de entorno, integridad de archivos y componentes .dmd | `--json` |
| **[`mcp`](#6-mcp-servidor-model-context-protocol)** | — | Expone docs a asistentes de IA (Cursor, Claude Desktop, Windsurf) | `-t, --transport`, `-p, --port`, `--allow-origins` |
| **[`config`](#7-config-tui-interactiva-en-terminal)** | — | Asistente visual de terminal para tema, marca y navegación | — |

---

<a id="0-docmedown-inicio-rapido-servidor-dev"></a>
## 0. `docmedown` — Inicio Rápido & Servidor Dev

Al ejecutarse en un directorio que ya contiene documentación, `docmedown` inicia inmediatamente el servidor de desarrollo local.

Al ejecutarse en un directorio vacío o sin documentación, `docmedown` actúa como el **Inicio Rápido**:
1. Utiliza valores predeterminados de inicio rápido (detectando el nombre del proyecto desde `package.json`).
2. Muestra un árbol de previsualización de los directorios y archivos a crear.
3. **Solicita confirmación ANTES de crear cualquier archivo** (salvo que se proporcione `-y, --yes`).

```bash
# Inicio rápido en ./docs (solicita confirmación antes de crear archivos):
npx docmedown

# Inicio rápido sin confirmación:
npx docmedown -y
```

---

<a id="1-init-asistente-interactivo-de-configuracion"></a>
## 1. `init` — Asistente Interactivo de Configuración

El comando `init` lanza el asistente interactivo de configuración, guiándote en la personalización de tu sitio antes de generar archivos:

1. **Cuestionario Interactivo**: Elige el directorio de documentación, nombre del proyecto, lema, familia de temas, modo de color predeterminado y si deseas incluir componentes personalizados de muestra.
2. **Previsualización del Árbol de Directorios**: Muestra un árbol completo con cada archivo que se creará o enlazará desde la raíz.
3. **Confirmación Previa**: Solicita confirmación **antes** de escribir cualquier archivo en disco.

```bash
# Iniciar asistente interactivo de configuración:
npx docmedown init

# Iniciar configuración interactiva para un directorio específico:
npx docmedown init ./docs

# Modo no interactivo / CI con valores por defecto:
npx docmedown init ./docs -y --no-start
```

### Qué se crea:
```
docs/                        # Raíz de la documentación: SOLO fuentes + symlink index.html
├── index.html               # Symlink → .dmd/index.html (sitio SEO generado vía build)
├── README.md                # Página de inicio principal de documentación (o enlazada de raíz)
├── getting-started.md       # Guía inicial (#/getting-started)
├── CHANGELOG.md             # Enlazado desde la raíz (si existe)
├── guides/
│   └── custom-components.md # Referencia de componentes personalizados
└── .dmd/
    ├── .config/docs.json         # Configuración central (tema, navegación, marca)
    └── .components/
        └── CounterWidget.svelte  # Componente inicial Svelte 5 con runes
```

---

## 2. `serve` (alias: `dev`) — Hot Live Reload

Inicia un servidor de desarrollo local ultrarrápido con recarga en vivo instantánea respaldada por WebSocket.

```bash
# Servir carpeta predeterminada ./docs en http://localhost:3000:
npx docmedown serve ./docs

# Usar el alias corto:
npx docmedown dev

# Puerto y host personalizados:
npx docmedown serve ./docs --port 8080 --host 0.0.0.0 --no-open
```

### Opciones:
- `-p, --port <number>`: Puerto en el que escuchar (predeterminado: `3000`; se incrementa automáticamente si está ocupado).
- `-H, --host <string>`: Host al que vincular el servidor (predeterminado: `0.0.0.0` para acceso en red local).
- `--no-open`: Evita abrir automáticamente tu navegador predeterminado al iniciar.
- `--no-qr`: Oculta el código QR de terminal para la URL de red.

Al iniciar, el servidor imprime un banner compacto (`✔ Artifacts ready (N pages)`) en lugar de la lista completa, junto con las URLs `Local:` y `Network:` con un QR escaneable para la dirección de red.

> [!TIP]
> **Posición de Lectura Preservada**: Al editar cualquier archivo Markdown o componente `.dmd/`, DocMeDown envía actualizaciones por WebSocket y vuelve a renderizar el documento **sin perder tu posición actual de scroll**.

---

<a id="3-build-compilador-estatico-y-bundler"></a>
## 3. `build` — Compilador Estático y Bundler

Escanea recursivamente todos los documentos Markdown, extrae encabezados, genera árboles de navegación, prerenderiza páginas estáticas con metadatos completos de SEO, emite archivos de contexto para IA y produce un paquete offline para entornos aislados.

```bash
# Compilar activos de producción y paquete offline en ./docs/.dmd/.singlefile:
npx docmedown build ./docs

# Modo watch (recompila automáticamente tras cada cambio):
npx docmedown build ./docs --watch

# Guardar paquete offline en archivo único en directorio personalizado:
npx docmedown build ./docs --out-dir ./dist
```

### Artefactos Generados:
1. **Páginas Estáticas Prerenderizadas**: Compila cada archivo Markdown a `<slug>/index.html` con HTML semántico completo, resaltado de sintaxis Prism integrado y esquema JSON-LD.
2. **Activos de SEO**: Genera `sitemap.xml` y `robots.txt` cuando `url` está configurada en `docs.json`.
3. **Archivos de Contexto para IA**: Emite `llms.txt`, `llms-full.txt`, `SKILL.md` y `okf.json` en `.dmd/` para asistentes y agentes de programación.
4. **Distribuible Offline Autónomo**: Comprime todos los documentos, componentes personalizados y el runtime en un único archivo `.dmd/.singlefile/index.html` que funciona directamente en URLs `file:///`. El symlink `docs/index.html` apunta al sitio SEO listo para servidor (`.dmd/index.html`).

### Opciones:
- `-w, --watch`: Observa archivos de origen y recompila ante cualquier cambio.
- `--no-single-file`: Compila solo archivos para servidor; omite el empaquetado offline en archivo único.
- `--no-static`: Omite la generación de páginas estáticas prerenderizadas y archivos SEO/IA.
- `-o, --out-dir <path>`: Directorio de salida para el paquete offline (predeterminado: `<dir>/.dmd/.singlefile`).

---

## 4. `validate` — Linter de Enlaces y Frontmatter

Realiza una verificación estructural exhaustiva en todo el sitio de documentación. Detecta enlaces locales rotos, anclas faltantes, frontmatter YAML malformado y configuraciones no válidas de `docs.json` antes del despliegue.

```bash
# Validar enlaces y esquemas de documentación:
npx docmedown validate ./docs

# Salida en formato JSON para pipelines de CI/CD:
npx docmedown validate ./docs --json
```

### Ejemplo de Salida:
```text
🔍 Validating documentation in ./docs...
  📄 Documents scanned: 12
  🔗 Links verified:    21
  📑 Headings indexed:  148

✔ Validation passed! All documents, links, and schemas are valid.
```

Si un autor escribe un enlace roto o referencia un ancla de encabezado inexistente, `validate` señala el archivo y número de línea exactos:
```text
✖ Broken link in "guides/custom-components.md":
  Anchor "#missing-prop" not found in "guides/cli-reference.md"
```

---

<a id="5-doctor-diagnosticos-de-sistema-y-componentes"></a>
## 5. `doctor` — Diagnósticos de Sistema y Componentes

Ejecuta diagnósticos completos sobre tu entorno de desarrollo, estructura de proyecto, referencias a recursos y componentes personalizados `.dmd`.

```bash
# Diagnosticar proyecto de documentación local:
npx docmedown doctor ./docs

# Generar informe en formato JSON:
npx docmedown doctor ./docs --json
```

### Informe de Diagnóstico de Ejemplo:
```text
🩺 DocMeDown Doctor — System & Documentation Diagnostics (./docs)
──────────────────────────────────────────────────────────────────────
✔ [PASS] Node.js Environment: v26.3.0 (satisfies requirement >=20.19.0)
✔ [PASS] Configuration File: Found valid configuration file: docs.json
✔ [PASS] Documentation Documents: Found 12 markdown document(s) with valid home page
✔ [PASS] Asset References: All local asset references verified
✔ [PASS] Custom Components (.dmd): All 4 custom component(s) compiled cleanly
──────────────────────────────────────────────────────────────────────
✨ Doctor found 0 critical issues (5 passed, 0 warning(s)). Ready to build/serve!
```

---

## 6. `mcp` — Servidor Model Context Protocol

Convierte tu documentación en una base de conocimiento interactiva consultable por asistentes de programación con IA (Claude Desktop, Cursor, Windsurf, Copilot).

```bash
# Transporte Stdio (predeterminado, ideal para Cursor / Claude Desktop):
npx -y docmedown mcp ./docs

# Transporte HTTP Server-Sent Events (SSE) (para agentes remotos en red):
npx -y docmedown mcp ./docs --transport sse --port 3001 --host 0.0.0.0
```

### Opciones:
- `-t, --transport <type>`: Protocolo a utilizar: `stdio` (predeterminado) o `sse`.
- `-p, --port <number>`: Número de puerto para transporte SSE (predeterminado: `3001`).
- `-H, --host <string>`: Hostname/IP al que vincular (predeterminado: `localhost`).
- `--allow-origins <origins>`: Orígenes CORS permitidos para SSE (ej.: `*` o `http://localhost:3000`).

---

## 7. `config` — TUI Interactiva en Terminal

Inicia una interfaz visual de usuario en la terminal para configurar temas, marca, densidad, enlaces de navegación y repositorios Git remotos.

```bash
npx docmedown config ./docs/docs.json
```

Guarda directamente en tu archivo `docs.json` con validación completa de esquema.

---

## 🤖 Receta de Automatización para CI/CD

Añade este flujo de trabajo de GitHub Actions a `.github/workflows/docs-check.yml` para validar enlaces, verificar salud y compilar documentación automáticamente en cada Pull Request:

```yaml title=".github/workflows/docs-check.yml"
name: Documentation Quality & Build
on: [push, pull_request]

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      with:
        node-version: 22

      - name: Validate Links & Frontmatter
        run: npx docmedown validate ./docs

      - name: Run Doctor Diagnostics
        run: npx docmedown doctor ./docs

      - name: Compile Production Site & Offline Bundle
        run: npx docmedown build ./docs
```

---

## 🗺️ Próximos Pasos

Continúa con el recorrido lineal de la documentación:

<CardGrid cols={2}>
  <Card
    title="Guías de Migración"
    description="Paso a paso para migrar desde Docusaurus, VitePress, Docsify y MkDocs."
    href="#/guides/migrations"
    badge="Siguiente"
    badgeType="info"
  />
  <Card
    title="Referencia de Configuración"
    description="Revisa el esquema de docs.json, familias de temas, imagen de marca y navegación."
    href="#/configuration"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
