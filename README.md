# Consentino

Consentino connects analytics consent from Cookiebot or CookieYes to Webflow site tracking, so Webflow follows the choice visitors make in your existing cookie banner.

## Why Consentino?

We built Consentino after encountering the same gap on client Webflow sites. We wanted to use Webflow's native analytics while respecting visitor privacy and GDPR requirements. But neither Webflow nor the consent management platforms offered a native connection. Making them work together meant researching both systems and writing custom integration code for every project.

Consentino packages that integration into small, production-ready browser scripts. It listens for analytics consent and tells Webflow to allow or deny tracking—both when the page loads and whenever a visitor changes their choice. You keep your existing consent banner and add one script for the platform you use.

Consentino does not replace your consent management platform or determine your legal requirements. It synchronizes the analytics consent collected by your platform with Webflow site tracking.

## Integrations

1. Open your site in Webflow.
2. Go to **Insights → Settings → Tracking**.
3. Turn on **Start tracking visitor behavior data** and select **Don't track by default**. This keeps tracking off until a visitor gives consent. See [Webflow's tracking settings guide](https://help.webflow.com/hc/en-us/articles/33620965657107-Analyze-Optimize-tracking-settings) for more details.
4. Go to **Site settings → Custom code → Head code**.
5. Choose the integration you use and paste its script at the top of the **Head code** field, before your Cookiebot or CookieYes script.

#### Cookiebot

```html
<script src="https://cdn.jsdelivr.net/npm/@consentino/cookiebot"></script>
```

#### CookieYes

```html
<script src="https://cdn.jsdelivr.net/npm/@consentino/cookieyes"></script>
```

6. Click **Save changes**, then publish the site. Custom code only takes effect after publishing. See [Webflow's custom code guide](https://help.webflow.com/hc/en-us/articles/33961357265299-Custom-code-in-head-and-body-tags) if you need help finding the **Head code** field.

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

Commit messages and pull request titles follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

## License

[MIT](LICENSE)
