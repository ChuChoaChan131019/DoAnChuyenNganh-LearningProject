import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // TODO: Implement business logic methods
}
