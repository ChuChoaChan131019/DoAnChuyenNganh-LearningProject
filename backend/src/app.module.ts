import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SupabaseModule } from './config/supabase.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { CoursesModule } from './modules/courses/courses.module.js';
import { QuestionsModule } from './modules/questions/questions.module.js';
import { PracticeModule } from './modules/practice/practice.module.js';
import { QuizzesModule } from './modules/quizzes/quizzes.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SupabaseModule,
    AuthModule,
    AiModule,
    CategoriesModule,
    CoursesModule,
    QuestionsModule,
    PracticeModule,
    QuizzesModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
