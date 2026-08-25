import {defineConfig} from 'vitepress';

export default defineConfig({
    base: process.env.NODE_ENV === 'production' ? '/consentino/' : '/',
    description: 'Framework-agnostic cookie consent web components.',
    srcExclude: ['superpowers/**'],
    themeConfig: {
        nav: [
            {link: '/', text: 'Overview'},
            {link: '/architecture', text: 'Architecture'},
        ],
        sidebar: [
            {link: '/', text: 'Overview'},
            {link: '/architecture', text: 'Architecture'},
        ],
    },
    title: 'Consentino',
});
