import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../config/supabase.module.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
