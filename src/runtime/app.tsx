import React from 'react';
import { DocConfig } from './types';
import { ThemeProvider } from './provider/ThemeProvider';
import { DocProvider } from './provider/DocProvider';
import { Layout } from './components/Layout';
import './styles/main.css';

interface DocMeDownAppProps {
  config: DocConfig;
  basePath?: string;
}

export const DocMeDownApp: React.FC<DocMeDownAppProps> = ({ config, basePath = '' }) => {
  return (
    <ThemeProvider
      defaultMode={config.theme?.defaultMode}
      defaultPreset={config.theme?.preset}
    >
      <DocProvider initialConfig={config} basePath={basePath}>
        <Layout />
      </DocProvider>
    </ThemeProvider>
  );
};
