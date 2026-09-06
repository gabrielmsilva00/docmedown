import React, { useEffect, useRef, useState } from "react";

/**
 * Universal `<Item>` resolution context.
 *
 * Container components that render a paired "child" (Timeline→TimelineItem,
 * Accordion→AccordionItem, Columns→Column, Steps→Step, CardGrid→Card) provide
 * this context around their children. A bare `<Item>` reads the nearest
 * provider and renders as that container's designated child, forwarding all
 * props — so `<Timeline><Item title="…"/></Timeline>` behaves exactly like
 * `<TimelineItem title="…"/>`, regardless of how deeply the Item is nested.
 *
 * With no provider up the tree, `<Item>` degrades to an `<li>` (the child of
 * an unordered list), so it works as a generic list item anywhere.
 */
export type ItemParentKind = "timeline" | "accordion" | "columns" | "steps" | "cardgrid" | "tabs";

export interface ItemParentContextValue {
  kind: ItemParentKind;
  /** 1-based position, used by `Steps` to auto-number. */
  index?: number;
}

export const ItemParentContext = React.createContext<ItemParentContextValue | null>(null);

export type TabsType = "recessed" | "underline" | "pills" | "postit";

export interface TabsProps {
  children?: React.ReactNode;
  defaultIndex?: number;
  groupId?: string;
  /** Visual treatment. `recessed` (default) renders inset/recessed tab buttons.
      Also accepts `underline`, `pills`, or `postit`. */
  type?: TabsType;
  /** Legacy alias for `type` (`underline` | `pills`); kept for backward compat. */
  variant?: "underline" | "pills";
}

export interface TabItemProps {
  label?: string;
  value?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({ children, defaultIndex = 0, groupId, type, variant }) => {
  const baseId = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  // `type` wins; fall back to legacy `variant`; default to `recessed`.
  const tabType: TabsType = type ?? variant ?? "recessed";
  const items = React.Children.toArray(children).filter((child): child is React.ReactElement<TabItemProps> =>
    React.isValidElement(child),
  );

  const tabName = (it: React.ReactElement<TabItemProps>, idx: number) =>
    it.props.value ?? it.props.label ?? `Tab ${idx + 1}`;

  const safeDefault = items.length === 0 ? 0 : Math.min(Math.max(defaultIndex, 0), items.length - 1);
  const [activeIndex, setActiveIndex] = useState(() => {
    if (!groupId || typeof window === "undefined") return safeDefault;
    try {
      const saved = window.localStorage.getItem(`dmd-tabs:${groupId}`);
      if (saved) {
        const idx = items.findIndex((it) => (it.props.value ?? it.props.label ?? "") === saved);
        if (idx >= 0) return idx;
      }
    } catch {
      // storage unavailable (opaque origin) — fall back to defaultIndex
    }
    return safeDefault;
  });
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const select = (idx: number, focus = false) => {
    if (items.length === 0) return;
    const clamped = (idx + items.length) % items.length;
    setActiveIndex(clamped);
    if (groupId && typeof window !== "undefined") {
      try {
        const key = items[clamped]?.props.value ?? items[clamped]?.props.label ?? String(clamped);
        window.localStorage.setItem(`dmd-tabs:${groupId}`, String(key));
        window.dispatchEvent(new CustomEvent("dmd-tabs-change", { detail: { groupId, value: key } }));
      } catch {
        // ignore persistence failures
      }
    }
    if (focus) tabRefs.current[clamped]?.focus();
  };

  React.useEffect(() => {
    if (!groupId) return;
    const onSync = (e: Event) => {
      const detail = (e as CustomEvent).detail as { groupId?: string; value?: string } | undefined;
      if (detail?.groupId !== groupId || detail?.value == null) return;
      const idx = items.findIndex((it) => (it.props.value ?? it.props.label ?? "") === detail.value);
      if (idx >= 0) setActiveIndex(idx);
    };
    window.addEventListener("dmd-tabs-change", onSync);
    return () => window.removeEventListener("dmd-tabs-change", onSync);
  }, [groupId, items]);

  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      select(idx + 1, true);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      select(idx - 1, true);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      select(items.length - 1, true);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className={`dmd-tabs-wrapper dmd-tabs-${tabType}`}>
      <div className="dmd-tabs-header" role="tablist" aria-label="Content tabs">
        {items.map((item, idx) => {
          const active = activeIndex === idx;
          const tabId = `dmd-tab-${baseId}-${idx}`;
          const panelId = `dmd-tabpanel-${baseId}-${idx}`;
          const name = tabName(item, idx);
          const hasLabel = Boolean(item.props.label);
          return (
            <button
              type="button"
              key={item.props.value ?? item.props.label ?? idx}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              role="tab"
              id={tabId}
              aria-selected={active}
              aria-controls={panelId}
              aria-label={hasLabel ? undefined : name}
              tabIndex={active ? 0 : -1}
              className={`dmd-tab-btn${active ? " active" : ""}${hasLabel ? "" : " dmd-tab-btn-icon"}`}
              onClick={() => select(idx)}
              onKeyDown={(e) => onKeyDown(e, idx)}
            >
              {item.props.icon && (
                <span className="dmd-tab-icon" aria-hidden="true">
                  {item.props.icon}
                </span>
              )}
              {hasLabel ? <span className="dmd-tab-label">{item.props.label}</span> : null}
            </button>
          );
        })}
      </div>
      <ItemParentContext.Provider value={{ kind: "tabs" }}>
        <div
          className="dmd-tab-panel"
          role="tabpanel"
          id={`dmd-tabpanel-${baseId}-${activeIndex}`}
          aria-labelledby={`dmd-tab-${baseId}-${activeIndex}`}
        >
          {items[activeIndex]?.props.children}
        </div>
      </ItemParentContext.Provider>
    </div>
  );
};

