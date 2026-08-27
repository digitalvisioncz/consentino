# Consentino

Tiny browser scripts that synchronize Cookiebot or CookieYes analytics consent with Webflow site tracking.

> [!NOTE]
> Consentino is under development. The packages are not ready for production use yet.

## Integrations

Configure Webflow to track visitors only after opt-in, then place Consentino as the first executable script in `<head>`, before CMP (CookieBot or CookieYes):

### Cookiebot

```html
<script src="https://cdn.jsdelivr.net/npm/@consentino/cookiebot"></script>
```

### CookieYes

```html
<script src="https://cdn.jsdelivr.net/npm/@consentino/cookieyes"></script>
```

## Workspace

```text
apps/web             Astro landing page
packages/core        Private Webflow consent runtime
packages/cookiebot   Public Cookiebot integration
packages/cookieyes   Public CookieYes integration
```

## Contributing

Install [proto](https://moonrepo.dev/proto), then install the pinned toolchain and dependencies:

```bash
proto install
pnpm install
```

Moon is the canonical task interface:

| Task                        | Command                       |
| --------------------------- | ----------------------------- |
| Run the website locally     | `moon run docs:dev`           |
| Build all projects          | `moon run :build`             |
| Lint                        | `moon run root:lint`          |
| Typecheck                   | `moon run root:typecheck`     |
| Run tests                   | `moon run root:test`          |
| Inspect Cookiebot package   | `moon run cookiebot:pack`     |
| Inspect CookieYes package   | `moon run cookieyes:pack`     |
| Check release configuration | `moon run root:release-check` |
| Run the affected CI graph   | `moon ci`                     |

Commit messages and pull request titles follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

## Releases

Cookiebot and CookieYes share one version and one changelog. Release Please derives releases from Conventional Commit messages after changes reach `main`.

- `fix:` creates a patch release.
- `feat:` creates a minor release.
- Before `1.0.0`, a breaking commit also creates a minor release.
- Add `Release-As: 1.0.0` to a commit body to request the first stable release.

Feature pull requests are squash-merged into `next`. The aggregated `next` branch is rebased into `main`, preserving the feature commit messages used to build the release notes.

Repository release setup:

- Add `RELEASE_PLEASE_TOKEN` as a repository secret so generated pull requests trigger CI.
- Create the `npm` environment and set `NPM_PUBLISH_ENABLED=true` only when publishing is ready.
- Configure npm trusted publishing for both packages against `digitalvisioncz/consentino`, workflow `release.yml`, and environment `npm`.
- Enable GitHub Actions to create pull requests.

## License

[MIT](LICENSE)
