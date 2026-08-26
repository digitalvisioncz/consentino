import type {ConsentBridge, ConsentChoice} from '@consentino/core';
import {describe, expect, it, vi} from 'vite-plus/test';

import {registerCookiebotConsent, type CookiebotEventTarget} from './cookiebot';

function createHarness() {
    const choices: ConsentChoice[] = [];
    const bridge: ConsentBridge = {
        publish: choice => choices.push(choice),
    };
    const target = new EventTarget() as CookiebotEventTarget;
    const warn = vi.fn();

    return {bridge, choices, target, warn};
}

describe('registerCookiebotConsent', () => {
    it('allows tracking when restored statistics consent is true', () => {
        const harness = createHarness();
        harness.target.Cookiebot = {consent: {statistics: true}};

        registerCookiebotConsent(harness.target, harness.bridge, harness.warn);
        harness.target.dispatchEvent(new Event('CookiebotOnConsentReady'));

        expect(harness.choices).toEqual(['allow']);
    });

    it('denies tracking when the visitor declines statistics consent', () => {
        const harness = createHarness();
        harness.target.Cookiebot = {consent: {statistics: false}};

        registerCookiebotConsent(harness.target, harness.bridge, harness.warn);
        harness.target.dispatchEvent(new Event('CookiebotOnDecline'));

        expect(harness.choices).toEqual(['deny']);
    });

    it('reads the current statistics value for every supported event', () => {
        const harness = createHarness();
        harness.target.Cookiebot = {consent: {statistics: false}};
        registerCookiebotConsent(harness.target, harness.bridge, harness.warn);

        harness.target.dispatchEvent(new Event('CookiebotOnConsentReady'));
        harness.target.Cookiebot.consent.statistics = true;
        harness.target.dispatchEvent(new Event('CookiebotOnAccept'));
        harness.target.Cookiebot.consent.statistics = false;
        harness.target.dispatchEvent(new Event('CookiebotOnDecline'));

        expect(harness.choices).toEqual(['deny', 'allow', 'deny']);
    });

    it('denies malformed consent and warns only once', () => {
        const harness = createHarness();
        registerCookiebotConsent(harness.target, harness.bridge, harness.warn);

        harness.target.dispatchEvent(new Event('CookiebotOnConsentReady'));
        harness.target.dispatchEvent(new Event('CookiebotOnAccept'));

        expect(harness.choices).toEqual(['deny', 'deny']);
        expect(harness.warn).toHaveBeenCalledOnce();
    });

    it('fails closed when a partial Cookiebot global replaces an allowed state', () => {
        const harness = createHarness();
        harness.target.Cookiebot = {consent: {statistics: true}};
        registerCookiebotConsent(harness.target, harness.bridge, harness.warn);
        harness.target.dispatchEvent(new Event('CookiebotOnConsentReady'));
        Object.defineProperty(harness.target, 'Cookiebot', {configurable: true, value: {}});

        expect(() => harness.target.dispatchEvent(new Event('CookiebotOnAccept'))).not.toThrow();
        expect(harness.choices).toEqual(['allow', 'deny']);
    });

    it('warns when Cookiebot has not emitted a consent event by window load', () => {
        const harness = createHarness();
        registerCookiebotConsent(harness.target, harness.bridge, harness.warn);

        harness.target.dispatchEvent(new Event('load'));

        expect(harness.choices).toEqual([]);
        expect(harness.warn).toHaveBeenCalledOnce();
    });
});
