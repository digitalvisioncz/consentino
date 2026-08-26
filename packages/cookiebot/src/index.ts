import {createWebflowConsentBridge} from '@consentino/core';

import {registerCookiebotConsent} from './cookiebot';

registerCookiebotConsent(window, createWebflowConsentBridge());
