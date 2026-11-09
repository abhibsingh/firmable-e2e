import { test, expect } from '../../src/fixtures/test';
import { env } from '../../src/config/env';

test.describe('Sign up', () => {
  test.beforeEach(async ({ signUpPage }) => {
    await signUpPage.goto();
  });

  test('new user signs up with the Clerk test code and reaches the dashboard', { tag: ['@smoke', '@auth'] }, async ({
    signUpPage,
    onboardingPage,
    appShell,
    signInPage,
    newUser,
  }) => {
    test.info().annotations.push({ type: 'test-user', description: newUser.email });

    await test.step('submit the sign up form', () => signUpPage.fillDetails(newUser));
    await test.step('enter verification code 424242', () => signUpPage.enterVerificationCode(newUser.otp));
    await test.step('skip personalisation', () => onboardingPage.complete(newUser));
    await appShell.expectSignedIn();

    await test.step('account persists: sign out and sign back in', async () => {
      await appShell.signOut();
      await signInPage.goto();
      await signInPage.signIn(newUser.email, newUser.password);
      await appShell.expectSignedIn();
    });
  });

  test('wrong verification code is rejected', { tag: ['@regression', '@auth', '@negative'] }, async ({ page, signUpPage, newUser }) => {
    await signUpPage.fillDetails(newUser);
    await signUpPage.enterVerificationCode('000000');
    await expect(signUpPage.formError).toContainText(/incorrect|invalid|wrong/i);
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test('existing email cannot sign up again', { tag: ['@regression', '@auth', '@negative'] }, async ({ signUpPage, newUser }) => {
    await signUpPage.fillDetails({ ...newUser, email: env.userEmail });
    await expect(signUpPage.formError).toContainText(/already|taken|exists/i);
  });

  test('weak password is rejected', { tag: ['@regression', '@auth', '@negative'] }, async ({ signUpPage, newUser }) => {
    await signUpPage.fillDetails({ ...newUser, password: '123' });
    await expect(signUpPage.formError).toBeVisible();
    await expect(signUpPage.otpInput).toBeHidden();
  });
});
