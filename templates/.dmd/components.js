const { createElement, useState } = window.React;

export function CounterWidget({ initial = 0 }) {
  const [count, setCount] = useState(Number(initial));

  return createElement(
    'button',
    {
      type: 'button',
      onClick: () => setCount((value) => value + 1),
      style: {
        padding: '0.55rem 0.85rem',
        border: '1px solid var(--dmd-accent)',
        borderRadius: '6px',
        background: 'var(--dmd-accent-subtle)',
        color: 'var(--dmd-text-primary)',
        cursor: 'pointer',
        fontWeight: 700,
      },
    },
    `Interactive counter: ${count}`
  );
}

export default { CounterWidget };