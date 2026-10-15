/**
 * Media detection, MIME type resolution, and lossless embedding utilities
 * for DocMeDown's <Media /> component and offline distributables.
 */

export type MediaCategory = "image" | "vector" | "video" | "audio" | "unknown";

const MEDIA_MIME_TYPES: Record<string, string> = {
  // Raster Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
  ico: "image/x-icon",
  cur: "image/x-icon",
  tif: "image/tiff",
  tiff: "image/tiff",
  apng: "image/apng",

  // Vector Graphics
  svg: "image/svg+xml",
  svgz: "image/svg+xml",

  // Video Formats
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",

  // Audio Formats
  mp3: "audio/mpeg",
  wav: "audio/wav",
  wave: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/opus",
  aac: "audio/aac",
  m4a: "audio/mp4",
  flac: "audio/flac",
  weba: "audio/webm",
  wma: "audio/x-ms-wma",
  mid: "audio/midi",
  midi: "audio/midi",
};

/** Extracts extension without dot, query params or hash fragments. */
function extractExtension(urlOrPath: string): string {
  if (!urlOrPath) return "";
  const clean = urlOrPath.trim().split("#")[0].split("?")[0];
  const lastDot = clean.lastIndexOf(".");
  if (lastDot === -1 || lastDot === clean.length - 1) return "";
  return clean.slice(lastDot + 1).toLowerCase();
}

/** Determines MIME type from file extension or explicit type hint. */
export function resolveMimeType(urlOrPath: string, explicitType?: string): string {
  if (explicitType?.trim()) {
    const cleanType = explicitType.trim().toLowerCase();
    if (cleanType.includes("/")) return cleanType;
    if (MEDIA_MIME_TYPES[cleanType]) return MEDIA_MIME_TYPES[cleanType];
  }

  if (isDataUri(urlOrPath)) {
    const parsed = parseDataUri(urlOrPath);
    if (parsed) return parsed.mimeType;
  }

  const ext = extractExtension(urlOrPath);
  if (ext && MEDIA_MIME_TYPES[ext]) {
    return MEDIA_MIME_TYPES[ext];
  }

  return "application/octet-stream";
}

/**
 * Categorizes media into "image" (raster), "vector" (SVG), "video", or "audio".
 */
export function detectMediaCategory(urlOrPath: string, typeOrFormat?: string): MediaCategory {
  const normalizedHint = (typeOrFormat || "").trim().toLowerCase();

  if (normalizedHint === "vector" || normalizedHint === "svg" || normalizedHint.includes("svg")) {
    return "vector";
  }
  if (normalizedHint === "image" || normalizedHint.startsWith("image/")) {
    if (normalizedHint.includes("svg")) return "vector";
    return "image";
  }
  if (normalizedHint === "video" || normalizedHint.startsWith("video/")) {
    return "video";
  }
  if (normalizedHint === "audio" || normalizedHint.startsWith("audio/")) {
    return "audio";
  }

  const mime = resolveMimeType(urlOrPath, typeOrFormat);

  if (mime === "image/svg+xml") return "vector";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  const ext = extractExtension(urlOrPath);
  if (["png", "jpg", "jpeg", "webp", "gif", "avif", "bmp", "ico", "tif", "tiff", "apng"].includes(ext)) {
    return "image";
  }
  if (["svg", "svgz"].includes(ext)) {
    return "vector";
  }
  if (["mp4", "m4v", "webm", "ogv", "mov", "avi", "mkv"].includes(ext)) {
    return "video";
  }
  if (["mp3", "wav", "ogg", "oga", "opus", "aac", "m4a", "flac", "weba"].includes(ext)) {
    return "audio";
  }

  return "unknown";
}

/** True if the target URL or path appears to reference a known media asset. */
export function isMediaFile(urlOrPath: string): boolean {
  if (!urlOrPath) return false;
  if (isDataUri(urlOrPath)) {
    const mime = parseDataUri(urlOrPath)?.mimeType || "";
    return mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/");
  }
  const ext = extractExtension(urlOrPath);
  return Boolean(ext && MEDIA_MIME_TYPES[ext]);
}

/** True if a string is a valid Data URI. */
export function isDataUri(url: string): boolean {
  if (!url) return false;
  return /^data:([a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+)?(?:;charset=[a-zA-Z0-9-]+)?(?:;base64)?,/i.test(
    url.trim(),
  );
}

/** Parses a Data URI into its MIME type, base64 status, and payload. */
export function parseDataUri(dataUri: string): { mimeType: string; isBase64: boolean; data: string } | null {
  if (!dataUri) return null;
  const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/is.exec(dataUri.trim());
  if (!match) return null;
  return {
    mimeType: match[1] || "text/plain",
    isBase64: Boolean(match[2]),
    data: match[3],
  };
}

/**
 * Encodes binary bytes losslessly to a Base64 Data URI.
 * This conversion is 100% bijective and preserves the original bitstream
 * without lossy compression or transcoding.
 */
export function toLosslessDataUri(bytes: Uint8Array | ArrayBuffer | string, mimeType: string): string {
  let base64: string;
  if (typeof bytes === "string") {
    if (typeof Buffer !== "undefined") {
      base64 = Buffer.from(bytes, "utf-8").toString("base64");
    } else {
      base64 = btoa(unescape(encodeURIComponent(bytes)));
    }
  } else {
    const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (typeof Buffer !== "undefined") {
      base64 = Buffer.from(uint8).toString("base64");
    } else {
      let binary = "";
      const chunkSize = 0x8000;
      for (let offset = 0; offset < uint8.length; offset += chunkSize) {
        binary += String.fromCharCode(...uint8.subarray(offset, offset + chunkSize));
      }
      base64 = btoa(binary);
    }
  }
  return `data:${mimeType};base64,${base64}`;
}
