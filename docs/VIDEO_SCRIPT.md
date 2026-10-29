# Walkthrough Video Plan (10 minutes max)

Record with QuickTime / Loom at 1080p, terminal font 16pt+, browser zoom 110%.

| Time | Segment | What to show | What to say (key points) |
|---|---|---|---|
| 0:00 to 0:45 | Intro | README top section | Goal: a release gate that is reliable, debuggable and safe for shared staging. Playwright + TS and why not an AI tool for the gate |
| 0:45 to 3:30 | Suite running end to end | `npm run test:smoke` then `npx playwright test` in the terminal, then the HTML report | Projects (setup, auth, app, credits), tags, parallel workers, credits serial. Point at annotations: credits before / spent, filter counts, attached CSV |
| 3:30 to 6:30 | A failing test and how to debug it | Temporarily break one assertion, e.g. in `export.spec.ts` change `toHaveLength(n)` to `toHaveLength(n + 1)` (or break a locator in `ListsPage`), run that file | Open the report → failing step → error message → open trace → step through actions, DOM snapshot, Network tab, Console. Show the video and screenshot. Fix, rerun green. Mention: in CI the same trace is in the uploaded artifact |
| 6:30 to 9:15 | Code walkthrough | `playwright.config.ts` → `src/fixtures/test.ts` → one page object + one component → `reveal.spec.ts` → CI workflows | Page objects expose intent, components reused (SidePanel), cleanup fixture runs even on failure, no sleeps (`actAndWaitForResponse`, `expect.poll`), credit guard and "no double charge" rule, sharding + merged report + Slack + quarantine |
| 9:15 to 10:00 | Wrap up | `docs/COVERAGE.md`, `docs/TEST_STRATEGY.md` | What is covered, what was skipped and why, top 3 roadmap items |

Tips: rehearse once, keep the failing test change ready in a git stash, and close Slack / notifications before recording.
