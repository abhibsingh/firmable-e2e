# Coverage Summary

**40 tests in 11 files by default (E2E plus 4 helper unit tests and 1 auth setup), plus 3 opt in credit tests.** Calibrated against staging.firmable.com.
Every required area has at least one negative or edge case.

Legend: ✅ automated · 🟡 automated with a documented assumption · ⏭ skipped (reason given)

## Required use cases

| # | Use case | Status | Tests | How it is verified |
|---|---|---|---|---|
| 1 | Sign up with Clerk test email + code | ✅ | `auth/sign-up.spec.ts` | Unique `+clerk_test` email, code 424242, personalisation skipped, lands on `/dashboard`, then **sign out and sign back in** with the new account |
| 1n | Sign up negatives | ✅ | same | Wrong code (000000), email already registered, weak password |
| 2 | Sign in / sign out | ✅ | `auth/sign-in.spec.ts` | Sign in, session survives reload, sign out, protected page redirects to sign in afterwards |
| 2n | Invalid credentials | ✅ | same | Wrong password, unknown email, malformed email |
| 2e | Deep link | ✅ | same | `/dashboard/list` signed out redirects to sign in and returns there after login |
| 3 | Keyword search | ✅ | `search/company-search.spec.ts`, `people-search.spec.ts` | Tab total drops below the baseline, every visible name contains the keyword |
| 3 | 2+ filters, counts make sense | ✅ | `company-search.spec.ts` | Keyword → Industry Banking → Location Sydney: each step strictly narrows, `Applied (2)`, every row shows Banking and NSW, Clear all restores the count |
| 3 | AI search | ⏭ | none | AI output varies run to run; worth a contract test on the parsed filters rather than an E2E gate |
| 3n | Search negatives | ✅ | `company-search.spec.ts` | Nonsense keyword gives 0 and an empty table with no JS error; SQL like, script and Unicode input cause no error and no dialog |
| 4 | Company quick view | ✅ | `company-search.spec.ts`, `company-profile.spec.ts` | Opens for the clicked row, links to `/dashboard/company/<id>`, closes |
| 4 | Company full view | ✅ | `company-profile.spec.ts` | Same company as the quick view, Profile tab selected, People tab present, name link and deep link land on the same profile, Back returns to search |
| 4n | Unknown company id | ✅ | same | App shell survives, no profile rendered, no JS error |
| 5 | Person quick view and full view | ✅ | `people-search.spec.ts`, `person-profile.spec.ts` | Quick view shows Show email / Show number (contacts gated), full view matches the person |
| 6 | Lists: create, rename, delete | ✅ | `lists/lists.spec.ts` | One journey with `test.step` per action, toast text asserted, cleanup registered before the first action |
| 6 | Add records to a list | ✅ | same | Two companies selected in search, list shows `Companies (2)` and both names |
| 6n | Lists negatives | ✅ | same | Blank name cannot be created; shared list does not leak into Private |
| 7 | Reveal email, credits go down | ✅ opt in | `credits/reveal.spec.ts` | Picks a person with an unrevealed email, value is a real address, balance on the credits page drops (exactly, if `EMAIL_REVEAL_COST` is set) |
| 8 | Export small set, validate file | ✅ opt in | `credits/export.spec.ts` | 2 rows selected, Tech Intelligence unticked, XLSX fetched from the Download Centre, parsed with exceljs, row count and company names match the selection, at most 1 credit per record |
| 8n | Export negative | ✅ | same | Nothing selected: Download and Add to list are disabled |

## Going beyond (extra credit) and why these

| Extra | Status | Why it was chosen |
|---|---|---|
| Accessibility (axe, WCAG 2.1 AA) on search + lists | ✅ `extras/accessibility.spec.ts` | Enterprise and public sector buyers ask for it in procurement; cheap to run on every release. Gates only on critical / serious |
| App health (no uncaught JS errors, no 5xx, sane load time) | ✅ `extras/app-health.spec.ts` | Catches broken deploys in seconds, high signal per line of code |
| Cross browser + mobile viewport smoke | ✅ opt in projects | Sales users live in Chrome, but Safari / Firefox regressions are cheap to catch at smoke depth |
| Helper unit tests | ✅ `tests/unit` | The XLSX and count parsers are test oracles; if they are wrong, export and search tests lie |
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
