# Findings on staging.firmable.com

Issues the suite surfaced while running against staging. Each one is covered by a test so it stays visible.

| # | Area | Finding | Severity | Test |
|---|---|---|---|---|
| F1 | Profiles | Opening `/dashboard/company/<unknown id>` renders a blank page: no navigation, no user menu, no "not found" message. The user has no way back except the browser. | Medium | `profiles/company-profile.spec.ts` (marked `test.fail` until fixed) |
| F2 | Accessibility | axe (WCAG 2.1 AA) reports on search and lists: `html-has-lang` (page has no `lang`), `color-contrast`, `nested-interactive` (overlay buttons inside clickable rows), and on lists `button-name` (critical: icon buttons without a label). | Medium | `extras/accessibility.spec.ts` (existing ones baselined, new ones fail) |
| F3 | Auth | Clerk lockout and rate limiting are aggressive: repeated sign in attempts locked the test account, and repeated sign ups from one machine return "Your account has been temporarily locked" even for brand new emails. Good for security, but it means automated runs need a dedicated account for negative login tests and should keep sign ups per run low. | Info | `auth/*` (wrong password test only runs against `LOCKOUT_CANARY_EMAIL`) |
| F4 | Export | The export dialog ticks "Include Tech Intelligence" by default, which costs up to 5 extra credits per company. Easy to overspend without noticing. | Low (UX / billing) | `credits/export.spec.ts` unticks it |
| F5 | Lists | After "Create" succeeds, the page refetches and an empty "Create new list" dialog opens again on its own. The success toast is often lost in the refresh. A user may think the list was not created and create it twice. | Medium | `lists/lists.spec.ts` (create is verified through the API call and the list appearing) |
