import { chromium } from '@playwright/test';
import { env } from '../src/config/env';
import { SignInPage } from '../src/pages/SignInPage';
import { AppShell } from '../src/components/AppShell';
import { ListsPage } from '../src/pages/ListsPage';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: env.baseUrl });
  const page = await context.newPage();
  let deleted = 0;
  try {
    const signIn = new SignInPage(page);
    await signIn.goto();
    await signIn.signIn(env.userEmail, env.userPassword);
    await new AppShell(page).expectSignedIn();

    const lists = new ListsPage(page);
    await lists.goto();
    const ours = lists.listRows.filter({ hasText: new RegExp(`^\\s*${env.dataPrefix}`) });

    for (let i = 0; i < 200 && (await ours.count()) > 0; i++) {
      const name = (await ours.first().innerText()).split('\n')[0].trim();
      console.log(`deleting list: ${name}`);
      await lists.delete(name);
      deleted++;
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
