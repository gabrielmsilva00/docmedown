declare module 'mime-types' {
  const mime: {
    lookup(path: string): string | false;
  };

  export default mime;
}

declare module 'prismjs' {
  interface PrismGrammar {
    [key: string]: unknown;
  }

  interface PrismStatic {
    languages: Record<string, PrismGrammar | undefined>;
    highlight(code: string, grammar: PrismGrammar, language: string): string;
  }

  const Prism: PrismStatic;
  export default Prism;
}

declare module 'prismjs/components/*';