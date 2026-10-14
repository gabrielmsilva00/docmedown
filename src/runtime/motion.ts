/**
 * DocMeDown Performance-Minded Motion & Animation Engine.
 *
 * Built on top of motion/mini (lightweight WAAPI) with:
 * - Native prefers-reduced-motion support (zero duration for accessibility).
 * - Interruptible, cancelable smooth scrolling for Carousels.
 * - Hardware-accelerated transitions for Tabs and Accordions.
 * - Svelte actions (motion, fade, slide, scale) and React hooks (useMotion)
 *   for effortless custom component animations.
 */
import { animate as motionAnimate } from "motion/mini";

export { motionAnimate as animateRaw };

/**
 * Checks whether the target is a real browser DOM Element.
 * Protects against crashes in SSR/prerendering and mock test environments.
 */
export function isDOMElement(target: unknown): target is Element {
  if (typeof window === "undefined" || !target) return false;
  return typeof (window as any).Element !== "undefined" && target instanceof (window as any).Element;
}

/**
 * Checks whether the user has requested "Reduce motion".
 * Respects explicit user overrides (data-dmd-motion or localStorage) while
 * preserving DocMeDown's performance-minded subtle animations by default.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  const attribute = document.documentElement?.getAttribute("data-dmd-motion");
  if (attribute === "reduced" || attribute === "off") return true;
  if (attribute === "full" || attribute === "on") return false;
  try {
    const userPref = window.localStorage.getItem("dmd-motion");
    if (userPref === "reduced" || userPref === "off") return true;
    if (userPref === "full" || userPref === "on") return false;
  } catch {}
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Normalizes motion options based on the user's motion preferences.
 */
export function getMotionOptions<T extends { duration?: number; delay?: number }>(options: T): T {
  if (prefersReducedMotion()) {
    return { ...options, duration: 0, delay: 0 };
  }
  return options;
}

/**
 * Safe, accessibility-respecting wrapper around motion's animate function.
 */
export function animate(target: any, keyframes: Record<string, any>, options: Record<string, any> = {}) {
  if (!isDOMElement(target)) {
    if (target && typeof target === "object" && "style" in target && target.style) {
      for (const [key, val] of Object.entries(keyframes)) {
        const finalVal = Array.isArray(val) ? val[val.length - 1] : val;
        try {
          (target as any).style[key] = String(finalVal);
        } catch {}
      }
    }
    const noop = Promise.resolve() as Promise<void> & { stop: () => void };
    noop.stop = () => {};
    return noop;
  }
  if (prefersReducedMotion()) {
    options = { ...options, duration: 0, delay: 0 };
  }
  return motionAnimate(target, keyframes, options);
}

// ---------------------------------------------------------------------------
// Smooth Scrolling (Carousels & Page Navigation)
// ---------------------------------------------------------------------------

const activeScrolls = new WeakMap<HTMLElement, { stop: () => void }>();

export interface SmoothScrollOptions {
  duration?: number;
  direction?: "x" | "y";
  easing?: (t: number) => number;
  onComplete?: () => void;
}

/**
 * Smoothly and cancelably animates scrollLeft or scrollTop of a container.
 * Automatically interrupts any active animation on subsequent user clicks.
 */
export function smoothScroll(
  container: HTMLElement,
  targetOffset: number,
  options: SmoothScrollOptions = {},
): { stop: () => void; finished: Promise<void> } {
  activeScrolls.get(container)?.stop();

  const isX = options.direction !== "y";
  const startOffset = isX ? container.scrollLeft : container.scrollTop;
  const delta = targetOffset - startOffset;

  if (
    Math.abs(delta) < 1 ||
    (options.duration ?? 400) <= 0 ||
    prefersReducedMotion() ||
    typeof requestAnimationFrame === "undefined"
  ) {
    if (isX) container.scrollLeft = targetOffset;
    else container.scrollTop = targetOffset;
    options.onComplete?.();
    return {
      stop: () => {},
      finished: Promise.resolve(),
    };
  }

  const duration = options.duration ?? 400;
  // Cubic ease-out: starts briskly and glides gracefully into place
  const easing = options.easing ?? ((t: number) => 1 - (1 - t) ** 3);

  let startTime: number | null = null;
  let rafId = 0;
  let isStopped = false;

  let resolveFinished: () => void;
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });

  // Temporarily disable CSS scroll snapping during JS-driven interpolation so
  // native browser scroll snapping does not fight animation updates on each frame.
  const prevSnapType = container.style.scrollSnapType;
  container.style.scrollSnapType = "none";

  const restoreSnap = () => {
    container.style.scrollSnapType = prevSnapType;
    container.removeEventListener("wheel", stop);
    container.removeEventListener("touchstart", stop);
    container.removeEventListener("pointerdown", stop);
    container.removeEventListener("keydown", stop);
  };

  const stop = () => {
    if (isStopped) return;
    isStopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    restoreSnap();
    activeScrolls.delete(container);
    resolveFinished();
  };

  const step = (now: number) => {
    if (isStopped) return;
    if (startTime === null) startTime = now;
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = easing(progress);

    const current = startOffset + delta * eased;
    if (isX) container.scrollLeft = current;
    else container.scrollTop = current;

    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      isStopped = true;
      if (isX) container.scrollLeft = targetOffset;
      else container.scrollTop = targetOffset;
      restoreSnap();
      activeScrolls.delete(container);
      options.onComplete?.();
      resolveFinished();
    }
  };

  activeScrolls.set(container, { stop });
  // A user gesture takes priority over programmatic navigation.
  container.addEventListener("wheel", stop, { passive: true });
  container.addEventListener("touchstart", stop, { passive: true });
  container.addEventListener("pointerdown", stop, { passive: true });
  container.addEventListener("keydown", stop);
  rafId = requestAnimationFrame(step);

  return { stop, finished };
}

