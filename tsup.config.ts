import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    cli: "src/cli/index.ts",
  },
  outDir: "dist",
  format: ["cjs"],
  target: "node18",
  clean: false,
  dts: false,
  sourcemap: false,
  minify: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
