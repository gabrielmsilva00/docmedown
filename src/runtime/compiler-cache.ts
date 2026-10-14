/**
 * SHA-256 and IndexedDB compilation cache for dynamic browser components.
 *
 * Subsequent page visits and reloads bypass compilation entirely by matching
 * the SHA-256 hash of the source code and metadata against IndexedDB.
 */

const DB_NAME = "DocMeDownComponentCache";
const STORE_NAME = "compiled_modules";
const DB_VERSION = 1;

// In-memory fallback if IndexedDB is disabled (e.g. incognito/SSR)
const memoryCache = new Map<string, string>();

/**
 * Computes a SHA-256 hash hex string of the input source and optional metadata.
 */
export async function computeSourceHash(source: string, salt: string = ""): Promise<string> {
  const content = `${source}:::${salt}`;

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Node.js crypto fallback
  try {
    const nodeCrypto = await import(/* @vite-ignore */ "node:crypto");
    return nodeCrypto.createHash("sha256").update(content).digest("hex");
  } catch {
    // Basic djb2 / FNV-1a numeric hash fallback if no crypto available
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
      hash = (hash * 33) ^ content.charCodeAt(i);
    }
    return (hash >>> 0).toString(16).padStart(16, "0");
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Retrieves compiled component JavaScript from IndexedDB (or in-memory cache).
 */
export async function getCachedCompiledComponent(hash: string): Promise<string | null> {
  if (memoryCache.has(hash)) {
    return memoryCache.get(hash)!;
  }

  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(hash);

      req.onsuccess = () => {
        const val = req.result as string | undefined;
        if (val) {
          memoryCache.set(hash, val);
          resolve(val);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Stores compiled component JavaScript in IndexedDB (and in-memory cache).
 */
export async function setCachedCompiledComponent(hash: string, compiledJs: string): Promise<void> {
  memoryCache.set(hash, compiledJs);

  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(compiledJs, hash);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
