import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../config/supabase.module.js';
import { UserNotificationsController } from './user-notifications.controller.js';
import { UserNotificationsService } from './user-notifications.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [UserNotificationsController],
  providers: [UserNotificationsService],
})
export class UserNotificationsModule {}
