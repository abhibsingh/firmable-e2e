import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true } as dotenv.DotenvConfigOptions);

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required env var "${name}". Copy .env.example to .env (locally) or add it as a GitHub secret (CI).`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

function int(name: string, fallback: number): number {
  const raw = optional(name, String(fallback));
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) throw new Error(`Env var "${name}" must be an integer, got "${raw}"`);
  return parsed;
}

export const env = {
  baseUrl: optional('BASE_URL', 'https://staging.firmable.com'),
  isCI: !!process.env.CI,

  get userEmail(): string {
    return required('FIRMABLE_USER_EMAIL');
  },
  get userPassword(): string {
    return required('FIRMABLE_USER_PASSWORD');
  },

  dataPrefix: optional('TEST_DATA_PREFIX', 'qa-as'),
  clerkTestDomain: optional('CLERK_TEST_EMAIL_DOMAIN', 'example.com'),
  clerkTestOtp: optional('CLERK_TEST_OTP', '424242'),
  minCreditsForSpendTests: int('MIN_CREDITS_FOR_SPEND_TESTS', 5),
  maxCreditRecords: int('MAX_CREDIT_RECORDS', 2),
  emailRevealCost: process.env.EMAIL_REVEAL_COST ? int('EMAIL_REVEAL_COST', 1) : undefined,
  phoneRevealCost: process.env.PHONE_REVEAL_COST ? int('PHONE_REVEAL_COST', 1) : undefined,
} as const;

export const STORAGE_STATE = path.resolve(__dirname, '../../.auth/user.json');
