import {resolve} from 'node:path';

import {defineConfig} from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(import.meta.dirname, 'src/index.ts'),
            fileName: () => 'consentino.js',
            formats: ['iife'],
            name: 'Consentino',
        },
        target: 'es2022',
    },
});
