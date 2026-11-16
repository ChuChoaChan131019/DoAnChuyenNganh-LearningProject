import { describe, expect, it } from 'vitest';
import { assertAccountActive, assertTokenCurrent } from './account-access.js';
const token = (iat: number) => `header.${Buffer.from(JSON.stringify({ iat })).toString('base64url')}.signature`;
describe('account access after administrative disable/restore', () => {
  it('rejects disabled accounts regardless of temporary login locks', () => {
    expect(() => assertAccountActive({ disabled_at: new Date().toISOString() })).toThrow();
    expect(() => assertAccountActive({ disabled_at: null })).not.toThrow();
  });
  it('rejects old and malformed JWT timestamps after restoration', () => {
    const profile = { revoked_before: new Date(2000000).toISOString() };
    expect(() => assertTokenCurrent(profile, token(1999))).toThrow();
    expect(() => assertTokenCurrent(profile, token(2000))).toThrow();
    expect(() => assertTokenCurrent(profile, 'bad')).toThrow();
    expect(() => assertTokenCurrent(profile, token(2001))).not.toThrow();
  });
});
