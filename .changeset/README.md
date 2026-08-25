# Changesets

Every pull request that changes a publishable package should include a changeset:

```bash
pnpm exec changeset
```

Choose the affected package, semantic-version impact, and a concise changelog entry. GitHub Actions collects these files into the release pull request; version files are not edited manually.
