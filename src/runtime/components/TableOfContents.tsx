import type React from "react";
import { useEffect, useState } from "react";
import type { DocHeading } from "../types";

interface TOCProps {
  headings: DocHeading[];
  currentSlug: string;
}

export const TableOfContents: React.FC<TOCProps> = ({ headings, currentSlug }) => {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: "-80px 0% -60% 0%",
        threshold: 0,
      },
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside className={`dmd-toc ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="dmd-toc-header"
        aria-expanded={isOpen}
        aria-controls="dmd-toc-list"
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="8" x2="21" y1="6" y2="6" />
          <line x1="8" x2="21" y1="12" y2="12" />
          <line x1="8" x2="21" y1="18" y2="18" />
          <line x1="3" x2="3.01" y1="6" y2="6" />
          <line x1="3" x2="3.01" y1="12" y2="12" />
          <line x1="3" x2="3.01" y1="18" y2="18" />
        </svg>
        <span>On this page</span>
        <svg
          className="dmd-toc-chevron"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <ul className="dmd-toc-list" id="dmd-toc-list">
        {headings.map((h) => {
          const isActive = activeId === h.id;
          return (
            <li key={h.id} className={`dmd-toc-item dmd-toc-level-${h.level}`}>
              <a
                href={`#/${currentSlug}#${h.id}`}
                className={`dmd-toc-link ${isActive ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  const target = document.getElementById(h.id);
                  if (target) {
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                    history.pushState(null, "", `#/${currentSlug}#${h.id}`);
                    setActiveId(h.id);
                    setIsOpen(false);
                  }
                }}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
