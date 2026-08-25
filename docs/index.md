---
layout: home

hero:
  name: Consentino
  text: Local cookie consent web components
  tagline: A framework-agnostic browser library for Google Consent Mode v2.
---

## Project status

The repository currently contains the monorepo, build, documentation, and release foundation. Consent runtime behavior will be implemented in the next phase.

## Development

```bash
moon run docs:dev
moon run :build
moon run root:lint
moon run root:typecheck
moon run root:test
moon ci
```
