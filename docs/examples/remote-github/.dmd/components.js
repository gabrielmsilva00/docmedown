const { createElement } = window.React;

export function RemoteSourceBadge() {
  return createElement(
    'span',
    { style: { color: 'var(--dmd-accent)', fontWeight: 700 } },
    'Remote source example'
  );
}

export default { RemoteSourceBadge };