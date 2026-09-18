import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly supabaseUrl: string;
  private readonly publishableKey: string;
  private readonly secretKey: string;
  private readonly jwksUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl =
      this.configService.get<string>('SUPABASE_URL') || 'https://placeholder.supabase.co';

    // SUPABASE_SECRET_KEY theo .env.example (hỗ trợ fallback SUPABASE_SERVICE_KEY)
    this.secretKey =
      this.configService.get<string>('SUPABASE_SECRET_KEY') ||
      this.configService.get<string>('SUPABASE_SERVICE_KEY') ||
      'placeholder-secret-key';

    // SUPABASE_PUBLISHABLE_KEY theo .env.example (hỗ trợ fallback SUPABASE_KEY / SUPABASE_ANON_KEY)
    this.publishableKey =
      this.configService.get<string>('SUPABASE_PUBLISHABLE_KEY') ||
      this.configService.get<string>('SUPABASE_KEY') ||
      this.configService.get<string>('SUPABASE_ANON_KEY') ||
      'placeholder-publishable-key';

    // SUPABASE_JWKS_URL theo .env.example
    this.jwksUrl =
      this.configService.get<string>('SUPABASE_JWKS_URL') ||
      (this.supabaseUrl.includes('placeholder')
        ? ''
        : `${this.supabaseUrl}/auth/v1/.well-known/jwks.json`);

    if (this.supabaseUrl.includes('placeholder') || this.supabaseUrl.includes('xxx')) {
      this.logger.warn(
        '⚠️ SUPABASE_URL / SUPABASE_SECRET_KEY chưa được cấu hình đầy đủ trong .env. Hãy cập nhật thông tin Supabase để thực hiện các thao tác database.',
      );
    }

  }

  /**
   * Tạo client backend mới cho mỗi lần gọi.
   * Không dùng singleton ở đây: signInWithPassword() sẽ gắn session vào client,
   * nếu dùng chung thì các request sau có thể vô tình dùng JWT của user thay vì secret key.
   */
  getClient(): SupabaseClient {
    return this.getAdminClient();
  }

  /** Tạo client với publishable key hoặc user token — tuân thủ RLS */
  getClientWithToken(token: string): SupabaseClient {
    return createClient(this.supabaseUrl, this.publishableKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  getSupabaseUrl(): string {
    return this.supabaseUrl;
  }

  getPublishableKey(): string {
    return this.publishableKey;
  }

  getSecretKey(): string {
    return this.secretKey;
  }

  getJwksUrl(): string {
    return this.jwksUrl;
  }

  /** Tạo fresh admin client với service_role key gắn cứng vào Authorization header
   *  — đảm bảo bypass RLS dù shared client bị contaminate bởi user token */
  getAdminClient(): SupabaseClient {
    return createClient(this.supabaseUrl, this.secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      },
    });
  }
}