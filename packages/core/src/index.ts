export type ConsentChoice = 'allow' | 'deny';

export interface WebflowConsentApi {
    allowUserTracking(options?: {activate?: boolean; reload?: boolean}): void;
    denyUserTracking(): void;
    ready(listener: () => void): void;
}

export interface ConsentBridgeEnvironment {
    getWebflow(): WebflowConsentApi | undefined;
    onDocumentReady(listener: () => void): void;
    onWindowLoad(listener: () => void): void;
    warn(message: string, error?: unknown): void;
}

export interface ConsentBridge {
    publish(choice: ConsentChoice): void;
}

const createBrowserEnvironment = (): ConsentBridgeEnvironment => {
    return {
        getWebflow: () => (globalThis as typeof globalThis & {wf?: WebflowConsentApi}).wf,
        onDocumentReady: listener => {
            if (typeof document === 'undefined') {
                return;
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', listener, {once: true});

                return;
            }
            listener();
        },
        onWindowLoad: listener => {
            if (typeof window === 'undefined' || typeof document === 'undefined') {
                return;
            }

            if (document.readyState === 'complete') {
                listener();

                return;
            }

            window.addEventListener('load', listener, {once: true});
        },
        warn: (message, error) => {
            const formatted = `[Consentino] ${message}`;

            if (error === undefined) {
                console.warn(formatted);

                return;
            }

            console.warn(formatted, error);
        },
    };
};

export const createWebflowConsentBridge = (environment: ConsentBridgeEnvironment = createBrowserEnvironment()): ConsentBridge => {
    let pending: ConsentChoice = 'deny';
    let applied: ConsentChoice | undefined;
    let webflow: WebflowConsentApi | undefined;
    let ready = false;
    let readyRegistered = false;
    const warnings = new Set<string>();

    const warnOnce = (key: string, message: string, error?: unknown) => {
        if (warnings.has(key)) {
            return;
        }

        warnings.add(key);
        environment.warn(message, error);
    };

    const applyPending = () => {
        if (!ready || !webflow || pending === applied) {
            return;
        }

        try {
            if (pending === 'allow') {
                webflow.allowUserTracking({activate: true});
            }

            if (pending === 'deny') {
                webflow.denyUserTracking();
            }

            applied = pending;
        } catch (error) {
            warnOnce('consent-method', 'Webflow rejected the tracking consent update.', error);
        }
    };

    const initialize = (reportMissing = false) => {
        if (ready) {
            applyPending();
            return;
        }

        const candidate = environment.getWebflow();
        const valid =
            candidate &&
            typeof candidate.ready === 'function' &&
            typeof candidate.allowUserTracking === 'function' &&
            typeof candidate.denyUserTracking === 'function';

        if (!valid) {
            if (reportMissing) warnOnce('missing-webflow', 'Webflow consent API was not available at window load.');

            return;
        }

        webflow = candidate;

        if (readyRegistered) {
            return;
        }

        readyRegistered = true;

        try {
            candidate.ready(() => {
                ready = true;
                applyPending();
            });
        } catch (error) {
            readyRegistered = false;
            warnOnce('webflow-ready', 'Webflow consent API could not register its ready callback.', error);
        }
    };

    environment.onDocumentReady(() => initialize());
    environment.onWindowLoad(() => initialize(true));
    initialize();

    return {
        publish: choice => {
            pending = choice;
            initialize();
        },
    };
};
