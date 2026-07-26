// Test-only stand-in for the real "server-only" package, which throws
// unconditionally when imported outside a webpack "react-server" bundle
// (see node_modules/server-only/index.js). Vitest runs in plain Node, so
// vitest.config.ts aliases "server-only" to this no-op instead.
export {};
