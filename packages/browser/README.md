# @consentino/browser

Browser-only distribution of Consentino.

The package is an infrastructure scaffold and does not implement consent behavior yet.

## Integration contract

Load the final bundle as the first executable script in `<head>`, before GTM:

```html
<script
  src="/consentino.js"
  data-consent-version="2026-01"
></script>
```

Do not use `async`, `defer`, or `type="module"`. The future `<consentino>` root must declare the same consent version.
