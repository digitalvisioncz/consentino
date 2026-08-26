import {describe, expect, it, vi} from 'vite-plus/test';

import {createWebflowConsentBridge, type ConsentBridgeEnvironment, type WebflowConsentApi} from './index';

function createHarness(initialApi?: WebflowConsentApi) {
    let api = initialApi;
    let documentReady: () => void = () => undefined;
    let windowLoad: () => void = () => undefined;
    const warn = vi.fn();

    const environment: ConsentBridgeEnvironment = {
        getWebflow: () => api,
        onDocumentReady: listener => {
            documentReady = listener;
        },
        onWindowLoad: listener => {
            windowLoad = listener;
        },
        warn,
    };

    return {
        documentReady: () => documentReady(),
        environment,
        setApi: (nextApi: WebflowConsentApi) => {
            api = nextApi;
        },
        warn,
        windowLoad: () => windowLoad(),
    };
}

function createWebflowApi() {
    let ready: () => void = () => undefined;
    const allowUserTracking = vi.fn();
    const denyUserTracking = vi.fn();

    return {
        allowUserTracking,
        api: {
            allowUserTracking,
            denyUserTracking,
            ready: listener => {
                ready = listener;
            },
        } satisfies WebflowConsentApi,
        denyUserTracking,
        ready: () => ready(),
    };
}

describe('createWebflowConsentBridge', () => {
    it('denies tracking by default when Webflow becomes ready', () => {
        const webflow = createWebflowApi();
        const harness = createHarness(webflow.api);

        createWebflowConsentBridge(harness.environment);
        webflow.ready();

        expect(webflow.denyUserTracking).toHaveBeenCalledOnce();
        expect(webflow.allowUserTracking).not.toHaveBeenCalled();
    });

    it('applies the latest consent received before Webflow exists', () => {
        const harness = createHarness();
        const bridge = createWebflowConsentBridge(harness.environment);
        const webflow = createWebflowApi();

        bridge.publish('deny');
        bridge.publish('allow');
        harness.setApi(webflow.api);
        harness.documentReady();
        webflow.ready();

        expect(webflow.allowUserTracking).toHaveBeenCalledOnce();
        expect(webflow.denyUserTracking).not.toHaveBeenCalled();
    });

    it('does not repeat an already applied consent choice', () => {
        const webflow = createWebflowApi();
        const harness = createHarness(webflow.api);
        const bridge = createWebflowConsentBridge(harness.environment);

        bridge.publish('allow');
        webflow.ready();
        bridge.publish('allow');
        bridge.publish('allow');

        expect(webflow.allowUserTracking).toHaveBeenCalledOnce();
        expect(webflow.allowUserTracking).toHaveBeenCalledWith({activate: true});
    });

    it('applies a later consent change without another ready callback', () => {
        const webflow = createWebflowApi();
        const harness = createHarness(webflow.api);
        const bridge = createWebflowConsentBridge(harness.environment);

        webflow.ready();
        bridge.publish('allow');
        bridge.publish('deny');

        expect(webflow.allowUserTracking).toHaveBeenCalledOnce();
        expect(webflow.denyUserTracking).toHaveBeenCalledTimes(2);
    });

    it('warns once when Webflow is still unavailable at window load', () => {
        const harness = createHarness();

        createWebflowConsentBridge(harness.environment);
        harness.windowLoad();
        harness.windowLoad();

        expect(harness.warn).toHaveBeenCalledOnce();
    });

    it('keeps a failed choice pending and deduplicates its warning', () => {
        const webflow = createWebflowApi();
        webflow.allowUserTracking.mockImplementation(() => {
            throw new Error('blocked');
        });
        const harness = createHarness(webflow.api);
        const bridge = createWebflowConsentBridge(harness.environment);

        webflow.ready();
        bridge.publish('allow');
        bridge.publish('allow');

        expect(webflow.allowUserTracking).toHaveBeenCalledTimes(2);
        expect(harness.warn).toHaveBeenCalledOnce();
    });
});
