import { Module } from '@nestjs/common';

import { SupabaseModule } from '../../config/supabase.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

import { DiscussionPostsController } from './discussion-posts.controller.js';
import { DiscussionPostsService } from './discussion-posts.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [DiscussionPostsController],
  providers: [
    DiscussionPostsService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [DiscussionPostsService],
})
export class DiscussionModule {}