import type {ConsentBridge} from '@consentino/core';

interface CookiebotApi {
    consent: {
        statistics?: unknown;
    };
}

export interface CookiebotEventTarget extends EventTarget {
    Cookiebot?: CookiebotApi;
    readonly document?: Pick<Document, 'readyState'>;
}

type Warn = (message: string) => void;

const events = ['CookiebotOnConsentReady', 'CookiebotOnAccept', 'CookiebotOnDecline'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

const readStatistics = (target: CookiebotEventTarget): unknown => {
    const cookiebot: unknown = target.Cookiebot;
    const consent = isRecord(cookiebot) ? cookiebot.consent : undefined;

    return isRecord(consent) ? consent.statistics : undefined;
};

export function registerCookiebotConsent(target: CookiebotEventTarget, bridge: ConsentBridge, warn: Warn = message => console.warn(message)): void {
    let warned = false;
    let received = false;

    const publish = () => {
        received = true;
        const statistics = readStatistics(target);

        if (typeof statistics !== 'boolean' && !warned) {
            warned = true;
            warn('[Consentino Cookiebot] Cookiebot statistics consent was unavailable or invalid.');
        }

        bridge.publish(statistics === true ? 'allow' : 'deny');
    };

    for (const event of events) {
        target.addEventListener(event, publish);
    }

    const reportMissingConsent = () => {
        if (!received) {
            warn('[Consentino Cookiebot] Cookiebot did not provide a consent state by window load.');
        }
    };

    if (target.document?.readyState === 'complete') {
        reportMissingConsent();

        return;
    }

    target.addEventListener('load', reportMissingConsent, {once: true});
}
