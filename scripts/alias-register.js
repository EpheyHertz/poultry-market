/**
 * Minimal `@/*` path-alias resolver for ts-node scripts.
 *
 * The project tsconfig.json declares `paths: { "@/*": ["./*"] }` but no
 * `baseUrl`, so `tsconfig-paths/register` skips itself. Next.js resolves the
 * alias through its own bundler, but plain ts-node does not - so any script
 * that imports application code (which uses `@/...` internally) needs this.
 *
 * Usage: npx ts-node -r ./scripts/alias-register.js scripts/<file>.ts
 */
const path = require('path');
const Module = require('module');

const projectRoot = path.resolve(__dirname, '..');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    request = path.join(projectRoot, request.slice(2));
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