export const Tab: React.FC<TabItemProps> = ({ children }) => {
  return <div className="dmd-tab-content">{children}</div>;
};

export type CardColor = "blue" | "green" | "violet" | "amber" | "red" | "neutral";

export interface CardProps {
  title?: string;
  description?: string;
  href?: string;
  icon?: React.ReactNode | string;
  image?: string;
  imageAlt?: string;
  badge?: string;
  badgeType?: "info" | "success" | "warning" | "new" | "danger" | "neutral";
  footer?: React.ReactNode;
  /** Named accent variant or any CSS color (hex/rgb/var(...)) applied as the card accent. */
  color?: CardColor | string;
  /** Soft drop shadow — enabled by default. */
  shadow?: boolean;
  children?: React.ReactNode;
}

const CARD_COLORS: ReadonlySet<string> = new Set(["blue", "green", "violet", "amber", "red", "neutral"]);

function cardColorProps(color?: CardColor | string): { className: string; style?: React.CSSProperties } {
  if (!color) return { className: "" };
  if (CARD_COLORS.has(color)) return { className: ` dmd-card-${color}` };
  // Free CSS color: exposed as a token so every card surface (top bar, icon,
  // hover ring) derives from one author-provided value.
  return { className: " dmd-card-accent", style: { ["--dmd-card-accent" as any]: color } };
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  href,
  icon,
  image,
  imageAlt,
  badge,
  badgeType = "info",
  footer,
  color,
  shadow = true,
  children,
}) => {
  const { className: colorClass, style: colorStyle } = cardColorProps(color);
  const shadowClass = shadow ? " dmd-card-shadow" : " dmd-card-flat";
  const hasHeader = Boolean(title || badge || icon || description);
  const childArray = React.Children.toArray(children).filter((child) => {
    if (typeof child === "string") return child.trim().length > 0;
    return true;
  });
  const hasBody = childArray.length > 0;
  const content = (
    <div className={`dmd-card${colorClass}${shadowClass}`} style={colorStyle}>
      {image && (
        <div className="dmd-card-media" aria-hidden={imageAlt ? undefined : "true"}>
          <img src={image} alt={imageAlt || ""} loading="lazy" />
        </div>
      )}
      {hasHeader && (
        <div className="dmd-card-header">
          {icon && (
            <div className="dmd-card-icon">
              {typeof icon === "string" ? <span dangerouslySetInnerHTML={{ __html: icon }} /> : icon}
            </div>
          )}
          <div className="dmd-card-header-text">
            {(title || badge) && (
              <div className="dmd-card-title-row">
                {title && <h3 className="dmd-card-title">{title}</h3>}
                {badge && <span className={`dmd-badge dmd-badge-${badgeType}`}>{badge}</span>}
              </div>
            )}
            {description && <p className="dmd-card-subtitle">{description}</p>}
          </div>
        </div>
      )}
      {hasBody && <div className="dmd-card-body">{children}</div>}
      {footer && <div className="dmd-card-footer">{footer}</div>}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="dmd-card-link">
        {content}
      </a>
    );
  }

  return content;
};

