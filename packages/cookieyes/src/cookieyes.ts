import type {ConsentBridge} from '@consentino/core';

type Warn = (message: string) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export const registerCookieYesConsent = (
    target: EventTarget,
    bridge: ConsentBridge,
    warn: Warn = message => console.warn(message),
    lifecycle: EventTarget = target,
): void => {
    let warned = false;
    let received = false;

    const publish = (allow: boolean, valid: boolean) => {
        received = true;

        if (!valid && !warned) {
            warned = true;
            warn('[Consentino CookieYes] CookieYes analytics consent was unavailable or invalid.');
        }

        bridge.publish(allow ? 'allow' : 'deny');
    };

    target.addEventListener('cookieyes_banner_load', event => {
        const detail: unknown = (event as CustomEvent<unknown>).detail;
        const categories = isRecord(detail) && isRecord(detail.categories) ? detail.categories : undefined;
        const analytics = categories?.analytics;

        publish(analytics === true, typeof analytics === 'boolean');
    });

    target.addEventListener('cookieyes_consent_update', event => {
        const detail: unknown = (event as CustomEvent<unknown>).detail;
        const accepted = isRecord(detail) ? detail.accepted : undefined;
        const rejected = isRecord(detail) ? detail.rejected : undefined;
        const valid = isStringArray(accepted) && isStringArray(rejected);

        publish(valid && accepted.includes('analytics'), valid);
    });

    lifecycle.addEventListener('load', () => {
        if (!received) {
            warn('[Consentino CookieYes] CookieYes did not provide a consent state by window load.');
        }
    });
};
