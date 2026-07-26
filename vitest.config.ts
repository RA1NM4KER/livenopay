import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts")
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    resolveSnapshotPath: undefined,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/**/types.ts",
        "src/app/**",
        "src/lib/supabase/**",
        "src/lib/livenopay-web.ts"
      ]
    }
  }
});
