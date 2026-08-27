# Script Verifier Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all repository verifier scripts reject malformed input clearly and reliably.

**Architecture:** Keep the three scripts as standalone CLI verifiers. Exercise them through real subprocesses and controlled fixture directories or stdin so tests cover observable exit status and diagnostics rather than source structure.

**Tech Stack:** TypeScript 7, Node.js 24, Vite Plus tests, Moon.

**Spec:** `docs/superpowers/specs/2026-08-26-script-verifier-audit.md`

## Global Constraints

- Preserve each script's existing CLI and successful output.
- Add no dependency unless existing Node and Vite Plus APIs cannot express the test.
- Use `import {describe, it, expect} from "vite-plus/test"` for tests.
- Do not commit; prepare a Conventional Commit message for user review.

---

### Task 1: Audit all verifier boundaries

**Files:**
- Inspect: `scripts/verify-release-config.ts`
- Inspect: `scripts/verify-browser-bundle.ts`
- Inspect: `scripts/verify-package-files.ts`
- Inspect: `moon.yml`
- Inspect: `packages/cookiebot/moon.yml`
- Inspect: `packages/cookieyes/moon.yml`

**Interfaces:**
- Consumes: JSON files, stdin JSON, integration CLI argument, built bundle files.
- Produces: A finding list containing only reproducible correctness bugs with concrete malformed inputs and expected diagnostics.

- [ ] **Step 1: Trace every external input to its validation and comparison point**

Check missing fields, wrong primitive types, empty arrays, malformed array members, duplicates, invalid CLI values, import failures, global cleanup, and path assumptions.

- [ ] **Step 2: Separate correctness bugs from optional hardening**

Retain a finding only when an invalid input can pass verification, a valid input can fail, or diagnostics materially misrepresent the invalid value.

- [ ] **Step 3: Record one minimal reproducer per retained finding**

Specify the exact fixture or stdin payload and the expected non-zero exit plus diagnostic substring.

### Task 2: Add subprocess-level verifier test coverage

**Files:**
- Create: `scripts/verify-scripts.test.ts`
- Modify: `vite.config.ts`
- Modify: `moon.yml`

**Interfaces:**
- Consumes: Absolute verifier path, temporary working directory, optional stdin string and CLI arguments.
- Produces: `{status: number | null; stderr: string; stdout: string}` from `spawnSync(process.execPath, [script, ...args], options)`.

- [ ] **Step 1: Add the failing Release Please missing-path test**

Create a temporary repository fixture with matching package versions and an `extra-files` entry `{type: "json", jsonpath: "$.version"}` without `path`. Execute `verify-release-config.ts` in that directory and assert a non-zero status plus `Release Please version targets do not match: .` without `null`, `undefined`, or a leading empty list item.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vp test scripts/verify-scripts.test.ts`

Expected: FAIL because the current diagnostic serializes the missing path as an empty entry.

- [ ] **Step 3: Include script tests in canonical test inputs**

Add `scripts/**/*.test.{ts,tsx}` to `vite.config.ts` test `include` and `/scripts/**/*.test.{ts,tsx}` to `root:test` inputs in `moon.yml`.

- [ ] **Step 4: Add failing tests for every additional confirmed finding**

Each case must invoke the real script with the exact reproducer from Task 1 and assert its exit status and user-visible diagnostic.

### Task 3: Normalize Release Please extra-file paths

**Files:**
- Modify: `scripts/verify-release-config.ts:57-63`
- Test: `scripts/verify-scripts.test.ts`

**Interfaces:**
- Consumes: `Array<{jsonpath?: string; path?: string; type?: string}>`.
- Produces: A sorted `string[]` containing only version-target paths.

- [ ] **Step 1: Filter mapped paths with a type predicate**

After `.map(file => file.path)`, add `.filter((path): path is string => typeof path === 'string')` and replace the nullable comparator with `.sort()`.

- [ ] **Step 2: Run the focused test and verify GREEN**

Run: `pnpm exec vp test scripts/verify-scripts.test.ts`

Expected: PASS with the mismatch containing only string paths.

### Task 4: Reject malformed package manifests and diagnose set differences

**Files:**
- Modify: `scripts/verify-package-files.ts`
- Create: `scripts/verify-package-files.test.ts`

**Interfaces:**
- Consumes: `pnpm pack --dry-run --json` payload from stdin.
- Produces: A validated `string[]` path list or an explicit payload error; separate missing and unexpected path diagnostics.

- [ ] **Step 1: Write failing malformed-entry and missing-file diagnostic tests**

Run the real verifier in `packages/cookiebot` with: (a) all expected path objects plus `null`, expecting non-zero and `pnpm pack returned an unexpected payload`; and (b) the expected set without `README.md`, expecting `Missing package files: README.md`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `pnpm exec vp test scripts/verify-package-files.test.ts`

Expected: malformed entries currently pass and the missing-file diagnostic currently omits `README.md`.

- [ ] **Step 3: Validate every file entry before mapping paths**

Use `files.every(file => isRecord(file) && typeof file.path === 'string')`; throw the existing unexpected-payload error when false. Map validated paths without filtering.

- [ ] **Step 4: Report missing and unexpected paths separately**

Compute `missing = expected.filter(path => !actual.includes(path))` and `unexpected = actual.filter(path => !expected.includes(path))`. Throw a message composed only from non-empty `Missing package files: ...` and `Unexpected package files: ...` clauses.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `pnpm exec vp test scripts/verify-package-files.test.ts`

Expected: both tests pass.

### Task 5: Execute browser bundles in a faithful realm and strengthen behavior checks

**Files:**
- Modify: `scripts/verify-browser-bundle.ts`
- Create: `scripts/verify-browser-bundle.test.ts`

**Interfaces:**
- Consumes: `dist/browser.js` classic IIFE and `dist/browser.mjs` self-executing ESM bundle.
- Produces: Exact tracking-call verification in a Happy DOM realm where `globalThis === window`, plus failure on runtime errors.

- [ ] **Step 1: Add failing fixture tests for verifier blind spots**

Cover an ESM-only token in `browser.js`, browser-global access through `globalThis`, delayed `wf` installation with deferred `ready`, wrong-first/expected-last tracking calls, missing Cookiebot accept handling, payload-insensitive CMP handlers, and a handler that calls correctly then throws.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm exec vp test scripts/verify-browser-bundle.test.ts`

