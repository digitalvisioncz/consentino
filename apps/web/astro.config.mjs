import {defineConfig} from 'astro/config';

export default defineConfig({
    base: process.env.NODE_ENV === 'production' ? '/consentino/' : '/',
    site: 'https://digitalvisioncz.github.io',
});
