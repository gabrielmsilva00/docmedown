const { createElement, useEffect, useState } = window.React;

const panelStyle = {
  margin: '1.25rem 0',
  padding: '1rem',
  border: '1px solid var(--dmd-border-color)',
  borderRadius: '10px',
  background: 'var(--dmd-bg-card)',
};

export function InteractiveThemeDemo() {
  const readAppearance = () => ({
    family: document.documentElement.getAttribute('data-dmd-theme') || 'atlas',
    mode: document.documentElement.getAttribute('data-dmd-mode') || 'light',
    density: document.documentElement.getAttribute('data-dmd-density') || 'comfortable',
  });
  const [appearance, setAppearance] = useState(readAppearance);

  useEffect(() => {
    const observer = new MutationObserver(() => setAppearance(readAppearance()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-dmd-theme', 'data-dmd-mode', 'data-dmd-density'],
    });
    return () => observer.disconnect();
  }, []);

  return createElement(
    'div',
    { style: panelStyle },
    createElement('strong', null, 'Live appearance state'),
    createElement(
      'p',
      { style: { color: 'var(--dmd-text-secondary)' } },
      'Use the Appearance menu above. This custom component observes the runtime theme contract directly.'
    ),
    createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.6rem' } },
      ...Object.entries(appearance).map(([label, value]) => createElement(
        'div',
        {
          key: label,
          style: {
            border: '1px solid var(--dmd-border-color)',
            borderRadius: 'var(--dmd-radius-md)',
            padding: '0.65rem',
            background: 'var(--dmd-bg-secondary)',
          },
        },
        createElement('div', {
          style: {
            color: 'var(--dmd-text-muted)',
            fontFamily: 'var(--dmd-font-mono)',
            fontSize: '0.68rem',
            textTransform: 'uppercase',
          },
        }, label),
        createElement('div', { style: { marginTop: '0.25rem', fontWeight: 700 } }, value)
      ))
    )
  );
}

export function CounterWidget({ title = 'Live state demo' }) {
  const [count, setCount] = useState(0);

  return createElement(
    'div',
    { style: panelStyle },
    createElement('strong', null, title),
    createElement('p', { style: { color: 'var(--dmd-text-secondary)' } }, 'A component-local React state value.'),
    createElement(
      'button',
      {
        type: 'button',
        onClick: () => setCount((value) => value + 1),
        style: {
          border: '1px solid var(--dmd-accent)',
          borderRadius: '6px',
          padding: '0.45rem 0.7rem',
          background: 'var(--dmd-accent-subtle)',
          color: 'var(--dmd-text-primary)',
          cursor: 'pointer',
        },
      },
      `Count: ${count}`
    )
  );
}

export default { InteractiveThemeDemo, CounterWidget };