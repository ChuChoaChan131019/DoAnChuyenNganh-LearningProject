import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

function serviceWithAuthError(code: string, message: string) {
  const createUser = vi.fn().mockResolvedValue({
    data: { user: null },
    error: { code, message, status: 422 },
  });
  const service = new AuthService({
    getClient: () => ({ auth: { admin: { createUser } } }),
  } as never);
  return { service, createUser };
}

describe('AuthService registration errors', () => {
  it('reports a weak password as a password error, even when Supabase returns 422', async () => {
    const { service } = serviceWithAuthError(
      'weak_password',
      'Password should contain at least one character of each category',
    );

    await expect(service.register('student@example.com', 'password123'))
      .rejects.toMatchObject({
        status: 400,
        response: { error: { code: 'WEAK_PASSWORD' } },
      });
  });

  it('reports an existing email only for the matching Supabase error code', async () => {
    const { service } = serviceWithAuthError('email_exists', 'A user with this email already exists');

    await expect(service.register('student@example.com', 'ValidPassword1!'))
      .rejects.toMatchObject({
        status: 409,
        response: { error: { code: 'USER_ALREADY_EXISTS' } },
      });
  });
});

describe('AuthService self-registration role', () => {
  it('creates a learner in Supabase Auth and profiles', async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'student@example.com' } },
      error: null,
    });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const service = new AuthService({
      getClient: () => ({ auth: { admin: { createUser } }, from: () => ({ upsert }) }),
    } as never);

    await expect(service.register('student@example.com', 'ValidPassword1!', 'Student'))
      .resolves.toMatchObject({ user: { role: 'learner', fullName: 'Student' } });
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({
      user_metadata: { full_name: 'Student' },
    }));
    expect(upsert).not.toHaveBeenCalled();
  });
});