// ---------------------------------------------------------------------------
// Accordion & Disclosure Animation (Height & Opacity)
// ---------------------------------------------------------------------------

const activeCollapses = new WeakMap<HTMLElement, { stop: () => void }>();

export interface DisclosureAnimationOptions {
  duration?: number;
  onComplete?: () => void;
}

/**
 * Expands an element smoothly from 0px (or its current height) to its natural scrollHeight.
 */
export function expand(
  element: HTMLElement,
  options: DisclosureAnimationOptions = {},
): { stop: () => void; finished: Promise<void> } {
  activeCollapses.get(element)?.stop();

  if (!isDOMElement(element) || prefersReducedMotion()) {
    if (element?.style) {
      element.style.height = "auto";
      element.style.opacity = "1";
      element.style.overflow = "visible";
    }
    options.onComplete?.();
    return { stop: () => {}, finished: Promise.resolve() };
  }

  const currentHeight = element.offsetHeight;
  element.style.display = "block";
  element.style.height = "auto";
  const targetHeight = element.scrollHeight;
  const startHeight = currentHeight > 0 && currentHeight < targetHeight ? currentHeight : 0;
  element.style.height = `${startHeight}px`;
  element.style.opacity = currentHeight > 0 ? String(Math.min(1, currentHeight / targetHeight)) : "0";
  element.style.overflow = "hidden";

  const duration = (options.duration ?? 240) / 1000;
  const anim = motionAnimate(
    element,
    {
      height: [`${startHeight}px`, `${targetHeight}px`],
      opacity: [Number(element.style.opacity) || 0, 1],
    },
    {
      duration,
      ease: [0.16, 1, 0.3, 1],
    },
  );

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    anim.stop();
    activeCollapses.delete(element);
  };

  activeCollapses.set(element, { stop });

  const finished = anim.then(() => {
    if (!stopped) {
      element.style.height = "auto";
      element.style.opacity = "1";
      element.style.overflow = "visible";
      options.onComplete?.();
      activeCollapses.delete(element);
    }
  });

  return { stop, finished };
}

/**
 * Collapses an element smoothly from its current height down to 0px.
 */
export function collapse(
  element: HTMLElement,
  options: DisclosureAnimationOptions = {},
): { stop: () => void; finished: Promise<void> } {
  activeCollapses.get(element)?.stop();

  if (!isDOMElement(element) || prefersReducedMotion()) {
    if (element?.style) {
      element.style.height = "0px";
      element.style.opacity = "0";
      element.style.overflow = "hidden";
    }
    options.onComplete?.();
    return { stop: () => {}, finished: Promise.resolve() };
  }

  const currentHeight = element.offsetHeight;
  element.style.overflow = "hidden";

  if (currentHeight <= 0) {
    element.style.height = "0px";
    element.style.opacity = "0";
    options.onComplete?.();
    return { stop: () => {}, finished: Promise.resolve() };
  }

  const duration = (options.duration ?? 200) / 1000;
  const anim = motionAnimate(
    element,
    {
      height: [`${currentHeight}px`, "0px"],
      opacity: [1, 0],
    },
    {
      duration,
      ease: [0.16, 1, 0.3, 1],
    },
  );

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    anim.stop();
    activeCollapses.delete(element);
  };

  activeCollapses.set(element, { stop });

  const finished = anim.then(() => {
    if (!stopped) {
      element.style.height = "0px";
      element.style.opacity = "0";
      options.onComplete?.();
      activeCollapses.delete(element);
    }
  });

  return { stop, finished };
}

// ---------------------------------------------------------------------------
// Svelte Action: motion & presets
// ---------------------------------------------------------------------------

export interface MotionOptions {
  initial?: Record<string, any>;
  animate?: Record<string, any>;
  transition?: {
    duration?: number;
    delay?: number;
    ease?: any;
  };
  inView?: boolean;
}

/** Options shared by the fade, slide, and scale Svelte action presets. Durations are seconds. */
export interface MotionPresetOptions {
  duration?: number;
  delay?: number;
  inView?: boolean;
}

/**
 * Svelte action for declarative component animations:
 * `<div use:motion={{ initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } }}>`
 */
