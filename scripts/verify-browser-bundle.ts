import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';

import {Window} from 'happy-dom';
import {readFile} from 'node:fs/promises';

interface TrackingOptions {
    [key: string]: unknown;
}

interface EsbuildRuntime {
    transform(
        source: string,
        options: {format: 'iife'; loader: 'js'; sourcefile: string},
    ): Promise<{
        code: string;
    }>;
}

type TrackingCall = {choice: 'allow'; options?: TrackingOptions} | {choice: 'deny'};

interface WebflowApi {
    allowUserTracking(options?: TrackingOptions): void;
    denyUserTracking(): void;
    ready(listener: () => void): void;
}

interface TestWindow extends Window {
    Cookiebot?: {
        consent: {
            statistics: boolean;
        };
    };
    wf?: WebflowApi;
}

const integration = process.argv[2];

if (integration !== 'cookiebot' && integration !== 'cookieyes') {
    throw new Error('Expected integration argument: cookiebot or cookieyes.');
}

const packageRequire = createRequire(resolve('package.json'));
const esbuild = packageRequire('esbuild') as EsbuildRuntime;

const readRuntimeSource = async (filename: 'browser.js' | 'browser.mjs'): Promise<string> => {
    const source = await readFile(resolve('dist', filename), 'utf8');

    if (filename === 'browser.js') {
        return source;
    }

    return (await esbuild.transform(source, {format: 'iife', loader: 'js', sourcefile: filename})).code;
};

const verifyConsentBeforeWebflow = (filename: 'browser.js' | 'browser.mjs', source: string): void => {
    const browser = new Window({url: 'https://example.com'}) as TestWindow;
    const calls: TrackingCall[] = [];
    const errors: unknown[] = [];
    const readyListeners: (() => void)[] = [];
    const expectedCalls: TrackingCall[] = [];

    const assertCalls = (step: string) => {
        if (errors.length > 0) {
            throw new Error(`${integration} ${filename}: browser error during ${step}: ${errors.map(String).join('; ')}`);
        }

        if (!isDeepStrictEqual(calls, expectedCalls)) {
            throw new Error(
                `${integration} ${filename}: unexpected tracking calls after ${step}. Expected ${JSON.stringify(expectedCalls)}, received ${JSON.stringify(calls)}.`,
            );
        }
    };

    browser.addEventListener('error', event => {
        const errorEvent = event as unknown as ErrorEvent;
        errors.push(errorEvent.error ?? errorEvent.message);
        event.preventDefault();
    });

    try {
        browser.eval(source);

        if (integration === 'cookiebot') {
            browser.Cookiebot = {consent: {statistics: true}};
            browser.dispatchEvent(new browser.Event('CookiebotOnConsentReady'));
        }

        if (integration === 'cookieyes') {
            browser.document.dispatchEvent(
                new browser.CustomEvent('cookieyes_banner_load', {
                    detail: {categories: {analytics: true, necessary: true}},
                }),
            );
        }

        assertCalls('allowed consent before Webflow installation');

        browser.wf = {
            allowUserTracking: options => calls.push({choice: 'allow', options: options === undefined ? undefined : {...options}}),
            denyUserTracking: () => calls.push({choice: 'deny'}),
            ready: listener => readyListeners.push(listener),
        };

        browser.dispatchEvent(new browser.Event('load'));
        assertCalls('window load before Webflow readiness after allowed consent');

        if (readyListeners.length !== 1) {
            throw new Error(`${integration} ${filename}: expected one Webflow ready callback after window load, received ${readyListeners.length}.`);
        }

        readyListeners[0]();
        expectedCalls.push({choice: 'allow', options: {activate: true}});
        assertCalls('Webflow readiness after allowed consent');
    } finally {
        browser.close();
    }
};

