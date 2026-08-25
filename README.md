# Consentino

Framework-agnostic cookie consent web components with Google Consent Mode v2 support.

> [!NOTE]
> Consentino is currently under development. The package is not ready for production use yet.

Consentino is designed for marketing websites that use Google Tag Manager and Google Analytics 4. It will provide a small, synchronous browser script that can be placed before GTM as the first executable script in `<head>`.

## Features

- Default-denied Google Consent Mode v2 flow.
- Necessary, analytics and preferences, and marketing consent groups.
- Declarative web components built with Atomico.
- First-party, host-only consent cookie.
- DOM custom events and `dataLayer` events.
- Styling through documented `--consentino-*` CSS custom properties.
- No framework or browser polyfills required.

## Browser package

`@consentino/browser` will contain the complete classic browser bundle: early Consent Mode initialization, persisted consent handling, and web component registration.

The intended integration is a synchronous script placed before GTM:

```html
<head>
  <script
    src="/path/to/consentino.js"
    data-consent-version="2026-01"
  ></script>

  <!-- Google Tag Manager follows Consentino. -->
</head>
```

The page will then declare its consent UI with Consentino custom elements:

```html
<consentino consent-version="2026-01">
  <consentino-banner>
    <consentino-description>
      We use cookies to improve this website and show relevant content.
    </consentino-description>

    <consentino-actions>
      <consentino-action action="accept-all">Accept all</consentino-action>
      <consentino-action action="reject-optional">Reject optional</consentino-action>
      <consentino-action action="open-preferences">Preferences</consentino-action>
    </consentino-actions>
  </consentino-banner>
</consentino>
```

See the [full documentation](https://digitalvisioncz.github.io/consentino/) for architecture and the evolving public API.

## Contributing

### Local setup

Install [proto](https://moonrepo.dev/proto), then install the pinned toolchain and workspace dependencies:

```bash
proto install
pnpm install
```

Moon is the canonical task interface:

| Task | Command |
| --- | --- |
| Run documentation locally | `moon run docs:dev` |
| Build all projects | `moon run :build` |
| Lint | `moon run root:lint` |
| Typecheck | `moon run root:typecheck` |
| Run tests | `moon run root:test` |
| Inspect the browser package | `moon run browser:pack` |
| Run the affected CI graph | `moon ci` |

### Commits and pull requests

Commit messages and pull request titles follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>[optional scope][!]: <description>
```

Examples:

```text
feat(browser): add consent state serialization
fix(docs): correct the head script example
refactor!: remove the deprecated event payload
```

Allowed types are `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `perf`, and `revert`. Use `!` for a breaking change and explain it in the commit or pull request body.

Before opening a pull request:

1. Run `moon ci`.
2. Run `moon run browser:pack` when changing the published package.
3. Add a Changeset for a user-visible package change with `pnpm exec changeset`.
4. Use a Conventional Commit title for the pull request.

Pull requests should be squash-merged using their title as the resulting commit message. GitHub Actions validates every pull request title.

## License

[MIT](LICENSE)
