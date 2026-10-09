import {
  checkPasswordStrength,
  generateStrongPassword,
  isPasswordStrong,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './password';

describe('checkPasswordStrength', () => {
  it('accepts a password that meets every rule', () => {
    expect(checkPasswordStrength('Abcdef1!')).toEqual({
      valid: true,
      failures: [],
    });
    expect(isPasswordStrong('Abcdef1!')).toBe(true);
  });

  it('rejects anything shorter than the minimum', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(checkPasswordStrength('Ab1!aaa').failures).toContain('length');
    expect(isPasswordStrong('Ab1!aaa')).toBe(false);
  });

  it('rejects anything longer than the bcrypt truncation limit', () => {
    expect(PASSWORD_MAX_LENGTH).toBe(72);
    const overlong = `Ab1!${'a'.repeat(72)}`;
    expect(overlong.length).toBe(76);
    expect(checkPasswordStrength(overlong).failures).toContain('length');
  });

  it.each([
    ['no lowercase', 'ABCD123!'],
    ['no uppercase', 'abcd123!'],
    ['no digit', 'abcDEFgh!'],
    ['no symbol', 'Abcdefgh1'],
  ])('rejects a password with %s', (_label, value) => {
    const { valid, failures } = checkPasswordStrength(value);
    expect(valid).toBe(false);
    expect(failures.length).toBeGreaterThanOrEqual(1);
  });

  it('reports every failing rule at once', () => {
    expect(checkPasswordStrength('ab').failures).toEqual(
      expect.arrayContaining(['length', 'uppercase', 'digit', 'symbol']),
    );
    expect(checkPasswordStrength('abcdef').failures).toEqual(
      expect.arrayContaining(['length', 'uppercase', 'digit', 'symbol']),
    );
    expect(checkPasswordStrength('Abcdefgh').failures).toEqual([
      'digit',
      'symbol',
    ]);
  });

  it('treats a non-string as weak instead of throwing', () => {
    expect(checkPasswordStrength(undefined as unknown as string).valid).toBe(
      false,
    );
    expect(checkPasswordStrength(null as unknown as string).valid).toBe(false);
  });
});

describe('generateStrongPassword', () => {
  it('always produces a password that passes its own policy', () => {
    for (let i = 0; i < 500; i++) {
      const password = generateStrongPassword();
      expect({ index: i, strong: isPasswordStrong(password) }).toEqual({
        index: i,
        strong: true,
      });
    }
  });

  it('honours the requested length', () => {
    expect(generateStrongPassword(8)).toHaveLength(8);
    expect(generateStrongPassword(32)).toHaveLength(32);
  });

  it('clamps a too-short request up to the policy minimum', () => {
    expect(generateStrongPassword(4)).toHaveLength(PASSWORD_MIN_LENGTH);
    expect(isPasswordStrong(generateStrongPassword(4))).toBe(true);
    expect(generateStrongPassword(0)).toHaveLength(PASSWORD_MIN_LENGTH);
  });

  it('contains no ambiguous characters', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateStrongPassword(32)).not.toMatch(/[0O1lI]/);
    }
  });

  it('does not emit the same password twice', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(generateStrongPassword());
    expect(seen.size).toBe(500);
  });

  it('shuffles so required classes are not pinned to fixed positions', () => {
    const firstPositions = new Set<string>();
    for (let i = 0; i < 200; i++) {
      firstPositions.add(generateStrongPassword()[0]);
    }
    expect(firstPositions.size).toBeGreaterThan(1);
  });
});
