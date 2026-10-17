// Minimal ambient typing: qrcode-terminal ships CJS without bundled @types.
declare module "qrcode-terminal" {
  export function generate(text: string, opts?: { small?: boolean }): void;
}
