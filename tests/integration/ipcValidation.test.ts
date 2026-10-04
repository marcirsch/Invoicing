import { describe, expect, it } from 'vitest';
import { isTrustedSenderUrl } from '../../src/main/security/trustedSender';
import { customerSchema } from '../../src/shared/validation/customerValidation';
import { settingsSchema } from '../../src/shared/validation/settingsValidation';
import { defaultSettings } from '../../src/shared/domain/settingsDefaults';

describe('IPC boundary validation', () => {
  it('accepts only the exact packaged renderer document', () => {
    const expected = 'file:///application/out/renderer/index.html';
    expect(isTrustedSenderUrl(expected, undefined, expected)).toBe(true);
    expect(
      isTrustedSenderUrl(
        'file:///elsewhere/renderer/index.html',
        undefined,
        expected,
      ),
    ).toBe(false);
    expect(
      isTrustedSenderUrl('https://example.test/', undefined, expected),
    ).toBe(false);
  });
  it('limits development IPC to the configured renderer origin', () => {
    expect(
      isTrustedSenderUrl(
        'http://127.0.0.1:5173/',
        'http://127.0.0.1:5173/',
        '',
      ),
    ).toBe(true);
    expect(
      isTrustedSenderUrl(
        'http://localhost:5173/',
        'http://127.0.0.1:5173/',
        '',
      ),
    ).toBe(false);
    expect(
      isTrustedSenderUrl('https://example.test/', 'http://127.0.0.1:5173/', ''),
    ).toBe(false);
  });
  it('rejects invalid settings and customer payloads', () => {
    expect(
      customerSchema.safeParse({
        id: '1',
        name: '',
        email: 'bad',
        phone: '',
        address: {},
      }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({ ...defaultSettings, currency: 'USD' }).success,
    ).toBe(false);
  });
});
