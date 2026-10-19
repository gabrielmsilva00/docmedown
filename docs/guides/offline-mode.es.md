---
title: Modo Offline y Archivo Único
description: Cree paquetes de documentación HTML monofile 100% autocontenidos y aislados que se abren directamente mediante file:/// sin necesidad de servidor.
order: 3
tags: [offline, single-file, air-gapped, file-protocol, standalone, distribution]
---

# Paquetes Offline y de Archivo Único 📦

DocMeDown está diseñado para ejecutarse en cualquier entorno — incluyendo redes aisladas de alta seguridad (air-gapped), manuales de dispositivos integrados, infraestructuras de defensa, portátiles de campo y sistemas de archivos locales.

---

## 💻 El Problema de los Generadores de Documentación Tradicionales

La mayoría de los generadores estáticos contemporáneos (Docusaurus, VitePress, MkDocs, etc.) generan cientos de archivos HTML individuales, bloques de JavaScript y hojas de estilo CSS.

Al intentar abrir estos archivos directamente desde el explorador de archivos con doble clic vía `file:///C:/mis-docs/index.html`:
- El navegador genera **errores de seguridad CORS y de origen cruzado**.
- Los navegadores bloquean sistemáticamente las llamadas JavaScript `fetch()` hacia archivos locales adyacentes en URLs con protocolo `file:///`.
- La documentación se muestra como una pantalla en blanco con errores, sin estilos ni navegación utilizable.

---

## ⚡ La Solución Monofile de DocMeDown

DocMeDown compila su sitio web de documentación al completo — incluyendo todos los archivos Markdown, configuración, estilos, diagramas, componentes personalizados y el entorno de ejecución en Svelte 5 — en **un único archivo `index.html` independiente y autoextraíble**:

```bash
npx docmedown build ./docs
```

### El Flujo de Compilación:
1. **Extracción del Contenido**: Rastrea todos los documentos Markdown, extrae encabezados e indexa el contenido para búsquedas difusas.
2. **Compilación de Componentes**: Localiza componentes `.dmd/*.{svelte,tsx,ts}` y los precompila por adelantado (Ahead-of-Time) en elementos personalizados autocontenidos.
3. **Incrustación de Medios sin Pérdidas**: Analiza todas las etiquetas `<Media>` e imágenes habituales de Markdown, convirtiendo gráficos de mapa de bits, vectores SVG, audio y vídeo en URIs de datos Base64 sin degradación.
4. **Serialización en Paquete Gzip**: Comprime todo el acervo de documentación, el runtime, los medios incrustados y los recursos en una carga gzip base64 compacta.
5. **Arranque Autoextraíble**: Integra un script ligero que aprovecha la API nativa `DecompressionStream` del navegador para descomprimir e inicializar DocMeDown localmente en milisegundos.

```
┌─────────────────────────────────────────────────────────────┐
│  index.html independiente (~1.2 MB Gzip)                    │
│  ├─ Arranque Autoextraíble con DecompressionStream          │
│  ├─ Runtime de Producción y Enrutador en Svelte 5           │
│  ├─ Tokens de Tema (Atlas, Blueprint, Terminal, Botanical…) │
│  ├─ Motor de Diagramas Mermaid Offline                      │
│  ├─ Componentes Personalizados .dmd Compilados              │
│  ├─ Medios Incrustados sin Pérdidas (Imágenes, SVGs, Audio) │
│  └─ Base Documental e Índice de Búsqueda Comprimidos        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Cómo Distribuir y Utilizar Documentación Monofile

Una vez generado, distribuya directamente el archivo `docs/.dmd/.singlefile/index.html` (el enlace simbólico `docs/index.html` hace referencia al sitio web servible de SEO, no a este archivo):

### 1. Garantía de Doble Clic
- Haga doble clic en `index.html` directamente desde el explorador de archivos en Windows, macOS o Linux.
- Se abre sin fricción en cualquier navegador moderno mediante `file:///.../index.html`.
- **Cero servidores web necesarios**: Búsqueda instantánea (<Kbd>⌘K</Kbd>), navegación completa, diagramas Mermaid interactivos y cambio de tema funcionan **100% offline**.

