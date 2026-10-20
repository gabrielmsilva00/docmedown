import yaml from "js-yaml/lib/js-yaml/loader.js";
import type { DocFrontmatter } from "../types";

/**
 * Use the same safe YAML schema as the CLI's gray-matter engine. Import the
 * parser-only entry to avoid bundling the serializer and CLI dependencies.
 * Invalid YAML is tolerated while editing; `docmedown validate` reports it.
 */
export function extractFrontmatter(rawMarkdown: string): { frontmatter: DocFrontmatter; content: string } {
  const source = rawMarkdown.replace(/^\uFEFF/, "");
  const frontmatterRegex = /^---(?:ya?ml)?[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m;
  const match = source.match(frontmatterRegex);

  if (match?.index !== 0) {
    return { frontmatter: {}, content: source };
  }

  const content = source.substring(match[0].length);
  try {
    const data = yaml.safeLoad(match[1]);
    const frontmatter = data && typeof data === "object" && !Array.isArray(data) ? (data as DocFrontmatter) : {};
    return { frontmatter, content };
  } catch {
    return { frontmatter: {}, content };
  }
}
