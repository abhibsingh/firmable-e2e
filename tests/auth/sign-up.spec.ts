import { test, expect } from '../../src/fixtures/test';
import { env } from '../../src/config/env';

test.describe('Sign up', () => {
  test.beforeEach(async ({ signUpPage }) => {
    await signUpPage.goto();
  });

  test('new user signs up, verifies email and completes onboarding', { tag: ['@smoke', '@auth'] }, async ({
    page,
    signUpPage,
    onboardingPage,
    appShell,
    signInPage,
    newUser,
  }) => {
    test.info().annotations.push({ type: 'test-user', description: newUser.email });

    await test.step('submit sign up form', async () => {
      await signUpPage.fillDetails(newUser);
    });

    await test.step('enter Clerk test verification code', async () => {
      await signUpPage.enterVerificationCode(newUser.otp);
    });

    await test.step('complete onboarding', async () => {
      const steps = await onboardingPage.complete(newUser);
      test.info().annotations.push({ type: 'onboarding-steps', description: String(steps) });
    });

    await test.step('lands in the app as the new user', async () => {
      await appShell.expectSignedIn();
    });

    await test.step('account persists: sign out and sign back in', async () => {
      await appShell.signOut();
      await signInPage.signIn(newUser.email, newUser.password);
      await appShell.expectSignedIn();
      await expect(page).not.toHaveURL(/onboarding/);
    });
  });

  test('wrong verification code is rejected', { tag: ['@regression', '@auth', '@negative'] }, async ({ signUpPage, newUser }) => {
    await signUpPage.fillDetails(newUser);
    await signUpPage.enterVerificationCode('000000');
    await expect(signUpPage.formError).toContainText(/incorrect|invalid|wrong/i);
  });

  test('cannot sign up with an email that already exists', { tag: ['@regression', '@auth', '@negative'] }, async ({ signUpPage, newUser }) => {
    await signUpPage.fillDetails({ ...newUser, email: env.userEmail });
    await expect(signUpPage.formError).toContainText(/already|taken|exists/i);
  });

  test('weak password is rejected', { tag: ['@regression', '@auth', '@negative'] }, async ({ signUpPage, newUser }) => {
    test.skip(!(await signUpPage.password.isVisible()), 'Password step not shown in this Clerk config (passwordless)');
    await signUpPage.fillDetails({ ...newUser, password: '123' });
    await expect(signUpPage.formError).toBeVisible();
    await expect(signUpPage.otpInput).toBeHidden();
  });
});
