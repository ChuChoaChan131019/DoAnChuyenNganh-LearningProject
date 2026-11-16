import { Injectable, HttpException, HttpStatus, Logger, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { assertAccountActive, assertTokenCurrent } from '../../common/guards/account-access.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async register(
    email: string,
    password: string,
    fullName?: string,
  ): Promise<{ user: { id: string; email: string; role: string; fullName?: string } }> {
    const role = 'learner';

    const supabase = this.supabaseService.getClient();

    // The Auth trigger creates a learner profile atomically; metadata cannot choose a role.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : {},
    });

    if (authError || !authData?.user) {
      const errorMessage = authError?.message || 'Registration failed';
      this.logger.error(`Registration failed: ${errorMessage}`);

      const authCode = authError?.code;
      const isDuplicate = authCode === 'email_exists' || authCode === 'user_already_exists';

      if (authCode === 'weak_password' || errorMessage.toLowerCase().startsWith('password should contain')) {
        throw new HttpException(
          {
            error: {
              code: 'WEAK_PASSWORD',
              message: 'Mật khẩu cần có ít nhất 8 ký tự, gồm chữ thường, chữ hoa, số và ký tự đặc biệt.',
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (isDuplicate) {
        throw new HttpException(
          { error: { code: 'USER_ALREADY_EXISTS', message: 'Email already registered' } },
          HttpStatus.CONFLICT,
        );
      }

      throw new HttpException(
        { error: { code: 'REGISTRATION_FAILED', message: errorMessage } },
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email ?? email,
        role,
        ...(fullName ? { fullName } : {}),
      },
    };
  }

  async login(email: string, password: string): Promise<any> {
    const supabase = this.supabaseService.getClient();

    // Indexed lookup covers every account, not just the first Auth API page.
    const { data: profile, error: lookupError } = await supabase.from('profiles')
      .select('*').eq('email', email.trim().toLowerCase()).maybeSingle();
    if (lookupError) throw new HttpException('Không thể kiểm tra tài khoản.', HttpStatus.SERVICE_UNAVAILABLE);
    if (profile) assertAccountActive(profile);

    if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
      throw new HttpException(
        { error: { code: 'ACCOUNT_LOCKED', message: 'Account is temporarily locked. Try again later.' } },
        HttpStatus.LOCKED,
      );
    }

    // Đăng nhập qua Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });

    if (error) {
      // Tăng failed_login_attempts
      if (profile && profile.id) {
        const attempts = (profile.failed_login_attempts || 0) + 1;
        const updateData: any = { failed_login_attempts: attempts };

        if (attempts >= 5) {
          updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }

        await this.supabaseService.getAdminClient()
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id);
      }

      throw new HttpException(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Đăng nhập thành công — reset counter
    if (data.user) {
      await this.supabaseService.getAdminClient()
        .from('profiles')
        .update({ failed_login_attempts: 0, locked_until: null })
        .eq('id', data.user.id);
    }

    // Re-read after authentication so a concurrent ban/role change takes effect.
    const { data: currentProfile, error: profileError } = await this.supabaseService.getAdminClient()
      .from('profiles').select('*').eq('id', data.user.id).single();
    if (profileError || !currentProfile) throw new UnauthorizedException('User profile not found');
    assertAccountActive(currentProfile);
    assertTokenCurrent(currentProfile, data.session?.access_token ?? '');

    return {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        role: currentProfile.role,
        fullName: data.user?.user_metadata?.full_name ?? '',
      },
    };
  }

  async logout(token: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    await supabase.auth.admin.signOut(token);
  }

  async refreshSession(refreshToken: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    const { data: profile, error: profileError } = await this.supabaseService.getAdminClient().from('profiles')
      .select('role,disabled_at,revoked_before').eq('id', data.user.id).single();
    if (profileError || !profile) {
      throw new UnauthorizedException('User profile not found');
    }
    assertAccountActive(profile);
    assertTokenCurrent(profile, data.session.access_token);

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile.role,
        fullName: data.user.user_metadata?.full_name ?? '',
      },
    };
  }

  async getMe(userId: string): Promise<any> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    return data;
  }
}
