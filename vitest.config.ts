import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
        clearMocks: true,
        restoreMocks: false,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/generated/**', 'src/index.ts', 'src/data/**', 'src/repositories/**', 'src/lib/prisma.ts', 'src/server.ts', '**/*.d.ts'],
            reporter: ['text', 'html'],
        },
    },
});