export interface CardGridProps {
  cols?: 1 | 2 | 3 | 4;
  /**
   * Max visible cards in carousel mode (when cards outnumber `cols`).
   * Defaults to `cols` and auto-shrinks when space is tight (mobile → 1).
   */
  carouselCols?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}

const CAROUSEL_MIN_CARD_PX = 260;
const CAROUSEL_GAP_PX = 16;

/** Clamp a column count into the supported 1–4 range. */
export function clampCarouselCols(value: unknown, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback;
  if (n < 1) return 1;
  if (n > 4) return 4;
  return n;
}

/**
 * Resolve how many cards fit side-by-side in the carousel viewport.
 * `maxPerView` is the `carouselCols` cap; narrow containers shrink below it
 * (mobile-first) so a `carouselCols={2}` grid still shows 1 card on phones.
 */
export function resolveCarouselPerView(maxPerView: number, containerWidth: number): number {
  const cap = clampCarouselCols(maxPerView, 2);
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return cap;
  const fit = Math.floor((containerWidth + CAROUSEL_GAP_PX) / (CAROUSEL_MIN_CARD_PX + CAROUSEL_GAP_PX));
  if (fit < 1) return 1;
  return Math.min(cap, fit);
}

/** Normalize any card index into the `0 … total-1` loop range. */
export function normalizeLoopIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  const i = Number.isFinite(index) ? Math.floor(index) : 0;
  return ((i % total) + total) % total;
}

/** Clone ranges that make the loop seamless: last N before, first N after. */
export function buildLoopRange(total: number, perView: number): { leading: number[]; trailing: number[] } {
  if (total <= 0) return { leading: [], trailing: [] };
  const n = Math.max(1, Math.min(clampCarouselCols(perView, 1), total));
  const leading: number[] = [];
  const trailing: number[] = [];
  for (let k = n; k >= 1; k--) leading.push(normalizeLoopIndex(total - k, total));
  for (let k = 0; k < n; k++) trailing.push(normalizeLoopIndex(k, total));
  return { leading, trailing };
}

/**
 * Sliding-window math for the CardGrid carousel. The window shows `perView`
 * consecutive cards and cycles with wrap-around; there are
 * `total - perView + 1` positions and every window stays full (cards from the
 * end wrap to the front circularly).
 */
export function carouselWindow(
  total: number,
  perView: number,
  start: number,
): { positions: number; index: number; indices: number[] } {
  const safeTotal = Math.max(0, Math.floor(total));
  const safePerView = Math.max(1, Math.floor(perView));
  const positions = Math.max(1, safeTotal - safePerView + 1);
  const index = ((Math.floor(start) % positions) + positions) % positions;
  const indices: number[] = [];
  for (let i = 0; i < Math.min(safePerView, safeTotal); i++) {
    indices.push((index + i) % safeTotal);
  }
  return { positions, index, indices };
}

