import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Standalone vitest for the authoring-time design-importer (outside any app/pkg).
// The workspace package isn't linked under this dir, so alias it to its built
// dist (same code the server/runtime uses).
export default defineConfig({
  resolve: {
    alias: {
      '@dw-church/design-tokens': fileURLToPath(
        new URL('../../packages/design-tokens/dist/index.js', import.meta.url),
      ),
    },
  },
  test: {
    include: ['__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
