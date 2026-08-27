# Script Verifier Audit

## Goal

Make every TypeScript verifier in `scripts/` reject malformed input explicitly and report actionable errors.

## Scope

- Audit `verify-release-config.ts`, `verify-browser-bundle.ts`, and `verify-package-files.ts`.
- Fix the known `undefined` path handling in Release Please `extra-files`.
- Fix additional reproducible correctness bugs found during the audit.
- Add behavior-level regression tests for every production fix.
- Preserve current valid-input behavior and command-line interfaces.

## Constraints

- Use Moon as the canonical task interface.
- Do not weaken assertions or mutate snapshots to hide failures.
- Do not add dependencies unless a verifier cannot be tested with existing Node and Vite Plus APIs.
- Do not commit; prepare a Conventional Commit message for user review.

## Acceptance criteria

- A missing Release Please `extra-files[].path` is excluded from the normalized path list and produces a clear mismatch listing only actual string paths.
- Malformed `pnpm pack` file entries fail instead of being silently discarded; missing and extra package files are named separately.
- A failing `pnpm pack` producer cannot be masked by a successful verifier process.
- Browser bundles execute in a browser-equivalent global realm; the classic artifact is evaluated as a classic script.
- Browser verification covers delayed Webflow availability, deferred readiness, every supported CMP event in both consent states, exact tracking call transcripts, and runtime handler errors.
- Moon invalidates verifier tests and package builds when their real script, declaration, or core metadata inputs change.
- Every additional fix has a failing regression test observed before implementation.
- `moon run root:test`, `moon run root:typecheck`, `moon run root:lint`, `moon run :build`, `moon run root:release-check`, `moon run cookieyes:pack`, and `moon run cookiebot:pack` pass.
