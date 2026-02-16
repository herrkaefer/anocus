import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "index.ts",
    "server/index": "server/index.ts",
    "adapters/cloudflare": "adapters/cloudflare.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
});
