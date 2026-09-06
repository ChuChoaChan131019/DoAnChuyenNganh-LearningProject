import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async register(
    email: string,
    password: string,
    role: string,
    fullName?: string,
  ): Promise<{ user: { id: string; email: string; role: string; fullName?: string } }> {
    // Chặn đăng ký admin qua API
    if (role === 'admin') {
      throw new HttpException(
        { error: { code: 'FORBIDDEN', message: 'Cannot register as admin' } },
        HttpStatus.FORBIDDEN,
      );
    }

    if (!['learner', 'content_manager'].includes(role)) {
      throw new HttpException(
        { error: { code: 'INVALID_ROLE', message: 'Invalid role' } },
        HttpStatus.BAD_REQUEST,
      );
    }

    const supabase = this.supabaseService.getClient();

    // Tạo user trên Supabase Auth (truyền role vào user_metadata để trigger handle_new_user nhận diện đúng)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        ...(fullName ? { full_name: fullName } : {}),
      },
    });

    if (authError || !authData?.user) {
      const errorMessage = authError?.message || 'Registration failed';
      this.logger.error(`Registration failed: ${errorMessage}`);

      const isDuplicate =
        errorMessage.toLowerCase().includes('already') ||
        (authError as any)?.status === 422;

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

    // Đồng bộ profile trong bảng profiles (dùng upsert để tương thích an toàn cả khi có trigger tự động insert)
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: authData.user.id,
        role,
        failed_login_attempts: 0,
      },
      { onConflict: 'id' },
    );

    if (profileError) {
      this.logger.error(`Profile creation failed: ${profileError.message}`);
      // Rollback: xóa profile và user vừa tạo
      try {
        await supabase.from('profiles').delete().eq('id', authData.user.id);
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (rollbackErr: any) {
        this.logger.warn(`Failed to rollback user ${authData.user.id}: ${rollbackErr?.message}`);
      }

      throw new HttpException(
        { error: { code: 'FAILED_TO_CREATE_PROFILE', message: 'Failed to create profile' } },
        HttpStatus.INTERNAL_SERVER_ERROR,
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

    // Kiểm tra tài khoản bị khóa
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
      throw new HttpException(
        { error: { code: 'ACCOUNT_LOCKED', message: 'Account is temporarily locked. Try again later.' } },
        HttpStatus.LOCKED,
      );
    }

    // Đăng nhập qua Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Tăng failed_login_attempts
      if (profile) {
        const attempts = (profile.failed_login_attempts || 0) + 1;
        const updateData: any = { failed_login_attempts: attempts };

        if (attempts >= 5) {
          updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }

        await supabase
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
      await supabase
        .from('profiles')
        .update({ failed_login_attempts: 0, locked_until: null })
        .eq('id', data.user.id);
    }

    return {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      user: { id: data.user?.id, email: data.user?.email },
    };
  }

  async logout(token: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    await supabase.auth.admin.signOut(token);
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