export function motion(node: HTMLElement, options: MotionOptions = {}) {
  let currentAnim: { stop: () => void } | null = null;
  let observer: IntersectionObserver | null = null;
  let disposed = false;

  function stopAnimation() {
    currentAnim?.stop();
    currentAnim = null;
  }

  function runAnimation() {
    stopAnimation();
    if (!isDOMElement(node) || prefersReducedMotion()) {
      if (options.animate && node?.style) {
        Object.assign(node.style, options.animate);
      }
      return;
    }

    if (options.initial && node?.style) {
      Object.assign(node.style, options.initial);
    }

    if (options.animate) {
      const duration = options.transition?.duration ?? 0.35;
      const delay = options.transition?.delay ?? 0;
      const ease = options.transition?.ease ?? [0.25, 1, 0.5, 1];

      currentAnim = motionAnimate(node, options.animate, {
        duration,
        delay,
        ease,
      });
    }
  }

  function start() {
    observer?.disconnect();
    observer = null;
    stopAnimation();
    if (
      options.inView &&
      isDOMElement(node) &&
      !prefersReducedMotion() &&
      typeof IntersectionObserver !== "undefined"
    ) {
      if (options.initial) Object.assign(node.style, options.initial);
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            observer = null;
            runAnimation();
          }
        },
        { threshold: 0.1 },
      );
      observer.observe(node);
    } else {
      runAnimation();
    }
  }

  start();

  return {
    update(newOptions: MotionOptions) {
      if (disposed || newOptions === options) return;
      options = newOptions;
      start();
    },
    destroy() {
      disposed = true;
      observer?.disconnect();
      observer = null;
      stopAnimation();
    },
  };
}

/**
 * Svelte action preset for smooth fade-in.
 */
export function fade(node: HTMLElement, options: MotionPresetOptions = {}) {
  const config = (value: typeof options): MotionOptions => ({
    initial: { opacity: "0" },
    animate: { opacity: "1" },
    transition: { duration: value.duration ?? 0.3, delay: value.delay ?? 0 },
    inView: value.inView,
  });
  const action = motion(node, config(options));
  return { update: (value: typeof options) => action.update(config(value)), destroy: action.destroy };
}

/**
 * Svelte action preset for smooth slide-in.
 */
export function slide(
  node: HTMLElement,
  options: MotionPresetOptions & {
    direction?: "up" | "down" | "left" | "right";
    distance?: number;
  } = {},
) {
  const config = (value: typeof options): MotionOptions => {
    const dir = value.direction ?? "up";
    const dist = value.distance ?? 16;
    const x = dir === "left" ? `${dist}px` : dir === "right" ? `-${dist}px` : "0px";
    const y = dir === "up" ? `${dist}px` : dir === "down" ? `-${dist}px` : "0px";
    return {
      initial: { opacity: "0", transform: `translate3d(${x}, ${y}, 0)` },
      animate: { opacity: "1", transform: "translate3d(0, 0, 0)" },
      transition: { duration: value.duration ?? 0.35, delay: value.delay ?? 0 },
      inView: value.inView,
    };
  };
  const action = motion(node, config(options));
  return { update: (value: typeof options) => action.update(config(value)), destroy: action.destroy };
}

/**
 * Svelte action preset for smooth scale-in.
 */
export function scale(node: HTMLElement, options: MotionPresetOptions & { from?: number } = {}) {
  const config = (value: typeof options): MotionOptions => ({
    initial: { opacity: "0", transform: `scale(${value.from ?? 0.94})` },
    animate: { opacity: "1", transform: "scale(1)" },
    transition: { duration: value.duration ?? 0.3, delay: value.delay ?? 0 },
    inView: value.inView,
  });
  const action = motion(node, config(options));
  return { update: (value: typeof options) => action.update(config(value)), destroy: action.destroy };
}

// ---------------------------------------------------------------------------
// React Hook: useMotion
// ---------------------------------------------------------------------------

/**
 * React ref callback hook for animating elements in React custom components:
 * `const ref = useMotion({ initial: { opacity: 0 }, animate: { opacity: 1 } });`
 */
export function useMotion<T extends HTMLElement = HTMLElement>(
  options: MotionOptions = {},
): (element: T | null) => void {
  let cleanUp: (() => void) | null = null;

  return (node: T | null) => {
    if (cleanUp) {
      cleanUp();
      cleanUp = null;
    }
    if (node) {
      const action = motion(node, options);
      cleanUp = () => action.destroy();
    }
  };
}

// ---------------------------------------------------------------------------
// Stagger Utility
// ---------------------------------------------------------------------------

/**
 * Animates a list of elements with sequential stagger delays.
 */
export function stagger<T extends Element = Element>(
  elements: ArrayLike<T> | Iterable<T>,
  keyframes: Record<string, any>,
  options: {
    duration?: number;
    staggerDelay?: number;
    delay?: number;
    ease?: any;
  } = {},
) {
  const list = Array.from(elements as any) as HTMLElement[];
  const staggerDelay = options.staggerDelay ?? 0.05;
  const baseDelay = options.delay ?? 0;

  return list.map((el, i) =>
    animate(el, keyframes, {
      duration: options.duration,
      ease: options.ease,
      delay: baseDelay + i * staggerDelay,
    }),
  );
}
