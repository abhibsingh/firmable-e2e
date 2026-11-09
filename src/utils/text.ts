export function parseCount(text: string | null | undefined): number {
  if (!text) return Number.NaN;
  const match = text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([kKmM])?/);
  if (!match) return Number.NaN;
  const base = Number.parseFloat(match[1]);
  const unit = match[2]?.toLowerCase();
  if (unit === 'k') return Math.round(base * 1_000);
  if (unit === 'm') return Math.round(base * 1_000_000);
  return base;
}

/** "Companies (2,066,723)" -> 2066723 */
export function parseTabCount(text: string | null | undefined): number {
  const match = (text ?? '').match(/\(([\d,]+)\)/);
  return match ? Number(match[1].replace(/,/g, '')) : Number.NaN;
}

export const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
export const PHONE_REGEX = /\+?\d[\d\s().-]{6,}\d/;
export const MASKED_REGEX = /\*{2,}|•{2,}|x{3,}/i;
