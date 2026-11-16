import { UnauthorizedException } from '@nestjs/common';

export function assertAccountActive(profile: { disabled_at?: string | null }) {
  if (profile.disabled_at) throw new UnauthorizedException({ error: {
    code: 'ACCOUNT_DISABLED', message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
  } });
}

/** Call only after Supabase has validated the JWT. */
export function assertTokenCurrent(profile: { revoked_before?: string | null }, token: string) {
  if (!profile.revoked_before) return;
  let issuedAt = 0;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    issuedAt = typeof payload.iat === 'number' ? payload.iat * 1000 : 0;
  } catch { /* Missing or malformed issuance time must fail closed. */ }
  if (issuedAt <= new Date(profile.revoked_before).getTime()) {
    throw new UnauthorizedException({ error: {
      code: 'SESSION_REVOKED', message: 'Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.',
    } });
  }
}