export const CardGrid: React.FC<CardGridProps> = ({ cols = 2, carouselCols, children }) => {
  // Wrap each card in an item-context provider so `<Item>` (and nested items)
  // resolve to `<Card>`. Each child is wrapped individually so the card count
  // (drives grid vs. carousel) is preserved.
  const wrapped = React.Children.map(children, (child) => (
    <ItemParentContext.Provider value={{ kind: "cardgrid" }}>{child}</ItemParentContext.Provider>
  ));
  const cards = React.Children.toArray(wrapped).filter((child) => React.isValidElement(child));
  const total = cards.length;
  const maxPerView = clampCarouselCols(carouselCols ?? cols, clampCarouselCols(cols, 2));

  // Fewer (or equal) cards than columns: plain grid, exactly as before.
  // carouselCols only applies once the grid overflows into carousel mode.
  if (total <= cols) {
    return <div className={`dmd-card-grid dmd-card-grid-${cols}`}>{wrapped}</div>;
  }

  return <CardCarousel cards={cards} total={total} maxPerView={maxPerView} fallbackCols={clampCarouselCols(cols, 2)} />;
};

/**
 * Touch-first seamless carousel: a native scroll-snap track with clone zones
 * (last N cards prepended, first N appended) so cycling last → first glides
 * through adjacent clones instead of jumping back to the start.
 */
