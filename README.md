# Firmable E2E Suite

End to end release suite for the Firmable web app, built with **Playwright + TypeScript**.
It covers the journeys that matter most to a paying customer (sign up, sign in, search, profiles, lists, reveal, export) and is designed to run on every release: smoke on pull requests, full regression nightly and before release.

> Design priorities, in order: **reliable** (no flakiness, no sleeps, isolated data), **debuggable** (trace, video, screenshot and annotations on every failure), **maintainable** (one place to change a selector, a route or a config value), and **safe for shared staging** (credit budget, prefixed data, guaranteed cleanup).

| Doc | What's in it |
|---|---|
| [docs/COVERAGE.md](docs/COVERAGE.md) | Every required use case, how it is tested, what was skipped and why |
| [docs/TEST_STRATEGY.md](docs/TEST_STRATEGY.md) | Risk model, flaky test strategy, release process, roadmap |
| [docs/VIDEO_SCRIPT.md](docs/VIDEO_SCRIPT.md) | Outline of the 10 minute walkthrough video |

---

## 1. Quick start

```bash
# Node 20+
npm ci
npx playwright install --with-deps chromium

cp .env.example .env          # then fill in FIRMABLE_USER_EMAIL / FIRMABLE_USER_PASSWORD
npm test                      # everything
```

| Command | What it runs |
|---|---|
| `npm run test:smoke` | `@smoke` tests only (13 E2E journeys plus helper checks, a few minutes) |
| `npm run test:regression` | Everything except `@quarantine` |
| `npx playwright test --project=credits` | Only the credit spending tests (serial) |
| `npx playwright test --grep @lists` | One feature area by tag |
| `npm run test:headed` | Watch it run in a real browser, one worker |
| `npm run test:ui` | Playwright UI mode (time travel debugging) |
| `npm run report` | Open the last HTML report |
| `npm run trace -- test-results/<test>/trace.zip` | Open a trace |
| `npm run cleanup` | Delete any leftover data with our prefix |
| `CROSS_BROWSER=1 npm run test:smoke` | Smoke on Chromium, Firefox, WebKit and a mobile viewport |

Secrets are **never** committed: `.env` is gitignored, CI reads GitHub Actions secrets. A missing secret fails fast with a readable message (see `src/config/env.ts`).

---

## 2. Project structure

```
.
├── playwright.config.ts        # projects, reporters, retries, trace/video policy
├── .env.example                # every config knob, documented
├── src/
│   ├── config/
│   │   ├── env.ts              # typed, validated env (single source of truth)
│   │   └── routes.ts           # app routes + API URL patterns used for waits
│   ├── pages/                  # Page Objects: one per screen, expose INTENT
│   │   ├── BasePage.ts         # shared waits: actAndWaitForResponse, clickWithOptionalConfirm
│   │   ├── SignInPage.ts  SignUpPage.ts  OnboardingPage.ts
│   │   ├── SearchPage.ts  CompanyProfilePage.ts  PersonProfilePage.ts
│   │   └── ListsPage.ts
│   ├── components/             # UI pieces reused across pages (composition)
│   │   ├── AppShell.ts  CreditBalance.ts  FilterPanel.ts
│   │   ├── ResultsTable.ts  SidePanel.ts  ContactReveal.ts
│   ├── fixtures/test.ts        # custom fixtures: page objects, cleanup registry, list, creditGuard
│   ├── data/                   # unique data factory + stable search inputs
│   └── utils/                  # CSV parser, count parser, regexes
├── tests/
│   ├── unit/                   # browserless tests for the helpers above
│   ├── setup/auth.setup.ts     # sign in once, save storageState
│   ├── auth/                   # sign up, sign in, sign out (no stored session)
│   ├── search/  profiles/  lists/
│   ├── credits/                # reveal + export (serial, credit guarded)
│   └── extras/                 # accessibility (axe), app health
├── scripts/
│   ├── flaky-report.ts         # flake rate trend + quarantine candidates
│   └── cleanup-stale-data.ts   # prefix based safety net cleanup
└── .github/workflows/
    ├── pr-smoke.yml            # PR gate
    └── nightly-regression.yml  # sharded regression, merged report, Slack, cleanup
```

### Playwright projects

| Project | Purpose | Parallel | Session |
|---|---|---|---|
| `unit` | Helper tests (CSV, counts, data factory) | yes | none |
| `setup` | Signs in once, writes `.auth/user.json` | n/a | creates it |
| `auth` | Sign up, sign in, sign out, invalid credentials | yes | **fresh** (no cookies) |
| `app` | Search, profiles, lists, a11y, health | yes | stored session |
| `credits` | Reveal + export | **no, `workers: 1`** | stored session |
| `firefox-smoke`, `webkit-smoke`, `mobile-smoke` | Opt in with `CROSS_BROWSER=1` | yes | stored session |

### Tags

`@smoke` (release critical, fast) · `@regression` (full depth) · `@negative` · `@quarantine` (excluded from gating) · plus area tags `@auth @search @profile @lists @credits @export @a11y @health @unit @mobile`.

---

## 3. Key decisions (and why)

