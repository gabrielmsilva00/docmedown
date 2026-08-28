import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { SearchResultItem } from "../types";
import type { DocSearchIndex } from "./search-index";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchIndex: DocSearchIndex;
  onSelect: (slug: string) => void;
  placeholder?: string;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  searchIndex,
  onSelect,
  placeholder = "Search docs...",
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);

      return () => {
        window.clearTimeout(focusTimer);
        document.body.style.overflow = previousOverflow;
      };
    }

    setQuery("");
    setResults([]);
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const hits = searchIndex.search(query);
    setResults(hits);
    setSelectedIndex(0);
  }, [query, searchIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelect(results[selectedIndex].slug);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="dmd-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Documentation search"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="dmd-search-modal">
        <div className="dmd-search-input-wrapper">
          <svg
            className="dmd-search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="dmd-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
          />
          <kbd className="dmd-search-escape dmd-kbd">ESC</kbd>
          <button type="button" className="dmd-search-close" aria-label="Close search" onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="dmd-search-results">
          {query.trim() && results.length === 0 && (
            <div className="dmd-search-empty">No results found for &ldquo;{query}&rdquo;</div>
          )}

          {results.map((res, idx) => (
            <button
              type="button"
              key={res.id}
              className={`dmd-search-item ${idx === selectedIndex ? "selected" : ""}`}
              onClick={() => {
                onSelect(res.slug);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div className="dmd-search-item-header">
                <span className="dmd-search-item-title">{res.title}</span>
                {res.category && <span className="dmd-search-item-cat">{res.category}</span>}
              </div>
              {res.snippet && <p className="dmd-search-item-snippet">{res.snippet}</p>}
            </button>
          ))}
        </div>

        <div className="dmd-search-footer">
          <span>
            <kbd className="dmd-kbd">↑</kbd> <kbd className="dmd-kbd">↓</kbd> Navigate
          </span>
          <span>
            <kbd className="dmd-kbd">↵</kbd> Select
          </span>
          <span>
            <kbd className="dmd-kbd">ESC</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
};
