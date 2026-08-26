const { createElement } = window.React;

export function PackStatus() {
  return createElement(
    'div',
    {
      style: {
        margin: '1rem 0',
        padding: '0.9rem 1rem',
        border: '1px solid var(--dmd-accent)',
        background: 'var(--dmd-accent-subtle)',
        color: 'var(--dmd-text-primary)',
      },
    },
    'Ready to package: this component belongs only to the offline example.'
  );
}

export default { PackStatus };