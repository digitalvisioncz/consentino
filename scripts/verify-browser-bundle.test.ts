import {spawnSync, type SpawnSyncReturns} from 'node:child_process';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {expect, it} from 'vite-plus/test';

const browserVerifier = fileURLToPath(new URL('./verify-browser-bundle.ts', import.meta.url));
const packageDirectory = fileURLToPath(new URL('../packages/cookiebot/', import.meta.url));

type Integration = 'cookiebot' | 'cookieyes';

interface BundleFixture {
    classic: string;
    module?: string;
}

async function runVerifier(integration: Integration, fixture: BundleFixture): Promise<SpawnSyncReturns<string>> {
    const directory = await mkdtemp(join(packageDirectory, '.consentino-browser-bundle-'));

    try {
        await mkdir(join(directory, 'dist'));
        await Promise.all([
            writeFile(join(directory, 'package.json'), JSON.stringify({type: 'module', devDependencies: {esbuild: '0.28.2'}})),
            writeFile(join(directory, 'dist/browser.js'), fixture.classic),
            writeFile(join(directory, 'dist/browser.mjs'), fixture.module ?? fixture.classic),
        ]);

        return spawnSync(process.execPath, [browserVerifier, integration], {cwd: directory, encoding: 'utf8'});
    } finally {
        await rm(directory, {force: true, recursive: true});
    }
}

