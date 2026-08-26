import type React from "react";
import { Layout } from "./components/Layout";
import { DocProvider } from "./provider/DocProvider";
import { ThemeProvider } from "./provider/ThemeProvider";
import type { DocConfig } from "./types";
import "./styles/main.css";

interface DocMeDownAppProps {
  config: DocConfig;
  basePath?: string;
}

export const DocMeDownApp: React.FC<DocMeDownAppProps> = ({ config, basePath = "" }) => {
  return (
    <ThemeProvider defaultMode={config.theme?.defaultMode} defaultPreset={config.theme?.preset}>
      <DocProvider initialConfig={config} basePath={basePath}>
        <Layout />
      </DocProvider>
    </ThemeProvider>
  );
};
