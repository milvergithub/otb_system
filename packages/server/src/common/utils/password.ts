import { randomInt } from 'crypto';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export type PasswordRule =
  'length' | 'lowercase' | 'uppercase' | 'digit' | 'symbol';

export const PASSWORD_RULES: PasswordRule[] = [
  'length',
  'lowercase',
  'uppercase',
  'digit',
  'symbol',
];

const SYMBOL_CLASS = '!@#$%^&*()-_=+[]{};:,.?/';

/**
 * bcrypt silently truncates input at 72 bytes, so anything longer creates a
 * password that looks stronger than it is. Rejecting overlong input keeps the
 * stored hash honest.
 */
const LENGTH_MAX_MET = (value: string) =>
  value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH;

const CLASS_PATTERNS: Record<Exclude<PasswordRule, 'length'>, RegExp> = {
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
  symbol: /[^a-zA-Z0-9]/,
};

/**
 * Returns the individual rules a password fails so callers can surface
 * every unmet requirement instead of a single opaque "too weak" error.
 */
export function checkPasswordStrength(value: string): {
  valid: boolean;
  failures: PasswordRule[];
} {
  const failures: PasswordRule[] = [];

  if (typeof value !== 'string' || !LENGTH_MAX_MET(value)) {
    failures.push('length');
  }

  if (typeof value === 'string') {
    for (const rule of PASSWORD_RULES) {
      if (rule === 'length') continue;
      if (!CLASS_PATTERNS[rule].test(value)) failures.push(rule);
    }
  }

  return { valid: failures.length === 0, failures };
}

export function isPasswordStrong(value: string): boolean {
  return checkPasswordStrength(value).valid;
}

/**
 * Digits/letters that read like one another when transcribed over the phone.
 * Dropping them costs a little entropy but the strings are handed to humans
 * out of band, so legibility matters more here than the raw keyspace.
 */
const AMBIGUOUS = '0O1lI';

function ambiguousFree(source: string): string[] {
  return [...source].filter((char) => !AMBIGUOUS.includes(char));
}

const POOLS = {
  lowercase: ambiguousFree('abcdefghijklmnopqrstuvwxyz'),
  uppercase: ambiguousFree('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
  digit: ambiguousFree('0123456789'),
  symbol: [...SYMBOL_CLASS],
} as const;

const ALL_POOLS = [
  ...POOLS.lowercase,
  ...POOLS.uppercase,
  ...POOLS.digit,
  ...POOLS.symbol,
];

function pick(pool: readonly string[]): string {
  return pool[randomInt(pool.length)];
}

/**
 * Produces a password that is guaranteed to pass `checkPasswordStrength`: one
 * character is drawn from each required class up front, the remainder from the
 * full pool, then the whole string is shuffled so the guaranteed characters
 * never sit at predictable positions.
 */
export function generateStrongPassword(length = 16): string {
  const size = Math.max(length, PASSWORD_MIN_LENGTH);

  const chars = [
    pick(POOLS.lowercase),
    pick(POOLS.uppercase),
    pick(POOLS.digit),
    pick(POOLS.symbol),
  ];

  while (chars.length < size) {
    chars.push(pick(ALL_POOLS));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