it('transforms ESM-only module syntax before browser-realm execution', async () => {
    const classic = validBundle('cookiebot');
    const result = await runVerifier('cookiebot', {
        classic,
        module: `${classic}\nexport {};`,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('cookiebot: browser.js and browser.mjs behavior verified.\n');
});

it('reaches and rejects broken behavior in the ESM module artifact', async () => {
    const brokenModule = delayedBridge(`
        window.addEventListener('CookiebotOnConsentReady', () => publish('allow'));
        window.addEventListener('CookiebotOnAccept', () => publish('allow'));
        window.addEventListener('CookiebotOnDecline', () => publish('deny'));
    `);
    const result = await runVerifier('cookiebot', {
        classic: validBundle('cookiebot'),
        module: `${brokenModule}\nexport {};`,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('unexpected tracking calls');
    expect(result.stderr).not.toContain('SyntaxError');
});

function delayedBridge(handlers: string): string {
    return `
        (() => {
            let api;
            let pending = 'deny';
            let ready = false;
            let readyRegistered = false;

            const apply = () => {
                if (!api || !ready) return;
                if (pending === 'allow') api.allowUserTracking({activate: true});
                if (pending === 'deny') api.denyUserTracking();
            };
            const initialize = () => {
                if (ready) {
                    apply();
                    return;
                }
                api = globalThis.wf;
                if (!api || readyRegistered) return;
                readyRegistered = true;
                api.ready(() => {
                    ready = true;
                    apply();
                });
            };
            const publish = choice => {
                pending = choice;
                initialize();
            };

            window.addEventListener('load', initialize, {once: true});
            initialize();
            ${handlers}
        })();
    `;
}

function validBundle(integration: Integration): string {
    if (integration === 'cookiebot') {
        return delayedBridge(`
            const sync = () => publish(window.Cookiebot?.consent?.statistics === true ? 'allow' : 'deny');
            window.addEventListener('CookiebotOnConsentReady', sync);
            window.addEventListener('CookiebotOnAccept', sync);
            window.addEventListener('CookiebotOnDecline', sync);
        `);
    }

    return delayedBridge(`
        document.addEventListener('cookieyes_banner_load', event => {
            publish(event.detail?.categories?.analytics === true ? 'allow' : 'deny');
        });
        document.addEventListener('cookieyes_consent_update', event => {
            publish(event.detail?.accepted?.includes('analytics') ? 'allow' : 'deny');
        });
    `);
}

it('rejects ESM syntax in the classic browser bundle', async () => {
    const result = await runVerifier('cookiebot', {
        classic: `export {};\n${validBundle('cookiebot')}`,
        module: validBundle('cookiebot'),
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('SyntaxError');
});

it('executes bundles with browser globalThis identity', async () => {
    const source = `
        if (globalThis !== window) throw new Error('wrong JavaScript realm');
        ${validBundle('cookiebot')}
    `;
    const result = await runVerifier('cookiebot', {classic: source});

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('cookiebot: browser.js and browser.mjs behavior verified.\n');
});

it('rejects bundles that require Webflow before lifecycle initialization', async () => {
    const source = `
        wf.ready(() => wf.denyUserTracking());
        const sync = () => window.Cookiebot.consent.statistics ? wf.allowUserTracking({activate: true}) : wf.denyUserTracking();
        window.addEventListener('CookiebotOnConsentReady', sync);
        window.addEventListener('CookiebotOnDecline', sync);
    `;
    const result = await runVerifier('cookiebot', {classic: source});

    expect(result.status).not.toBe(0);
});

it('rejects bundles that lose allowed consent published before Webflow exists', async () => {
    const source = delayedBridge(`
        const sync = () => {
            if (!globalThis.wf) return;
            publish(window.Cookiebot?.consent?.statistics === true ? 'allow' : 'deny');
        };
        window.addEventListener('CookiebotOnConsentReady', sync);
        window.addEventListener('CookiebotOnAccept', sync);
        window.addEventListener('CookiebotOnDecline', sync);
    `);
    const result = await runVerifier('cookiebot', {classic: source});

    expect(result.status).not.toBe(0);
});

it('rejects a Cookiebot bundle missing its accept handler', async () => {
    const source = delayedBridge(`
        const sync = () => publish(window.Cookiebot.consent.statistics ? 'allow' : 'deny');
        window.addEventListener('CookiebotOnConsentReady', sync);
        window.addEventListener('CookiebotOnDecline', sync);
    `);
    const result = await runVerifier('cookiebot', {classic: source});

    expect(result.status).not.toBe(0);
});

it('rejects Cookiebot handlers that ignore the current statistics value', async () => {
    const source = delayedBridge(`
        window.addEventListener('CookiebotOnConsentReady', () => publish('allow'));
        window.addEventListener('CookiebotOnAccept', () => publish('allow'));
        window.addEventListener('CookiebotOnDecline', () => publish('deny'));
    `);
    const result = await runVerifier('cookiebot', {classic: source});

    expect(result.status).not.toBe(0);
});

it('rejects CookieYes handlers that ignore event consent details', async () => {
    const source = delayedBridge(`
        document.addEventListener('cookieyes_banner_load', () => publish('allow'));
        document.addEventListener('cookieyes_consent_update', () => publish('deny'));
    `);
    const result = await runVerifier('cookieyes', {classic: source});

    expect(result.status).not.toBe(0);
});

it('rejects contradictory tracking calls before the expected call', async () => {
    const source = delayedBridge(`
        const allow = () => {
            globalThis.wf.denyUserTracking();
            globalThis.wf.allowUserTracking({activate: true});
        };
        const deny = () => {
            globalThis.wf.allowUserTracking({activate: true});
            globalThis.wf.denyUserTracking();
        };
        window.addEventListener('CookiebotOnConsentReady', allow);
        window.addEventListener('CookiebotOnDecline', deny);
    `);
    const result = await runVerifier('cookiebot', {classic: source});

    expect(result.status).not.toBe(0);
});

it('rejects extra allow options', async () => {
    const source = delayedBridge(`
        const sync = () => {
            if (window.Cookiebot.consent.statistics) {
                globalThis.wf.allowUserTracking({activate: true, reload: true});
                return;
            }
            globalThis.wf.denyUserTracking();
        };
        window.addEventListener('CookiebotOnConsentReady', sync);
        window.addEventListener('CookiebotOnAccept', sync);
        window.addEventListener('CookiebotOnDecline', sync);
    `);
    const result = await runVerifier('cookiebot', {classic: source});

    expect(result.status).not.toBe(0);
});

it('rejects exceptions thrown by browser event handlers', async () => {
    const source = delayedBridge(`
        window.addEventListener('CookiebotOnConsentReady', () => {
            publish('allow');
            throw new Error('handler exploded');
        });
        window.addEventListener('CookiebotOnDecline', () => publish('deny'));
    `);
    const result = await runVerifier('cookiebot', {classic: source});

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('handler exploded');
});