const CardCarousel: React.FC<{ cards: React.ReactNode[]; total: number; maxPerView: number; fallbackCols: number }> = ({
  cards,
  total,
  maxPerView,
  fallbackCols,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [perView, setPerView] = useState<number>(maxPerView);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const settlingRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  activeRef.current = active;

  const { leading, trailing } = buildLoopRange(total, perView);
  const leadingCount = leading.length;

  // Responsive shrink: narrow containers show fewer cards (mobile → 1).
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof window === "undefined") return;
    const update = () => {
      const next = resolveCarouselPerView(maxPerView, viewport.clientWidth);
      setPerView((prev) => (prev === next ? prev : next));
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [maxPerView]);

  const slideStep = (): number => {
    const viewport = viewportRef.current;
    if (!viewport) return 0;
    const slide = viewport.querySelector<HTMLElement>(".dmd-carousel-slide");
    if (!slide) return 0;
    const styles = getComputedStyle(viewport);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "16") || CAROUSEL_GAP_PX;
    return slide.offsetWidth + gap;
  };

  const reducedMotion = (): boolean =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scrollToLogical = (logical: number, behavior?: ScrollBehavior) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const target = normalizeLoopIndex(logical, total);
    const slide = viewport.firstElementChild?.children[leadingCount + target] as HTMLElement | undefined;
    if (!slide) return;
    setActive(target);
    viewport.scrollTo({ left: slide.offsetLeft, behavior: behavior ?? (reducedMotion() ? "auto" : "smooth") });
  };

  // After scrolling settles inside a clone zone, silently remap to the
  // mirrored real position so the loop never visibly jumps.
  const scheduleSettle = () => {
    if (typeof window === "undefined") return;
    if (settlingRef.current !== null) window.clearTimeout(settlingRef.current);
    settlingRef.current = window.setTimeout(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const step = slideStep();
      if (step <= 0) return;
      const rawPos = Math.round(viewport.scrollLeft / step);
      const logical = normalizeLoopIndex(rawPos - leadingCount, total);
      if (rawPos < leadingCount || rawPos >= leadingCount + total) {
        const peer = viewport.firstElementChild?.children[leadingCount + logical] as HTMLElement | undefined;
        if (peer) viewport.scrollTo({ left: peer.offsetLeft, behavior: "auto" });
      }
      if (logical !== activeRef.current) setActive(logical);
    }, 140);
  };

  const onScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport || typeof window === "undefined") return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const step = slideStep();
      if (step > 0) {
        const rawPos = Math.round(viewport.scrollLeft / step);
        const logical = normalizeLoopIndex(rawPos - leadingCount, total);
        if (logical !== activeRef.current) setActive(logical);
      }
      scheduleSettle();
    });
  };

  useEffect(
    () => () => {
      if (typeof window === "undefined") return;
      if (settlingRef.current !== null) window.clearTimeout(settlingRef.current);
      if (rafRef.current !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // Anchor on the first real card after mount / per-view changes (no animation).
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof window === "undefined") return;
    const peer = viewport.firstElementChild?.children[leadingCount + activeRef.current] as HTMLElement | undefined;
    if (peer) viewport.scrollTo({ left: peer.offsetLeft, behavior: "auto" });
  }, [leadingCount]);

  const goPrev = () => scrollToLogical(activeRef.current - 1);
  const goNext = () => scrollToLogical(activeRef.current + 1);

  const renderSlide = (card: React.ReactNode, key: string, clone: boolean) => (
    <div
      key={key}
      className={`dmd-carousel-slide${clone ? " dmd-carousel-slide-clone" : ""}`}
      aria-hidden={clone || undefined}
    >
      {card}
    </div>
  );

  return (
    <section
      className={`dmd-card-carousel dmd-card-grid-${fallbackCols}`}
      data-per-view={perView}
      aria-roledescription="carousel"
      aria-label={`Card carousel, ${total} cards`}
    >
      <div ref={viewportRef} className="dmd-carousel-viewport" onScroll={onScroll}>
        <div className="dmd-carousel-track" style={{ "--dmd-carousel-per-view": perView } as React.CSSProperties}>
          {leading.map((idx) => renderSlide(cards[idx], `leading-${idx}`, true))}
          {cards.map((card, idx) => renderSlide(card, `card-${idx}`, false))}
          {trailing.map((idx, k) => renderSlide(cards[idx], `trailing-${k}-${idx}`, true))}
        </div>
      </div>
      <div className="dmd-sr-only" aria-live="polite">
        {`Showing card ${active + 1} of ${total}`}
      </div>
      <div className="dmd-carousel-controls">
        <button type="button" className="dmd-carousel-btn" onClick={goPrev} aria-label="Previous cards">
          <span aria-hidden="true">‹</span>
        </button>
        <div className="dmd-carousel-dots" role="tablist" aria-label="Choose card">
          {cards.map((_, i) => (
            <button
              type="button"
              key={i}
              className={`dmd-carousel-dot${i === active ? " active" : ""}`}
              role="tab"
              aria-selected={i === active}
              aria-label={`Go to card ${i + 1}`}
              aria-current={i === active || undefined}
              onClick={() => scrollToLogical(i)}
            />
          ))}
        </div>
        <button type="button" className="dmd-carousel-btn" onClick={goNext} aria-label="Next cards">
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </section>
  );
};

