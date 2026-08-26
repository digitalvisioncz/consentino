import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {Window} from 'happy-dom';

interface TrackingCall {
    activate?: boolean;
    choice: 'allow' | 'deny';
}

interface TestWindow extends Window {
    Cookiebot?: {
        consent: {
            statistics: boolean;
        };
    };
    wf: {
        allowUserTracking(options?: {activate?: boolean}): void;
        denyUserTracking(): void;
        ready(listener: () => void): void;
    };
}

const integration = process.argv[2];

if (integration !== 'cookiebot' && integration !== 'cookieyes') {
    throw new Error('Expected integration argument: cookiebot or cookieyes.');
}

const verify = async (filename: 'browser.js' | 'browser.mjs'): Promise<void> => {
    const path = resolve('dist', filename);
    const browser = new Window({url: 'https://example.com'}) as TestWindow;
    const calls: TrackingCall[] = [];

    browser.wf = {
        allowUserTracking: options => calls.push({activate: options?.activate, choice: 'allow'}),
        denyUserTracking: () => calls.push({choice: 'deny'}),
        ready: listener => listener(),
    };

    const globals = globalThis as Record<string, unknown>;
    globals.window = browser;
    globals.document = browser.document;
    globals.Event = browser.Event;
    globals.CustomEvent = browser.CustomEvent;
    globals.wf = browser.wf;

    await import(pathToFileURL(path).href);
    if (calls.at(-1)?.choice !== 'deny') {
        throw new Error(`${integration} ${filename}: bundle did not default Webflow tracking to deny.`);
    }

    if (integration === 'cookiebot') {
        const cookiebot = {consent: {statistics: true}};
        browser.Cookiebot = cookiebot;
        browser.dispatchEvent(new browser.Event('CookiebotOnConsentReady'));

        const allowed = calls.at(-1);

        if (allowed?.choice !== 'allow' || allowed.activate !== true) {
            throw new Error(`cookiebot ${filename}: statistics consent did not activate tracking immediately.`);
        }

        cookiebot.consent.statistics = false;
        browser.dispatchEvent(new browser.Event('CookiebotOnDecline'));
    }

    if (integration === 'cookieyes') {
        browser.document.dispatchEvent(
            new browser.CustomEvent('cookieyes_banner_load', {
                detail: {categories: {analytics: true, necessary: true}},
            }),
        );

        const allowed = calls.at(-1);

        if (allowed?.choice !== 'allow' || allowed.activate !== true) {
            throw new Error(`cookieyes ${filename}: analytics consent did not activate tracking immediately.`);
        }

        browser.document.dispatchEvent(
            new browser.CustomEvent('cookieyes_consent_update', {
                detail: {accepted: ['necessary'], rejected: ['analytics']},
            }),
        );
    }

    if (calls.at(-1)?.choice !== 'deny') {
        throw new Error(`${integration} ${filename}: consent revocation did not deny tracking.`);
    }

    browser.close();
};

await verify('browser.js');
await verify('browser.mjs');
console.log(`${integration}: browser.js and browser.mjs behavior verified.`);