### 2. Principales Casos de Uso
- **Adjuntos de Versiones de Software**: Adjunte `mis-docs.html` directamente a las releases de GitHub o GitLab para consulta sin conexión por parte de los usuarios.
- **Dispositivos y Equipos Embebidos**: Almacene en la memoria local del dispositivo (routers, sistemas NAS, instrumental médico) accesible sin conexión a internet.
- **Defensa e Intranets Aisladas (Air-Gapped)**: Despliegue en entornos seguros donde el acceso a internet hacia el exterior está estrictamente restringido.
- **Manuales de Ingeniería de Campo**: Distribuya en memorias USB para intervenciones técnicas en zonas remotas.

---

## 📥 Exportación Offline en el Navegador

Cada sitio de documentación creado con DocMeDown incorpora una opción automática de **Descarga** en la barra de navegación superior.

Cuando un lector hace clic en **Descargar Copia Offline**:
1. El navegador lee el contenido activo de la documentación (`window.__DOCMEDOWN_DATA__`).
2. Comprime los datos en el cliente mediante `CompressionStream("gzip")`.
3. Descarga un archivo `<nombre-doc>-offline.html` autocontenido directamente al equipo local.

> [!NOTE]
> La copia descargada se identifica como un artefacto offline; al abrirla, muestra un indicador de "Copia Offline" en la barra de navegación y desactiva acciones de descarga redundantes.

---

## 🖼️ Incrustación de Medios y Autosuficiencia de Recursos Offline

En sistemas convencionales de documentación, las imágenes enlazadas (`![alt](./imagen.png)`), audios y vídeos no se visualizan al abrir un archivo HTML offline debido a las restricciones de seguridad sobre el protocolo `file:///`.

DocMeDown resuelve esta situación mediante **incrustación offline sin pérdidas**:
- **Fidelidad sin Pérdidas**: Cada recurso vinculado (imágenes de mapa de bits, vectores SVG, pistas de audio y archivos de vídeo) se transforma en Data URIs Base64 sin recodificación destructiva, preservando cada byte con absoluta fidelidad.
- **Control Detallado de Incrustación**: El componente `<Media>` proporciona opciones precisas para definir la incrustación:
  - `embed="base64"` *(predeterminado)*: incrusta el contenido exacto del archivo como Data URI Base64 dentro del paquete final.
  - `embed="inline"`: decodifica vectores SVG directamente en elementos `<svg>` inline en el DOM para una estilización CSS integrada con el tema.
  - `embed="none"` o `embed={false}`: desactiva la incrustación, manteniendo URLs de streaming externas o puntos de acceso remotos en vivo.
- **Recuperación con Fallback**: Si un códec o formato de vídeo concreto no es compatible de forma nativa con el navegador del lector, `<Media fallback="...">` asegura la presentación fluida de recursos alternativos o paneles informativos de reserva.

---

## ⚙️ Opciones de Configuración

En `docs.json`, puede personalizar el comportamiento del paquete offline:

```json title="docs.json"
{
  "name": "Air-Gapped Reference",
  "offline": {
    "embedNestedDocs": true
  }
}
```

- `offline.embedNestedDocs`: Si es `true` (predeterminado), los sitios de documentación anidados (directorios con su propio `docs.json`) se integran directamente dentro del archivo único para navegar entre sub-sitios sin enlaces externos. Establezca en `false` para reducir el tamaño final del archivo.

### Banderas de Compilación CLI:
```bash
# Exportar el paquete offline a un directorio personalizado:
npx docmedown build ./docs --out-dir ./dist

# Omitir la creación del paquete monofile (compilar solo recursos estáticos):
npx docmedown build ./docs --no-single-file
```

---

## 🗺️ Próximos Passos

Siga la ruta de documentación:

<CardGrid cols={2}>
  <Card
    title="Git Remoto Dinámico"
    description="Transmita documentación en vivo directamente desde GitHub o GitLab sin pasos de compilación."
    href="#/guides/remote-github"
    badge="Siguiente"
    badgeType="info"
  />
  <Card
    title="Sitio Estático (SSG) y SEO"
    description="Aprenda cómo se pre-renderizan las páginas estáticas con metadatos completos y tarjetas sociales."
    href="#/guides/static-site"
    badge="Anterior"
    badgeType="success"
  />
</CardGrid>
