import {createWebflowConsentBridge} from '@consentino/core';

import {registerCookieYesConsent} from './cookieyes';

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    registerCookieYesConsent(document, createWebflowConsentBridge(), undefined, window);
}
