import { HttpException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthError, User } from '@supabase/supabase-js';
import { SupabaseService } from '../../config/supabase.service.js';
import type { AccountStatusDto, CreateContentManagerDto, ListAdminAccountsDto, UpdateAdminAccountDto } from './dto/admin-account.dto.js';

const FIELDS = 'id,email,full_name,role,disabled_at,created_at,updated_at';
type Account = {
  id: string; email: string; full_name: string;
  role: 'learner' | 'content_manager' | 'admin';
  disabled_at: string | null; created_at: string; updated_at: string;
};

@Injectable()
export class AdminAccountsService {
  private readonly logger = new Logger(AdminAccountsService.name);
  constructor(private readonly supabase: SupabaseService) {}

  private fail(status: number, code: string, message: string): never {
    throw new HttpException({ error: { code, message } }, status);
  }

  private authError(error: AuthError): never {
    if (['email_exists', 'user_already_exists'].includes(error.code ?? ''))
      this.fail(409, 'USER_ALREADY_EXISTS', 'Email này đã được sử dụng.');
    if (error.code === 'weak_password')
      this.fail(400, 'WEAK_PASSWORD', 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
    if (error.code === 'email_address_invalid')
      this.fail(400, 'INVALID_EMAIL', 'Email không hợp lệ.');
    if (error.code === 'user_not_found')
      this.fail(404, 'ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản.');
    // Never log the submitted credentials or raw Auth response.
    this.logger.error(`Auth account operation failed: ${error.code ?? error.status}`);
    this.fail(503, 'ACCOUNT_OPERATION_FAILED', 'Không thể lưu tài khoản. Vui lòng tải lại danh sách và thử lại.');
  }

  private operation(actorId: string, action: string) {
    return { id: randomUUID(), actor_id: actorId, action };
  }

  async list(query: ListAdminAccountsDto) {
    const { data, error } = await this.supabase.getAdminClient().rpc('list_admin_accounts', {
      p_search: query.search, p_role: query.role, p_status: query.status,
      p_limit: query.limit, p_offset: query.offset,
    });
    if (error) this.fail(503, 'ACCOUNTS_UNAVAILABLE', 'Không thể tải danh sách tài khoản.');
    return { ...data, limit: query.limit, offset: query.offset };
  }

  async detail(id: string): Promise<Account> {
    const { data, error } = await this.supabase.getAdminClient().from('profiles')
      .select(FIELDS).eq('id', id).maybeSingle();
    if (error) this.fail(503, 'ACCOUNTS_UNAVAILABLE', 'Không thể tải thông tin tài khoản.');
    if (!data?.email) this.fail(404, 'ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản.');
    return data as Account;
  }

  private async authUser(id: string): Promise<User> {
    const { data, error } = await this.supabase.getAdminClient().auth.admin.getUserById(id);
    if (error) this.authError(error);
    if (!data.user) this.fail(404, 'ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản.');
    return data.user;
  }

  async create(dto: CreateContentManagerDto, actorId: string) {
    // The trigger validates the actor and assigns content_manager atomically.
    const { data, error } = await this.supabase.getAdminClient().auth.admin.createUser({
      email: dto.email, password: dto.password, email_confirm: true,
      user_metadata: { full_name: dto.fullName },
      app_metadata: { admin_account_operation: this.operation(actorId, 'create') },
    });
    if (error) this.authError(error);
    if (!data.user) this.fail(503, 'ACCOUNT_OPERATION_FAILED', 'Không thể tạo tài khoản.');
    return { id: data.user.id };
  }

  async update(id: string, dto: UpdateAdminAccountDto, actorId: string) {
    await this.detail(id);
    const user = await this.authUser(id);
    const { error } = await this.supabase.getAdminClient().auth.admin.updateUserById(id, {
      email: dto.email, email_confirm: true,
      user_metadata: { ...user.user_metadata, full_name: dto.fullName },
      app_metadata: { ...user.app_metadata, admin_account_operation: this.operation(actorId, 'update') },
    });
    if (error) this.authError(error);
    return { id };
  }

  async setStatus(id: string, dto: AccountStatusDto, actorId: string) {
    const target = await this.detail(id);
    const disabling = dto.status === 'disabled';
    if (disabling && id === actorId)
      this.fail(409, 'CANNOT_DISABLE_SELF', 'Bạn không thể vô hiệu hóa tài khoản đang đăng nhập.');
    if (disabling === Boolean(target.disabled_at)) return { id };
    if (disabling && target.role === 'admin') {
      const { count, error } = await this.supabase.getAdminClient().from('profiles')
        .select('id', { count: 'exact', head: true }).eq('role', 'admin').is('disabled_at', null).neq('id', id);
      if (error) this.fail(503, 'ACCOUNTS_UNAVAILABLE', 'Không thể kiểm tra tài khoản quản trị.');
      if (!count) this.fail(409, 'LAST_ACTIVE_ADMIN', 'Phải giữ ít nhất một tài khoản admin hoạt động.');
    }
    const user = await this.authUser(id);
    const { error } = await this.supabase.getAdminClient().auth.admin.updateUserById(id, {
      ban_duration: disabling ? '876000h' : 'none',
      app_metadata: { ...user.app_metadata,
        admin_account_operation: this.operation(actorId, disabling ? 'disable' : 'restore') },
    });
    if (error) this.authError(error);
    return { id };
  }
}