Expected: each broken fixture demonstrates the current false positive or false negative.

- [ ] **Step 3: Evaluate bundle source inside Happy DOM**

Read each artifact and execute it with `browser.eval`, preserving the browser realm and classic-script parsing for `browser.js`. Capture `error` events and fail verification when any runtime error is observed.

- [ ] **Step 4: Model delayed Webflow initialization**

Start without `wf`, dispatch consent before Webflow exists where relevant, install a mock whose `ready` callback is retained rather than invoked, trigger lifecycle initialization, assert zero tracking calls before readiness, invoke readiness, then assert the exact pending call.

- [ ] **Step 5: Verify exact CMP transitions**

For Cookiebot, dispatch `CookiebotOnConsentReady`, `CookiebotOnAccept`, and `CookiebotOnDecline` with both statistics values. For CookieYes, dispatch banner and update events with both analytics states. After every transition, compare the full accumulated call array, including the exact `{activate: true}` option and absence of contradictory calls.

- [ ] **Step 6: Close the window in `finally` and verify GREEN**

Run: `pnpm exec vp test scripts/verify-browser-bundle.test.ts`

Expected: all verifier fixture tests pass without leaked windows.

### Task 6: Correct Moon task dependencies and pipeline failure propagation

**Files:**
- Modify: `moon.yml`
- Modify: `packages/cookiebot/moon.yml`
- Modify: `packages/cookieyes/moon.yml`

**Interfaces:**
- Consumes: script test sources, verifier production sources, package declarations, core package metadata, and `pnpm pack` exit status.
- Produces: Correct Moon cache invalidation and non-zero pack task status when either pipeline stage fails.

- [ ] **Step 1: Capture current Moon task definitions**

Run `moon task root:test`, `moon task cookiebot:build`, `moon task cookieyes:build`, `moon task cookiebot:pack`, and `moon task cookieyes:pack`. Record that root tests omit production scripts, builds omit declaration/core metadata inputs, and pack commands omit pipeline failure propagation.

- [ ] **Step 2: Reproduce masked producer failure**

Run a controlled Bash pipeline whose producer prints a valid pack payload and exits `42`, piped into `verify-package-files.ts`. Confirm the pipeline exits `0` without `pipefail` and non-zero with `set -o pipefail`.

- [ ] **Step 3: Correct task definitions**

Add `/scripts/**/*.ts` to root test inputs. Add `browser.d.ts` and `/packages/core/package.json` to both package build inputs. Prefix both pack scripts with `set -o pipefail;` so a failing producer fails the task.

- [ ] **Step 4: Inspect corrected task definitions**

Repeat all five `moon task` commands and confirm the resolved inputs/commands now include the required values.

Ruling: do not add a source-text assertion test for declarative Moon YAML; it would be a change detector rather than behavioral coverage. The resolved Moon task graph and controlled shell failure are the verification boundaries.

### Task 7: Verify the repository and package artifacts

**Files:**
- Update generated graph: `graphify-out/`
- Review: all modified files from Tasks 2-4.

**Interfaces:**
- Consumes: Final working tree.
- Produces: Fresh successful output from every canonical check.

- [ ] **Step 1: Refresh the code graph**

Run: `graphify update .`

- [ ] **Step 2: Run core checks**

Run: `moon run root:test`, `moon run root:typecheck`, and `moon run root:lint`.

- [ ] **Step 3: Run release and package checks**

Run: `moon run :build`, `moon run root:release-check`, `moon run cookieyes:pack`, and `moon run cookiebot:pack`.

- [ ] **Step 4: Review the final diff and prepare handoff**

Run `git diff --check` and report modified files, confirmed findings, verification evidence, and a Conventional Commit message. Do not commit.
