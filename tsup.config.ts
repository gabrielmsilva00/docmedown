import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    cli: "src/cli/index.ts",
    "embedded-dmd-locales": "src/runtime/embedded-dmd-locales.ts",
  },
  outDir: "dist",
  format: ["cjs"],
  target: "node18",
  clean: false,
  dts: false,
  sourcemap: false,
  minify: true,
  esbuildPlugins: [
    {
      name: "external-dmd-catalog",
      setup(build) {
        build.onResolve({ filter: /\/embedded-dmd-locales$/ }, () => ({
          path: "./embedded-dmd-locales.js",
          external: true,
        }));
      },
    },
  ],
  banner: { js: "#!/usr/bin/env node" },
  // qrcode-terminal is loaded lazily at serve time and must stay external so
  // the printed Network QR resolves from node_modules at runtime.
  external: ["qrcode-terminal"],
});
