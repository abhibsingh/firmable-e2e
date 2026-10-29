import { test as setup } from '../../src/fixtures/test';
import { env, STORAGE_STATE } from '../../src/config/env';

setup('authenticate as the shared test user', async ({ page, signInPage, appShell }) => {
  await signInPage.goto();
  await signInPage.signIn(env.userEmail, env.userPassword);
  await appShell.expectSignedIn();
  await page.context().storageState({ path: STORAGE_STATE });
});
