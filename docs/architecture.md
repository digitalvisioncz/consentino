# Repository architecture

Consentino is a pnpm workspace orchestrated by Moon.

| Project | Path | Responsibility |
| --- | --- | --- |
| `root` | `/` | Shared quality, tests, versioning, and releases |
| `browser` | `/packages/browser` | Publishable synchronous browser bundle |
| `docs` | `/docs` | VitePress documentation and GitHub Pages artifact |

## Browser integration contract

The production bundle is a classic IIFE. It must be the first executable script in `<head>` so the future runtime can establish Google Consent Mode defaults before GTM.

```html
<script
  src="/consentino.js"
  data-consent-version="2026-01"
></script>
```

Do not add `async`, `defer`, or `type="module"`. The later `<consentino consent-version="2026-01">` root in `<body>` must use the same version; the runtime will reject a mismatch.
