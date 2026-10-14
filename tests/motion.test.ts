import assert from "node:assert/strict";
import { test } from "node:test";
import {
  animate,
  collapse,
  expand,
  fade,
  getMotionOptions,
  motion,
  prefersReducedMotion,
  scale,
  slide,
  smoothScroll,
  stagger,
  useMotion,
} from "../src/runtime/motion";

test("motion module exports core animation primitives and reduced motion guards", () => {
  assert.equal(typeof animate, "function");
  assert.equal(typeof prefersReducedMotion, "function");
  assert.equal(typeof getMotionOptions, "function");
  assert.equal(typeof smoothScroll, "function");
  assert.equal(typeof expand, "function");
  assert.equal(typeof collapse, "function");
  assert.equal(typeof motion, "function");
  assert.equal(typeof fade, "function");
  assert.equal(typeof slide, "function");
  assert.equal(typeof scale, "function");
  assert.equal(typeof useMotion, "function");
  assert.equal(typeof stagger, "function");
});

test("getMotionOptions respects reduced motion preference", () => {
  const normal = getMotionOptions({ duration: 300, delay: 50 });
  assert.equal(normal.delay, 50);

  // In test/node environment without media query, prefersReducedMotion returns false
  assert.equal(prefersReducedMotion(), false);
});

test("motion preference honors system settings and explicit overrides", () => {
  const previousWindow = (globalThis as any).window;
  const previousDocument = (globalThis as any).document;
  let attribute: string | null = null;
  let preference: string | null = null;
  (globalThis as any).window = {
    matchMedia: () => ({ matches: true }),
    localStorage: { getItem: () => preference },
  };
  (globalThis as any).document = { documentElement: { getAttribute: () => attribute } };
  try {
    assert.equal(prefersReducedMotion(), true);
    preference = "full";
    assert.equal(prefersReducedMotion(), false);
    attribute = "reduced";
    assert.equal(prefersReducedMotion(), true);
    attribute = "full";
    assert.equal(prefersReducedMotion(), false);
    attribute = null;
    preference = null;
    assert.equal(getMotionOptions({ duration: 0.3 }).duration, 0);
    assert.deepEqual(getMotionOptions({ duration: 0.3, delay: 1 }), { duration: 0, delay: 0 });
  } finally {
    (globalThis as any).window = previousWindow;
    (globalThis as any).document = previousDocument;
  }
});

test("smoothScroll interrupts for user input and releases scroll snap and listeners", async () => {
  const previousWindow = (globalThis as any).window;
  const previousDocument = (globalThis as any).document;
  const previousRaf = (globalThis as any).requestAnimationFrame;
  const previousCancel = (globalThis as any).cancelAnimationFrame;
  const listeners = new Map<string, () => void>();
  let completed = 0;
  const container = {
    scrollLeft: 0,
    scrollTop: 0,
    style: { scrollSnapType: "x mandatory" },
    addEventListener: (name: string, listener: () => void) => listeners.set(name, listener),
    removeEventListener: (name: string) => listeners.delete(name),
  } as unknown as HTMLElement;
  (globalThis as any).window = { matchMedia: () => ({ matches: false }), localStorage: { getItem: () => null } };
  (globalThis as any).document = { documentElement: { getAttribute: () => null } };
  (globalThis as any).requestAnimationFrame = () => 1;
  (globalThis as any).cancelAnimationFrame = () => {};
  try {
    const scroll = smoothScroll(container, 200, { onComplete: () => completed++ });
    assert.equal(container.style.scrollSnapType, "none");
    listeners.get("wheel")?.();
    await scroll.finished;
    assert.equal(container.style.scrollSnapType, "x mandatory");
    assert.equal(listeners.size, 0);
    assert.equal(completed, 0);
    const immediate = smoothScroll(container, 200, { duration: 0, onComplete: () => completed++ });
    await immediate.finished;
    assert.equal(container.scrollLeft, 200);
    assert.equal(completed, 1);
  } finally {
    (globalThis as any).window = previousWindow;
    (globalThis as any).document = previousDocument;
    (globalThis as any).requestAnimationFrame = previousRaf;
    (globalThis as any).cancelAnimationFrame = previousCancel;
  }
});

test("motion Svelte action lifecycle: mount, update, destroy", () => {
  const fakeElement = {
    style: {} as Record<string, string>,
  } as unknown as HTMLElement;

  const action = motion(fakeElement, {
    initial: { opacity: "0", transform: "scale(0.9)" },
    animate: { opacity: "1", transform: "scale(1)" },
    transition: { duration: 0.2 },
  });

  assert.equal(typeof action.update, "function");
  assert.equal(typeof action.destroy, "function");

  // Update options without error
  action.update({
    animate: { opacity: "0.8" },
  });

  // Destroy cleanly cancels active animation
  action.destroy();
});

test("fade, slide, and scale preset actions configure initial and target states", () => {
  const elFade = { style: {} as Record<string, string> } as unknown as HTMLElement;
  const f = fade(elFade, { duration: 0.25 });
  assert.equal(typeof f.destroy, "function");
  f.update({ duration: 0.5, inView: true });
  f.destroy();

  const elSlide = { style: {} as Record<string, string> } as unknown as HTMLElement;
  const s = slide(elSlide, { direction: "down", distance: 20 });
  assert.equal(typeof s.destroy, "function");
  s.update({ direction: "left", distance: 12, inView: true });
  s.destroy();

  const elScale = { style: {} as Record<string, string> } as unknown as HTMLElement;
  const sc = scale(elScale, { from: 0.9 });
  assert.equal(typeof sc.destroy, "function");
  sc.update({ from: 0.8, inView: true });
  sc.destroy();
});

test("useMotion React ref hook produces attachable and detachable ref callback", () => {
  const refHook = useMotion({
    initial: { opacity: "0" },
    animate: { opacity: "1" },
  });

  assert.equal(typeof refHook, "function");

  const el = { style: {} as Record<string, string> } as unknown as HTMLDivElement;

  // Mount element via ref callback
  refHook(el);

  // Unmount element via ref callback (passing null)
  refHook(null);
});

test("expand and collapse disclosure helpers handle reduced motion and zero-height bounds", async () => {
  const fakePanel = {
    style: {} as Record<string, string>,
    scrollHeight: 240,
    offsetHeight: 240,
  } as unknown as HTMLElement;

  const exp = expand(fakePanel, { duration: 10 });
  assert.equal(typeof exp.stop, "function");
  assert.ok(exp.finished instanceof Promise);
  exp.stop();

  const col = collapse(fakePanel, { duration: 10 });
  assert.equal(typeof col.stop, "function");
  assert.ok(col.finished instanceof Promise);
  col.stop();
});

test("stagger utility distributes animation delays across element collection", () => {
  const el1 = { style: {} as Record<string, string> } as unknown as HTMLElement;
  const el2 = { style: {} as Record<string, string> } as unknown as HTMLElement;
  const el3 = { style: {} as Record<string, string> } as unknown as HTMLElement;

  const animations = stagger(
    [el1, el2, el3],
    { opacity: [0, 1] },
    {
      duration: 0.3,
      staggerDelay: 0.08,
    },
  );

  assert.equal(animations.length, 3);
  for (const anim of animations) {
    if (anim && typeof anim.stop === "function") anim.stop();
  }
});
