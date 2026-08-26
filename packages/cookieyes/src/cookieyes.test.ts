import type {ConsentBridge, ConsentChoice} from '@consentino/core';
import {describe, expect, it, vi} from 'vite-plus/test';

import {registerCookieYesConsent} from './cookieyes';

function createHarness() {
    const choices: ConsentChoice[] = [];
    const bridge: ConsentBridge = {
        publish: choice => choices.push(choice),
    };
    const target = new EventTarget();
    const warn = vi.fn();

    return {bridge, choices, target, warn};
}

describe('registerCookieYesConsent', () => {
    it('allows tracking when banner state has analytics consent', () => {
        const harness = createHarness();
        registerCookieYesConsent(harness.target, harness.bridge, harness.warn);

        harness.target.dispatchEvent(new CustomEvent('cookieyes_banner_load', {detail: {categories: {analytics: true, necessary: true}}}));

        expect(harness.choices).toEqual(['allow']);
    });

    it('denies tracking when banner state lacks analytics consent', () => {
        const harness = createHarness();
        registerCookieYesConsent(harness.target, harness.bridge, harness.warn);

        harness.target.dispatchEvent(new CustomEvent('cookieyes_banner_load', {detail: {categories: {analytics: false, necessary: true}}}));

        expect(harness.choices).toEqual(['deny']);
    });

    it('allows tracking when an update accepts analytics', () => {
        const harness = createHarness();
        registerCookieYesConsent(harness.target, harness.bridge, harness.warn);

        harness.target.dispatchEvent(
            new CustomEvent('cookieyes_consent_update', {
                detail: {accepted: ['necessary', 'analytics'], rejected: ['advertisement']},
            }),
        );

        expect(harness.choices).toEqual(['allow']);
    });

    it('denies tracking when an update revokes analytics', () => {
        const harness = createHarness();
        registerCookieYesConsent(harness.target, harness.bridge, harness.warn);

        harness.target.dispatchEvent(new CustomEvent('cookieyes_consent_update', {detail: {accepted: ['analytics'], rejected: []}}));
        harness.target.dispatchEvent(new CustomEvent('cookieyes_consent_update', {detail: {accepted: ['necessary'], rejected: ['analytics']}}));

        expect(harness.choices).toEqual(['allow', 'deny']);
    });

    it('denies malformed event details and warns only once', () => {
        const harness = createHarness();
        registerCookieYesConsent(harness.target, harness.bridge, harness.warn);

        harness.target.dispatchEvent(new CustomEvent('cookieyes_banner_load', {detail: undefined}));
        harness.target.dispatchEvent(new CustomEvent('cookieyes_consent_update', {detail: {accepted: 'analytics'}}));

        expect(harness.choices).toEqual(['deny', 'deny']);
        expect(harness.warn).toHaveBeenCalledOnce();
    });

    it('warns when CookieYes has not emitted a consent event by window load', () => {
        const harness = createHarness();
        const lifecycle = new EventTarget();
        registerCookieYesConsent(harness.target, harness.bridge, harness.warn, lifecycle);

        lifecycle.dispatchEvent(new Event('load'));
        lifecycle.dispatchEvent(new Event('load'));

        expect(harness.choices).toEqual([]);
        expect(harness.warn).toHaveBeenCalledOnce();
    });

    it('warns immediately when registered after window load', () => {
        const harness = createHarness();
        const lifecycle = Object.assign(new EventTarget(), {document: {readyState: 'complete'} satisfies Pick<Document, 'readyState'>});

        registerCookieYesConsent(harness.target, harness.bridge, harness.warn, lifecycle);

        expect(harness.choices).toEqual([]);
        expect(harness.warn).toHaveBeenCalledOnce();
    });
});
