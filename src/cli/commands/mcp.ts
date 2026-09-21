import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { DocFileItem, DocManifest } from "../../runtime/types";

export interface DocToolkit {
  manifest: DocManifest;
  /** Slug (and path) → raw markdown, extracted from the built _docs.js payload. */
  docs: Record<string, string>;
}

function parseDocsJs(source: string): Record<string, string> | null {
  const match = source.match(/window\.__DOCMEDOWN_DATA__\s*=\s*([\s\S]*?);\s*$/m);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]) as { docs?: Record<string, string> };
    return data.docs && typeof data.docs === "object" ? data.docs : null;
  } catch {
    return null;
  }
}

/**
 * Loads a built DocMeDown site (no source tree required): `_manifest.json` for
 * metadata and `_docs.js` for the embedded markdown corpus. Returns null when
 * the directory has not been built yet.
 */
export function loadBuiltSite(targetDir: string): DocToolkit | null {
  const manifestPath = path.join(targetDir, "_manifest.json");
  const docsJsPath = path.join(targetDir, "_docs.js");
  if (!fs.existsSync(manifestPath)) return null;

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as DocManifest;
    let docs: Record<string, string> = {};
    if (fs.existsSync(docsJsPath)) {
      docs = parseDocsJs(fs.readFileSync(docsJsPath, "utf-8")) ?? {};
    }
    return { manifest, docs };
  } catch {
    return null;
  }
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 1);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!haystack) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1 && count < 50) {
    count++;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function buildSnippet(doc: DocFileItem, terms: string[]): string {
  const content = (doc.content || "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const lines = content.split("\n");
  for (const term of terms) {
    for (const line of lines) {
      if (line.toLowerCase().includes(term)) {
        const clean = line.replace(/^[#>\-*\s`]+/, "").trim();
        if (clean) return clean.length > 200 ? `${clean.slice(0, 200)}…` : clean;
      }
    }
  }
  const first = lines.find((line) => line.trim() && !line.startsWith("#")) || "";
  return first.trim().slice(0, 200);
}

/** Lightweight term-frequency scoring over title, headings, and content. */
export function searchDocs(
  toolkit: DocToolkit,
  query: string,
  limit = 10,
): Array<{ slug: string; title: string; snippet: string; score: number }> {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const results = toolkit.manifest.docs
    .filter((doc) => doc.frontmatter?.hidden !== true)
    .map((doc) => {
      const title = doc.title.toLowerCase();
      const headingText = doc.headings
        .map((heading) => `${heading.text} ${heading.id}`)
        .join(" ")
        .toLowerCase();
      const content = (doc.content || "").toLowerCase();
      let score = 0;
      for (const term of terms) {
        score += countOccurrences(title, term) * 5;
        score += countOccurrences(headingText, term) * 3;
        score += Math.min(countOccurrences(content, term), 20);
      }
      return { slug: doc.slug, title: doc.title, snippet: buildSnippet(doc, terms), score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 25)));

  return results;
}

function findDoc(toolkit: DocToolkit, slug: string): DocFileItem | undefined {
  const normalized = slug.replace(/^\.?\//, "").replace(/\.(md|mdx)$/i, "");
  return toolkit.manifest.docs.find(
    (doc) =>
      doc.slug.toLowerCase() === normalized.toLowerCase() ||
      doc.path.replace(/\.(md|mdx)$/i, "").toLowerCase() === normalized.toLowerCase(),
  );
}

export type RegisterTools = (server: McpServer, toolkit: DocToolkit) => void;

/**
 * Registers the documentation tools on an MCP server. Tool output shapes match
 * the surface docmd users asked for in docmd-io/docmd#221: full page content
 * with headings and last-modified dates instead of truncated snippets.
 */
export const registerDocTools: RegisterTools = (server, toolkit) => {
  const siteName = toolkit.manifest.config?.name || "Documentation";

  server.registerTool(
    "list_docs",
    {
      description: `List every document in the ${siteName} documentation corpus with titles, categories, and reading times.`,
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              site: siteName,
              count: toolkit.manifest.docs.length,
              docs: toolkit.manifest.docs.map((doc) => ({
                slug: doc.slug,
                path: doc.path,
                title: doc.title,
                category: doc.category ?? null,
                readingTimeMinutes: doc.readingTimeMinutes ?? null,
                lastModified: doc.lastModified ?? null,
              })),
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    "read_doc",
    {
      description:
        "Read the full markdown content of one documentation page, including its headings and last-modified date.",
      inputSchema: {
        slug: z.string().describe('Document slug (e.g. "README" or "guides/custom-components").'),
      },
    },
    async ({ slug }) => {
      const doc = findDoc(toolkit, slug);
      if (!doc) {
        return {
          isError: true,
          content: [{ type: "text", text: `Document not found: ${slug}. Use list_docs to see available slugs.` }],
        };
      }
      const content = toolkit.docs[doc.slug] ?? toolkit.docs[doc.path] ?? doc.content ?? "";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                slug: doc.slug,
                path: doc.path,
                title: doc.title,
                headings: doc.headings.map((heading) => ({ level: heading.level, text: heading.text, id: heading.id })),
                lastModified: doc.lastModified ?? null,
                content: content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "search_docs",
    {
      description: `Search the ${siteName} documentation by keyword. Returns matching documents with a content snippet.`,
      inputSchema: {
        query: z.string().describe("Search query, one or more keywords."),
        limit: z.number().int().positive().max(25).optional().describe("Maximum results (default 10)."),
      },
    },
    async ({ query, limit }) => {
      const results = searchDocs(toolkit, query, limit ?? 10);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ query, count: results.length, results }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "resolve_url",
    {
      description: "Resolve a documentation slug to its public URL on the deployed documentation site.",
      inputSchema: {
        slug: z.string().describe('Document slug (e.g. "README" or "guides/custom-components").'),
      },
    },
    async ({ slug }) => {
      const doc = findDoc(toolkit, slug);
      if (!doc) {
        return {
          isError: true,
          content: [{ type: "text", text: `Document not found: ${slug}. Use list_docs to see available slugs.` }],
        };
      }
      const siteUrl = toolkit.manifest.config?.url;
      const base = siteUrl ? siteUrl.replace(/\/+$/, "") : null;
      const url = base
        ? doc.slug === "README"
          ? `${base}/`
          : `${base}/${doc.slug}/`
        : `/${doc.slug === "README" ? "" : `${doc.slug}/`}`;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ slug: doc.slug, url, siteUrl: base }, null, 2),
          },
        ],
      };
    },
  );
};

export function createMcpServer(toolkit: DocToolkit): McpServer {
  const server = new McpServer({
    name: "docmedown",
    version: "0.1.9",
  });
  registerDocTools(server, toolkit);
  return server;
}

export async function mcpCommand(targetDirArg: string = "./docs"): Promise<void> {
  const targetDir = path.resolve(process.cwd(), targetDirArg);
  const toolkit = loadBuiltSite(targetDir);

  if (!toolkit) {
    throw new Error(
      `No built documentation found at ${targetDir}. Run "docmedown build ${targetDirArg}" first, then retry "docmedown mcp".`,
    );
  }

  const server = createMcpServer(toolkit);
  await server.connect(new StdioServerTransport());
  // The MCP stdio transport owns stdout; diagnostics go to stderr only.
  console.error(
    `[DocMeDown] MCP server ready over stdio — serving ${toolkit.manifest.docs.length} documents from ${targetDir}`,
  );

  return new Promise(() => undefined);
}
