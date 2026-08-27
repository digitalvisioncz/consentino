import {createWebflowConsentBridge} from '@consentino/core';

import {registerCookiebotConsent} from './cookiebot';

if (typeof window !== 'undefined') {
    registerCookiebotConsent(window, createWebflowConsentBridge());
}
