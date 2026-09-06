import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SupabaseModule } from './config/supabase.module.js';
import { ContentGatewayModule } from './gateways/content-gateway.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module.js';
import { StudyPlansModule } from './modules/study-plans/study-plans.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { RemindersModule } from './modules/reminders/reminders.module.js';
import { NotesModule } from './modules/notes/notes.module.js';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module.js';
import { LearningHistoryModule } from './modules/learning-history/learning-history.module.js';
import { FeedbacksModule } from './modules/feedbacks/feedbacks.module.js';
import { MessagesModule } from './modules/messages/messages.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { AiModule } from './modules/ai/ai.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SupabaseModule,
    ContentGatewayModule,
    AuthModule,
    UsersModule,
    EnrollmentsModule,
    StudyPlansModule,
    TasksModule,
    RemindersModule,
    NotesModule,
    BookmarksModule,
    LearningHistoryModule,
    FeedbacksModule,
    MessagesModule,
    NotificationsModule,
    EventsModule,
    AiModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
