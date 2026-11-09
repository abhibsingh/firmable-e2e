import { chromium } from '@playwright/test';
import { env } from '../src/config/env';
import { SignInPage } from '../src/pages/SignInPage';
import { AppShell } from '../src/components/AppShell';
import { ListsPage } from '../src/pages/ListsPage';

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ baseURL: env.baseUrl })).newPage();
  let deleted = 0;
  try {
    const signIn = new SignInPage(page);
    await signIn.goto();
    await signIn.signIn(env.userEmail, env.userPassword);
    await new AppShell(page).expectSignedIn();

    const lists = new ListsPage(page);
    const ours = page.locator(`a[data-elements^="${env.dataPrefix}-"]`);
    for (const tab of [lists.privateTab, lists.sharedTab]) {
      for (let i = 0; i < 100; i++) {
        await lists.goto();
        await tab.click();
        if ((await ours.count()) === 0) break;
        const name = (await ours.first().getAttribute('data-elements')) ?? '';
        console.log(`deleting list: ${name}`);
        await lists.delete(name);
        deleted++;
      }
    }
    console.log(`cleanup done: ${deleted} list(s) removed with prefix "${env.dataPrefix}"`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('cleanup failed (non fatal for the pipeline):', err);
  process.exitCode = 0;
});
