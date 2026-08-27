import type React from "react";
import { useState } from "react";
import { downloadOfflineCopy, isOfflineDocumentation } from "../offline-export";

export const OfflineDownloadButton: React.FC = () => {
  const offline = isOfflineDocumentation();
  const [status, setStatus] = useState<"idle" | "compressing" | "error">("idle");
  const [message, setMessage] = useState("");

  const download = async () => {
    if (offline || status === "compressing") return;
    setStatus("compressing");
    setMessage("");
    try {
      await downloadOfflineCopy();
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const label = offline ? "Offline copy" : status === "compressing" ? "Compressing…" : "Download";
  const title = offline
    ? "This page is already a self-contained offline documentation copy."
    : "Compress and download this documentation as a self-contained offline HTML file.";

  return (
    <div className="dmd-offline-download-wrap">
      <button
        type="button"
        className="dmd-offline-download-btn"
        disabled={offline || status === "compressing"}
        aria-disabled={offline || status === "compressing"}
        title={title}
        onClick={download}
      >
        <svg
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
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        <span>{label}</span>
      </button>
      {message && (
        <div className="dmd-offline-download-error" role="alert">
          {message}
        </div>
      )}
    </div>
  );
};
