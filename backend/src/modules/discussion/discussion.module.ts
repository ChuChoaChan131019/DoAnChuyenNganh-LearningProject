import { Module } from '@nestjs/common';

import { SupabaseModule } from '../../config/supabase.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

import { DiscussionPostsController } from './discussion-posts.controller.js';
import { DiscussionPostsService } from './discussion-posts.service.js';
import { DiscussionCommentsController } from './discussion-comments.controller.js';
import { DiscussionCommentsService } from './discussion-comments.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [DiscussionPostsController, DiscussionCommentsController],
  providers: [
    DiscussionPostsService,
    DiscussionCommentsService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [DiscussionPostsService, DiscussionCommentsService],
})
export class DiscussionModule {}