const verify = async (filename: 'browser.js' | 'browser.mjs'): Promise<void> => {
    const source = await readRuntimeSource(filename);
    const browser = new Window({url: 'https://example.com'}) as TestWindow;
    const calls: TrackingCall[] = [];
    const errors: unknown[] = [];
    const readyListeners: (() => void)[] = [];
    const expectedCalls: TrackingCall[] = [];

    const assertNoBrowserErrors = (step: string) => {
        if (errors.length === 0) {
            return;
        }

        throw new Error(`${integration} ${filename}: browser error during ${step}: ${errors.map(String).join('; ')}`);
    };

    const assertCalls = (step: string) => {
        assertNoBrowserErrors(step);

        if (!isDeepStrictEqual(calls, expectedCalls)) {
            throw new Error(
                `${integration} ${filename}: unexpected tracking calls after ${step}. Expected ${JSON.stringify(expectedCalls)}, received ${JSON.stringify(calls)}.`,
            );
        }
    };

    browser.addEventListener('error', event => {
        const errorEvent = event as unknown as ErrorEvent;
        errors.push(errorEvent.error ?? errorEvent.message);
        event.preventDefault();
    });

    try {
        browser.eval(source);

        browser.wf = {
            allowUserTracking: options => calls.push({choice: 'allow', options: options === undefined ? undefined : {...options}}),
            denyUserTracking: () => calls.push({choice: 'deny'}),
            ready: listener => readyListeners.push(listener),
        };

        browser.dispatchEvent(new browser.Event('load'));
        assertCalls('window load before Webflow readiness');

        if (readyListeners.length !== 1) {
            throw new Error(`${integration} ${filename}: expected one Webflow ready callback after window load, received ${readyListeners.length}.`);
        }

        readyListeners[0]();
        expectedCalls.push({choice: 'deny'});
        assertCalls('Webflow readiness');

        if (integration === 'cookiebot') {
            const cookiebot = {consent: {statistics: false}};
            browser.Cookiebot = cookiebot;
            const transitions: {event: string; statistics: boolean; call: TrackingCall}[] = [
                {event: 'CookiebotOnConsentReady', statistics: true, call: {choice: 'allow', options: {activate: true}}},
                {event: 'CookiebotOnConsentReady', statistics: false, call: {choice: 'deny'}},
                {event: 'CookiebotOnAccept', statistics: true, call: {choice: 'allow', options: {activate: true}}},
                {event: 'CookiebotOnAccept', statistics: false, call: {choice: 'deny'}},
                {event: 'CookiebotOnDecline', statistics: true, call: {choice: 'allow', options: {activate: true}}},
                {event: 'CookiebotOnDecline', statistics: false, call: {choice: 'deny'}},
            ];

            for (const transition of transitions) {
                cookiebot.consent.statistics = transition.statistics;
                browser.dispatchEvent(new browser.Event(transition.event));
                expectedCalls.push(transition.call);
                assertCalls(`${transition.event} with statistics ${transition.statistics}`);
            }
        }

        if (integration === 'cookieyes') {
            const transitions: {event: string; detail: object; call: TrackingCall}[] = [
                {
                    event: 'cookieyes_banner_load',
                    detail: {categories: {analytics: true, necessary: true}},
                    call: {choice: 'allow', options: {activate: true}},
                },
                {
                    event: 'cookieyes_banner_load',
                    detail: {categories: {analytics: false, necessary: true}},
                    call: {choice: 'deny'},
                },
                {
                    event: 'cookieyes_consent_update',
                    detail: {accepted: ['necessary', 'analytics'], rejected: ['advertisement']},
                    call: {choice: 'allow', options: {activate: true}},
                },
                {
                    event: 'cookieyes_consent_update',
                    detail: {accepted: ['necessary'], rejected: ['analytics']},
                    call: {choice: 'deny'},
                },
            ];

            for (const transition of transitions) {
                browser.document.dispatchEvent(
                    new browser.CustomEvent(transition.event, {
                        detail: transition.detail,
                    }),
                );
                expectedCalls.push(transition.call);
                assertCalls(`${transition.event} with ${transition.call.choice} consent`);
            }
        }
    } finally {
        browser.close();
    }

    verifyConsentBeforeWebflow(filename, source);
};

await verify('browser.js');
await verify('browser.mjs');
console.log(`${integration}: browser.js and browser.mjs behavior verified.`);