export interface BadgeProps {
  type?: "info" | "success" | "warning" | "danger" | "new" | "neutral";
  pill?: boolean;
  dot?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ type = "info", pill, dot, icon, children }) => {
  return (
    <span className={`dmd-badge dmd-badge-${type}${pill ? " dmd-badge-pill" : ""}${dot ? " dmd-badge-dot" : ""}`}>
      {dot && (
        <span className="dmd-badge-pulse" aria-hidden="true">
          <span className="dmd-badge-pulse-ring" />
          <span className="dmd-badge-pulse-core" />
        </span>
      )}
      {icon && !dot && (
        <span className="dmd-badge-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="dmd-badge-label">{children}</span>
    </span>
  );
};

export interface StepsProps {
  children: React.ReactNode;
}

export const Steps: React.FC<StepsProps> = ({ children }) => {
  // Wrap each child in an item-context provider carrying its 1-based index, so
  // both `<Step>` and the universal `<Item>` can auto-number without cloning.
  const numbered = React.Children.map(children, (child, idx) => (
    <ItemParentContext.Provider key={idx} value={{ kind: "steps", index: idx + 1 }}>
      {child}
    </ItemParentContext.Provider>
  ));
  return <div className="dmd-steps">{numbered}</div>;
};

export interface StepProps {
  title: string;
  step?: number;
  children: React.ReactNode;
}

export const Step: React.FC<StepProps> = ({ title, step, children }) => {
  // Fall back to the position inherited from `<Steps>` when `step` is omitted.
  const ctx = React.useContext(ItemParentContext);
  const resolvedStep = step ?? (ctx?.kind === "steps" ? ctx.index : undefined);
  return (
    <div className="dmd-step-item">
      <div className="dmd-step-marker">{resolvedStep !== undefined ? resolvedStep : ""}</div>
      <div className="dmd-step-content">
        <h4 className="dmd-step-title">{title}</h4>
        <div className="dmd-step-body">{children}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Extended default library — 12+ built-in widgets, zero dependencies,
// themed entirely through --dmd-* tokens so every family and mode matches.
// ---------------------------------------------------------------------------

export type AlertType = "note" | "tip" | "important" | "warning" | "caution" | "info" | "success" | "danger";

export interface AlertProps {
  type?: AlertType;
  title?: string;
  children?: React.ReactNode;
}

const ALERT_ICONS: Record<AlertType, string> = {
  note: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  tip: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  important:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  warning:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  caution:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  success:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  danger:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
};

export const Alert: React.FC<AlertProps> = ({ type = "note", title, children }) => (
  <div className={`dmd-alert dmd-alert-${type}`} role="note">
    <div className="dmd-alert-head">
      <span className="dmd-alert-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ALERT_ICONS[type] }} />
      {title && <span className="dmd-alert-title">{title}</span>}
    </div>
    {children && <div className="dmd-alert-body">{children}</div>}
  </div>
);

/** Alias of <Alert> for Markdown-familiar authoring. */
export const Callout: React.FC<AlertProps> = (props) => <Alert {...props} />;

export interface ButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  href?: string;
  external?: boolean;
  block?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLElement>;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  href,
  external,
  block,
  icon,
  iconPosition = "left",
  loading,
  disabled,
  onClick,
  type = "button",
  children,
}) => {
  const cls = `dmd-btn dmd-btn-${variant} dmd-btn-${size}${block ? " dmd-btn-block" : ""}${
    loading ? " dmd-btn-loading" : ""
  }${icon && !children ? " dmd-btn-icon-only" : ""}`;
  const content = (
    <>
      {loading && (
        <span className="dmd-btn-spinner" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.2-8.56" strokeLinecap="round" />
          </svg>
        </span>
      )}
      {icon && iconPosition === "left" && !loading && (
        <span className="dmd-btn-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children && <span className="dmd-btn-label">{children}</span>}
      {icon && iconPosition === "right" && (
        <span className="dmd-btn-icon" aria-hidden="true">
          {icon}
        </span>
      )}
    </>
  );
  if (href && !disabled) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cls}
        aria-disabled={loading ? "true" : undefined}
        onClick={onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
      >
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled || loading} onClick={onClick}>
      {content}
    </button>
  );
};

export interface KbdProps {
  keys?: string;
  children: React.ReactNode;
}

export const Kbd: React.FC<KbdProps> = ({ keys, children }) => {
  const keyList = keys
    ? keys
        .split("+")
        .map((k) => k.trim())
        .filter(Boolean)
    : null;
  if (keyList?.length) {
    return (
      <span className="dmd-kbd-group">
        <span className="dmd-sr-only">Keyboard shortcut: {keyList.join(" plus ")}</span>
        {keyList.map((key, idx) => (
          <span className="dmd-kbd-chord" key={idx}>
            {idx > 0 && (
              <span className="dmd-kbd-plus" aria-hidden="true">
                +
              </span>
            )}
            <kbd className="dmd-kbd">{key}</kbd>
          </span>
        ))}
      </span>
    );
  }
  return <kbd className="dmd-kbd">{children}</kbd>;
};

export interface DetailsProps {
  summary: string;
  open?: boolean;
  children?: React.ReactNode;
}

export const Details: React.FC<DetailsProps> = ({ summary, open, children }) => (
  <details className="dmd-details" open={open}>
    <summary className="dmd-details-summary">{summary}</summary>
    <div className="dmd-details-body">{children}</div>
  </details>
);

export interface AccordionProps {
  children: React.ReactNode;
}

export const Accordion: React.FC<AccordionProps> = ({ children }) => (
  <div className="dmd-accordion">
    <ItemParentContext.Provider value={{ kind: "accordion" }}>{children}</ItemParentContext.Provider>
  </div>
);

export interface AccordionItemProps {
  title: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({ title, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`dmd-accordion-item${open ? " open" : ""}`}>
      <button type="button" className="dmd-accordion-trigger" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="dmd-accordion-label">{title}</span>
        <span className="dmd-accordion-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      <div className={`dmd-accordion-panel${open ? " open" : ""}`}>{children}</div>
    </div>
  );
};

export interface ColumnsProps {
  cols?: 2 | 3 | 4;
  /** Visual treatment for each column. `normal` (default) is borderless/flush. */
  type?: "normal" | "card" | "recessed" | "neon";
  children: React.ReactNode;
}

export const Columns: React.FC<ColumnsProps> = ({ cols = 2, type = "normal", children }) => (
  <div className={`dmd-columns dmd-columns-${cols} dmd-columns-${type}`}>
    <ItemParentContext.Provider value={{ kind: "columns" }}>{children}</ItemParentContext.Provider>
  </div>
);

export interface ColumnProps {
  children?: React.ReactNode;
}

export const Column: React.FC<ColumnProps> = ({ children }) => <div className="dmd-column">{children}</div>;

export interface TimelineProps {
  children: React.ReactNode;
}

export const Timeline: React.FC<TimelineProps> = ({ children }) => (
  <div className="dmd-timeline">
    <ItemParentContext.Provider value={{ kind: "timeline" }}>{children}</ItemParentContext.Provider>
  </div>
);

export interface TimelineItemProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ title, subtitle, children }) => (
  <div className="dmd-timeline-item">
    <div className="dmd-timeline-dot" aria-hidden="true" />
    <div className="dmd-timeline-content">
      <div className="dmd-timeline-title">{title}</div>
      {subtitle && <div className="dmd-timeline-subtitle">{subtitle}</div>}
      {children && <div className="dmd-timeline-body">{children}</div>}
    </div>
  </div>
);

export interface ItemProps {
  [key: string]: any;
  children?: React.ReactNode;
}

/**
 * Universal child element. Reads the nearest {@link ItemParentContext} and
 * renders as that container's designated child — TimelineItem, AccordionItem,
 * Column, Step (auto-numbered), or Card — forwarding every prop. With no
 * container ancestor, it renders as an `<li>` (the child of an unordered list).
 */
export const Item: React.FC<ItemProps> = (props) => {
  const ctx = React.useContext(ItemParentContext);
  const { children, ...rest } = props;
  if (ctx) {
    switch (ctx.kind) {
      case "timeline":
        return <TimelineItem {...(rest as any)}>{children}</TimelineItem>;
      case "accordion":
        return <AccordionItem {...(rest as any)}>{children}</AccordionItem>;
      case "columns":
        return <Column {...(rest as any)}>{children}</Column>;
      case "cardgrid":
        return <Card {...(rest as any)}>{children}</Card>;
      case "tabs":
        return <Tab {...(rest as any)}>{children}</Tab>;
      case "steps":
        return (
          <Step {...(rest as any)} step={rest.step ?? ctx.index}>
            {children}
          </Step>
        );
    }
  }
  return <li {...rest}>{children}</li>;
};
