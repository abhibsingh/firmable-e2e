import { test as base, expect } from '@playwright/test';
import { SignInPage } from '../pages/SignInPage';
import { SignUpPage } from '../pages/SignUpPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { SearchPage } from '../pages/SearchPage';
import { CompanyProfilePage } from '../pages/CompanyProfilePage';
import { PersonProfilePage } from '../pages/PersonProfilePage';
import { ListsPage } from '../pages/ListsPage';
import { AppShell } from '../components/AppShell';
import { uniqueName, newUserProfile, type NewUser } from '../data/testData';
import { env } from '../config/env';

type Cleanup = { add: (label: string, fn: () => Promise<void>) => void };

type Fixtures = {
  signInPage: SignInPage;
  signUpPage: SignUpPage;
  onboardingPage: OnboardingPage;
  searchPage: SearchPage;
  companyProfile: CompanyProfilePage;
  personProfile: PersonProfilePage;
  listsPage: ListsPage;
  appShell: AppShell;
  cleanup: Cleanup;
  uniqueName: (kind: string) => string;
  newUser: NewUser;
  list: { name: string };
  creditGuard: { balanceBefore: number };
};

export const test = base.extend<Fixtures>({
  signInPage: async ({ page }, use) => use(new SignInPage(page)),
  signUpPage: async ({ page }, use) => use(new SignUpPage(page)),
  onboardingPage: async ({ page }, use) => use(new OnboardingPage(page)),
  searchPage: async ({ page }, use) => use(new SearchPage(page)),
  companyProfile: async ({ page }, use) => use(new CompanyProfilePage(page)),
  personProfile: async ({ page }, use) => use(new PersonProfilePage(page)),
  listsPage: async ({ page }, use) => use(new ListsPage(page)),
  appShell: async ({ page }, use) => use(new AppShell(page)),

  uniqueName: async ({}, use, testInfo) => use((kind: string) => uniqueName(kind, testInfo.workerIndex)),
  newUser: async ({}, use, testInfo) => use(newUserProfile(testInfo.workerIndex)),

  cleanup: async ({}, use, testInfo) => {
    const tasks: { label: string; fn: () => Promise<void> }[] = [];
    await use({ add: (label, fn) => tasks.push({ label, fn }) });
    for (const task of tasks.reverse()) {
      try {
        await base.step(`cleanup: ${task.label}`, task.fn, { box: true });
      } catch (err) {
        // report a failed cleanup without hiding the real test result
        testInfo.annotations.push({ type: 'cleanup-failed', description: `${task.label}: ${String(err)}` });
        console.warn(`[cleanup] ${task.label} failed:`, err);
      }
    }
  },

  list: async ({ listsPage, cleanup, uniqueName }, use) => {
    const name = uniqueName('list');
    await listsPage.goto();
    await listsPage.create(name);
    cleanup.add(`delete list ${name}`, () => listsPage.deleteIfExists(name));
    await use({ name });
  },

  creditGuard: async ({ appShell, page }, use, testInfo) => {
    await page.goto('/');
    await appShell.expectSignedIn();
    const balanceBefore = await appShell.credits.read();
    testInfo.annotations.push({ type: 'credits-before', description: String(balanceBefore) });
    test.skip(
      balanceBefore < env.minCreditsForSpendTests,
      `Credit balance ${balanceBefore} below safety floor ${env.minCreditsForSpendTests}. Top up the test account.`,
    );
    await use({ balanceBefore });
  },
});

export { expect };
