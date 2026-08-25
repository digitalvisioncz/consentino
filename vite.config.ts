import {defineConfig} from 'vite-plus';

export default defineConfig({
    test: {
        include: ['docs/**/*.test.{ts,tsx}', 'packages/**/*.test.{ts,tsx}'],
        exclude: [
            '**/node_modules/**',
            '**/.git/**',
            '**/*.browser.{test,spec}.{ts,tsx}',
        ],
    },
});
