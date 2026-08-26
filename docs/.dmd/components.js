const { createElement, useState } = window.React;

const panelStyle = {
  margin: '1.25rem 0',
  padding: '1rem',
  border: '1px solid var(--dmd-border-color)',
  borderRadius: '10px',
  background: 'var(--dmd-bg-card)',
};

export function InteractiveThemeDemo() {
  const [activeTheme, setActiveTheme] = useState('indigo');
  const themes = ['indigo', 'emerald', 'sunset', 'violet', 'rose', 'slate', 'cyberpunk'];

  return createElement(
    'div',
    { style: panelStyle },
    createElement('strong', null, 'Theme palette demo'),
    createElement('p', { style: { color: 'var(--dmd-text-secondary)' } }, 'Choose a palette for this documentation site.'),
    createElement(
      'div',
      { style: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' } },
      ...themes.map((theme) => createElement(
        'button',
        {
          key: theme,
          type: 'button',
          onClick: () => {
            setActiveTheme(theme);
            document.documentElement.setAttribute('data-preset', theme);
          },
          style: {
            border: activeTheme === theme ? '2px solid var(--dmd-accent)' : '1px solid var(--dmd-border-color)',
            borderRadius: '6px',
            padding: '0.4rem 0.65rem',
            background: 'var(--dmd-bg-secondary)',
            color: 'var(--dmd-text-primary)',
            cursor: 'pointer',
          },
        },
        theme
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