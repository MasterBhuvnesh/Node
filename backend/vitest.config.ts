import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      // Map @prisma/client to the generated Prisma client (not node_modules)
      { find: /^@prisma\/client$/, replacement: path.resolve(__dirname, "generated/prisma/client.ts") },
      // Map @prisma/enums to the generated enums
      { find: /^@prisma\/enums$/, replacement: path.resolve(__dirname, "generated/prisma/enums.ts") },
    ],
  },
  test: {
    globals: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
