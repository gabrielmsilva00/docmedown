import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getEmbeddedNestedSites, isSelfContainedOffline, OFFLINE_LINK_EVENT } from "../offline-export";

const DEFAULT_TOAST_MESSAGE = "This offline copy has limited features.";

/**
 * Startup notice for self-contained offline copies: a dismissible toast that
 * expands into a modal describing exactly what the copy can and cannot do.
 */
export const OfflineNotice: React.FC = () => {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState(DEFAULT_TOAST_MESSAGE);
  const [modalOpen, setModalOpen] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const nestedCount = Object.keys(getEmbeddedNestedSites() ?? {}).length;

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setToastVisible(false), 12000);
  }, []);

  useEffect(() => {
    if (!isSelfContainedOffline()) return undefined;

    showToast(DEFAULT_TOAST_MESSAGE);
    const onUnavailableLink = (event: Event) => {
      const message = (event as CustomEvent<string | undefined>).detail;
      showToast(message || "That link is unavailable in offline documentation.");
    };
    window.addEventListener(OFFLINE_LINK_EVENT, onUnavailableLink);

    return () => {
      window.removeEventListener(OFFLINE_LINK_EVENT, onUnavailableLink);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, [showToast]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  if (!isSelfContainedOffline()) return null;

  return (
    <>
      {toastVisible && (
        <div className="dmd-offline-toast" role="status">
          <span>{toastMessage}</span>
          <button
            type="button"
            className="dmd-offline-toast-action"
            onClick={() => {
              setToastVisible(false);
              setModalOpen(true);
            }}
          >
            Learn more
          </button>
          <button
            type="button"
            className="dmd-offline-toast-dismiss"
            aria-label="Dismiss offline notice"
            onClick={() => setToastVisible(false)}
          >
            ×
          </button>
        </div>
      )}

      {modalOpen && (
        <div
          className="dmd-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Offline documentation limitations"
          onClick={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section className="dmd-offline-modal">
            <div className="dmd-offline-modal-header">
              <span>About this offline copy</span>
              <button
                type="button"
                className="dmd-appearance-close"
                aria-label="Close offline notice"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>
            <ul className="dmd-offline-modal-list">
              <li>Every page, the search index, diagrams, themes, and the runtime are embedded in this single file.</li>
              {nestedCount > 0 ? (
                <li>
                  {nestedCount === 1
                    ? "The nested documentation site opens directly from this file — no other files are needed."
                    : `${nestedCount} nested documentation sites open directly from this file — no other files are needed.`}
                </li>
              ) : (
                <li>
                  Links to other documentation files are disabled because nested sites were not embedded in this copy.
                </li>
              )}
              <li>Links to the internet, such as repository or social links, still require a connection.</li>
              <li>This copy never checks for updates. Rebuild the documentation to refresh its content.</li>
            </ul>
            <div className="dmd-offline-modal-footer">
              <button type="button" className="dmd-btn-primary" onClick={() => setModalOpen(false)}>
                Got it
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
