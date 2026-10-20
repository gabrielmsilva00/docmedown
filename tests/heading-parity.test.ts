import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { validateCommand } from "../src/cli/commands/validate";
import { extractHeadings, generateManifest } from "../src/cli/utils/scanner";
import { DEFAULT_CONFIG } from "../src/runtime/config";
import { parseMarkdown } from "../src/runtime/markdown/parser";
import { makeTempDir } from "./helpers/temp";

test("manifest headings match rendered anchors across Markdown syntax and all depths", () => {
  const markdown = [
    "---",
    "title: Heading parity",
    "---",
    "# Overview",
    "",
    "## **Setup** &amp; `run`",
    "",
    "## [Reference](https://example.com)",
    "",
    "## Setup",
    "",
    "## Setup",
    "",
    "Setext heading",
    "--------------",
    "",
    "```markdown",
    "# Not a heading",
    "```",
    "",
    "~~~~markdown",
    "## Not a heading either",
    "~~~~",
    "",
    "    # Indented code",
    "",
    "<!--",
    "# Comment example",
    "-->",
    "",
    "### Third",
    "#### Fourth",
    "##### Fifth",
    "###### Sixth",
  ].join("\n");
  const parsed = parseMarkdown(markdown);
  const headings = extractHeadings(markdown);
  assert.deepEqual(
    headings,
    parsed.headings.map(({ level, text, id }) => ({ level, text, id })),
  );
  const renderedIds = [...parsed.html.matchAll(/<h[1-6] id="([^"]*)"/g)].map((match) => match[1]);
  assert.deepEqual(
    headings.map((heading) => heading.id),
    renderedIds,
  );
  assert.equal(headings.length, 10);
  assert.ok(headings.some((heading) => heading.id === "setup-2"));
  assert.ok(headings.some((heading) => heading.id === "setext-heading"));
  assert.deepEqual(
    headings.slice(-3).map((heading) => heading.level),
    [4, 5, 6],
  );
  assert.ok(!headings.some((heading) => /example|code|not a heading/i.test(heading.text)));

  const dir = makeTempDir("dmd-heading-manifest");
  fs.writeFileSync(path.join(dir, "README.md"), markdown);
  const manifest = generateManifest(dir, DEFAULT_CONFIG);
  assert.deepEqual(manifest.docs[0].headings, headings);
});

test("heading IDs remain unique when duplicate suffixes collide with authored headings", () => {
  for (const markdown of [
    "# Setup\n\n## Setup-2\n\n## Setup\n\n## Setup",
    "# Setup\n\n## Setup\n\n## Setup-2\n\n## Setup",
    "# constructor\n\n## constructor\n\n## __proto__\n\n## __proto__",
  ]) {
    const parsed = parseMarkdown(markdown);
    const ids = parsed.headings.map((heading) => heading.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(
      extractHeadings(markdown).map((heading) => heading.id),
      ids,
    );
    for (const id of ids) assert.ok(parsed.html.includes(`id="${id}"`));
  }
  assert.deepEqual(
    parseMarkdown("# Setup\n\n## Setup\n\n## Setup").headings.map((heading) => heading.id),
    ["setup", "setup-2", "setup-3"],
  );
});

test("validation accepts rendered duplicate, Setext, and deep anchors but rejects fenced examples", async () => {
  const dir = makeTempDir("dmd-heading-validation");
  fs.writeFileSync(
    path.join(dir, "guide.md"),
    "# Guide\n\n## Setup\n\n## Setup\n\nDetails\n-------\n\n###### Deep\n\n```md\n# Example\n```\n",
  );
  fs.writeFileSync(
    path.join(dir, "README.md"),
    "# Home\n\n[Duplicate](guide.md#setup-2)\n\n[Setext](guide.md#details)\n\n[Deep](guide.md#deep)\n",
  );
  const valid = await validateCommand(dir, { silent: true });
  assert.equal(valid.valid, true, JSON.stringify(valid.errors));

  fs.appendFileSync(path.join(dir, "README.md"), "\n[Example](guide.md#example)\n");
  const invalid = await validateCommand(dir, { silent: true });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.length, 1);
  assert.equal(invalid.errors[0].type, "anchor");
});

test("validation does not accept custom heading IDs that the renderer does not implement", async () => {
  const dir = makeTempDir("dmd-heading-custom-id");
  fs.writeFileSync(path.join(dir, "README.md"), "# Title {#custom-id}\n\n[Invalid](#custom-id)\n");
  const result = await validateCommand(dir, { silent: true });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.type === "anchor"));
});
