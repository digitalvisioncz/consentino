## Golden rules
- Be brief. Use the fewest words possible to get your point across.
- Be specific. Avoid vague language; provide concrete details.
- Be direct. Say what you mean without unnecessary qualifiers or hedging.
- Never commit code by yourself, even if other skills tell you to. Only prepare commit and message, then ask me to review and commit. I will do the final commit to ensure consistency in style, message, and branch management.
- Prepared commit messages and pull request titles must follow Conventional Commits 1.0.0 using one of: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `perf`, or `revert`.

## Checks (clean-shield toolchain)
Moon is the canonical task interface. Do not add root `pnpm dev`/`build`/`lint`/`test` aliases.

- Development: `moon run docs:dev`.
- Build all projects: `moon run :build`.
- Typecheck: `moon run root:typecheck`.
- Lint: `moon run root:lint`. Auto-fix the underlying tools with `pnpm exec oxlint . --fix`, `pnpm exec oxfmt "**/*.{js,jsx,ts,tsx,mjs,cjs,mts}" "*.{js,jsx,ts,tsx,mjs,cjs,mts}"`, and `pnpm exec stylelint "**/*.{css,scss}" --fix --allow-empty-input`.
- Node tests: `moon run root:test`. Test imports: `import {describe, it, expect} from "vite-plus/test"`.
- Package inspection: `moon run browser:pack`.
- CI task graph: `moon ci`.
- JavaScript and TypeScript formatting is owned by Oxfmt; CSS and SCSS formatting remains owned by Stylelint.
- Do not use `vp lint` or `vp fmt`; invoke the pinned Oxlint and Oxfmt packages directly.
- Root `vite.config.ts` only configures the test runner; `vite.config.js` is a gitignored compiled artifact — never edit or commit it.

## Handling test/lint/ts failures
- Don't spend turns proving a failure isn't from your change. Establish a baseline ONCE (`git stash` → run → `git stash pop`, or check a file you didn't touch), then move on.
- A failure in code you didn't touch: fix it only if the cause is clear and the fix is local. Do NOT mutate golden snapshots, loosen assertions, or change a viewport to make a red go green — that masks WIP bugs. Flag it instead (`spawn_task`) and keep going.
- For a self-contained pre-existing failure worth fixing now, dispatch a subagent to fix it in isolation so it doesn't derail the current task.

## graphify
This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
