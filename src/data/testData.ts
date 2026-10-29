import { randomUUID } from 'crypto';
import { env } from '../config/env';

export function uniqueSuffix(workerIndex = 0): string {
  const time = Date.now().toString(36);
  const rand = randomUUID().slice(0, 6);
  return `w${workerIndex}-${time}-${rand}`;
}

export function uniqueName(kind: string, workerIndex = 0): string {
  return `${env.dataPrefix}-${kind}-${uniqueSuffix(workerIndex)}`;
}

export function clerkTestEmail(workerIndex = 0): string {
  return `${env.dataPrefix}-${uniqueSuffix(workerIndex)}+clerk_test@${env.clerkTestDomain}`;
}

export function newUserProfile(workerIndex = 0) {
  const suffix = uniqueSuffix(workerIndex);
  return {
    email: clerkTestEmail(workerIndex),
    password: `Qa!${randomUUID().slice(0, 12)}Aa9`,
    firstName: 'QA',
    lastName: `Auto ${suffix}`,
    company: `${env.dataPrefix} test co ${suffix}`,
    otp: env.clerkTestOtp,
  };
}

export type NewUser = ReturnType<typeof newUserProfile>;
