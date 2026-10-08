import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  clean: true,
  sourcemap: false,
  dts: false,
  // MCP CLI is executable — prepend the shebang so `npx` / `chmod +x` works.
  banner: { js: "#!/usr/bin/env node" },
});
