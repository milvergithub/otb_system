import en from '../../locales/en';
import es from '../../locales/es';
import { ERROR_CODES, errorKey } from './error-codes';

type Catalogue = Record<string, unknown>;

function leafKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value as Catalogue).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

const placeholders = (value: string) =>
  (value.match(/\{\{\s*[^{}]+?\s*\}\}/g) ?? [])
    .map((p) => p.replace(/\s+/g, ''))
    .sort()
    .join(',');

describe('error code registry', () => {
  const enErrors = en.errors as unknown as Record<string, string>;
  const esErrors = es.errors as unknown as Record<string, string>;

  it('declares a stable code for every documented error', () => {
    expect(ERROR_CODES.length).toBeGreaterThan(0);
    for (const code of ERROR_CODES) {
      expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });

  it('derives every catalogue key from the wire code', () => {
    expect(errorKey('MEMBER_NOT_FOUND')).toBe('errors.MEMBER_NOT_FOUND');
  });

  it.each(ERROR_CODES)('has an English message for %s', (code) => {
    expect(enErrors[code]).toBeTruthy();
  });

  it.each(ERROR_CODES)('has a Spanish message for %s', (code) => {
    expect(esErrors[code]).toBeTruthy();
  });

  it('has no catalogue entry without a matching code (catches drift)', () => {
    const orphans = Object.keys(enErrors).filter(
      (key) => !ERROR_CODES.includes(key as never),
    );
    expect(orphans).toEqual([]);
  });

  it('keeps both languages in exact key parity', () => {
    expect(Object.keys(esErrors).sort()).toEqual(Object.keys(enErrors).sort());
  });

  it.each(ERROR_CODES)(
    'uses the same placeholders in both languages for %s',
    (code) => {
      expect(placeholders(esErrors[code])).toBe(placeholders(enErrors[code]));
    },
  );

  it('is actually translated, not copied over', () => {
    // Sanity check that the Spanish catalogue is not just the English one.
    const identical = ERROR_CODES.filter(
      (code) => enErrors[code] === esErrors[code],
    );
    expect(identical).toEqual([]);
  });
});

describe('server catalogues', () => {
  it('covers every class-validator constraint used in the DTOs', () => {
    const used = [
      'isString',
      'isNumber',
      'isInt',
      'isPositive',
      'isBoolean',
      'isEmail',
      'isUuid',
      'isDateString',
      'isArray',
      'arrayNotEmpty',
      'isNotEmpty',
      'isEnum',
      'isIn',
      'minLength',
      'maxLength',
      'min',
      'max',
      'matches',
      'match',
      'isStrongPassword',
    ];
    const catalogue = en.validation as unknown as Record<string, string>;

    for (const constraint of used) {
      expect(catalogue[constraint]).toBeTruthy();
    }
  });

  it('keeps every namespace in exact key parity across languages', () => {
    for (const namespace of leafKeys(en)) {
      const prefix = namespace.split('.')[0];
      if (namespace !== prefix) continue;
      expect(leafKeys(es, prefix).sort()).toEqual(leafKeys(en, prefix).sort());
    }
  });
});