**1. Playwright + TypeScript over AI driven tools (Stagehand, TesterArmy).**
The suite is a release gate, so it has to be deterministic and debuggable. Playwright gives auto waiting, web first assertions, traces with DOM snapshots and network logs, fixtures, projects and sharding out of the box. AI agents are useful for exploratory testing and for drafting tests, but a gate that can "decide" differently on two runs is the opposite of what a release needs. Roadmap item: use an AI agent for exploratory sweeps and for suggesting locator fixes, never as the oracle.

**2. Sign in once, reuse the session.**
`setup` signs in through the real UI and saves `storageState`. Every other project starts signed in. Faster, and if login breaks, one clear failure is reported instead of forty confusing ones. The UI login itself is still fully covered in `tests/auth`.

**3. Credits are treated as money.**
- A separate `credits` project with `workers: 1`, plus a CI concurrency group, so two runs never spend the shared balance at the same time (that would make "balance went down by N" race).
- `creditGuard` fixture reads the balance first and **skips** (with a reason in the report) if it is under `MIN_CREDITS_FOR_SPEND_TESTS`.
- Each test touches at most `MAX_CREDIT_RECORDS` records (default 2).
- The reveal test picks a contact that is **not yet revealed**, because revealing again is free and would make the deduction check flaky.
- It also asserts the most important billing rule: revealing the same contact again does **not** charge twice.
- "Insufficient credits" is tested with network mocking (`page.route` returns 402), so it costs nothing.
- Credit spending tests do **not** run on every PR, only nightly and on release.

**4. Search asserts invariants, not numbers.**
Staging data changes, so exact counts would be flaky by design. Instead: a filter never increases the count, rows honour the filter, the page never shows more rows than the total, clearing filters restores the baseline, and the empty state appears for nonsense input.

**5. Isolated, self cleaning test data.**
Every name and email is `TEST_DATA_PREFIX + worker index + time + random` (e.g. `qa-as-list-w2-lx3k9-a1b2c3`). Tests create what they need and register teardown in a LIFO `cleanup` fixture that runs **even when the test fails**. A nightly prefix based cleanup script is the safety net. In CI the prefix includes the run id, so cleanup only touches that run's data.

**6. No sleeps anywhere.**
Waits are tied to real signals: `waitForResponse` on the API that the action triggers, web first assertions, `expect.poll` for values that update asynchronously (credit badge), and `Promise.race` between "confirm dialog appears" and "API responded" for flows that may or may not ask for confirmation.

**7. Locators: accessible first.**
Order of preference: `getByRole` / `getByLabel` → `data-testid` → stable attributes (Clerk's `name=`). They live only in page objects and components, so a UI change is a one file fix. Where the app lacks good hooks, the suggestion to the dev team is to add `data-testid` on: results table, results count, credit balance, side panel, list rows.

**8. Debuggability built in.**
On failure: trace (`retain-on-failure`), video, screenshot. Specs use `test.step` so the report reads like a user journey. Business data is attached as annotations (credits before / spent, counts at each filter step, the revealed person, the exported CSV file itself), so a failure explains itself without rerunning.

---

## 4. Reporting

- **HTML report** in `reports/html` with steps, screenshots, videos, traces and attachments.
- **JUnit XML** (`reports/junit`) for any CI dashboard.
- **JSON** (`reports/json`) feeds `scripts/flaky-report.ts` (flake rate over the last 30 runs).
- In CI, shards produce blob reports that are **merged into one HTML report**, uploaded as an artifact, published to GitHub Pages, and linked in a Slack message.

### Debugging a failure (what the video shows)

1. Open the HTML report (`npm run report`), click the red test.
2. Read the failing `test.step` and the assertion message (they are written as requirements).
3. Open the **trace**: step through actions, inspect the DOM snapshot before/after, check the **Network** tab (was the API a 4xx/5xx? slow?) and **Console** for JS errors.
4. Check annotations (e.g. `credits-before`, `counts`) for the business context.
5. Reproduce locally with `npx playwright test <file>:<line> --headed` or `--debug`.

---

## 5. CI (GitHub Actions)

| Workflow | Trigger | Scope |
|---|---|---|
| `pr-smoke.yml` | every PR to `main` | typecheck + test discovery + `@smoke` minus `@credits` |
| `nightly-regression.yml` | weekdays 01:17 Sydney, or manual with a custom `base_url` | 4 shards (unit, auth, app) + serial credits job + non blocking quarantine job + merged report + flaky summary + Slack + cleanup |

Required secrets: `FIRMABLE_USER_EMAIL`, `FIRMABLE_USER_PASSWORD`. Optional: `SLACK_WEBHOOK_URL`, repo variable `BASE_URL`.

---

## 6. Known limitations and assumptions

- Selectors were written against Clerk's standard components and common patterns; a short calibration pass against staging (with the trace viewer / codegen) is expected for app specific screens. All of them live in `src/pages` and `src/components`.
- API URL patterns in `src/config/routes.ts` are intentionally broad and should be tightened after one look at the Network tab.
- Sign up creates real (test mode) accounts on staging; they carry the prefix so they can be purged. If Firmable exposes a Clerk backend key for staging, teardown can delete them via API (roadmap).
- The negative sign in test makes one failed attempt per run against the shared account. If Clerk lockout thresholds are low, point it at a dedicated "lockout canary" account instead.
- If export produces XLSX instead of CSV, add a parser (`exceljs`) behind `readCsvFile`'s interface; the test logic stays the same.
