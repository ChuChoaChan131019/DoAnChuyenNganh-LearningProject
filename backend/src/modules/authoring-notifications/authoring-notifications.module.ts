import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../config/supabase.module.js';
import { AuthoringNotificationsController } from './authoring-notifications.controller.js';
import { AuthoringNotificationsService } from './authoring-notifications.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [AuthoringNotificationsController],
  providers: [AuthoringNotificationsService],
})
export class AuthoringNotificationsModule {}
