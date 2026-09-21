import assert from "node:assert/strict";
import { test } from "node:test";
import { unwrapBlockComponents } from "../src/runtime/markdown/component-body";

test("a paragraph opening a block component loses both wrapper tags", () => {
  assert.equal(
    unwrapBlockComponents('<p><Card color="blue">\n<h2>Quick start</h2></p>\n<h3>Install</h3>'),
    '<Card color="blue">\n<h2>Quick start</h2>\n<h3>Install</h3>',
  );
  // Closing side of the same wrapper, no whitespace between the tags.
  assert.equal(unwrapBlockComponents("<p><Card>Text</Card></p>"), "<Card>Text</Card>");
});

test("a paragraph nested inside the component body survives", () => {
  // The component body is rendered before this pass, so its own `</p>` is the
  // first one the scan meets — it must close *its* paragraph, not the wrapper's.
  assert.equal(unwrapBlockComponents("<p><Card>\n<p>Body</p></Card></p>"), "<Card>\n<p>Body</p></Card>");
  assert.equal(
    unwrapBlockComponents("<p><Card>\n<p>Body</p></Card>\nTrailing text</p>"),
    "<Card>\n<p>Body</p></Card>\nTrailing text",
  );
});

test("inline components keep the paragraph they are written in", () => {
  // Badge/Button/Kbd are sentence furniture: unwrapping them would unparent the
  // prose around them.
  assert.equal(unwrapBlockComponents("<p><Badge>new</Badge> Released.</p>"), "<p><Badge>new</Badge> Released.</p>");
  assert.equal(unwrapBlockComponents("<p><Kbd>Ctrl</Kbd>+<Kbd>C</Kbd></p>"), "<p><Kbd>Ctrl</Kbd>+<Kbd>C</Kbd></p>");
});

test("an unclosed component paragraph only loses its opening tag", () => {
  // No closing `</p>` to pair the wrapper with: the opener is dropped as before,
  // and the rest of the markup is passed through unchanged.
  const html = '<p><Card color="blue">\n<h2>Quick start</h2>';
  assert.equal(unwrapBlockComponents(html), '<Card color="blue">\n<h2>Quick start</h2>');
});

test("unwrapping one component leaves its siblings exactly as they were", () => {
  // The scanner rebuilds the string from slices, so content before, between, and
  // after the unwrapped component has to survive byte for byte.
  assert.equal(
    unwrapBlockComponents("<p><Card>A</Card></p>\n<p>Middle</p>\n<p><Tabs>B</Tabs></p>\nAfter"),
    "<Card>A</Card>\n<p>Middle</p>\n<Tabs>B</Tabs>\nAfter",
  );
  assert.equal(unwrapBlockComponents("<p>Before</p><p><Card>Unclosed"), "<p>Before</p><Card>Unclosed");
});

test("markup without a component is returned as-is", () => {
  assert.equal(unwrapBlockComponents("<p>Plain paragraph.</p>"), "<p>Plain paragraph.</p>");
  assert.equal(unwrapBlockComponents("No markup here"), "No markup here");
  assert.equal(unwrapBlockComponents(""), "");
});
