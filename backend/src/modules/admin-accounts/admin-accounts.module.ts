import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../config/supabase.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AdminAccountsController } from './admin-accounts.controller.js';
import { AdminAccountsService } from './admin-accounts.service.js';

@Module({ imports: [SupabaseModule], controllers: [AdminAccountsController],
  providers: [AdminAccountsService, JwtAuthGuard, RolesGuard] })
export class AdminAccountsModule {}
