const { createElement, useState } = window.React;

export function OrbitCounter({ label = 'Orbit count' }) {
  const [count, setCount] = useState(0);

  return createElement(
    'button',
    {
      type: 'button',
      onClick: () => setCount((value) => value + 1),
      style: {
        padding: '0.6rem 0.9rem',
        border: '1px solid var(--dmd-accent)',
        borderRadius: '6px',
        background: 'var(--dmd-accent-subtle)',
        color: 'var(--dmd-text-primary)',
        cursor: 'pointer',
        fontWeight: 700,
      },
    },
    `${label}: ${count}`
  );
}

export default { OrbitCounter };