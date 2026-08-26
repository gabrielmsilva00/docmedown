export async function renderMermaidDiagrams() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const elements = document.querySelectorAll('.dmd-mermaid-container pre.mermaid');
  if (elements.length === 0) return;

  try {
    // Dynamic import or global window.mermaid check
    let mermaid = (window as any).mermaid;
    if (!mermaid) {
      // If not loaded on window, try importing or injecting from CDN
      const scriptId = 'dmd-mermaid-script';
      if (!document.getElementById(scriptId)) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
          script.onload = resolve;
          script.onerror = resolve;
          document.head.appendChild(script);
        });
        mermaid = (window as any).mermaid;
      }
    }

    if (mermaid) {
      mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
      });
      await mermaid.run({
        nodes: elements,
      });
    }
  } catch (err) {
    console.warn('[DocMeDown] Mermaid diagram rendering notice:', err);
  }
}
