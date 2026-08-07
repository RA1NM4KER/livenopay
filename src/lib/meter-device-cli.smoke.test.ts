import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import pkg from "../../package.json";

// This is deliberately an out-of-process smoke test. The rest of the suite
// runs under Vitest, which aliases the `server-only` marker to a no-op stub
// (see vitest.config.ts), so an in-process import can NEVER reproduce the real
// failure: running scripts/create-meter-device.ts directly with tsx resolves
// server-only's *throwing* default export unless the `react-server` export
// condition is set. That is exactly the runtime bug this guards against, so it
// has to actually spawn the CLI the way the npm script does.

const repoRoot = path.resolve(__dirname, "../..");
const SERVER_ONLY_THROW = "cannot be imported from a Client Component";

const cliScript = (pkg as { scripts: Record<string, string> }).scripts["create:meter-device"];

describe("create:meter-device CLI", () => {
  it("is configured with the react-server export condition", () => {
    // Guards the npm script itself: drop this flag and the CLI throws at import
    // when run directly with Node/tsx.
    expect(cliScript).toContain("--conditions=react-server");
  });

  it("loads under tsx without hitting the server-only throw (runs usage path)", () => {
    // Reconstruct the exact command the npm script runs, minus --env-file (the
    // gitignored .env.local isn't present in CI, and the usage check runs
    // before any env is read). Passing no --email/--name makes it print usage
    // and exit *after* the whole server-only module graph has imported.
    const tsxArgs = cliScript
      .split(/\s+/)
      .slice(1) // drop the leading "tsx"
      .filter((arg) => !arg.startsWith("--env-file"));

    const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
    const result = spawnSync(tsxBin, tsxArgs, {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 60_000
    });

    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

    expect(result.error).toBeUndefined();
    expect(output).not.toContain(SERVER_ONLY_THROW);
    // Reaching the usage message proves the full module graph imported cleanly.
    expect(output).toContain("Usage: npm run create:meter-device");
    expect(result.status).toBe(1);
  }, 60_000);
});
