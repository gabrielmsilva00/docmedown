---
title: Servidor Model Context Protocol (MCP)
description: Conecte su documentación directamente a asistentes de programación con IA (Claude Desktop, Cursor, Windsurf, Copilot) con el servidor MCP nativo de DocMeDown.
order: 4
tags: [ai, mcp, model-context-protocol, claude, cursor, windsurf, llm, agents]
---

# Servidor Model Context Protocol (MCP) 🤖

DocMeDown integra un servidor nativo **Model Context Protocol (MCP)** preparado para producción.

En lugar de forzar a los asistentes de IA a raspar HTML renderizado o leer extractos incompletos, DocMeDown convierte su repositorio de documentación en un grafo de conocimiento interactivo y de alta fidelidad consultable directamente por **Claude Desktop**, **Cursor**, **Windsurf** y cualquier asistente compatible con MCP.

---

## ⚡ 1. Inicio Rápido sin Instalación Previa

El servidor MCP de DocMeDown puede invocarse al instante mediante `npx` sin necesidad de instalación:

```bash
# Transporte stdio (predeterminado, utilizado por Cursor, Claude Desktop y Windsurf):
npx -y docmedown mcp ./docs

# Transporte HTTP Server-Sent Events (SSE) (para agentes remotos o en red):
npx -y docmedown mcp ./docs --transport sse --port 3001 --host 0.0.0.0
```

> [!TIP]
> **Arranque en Sub-Milisegundos**: Ejecutar `npx docmedown build ./docs` antes de iniciar el servidor MCP genera `_manifest.json` y `_docs.js`. El servidor MCP opera entonces sin sobrecarga de escaneo en el sistema de archivos, iniciando en menos de 20ms.

---

## 🛠️ 2. Especificación de Herramientas MCP

DocMeDown ofrece cuatro herramientas especializadas conformes a las especificaciones estándar de JSON Schema:

| Herramienta | Parámetros | Descripción |
| :--- | :--- | :--- |
| **`list_docs`** | *(ninguno)* | Devuelve un inventario de todas las páginas con `slug`, `title`, `path`, `category`, `readingTimeMinutes` y `lastModified`. |
| **`read_doc`** | `slug` *(string)* | Devuelve el contenido Markdown sin procesar completo de una página, el árbol de encabezados estructurados (`level`, `text`, `id`) y la marca de tiempo. |
| **`search_docs`** | `query` *(string)*, `limit?` *(number)* | Búsqueda por relevancia de palabras clave en títulos, encabezados y textos con fragmentos de vista previa. |
| **`resolve_url`** | `slug` *(string)* | Calcula la URL pública canónica de cualquier documento en el sitio publicado a partir de la propiedad `url` en `docs.json`. |

---

## 🔌 3. Recetas de Configuración para Clientes

<Tabs type="pills">
  <Tab label="Cursor (.cursor/mcp.json)" icon="🖱️">
Cree o edite el archivo `.cursor/mcp.json` en la raíz de su proyecto:

```json title=".cursor/mcp.json"
{
  "mcpServers": {
    "project-docs": {
      "command": "npx",
      "args": ["-y", "docmedown", "mcp", "./docs"]
    }
  }
}
```
  </Tab>

  <Tab label="Claude Desktop" icon="🟣">
Añada a su archivo `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json title="claude_desktop_config.json"
{
  "mcpServers": {
    "docmedown": {
      "command": "npx",
      "args": ["-y", "docmedown", "mcp", "C:\\dev\\mi-proyecto\\docs"]
    }
  }
}
```
  </Tab>

  <Tab label="Windsurf (Cascade)" icon="🏄">
En Windsurf, abra `~/.codeium/windsurf/mcp_config.json`:

```json title="mcp_config.json"
{
  "mcpServers": {
    "docs": {
      "command": "npx",
      "args": ["-y", "docmedown", "mcp", "./docs"]
    }
  }
}
```
  </Tab>

  <Tab label="HTTP SSE (En Red / Docker)" icon="🌐">
Para contenedores remotos, microservicios o entornos de equipo compartidos:

```bash
npx -y docmedown mcp ./docs --transport sse --port 3001 --host 0.0.0.0 --allow-origins "*"
```

