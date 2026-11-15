import { Module } from '@nestjs/common';

import { SupabaseModule } from '../../config/supabase.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

import { DiscussionPostsController } from './discussion-posts.controller.js';
import { DiscussionPostsService } from './discussion-posts.service.js';

import { DiscussionCommentsController } from './discussion-comments.controller.js';
import { DiscussionCommentsService } from './discussion-comments.service.js';

import { DiscussionHelpfulController } from './discussion-helpful.controller.js';
import { DiscussionHelpfulService } from './discussion-helpful.service.js';
import { AdminDiscussionReportsController, LearnerDiscussionReportsController } from './discussion-reports.controller.js';
import { DiscussionReportsService } from './discussion-reports.service.js';

@Module({
  imports: [SupabaseModule],

  controllers: [
    DiscussionPostsController,
    DiscussionCommentsController,
    DiscussionHelpfulController,
    LearnerDiscussionReportsController,
    AdminDiscussionReportsController,
  ],

  providers: [
    DiscussionPostsService,
    DiscussionCommentsService,
    DiscussionHelpfulService,
    DiscussionReportsService,
    JwtAuthGuard,
    RolesGuard,
  ],

  exports: [
    DiscussionPostsService,
    DiscussionCommentsService,
    DiscussionHelpfulService,
  ],
})
export class DiscussionModule {}
