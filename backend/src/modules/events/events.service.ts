import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // TODO: Implement business logic methods
}