Conecte sus clientes mediante `http://localhost:3001/sse`.
  </Tab>
</Tabs>

---

## 🧪 4. Desarrollo Local y Pruebas

Al desarrollar DocMeDown o integrarlo en su flujo de trabajo, puede ejecutar, inspeccionar y probar el servidor MCP localmente mediante scripts dedicados:

### Servidor de Desarrollo Local (`dev:mcp`)
```bash
# Ejecutar sobre stdio (predeterminado, para Cursor, Claude Desktop y Windsurf):
npm run dev:mcp

# Ejecutar sobre SSE para clientes HTTP o navegadores:
npm run dev:mcp -- --transport sse --port 3001
```

### Suite de Pruebas Dedicada de MCP (`test:mcp`)
Ejecute la suite automatizada de pruebas MCP que valida esquemas de herramientas, ordenación de búsquedas, filtrado por frontmatter YAML, tuberías stdio de subprocesos y control de CORS en SSE:
```bash
npm run test:mcp
```

### Cliente de Pruebas Interactivo (`test:mcp:client`)
Pruebe las herramientas interactivamente desde la terminal sin necesidad de abrir un cliente de IA externo:
```bash
# Ejecutar verificación rápida automatizada de las 4 herramientas MCP:
npm run test:mcp:client

# Listar todas las páginas indexadas:
node ./scripts/test-mcp-client.mjs list

# Buscar en la documentación con puntuaciones y fragmentos:
node ./scripts/test-mcp-client.mjs search "deploy"

# Leer contenido Markdown y encabezados de un slug específico:
node ./scripts/test-mcp-client.mjs read "guides/mcp-server"

# Resolver URL pública canónica:
node ./scripts/test-mcp-client.mjs url "guides/mcp-server"
```

---

## 💬 5. Ejemplos Reales con Asistentes de IA

Una vez conectado, su asistente de IA decide de forma autónoma cuándo consultar la documentación:

### Ejemplo 1: Localización de Guías y Detalles de Implementación
> **Desarrollador:** *"¿Cómo configuro DocMeDown para servir documentación dinámica desde un repositorio remoto de GitHub?"*
> 
> **Acción del Asistente:**
> 1. Llama a `search_docs(query: "remote github")` ➔ Encuentra `guides/remote-github`.
> 2. Llama a `read_doc(slug: "guides/remote-github")` ➔ Obtiene el esquema exacto de configuración.
> 3. Responde con el bloque exacto de 12 líneas de `docs.json` y el enlace de citación.

### Ejemplo 2: Verificación de Parámetros de API
> **Desarrollador:** *"¿Cuáles son las opciones aceptadas por el comando `build`?"*
> 
> **Acción del Asistente:**
> 1. Llama a `search_docs(query: "build options")` ➔ Encuentra `guides/cli-reference`.
> 2. Devuelve `--watch`, `--no-single-file`, `--no-static` y `--out-dir` directamente de la fuente de verdad.

---

## ⚖️ Por qué MCP Nativo Supera al RAG Tradicional y al Web Scraping

| Capacidad | MCP de DocMeDown | Web Scraping / RAG con HTML |
| :--- | :---: | :---: |
| **Tiempo de Arranque** | **Instantáneo (< 20ms)** | Requiere embeddings vectoriales |
| **Fidelidad del Contenido** | **100% Markdown Original** | Ruido y recortes de etiquetas HTML |
| **Navegación Estructurada** | **Árbol Jerárquico Completo** | Segmentos de texto sin estructura |
| **Soporte Offline** | **Proceso 100% Local vía Stdio** | Requiere APIs y modelos externos |
| **Coste** | **$0.00 (Cero Bases Vectoriales)** | Costes periódicos de infraestructura vectorial |

---

## 🗺️ Próximos Pasos

Siga la ruta de documentación:

<CardGrid cols={2}>
  <Card
    title="Referencia de Configuración"
    description="Recetario completo y referencia de esquema para docs.json, familias visuales y personalización."
    href="#/configuration"
    badge="Siguiente"
    badgeType="info"
  />
  <Card
    title="Git Remoto Dinámico"
    description="Transmita documentación en vivo directamente desde GitHub o GitLab sin pasos de compilación."
    href="#/guides/remote-github"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
