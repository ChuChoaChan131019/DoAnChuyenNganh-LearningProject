import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // TODO: Implement business logic methods
}
