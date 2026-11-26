import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SupabaseModule } from './config/supabase.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { CoursesModule } from './modules/courses/courses.module.js';
import { QuestionsModule } from './modules/questions/questions.module.js';
import { PracticeModule } from './modules/practice/practice.module.js';
import { QuizzesModule } from './modules/quizzes/quizzes.module.js';
import { CodeExercisesModule } from './modules/code-exercises/code-exercises.module.js';
import { DiscussionModule } from './modules/discussion/discussion.module.js';
import { StatisticsModule } from './modules/statistics/statistics.module.js';
import { AdminAccountsModule } from './modules/admin-accounts/admin-accounts.module.js';
import { LearnerOverviewModule } from './modules/learner-overview/learner-overview.module.js';
import { AuthoringNotificationsModule } from './modules/authoring-notifications/authoring-notifications.module.js';
import { UserNotificationsModule } from './modules/user-notifications/user-notifications.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SupabaseModule,
    AuthModule,
    AiModule,
    CoursesModule,
    QuestionsModule,
    PracticeModule,
    QuizzesModule,
    CodeExercisesModule,
    DiscussionModule,
    StatisticsModule,
    AdminAccountsModule,
    LearnerOverviewModule,
    AuthoringNotificationsModule,
    UserNotificationsModule,
    CatalogModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
