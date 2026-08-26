import {createWebflowConsentBridge} from '@consentino/core';

import {registerCookieYesConsent} from './cookieyes';

registerCookieYesConsent(document, createWebflowConsentBridge(), undefined, window);
