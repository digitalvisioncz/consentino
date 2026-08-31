// @vitest-environment happy-dom

import {describe, expect, it} from 'vite-plus/test';

describe('setupIntegrationSwitcher', () => {
    it('shows the snippet selected by the visitor', async () => {
        const integrationSwitcher = await import('./integration-switcher').catch(() => undefined);

        expect(integrationSwitcher).toBeDefined();
        if (!integrationSwitcher) return;

        document.body.innerHTML = `
            <div data-integration-switcher>
                <button data-integration-option data-snippet="cookiebot" aria-pressed="true">Cookiebot</button>
                <button data-integration-option data-snippet="cookieyes" aria-pressed="false">CookieYes</button>
                <code data-integration-code>cookiebot</code>
            </div>
        `;

        integrationSwitcher.setupIntegrationSwitcher(document);
        const options = document.querySelectorAll<HTMLButtonElement>('[data-integration-option]');
        options[1]?.click();

        expect(document.querySelector('[data-integration-code]')?.textContent).toBe('cookieyes');
        expect(options[0]?.getAttribute('aria-pressed')).toBe('false');
        expect(options[1]?.getAttribute('aria-pressed')).toBe('true');
    });

    it('copies the currently selected snippet', async () => {
        const integrationSwitcher = await import('./integration-switcher');
        document.body.innerHTML = `
            <div data-integration-switcher>
                <code data-integration-code>cookieyes</code>
                <button data-copy-integration>Copy</button>
            </div>
        `;
        let copiedText = '';

        integrationSwitcher.setupIntegrationSwitcher(document, text => {
            copiedText = text;
        });
        const copyButton = document.querySelector<HTMLButtonElement>('[data-copy-integration]');
        copyButton?.click();
        await Promise.resolve();

        expect(copiedText).toBe('cookieyes');
        expect(copyButton?.textContent).toBe('Copied');
    });

    it('reports when the browser blocks clipboard access', async () => {
        const integrationSwitcher = await import('./integration-switcher');
        document.body.innerHTML = `
            <div data-integration-switcher>
                <code data-integration-code>cookiebot</code>
                <button data-copy-integration>Copy</button>
            </div>
        `;

        integrationSwitcher.setupIntegrationSwitcher(document, () => Promise.reject(new Error('Clipboard denied')));
        const copyButton = document.querySelector<HTMLButtonElement>('[data-copy-integration]');
        copyButton?.click();
        await Promise.resolve();
        await Promise.resolve();

        expect(copyButton?.textContent).toBe('Copy unavailable');
    });
});
