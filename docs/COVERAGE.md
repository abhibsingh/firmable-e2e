# Coverage Summary

**41 E2E tests (13 tagged `@smoke`) + 1 auth setup + 4 helper unit tests, across 13 files.**
Every required area has at least one negative or edge case.

Legend: ✅ automated · 🟡 automated with a documented assumption · ⏭ skipped (reason given)

## Required use cases

| # | Use case | Status | Tests | How it is verified |
|---|---|---|---|---|
| 1 | Sign up with Clerk test email + code, through onboarding | ✅ | `auth/sign-up.spec.ts` | Unique `+clerk_test` email, code 424242, onboarding driven to the app shell, then **sign out and sign back in** with the new account to prove it persisted and onboarding does not repeat |
| 1n | Sign up negatives | ✅ | same | Wrong code (000000), email already registered, weak password |
| 2 | Sign in / sign out | ✅ | `auth/sign-in.spec.ts` | Sign in, session survives reload, sign out, protected page redirects to sign in afterwards |
| 2n | Invalid credentials | ✅ | same | Wrong password (error shown, still on sign in), unknown email, malformed email |
| 2e | Deep link | ✅ | same | Visiting `/lists` signed out redirects to sign in and returns to `/lists` after login |
| 3 | Keyword search | ✅ | `search/company-search.spec.ts` | Results > 0, count ≤ unfiltered baseline, keyword persists after reload |
| 3 | AI search | 🟡 | same | Results > 0; AI derived filter chips visible (soft assertion, AI output may vary) |
| 3 | 2+ filters, counts make sense | ✅ | company + people search specs | Count never increases as filters are added, rows honour the location filter, rows on page ≤ total, clearing filters restores baseline |
| 3n | Search negatives | ✅ | same | Nonsense keyword shows empty state with no error, SQL like / script / whitespace / Unicode input causes no 5xx and no script execution, contradictory filters show empty state |
| 4 | Company profile: side panel | ✅ | `profiles/company-profile.spec.ts` | Opens for the clicked row, key fields visible, search context kept, switching rows updates the panel, Escape closes it |
| 4 | Company profile: full view | ✅ | same | Same company as the panel, key sections render, URL stable on reload, people tab lists employees |
| 4n | Company profile negative | ✅ | same | Unknown id shows not found instead of crashing |
| 5 | People profile: side panel | ✅ | `profiles/person-profile.spec.ts` | Opens for the clicked row, contact details gated behind reveal (not leaked) |
| 5 | People profile: full view | ✅ | same | Same person, title present, company link navigates to the company profile |
| 5n | People profile negative | ✅ | same | Unknown id shows not found |
| 6 | Lists: create, add, rename, remove, delete | ✅ | `lists/lists.spec.ts` | One journey with `test.step` per action, exact record names asserted after add and remove, cleanup registered before the first action |
| 6n | Lists negatives | ✅ | same | Empty name, duplicate name, 300 character name, adding the same record twice does not duplicate it |
| 7 | Reveal email, credits go down | ✅ | `credits/reveal.spec.ts` | Picks an **unrevealed** contact, value matches email format and is unmasked, balance drops (exactly, if `EMAIL_REVEAL_COST` is set), UI balance matches server after reload |
| 7 | Reveal phone | ✅ | same | Phone format, balance drops |
| 7e | No double charge | ✅ | same | Reopening the same contact shows the value with no reveal button and **no further deduction** |
| 7n | Insufficient credits | ✅ | same | Mocked 402 from the reveal API: friendly message, contact stays hidden, balance untouched, zero real credits spent |
| 8 | Export small set, validate file | ✅ | `credits/export.spec.ts` | 2 selected rows, CSV parsed, headers present, row count == selection, names == selected names, no corrupted cells, file attached to the report |
| 8n | Export negative | ✅ | same | Nothing selected: button disabled or explains, never downloads everything |

## Going beyond (extra credit) and why these

| Extra | Status | Why it was chosen |
|---|---|---|
| Accessibility (axe, WCAG 2.1 AA) on search + lists | ✅ `extras/accessibility.spec.ts` | Enterprise and public sector buyers ask for it in procurement; cheap to run on every release. Gates only on critical / serious |
| App health (no uncaught JS errors, no 5xx, sane load time) | ✅ `extras/app-health.spec.ts` | Catches broken deploys in seconds, high signal per line of code |
| Cross browser + mobile viewport smoke | ✅ opt in projects | Sales users live in Chrome, but Safari / Firefox regressions are cheap to catch at smoke depth |
| Helper unit tests | ✅ `tests/unit` | The CSV and count parsers are test oracles; if they are wrong, export and search tests lie |
| Flaky trend report | ✅ `scripts/flaky-report.ts` | Makes retry passes visible instead of hiding them |
| Prefix cleanup script | ✅ `scripts/cleanup-stale-data.ts` | Shared staging stays clean even after crashed runs |

## Skipped or deferred, and why

| Item | Reason |
|---|---|
| Saved and recent searches, signals | Lower risk than the money and data paths; first items on the roadmap |
| CRM push | Needs a sandbox CRM (HubSpot / Salesforce dev org) to assert the record arrived; planned with a contract test |
| Settings / team management | Needs a second seat and admin rights on staging; requires coordination with the team |
| Visual regression | Search results change daily, so screenshots would be noisy. Planned for stable surfaces only (sign in, empty states, profile layout with masked dynamic regions) |
| API level setup / teardown | API is not documented in the brief. Design is ready: fixtures call a `FirmableApi` client instead of the UI for list creation and cleanup once endpoints are confirmed |
| Load, performance, security testing | Explicitly out of scope for staging per the brief. Only a soft load time signal is recorded |
| Deleting sign up accounts | Needs Clerk backend access; accounts are prefixed for bulk purge |
