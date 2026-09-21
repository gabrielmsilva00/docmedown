import assert from "node:assert/strict";
import { test } from "node:test";
import { unwrapBlockComponents } from "../src/runtime/markdown/component-body";

test("unwrapBlockComponents unwraps block components while preserving paragraphs, inline components, and siblings", () => {
  // Opening block component loses wrapper tags
  assert.equal(
    unwrapBlockComponents('<p><Card color="blue">\n<h2>Quick start</h2></p>\n<h3>Install</h3>'),
    '<Card color="blue">\n<h2>Quick start</h2>\n<h3>Install</h3>',
  );
  // Closing side of wrapper without whitespace
  assert.equal(unwrapBlockComponents("<p><Card>Text</Card></p>"), "<Card>Text</Card>");

  // Paragraph nested inside component body survives
  assert.equal(unwrapBlockComponents("<p><Card>\n<p>Body</p></Card></p>"), "<Card>\n<p>Body</p></Card>");
  assert.equal(
    unwrapBlockComponents("<p><Card>\n<p>Body</p></Card>\nTrailing text</p>"),
    "<Card>\n<p>Body</p></Card>\nTrailing text",
  );

  // Inline components keep their paragraph
  assert.equal(unwrapBlockComponents("<p><Badge>new</Badge> Released.</p>"), "<p><Badge>new</Badge> Released.</p>");
  assert.equal(unwrapBlockComponents("<p><Kbd>Ctrl</Kbd>+<Kbd>C</Kbd></p>"), "<p><Kbd>Ctrl</Kbd>+<Kbd>C</Kbd></p>");

  // Unclosed component paragraph only loses opening tag
  const unclosed = '<p><Card color="blue">\n<h2>Quick start</h2>';
  assert.equal(unwrapBlockComponents(unclosed), '<Card color="blue">\n<h2>Quick start</h2>');

  // Siblings preserved byte-for-byte
  assert.equal(
    unwrapBlockComponents("<p><Card>A</Card></p>\n<p>Middle</p>\n<p><Tabs>B</Tabs></p>\nAfter"),
    "<Card>A</Card>\n<p>Middle</p>\n<Tabs>B</Tabs>\nAfter",
  );
  assert.equal(unwrapBlockComponents("<p>Before</p><p><Card>Unclosed"), "<p>Before</p><Card>Unclosed");

  // Markup without component returned as-is
  assert.equal(unwrapBlockComponents("<p>Plain paragraph.</p>"), "<p>Plain paragraph.</p>");
  assert.equal(unwrapBlockComponents("No markup here"), "No markup here");
  assert.equal(unwrapBlockComponents(""), "");
});
