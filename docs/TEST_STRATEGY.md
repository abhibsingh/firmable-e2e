# Test Strategy and Roadmap

## 1. Goal

Give the team a fast, trustworthy answer to one question before every release: **"Can a customer still find people and companies, get their contact details, pay the right amount of credits for them, and take the data away?"**

## 2. Risk based prioritisation

Risk = **impact** (revenue, trust, legal) × **likelihood** (change frequency, complexity, third parties).

| Area | Impact | Likelihood | Priority | Depth |
|---|---|---|---|---|
| Sign in / sign up (Clerk) | Blocks everything | Medium (3rd party, config changes) | **P0** | Smoke on every PR |
| Credits on reveal / export | Money and trust (over or under charging) | Medium | **P0** | Nightly + release, exact deduction, no double charge |
| Search + filters | Core value | High (frequent changes, AI search) | **P0** | Invariants on every PR |
| Export file correctness | Data leaves the platform, used in CRM / outreach | Medium | **P1** | Content validated, not just "downloaded" |
| Lists | Daily workflow | Medium | **P1** | Full CRUD journey |
| Profiles | Read mostly | Low | **P2** | Panel + full view |
| CRM push, signals, team settings | High for some customers | Medium | **P2** | Roadmap |

Rule of thumb: **anything that moves money, data out, or access gets the deepest coverage.**

## 3. Test pyramid for Firmable

```
            ┌──────────────┐  E2E (this repo): ~40 journeys, release gate
            │     E2E      │
          ┌─┴──────────────┴─┐  API / contract tests: credits ledger, search, export,
          │   API / contract │  CRM payloads (fast, many permutations)
        ┌─┴──────────────────┴─┐  Unit + component tests (dev owned)
        │     unit / component │
        └──────────────────────┘
```

E2E proves the journeys are wired together. Permutations (every filter, every pricing rule) belong lower, at the API layer, where they are fast and stable. This suite deliberately stays small and sharp.

## 4. How the suite fits the release process

| Stage | What runs | Blocking? | Spends credits? |
|---|---|---|---|
| **PR / preview deploy** | Unit helpers + `@smoke` minus `@credits`, against the preview URL (`base_url` input) | Yes, required check | No |
| **Merge to main → staging** | Full regression (sharded) + credits job | Yes, release candidate is not promoted on red | Yes, small and capped |
| **Nightly on staging** | Full regression + quarantine job + flaky report + cleanup | Alerts Slack, owner triages next morning | Yes, capped |
| **Production, post deploy** | Read only smoke: sign in, search, open profile. No reveal, no export, no list writes | Triggers rollback / incident if red | **Never** |

Exit criteria for a release: zero failing P0 tests, no new flaky tests in P0 areas, any known failure has a ticket and a sign off.

## 5. Flaky test strategy

**Prevent** (design rules enforced in code review):
- No `waitForTimeout`. Waits are tied to API responses, web first assertions or `expect.poll`.
- No shared mutable data. Unique names per worker, per run; tests never depend on each other's order.
- No exact counts on live data; invariants instead.
- Shared resources (credit balance) are serialised on purpose: `workers: 1` + CI concurrency group.

**Detect**:
- CI runs with `retries: 1`. A test that fails then passes is reported as **flaky**, not green.
- `scripts/flaky-report.ts` stores every result in a history file and prints the flake rate per test over the last 30 runs in the job summary.
- Optional: run new or changed specs with `--repeat-each=10` in the PR before merging (burn in).

**Respond**:
- Flake rate ≥ 5% over ≥ 10 runs → tag `@quarantine` + ticket + owner. Quarantined tests still run nightly in a non blocking job, so we know when they are fixed.
- Quarantine has an expiry: two weeks, then the test is fixed or deleted. A permanent quarantine is just a deleted test that lies.
- Root cause categories are recorded (test bug, app bug, environment, data) to spot patterns. An app bug found via flakiness (e.g. race condition in the credit badge) is a real bug, not a test problem.

## 6. Test data and environment hygiene

- Everything created is prefixed (`qa-as-…`, in CI `qa-as-ci-<run id>-…`).
- Per test cleanup in fixtures (runs even on failure) + nightly prefix based cleanup.
- Credit budget: safety floor (`MIN_CREDITS_FOR_SPEND_TESTS`), max records per test, credit tests not on PRs. Ask: an automated daily top up of the test account on staging, or a dedicated "QA" credit pool.
- Ask the dev team for: `data-testid` on key widgets, a staging API to read the credit ledger, a Clerk backend key to delete test users.

## 7. Roadmap (next 4 to 6 weeks)

| # | Item | Why now |
|---|---|---|
| 1 | Calibrate selectors and API patterns against staging, add `data-testid` with devs | Removes the main source of future flakiness |
| 2 | API client for setup / teardown (lists, users) | Faster tests, cleanup that never depends on the UI |
| 3 | Credit ledger API assertions (exact debit per action, idempotency) | Money; cheaper and more precise at API level |
| 4 | Saved + recent searches, signals | Next most used features |
| 5 | CRM push with a sandbox HubSpot / Salesforce org | High value integration, silent failures are costly |
| 6 | Team / seat management, roles and permissions | Access control risk |
| 7 | Visual regression on stable surfaces with masked dynamic regions | UI regressions that functional tests miss |
| 8 | Contract tests between frontend and search / export APIs | Catch breaking API changes before E2E |
| 9 | AI assisted exploratory runs (Stagehand style agent) on new features, findings fed back as deterministic tests | Breadth without making the gate nondeterministic |
| 10 | Dashboard: pass rate, duration and flake rate trend per area | Make quality visible to the whole team |

## 8. Metrics we would track

- Pass rate of the release gate (target: 100% green on a healthy build, no "rerun until green").
- Flake rate per test and overall (target < 1%).
- Suite duration (target: PR smoke < 5 min, regression < 15 min with 4 shards).
- Escaped defects per release in areas covered vs not covered (tells us where to automate next).
