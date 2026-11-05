import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { AiService } from '../ai/ai.service.js';
import { GenerateAiPracticeDto } from './dto/generate-ai-practice.dto.js';
import { CreateAiPracticeSetDto } from './dto/create-ai-practice-set.dto.js';

type PracticeMode = 'quick' | 'weak' | 'course' | 'ai';
type LessonAiContext = {
  lesson: { id: string; chapter_id: string; title: string; content: string | null; code_example: string | null; status: string };
  chapter: { id: string; course_id: string; title: string; status: string };
  course: { id: string; title: string; description: string | null; status: string };
  lessonContext: string;
};

@Injectable()
export class PracticeService {
  private readonly logger = new Logger(PracticeService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly aiService: AiService,
  ) {}

  async getOverview(userId: string) {
    const courseIds = await this.getAvailableCourseIds();
    if (courseIds.length === 0) return { courses: [], chapters: [], weakChapters: [] };

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, slug')
      .in('id', courseIds)
      .order('title');
    if (error) throw new InternalServerErrorException('Unable to load practice courses');

    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, course_id, title, description')
      .in('course_id', courseIds)
      .eq('status', 'published')
      .order('order_index');
    if (chaptersError) throw new InternalServerErrorException('Unable to load practice chapters');

    return {
      courses: data ?? [],
      chapters: chapters ?? [],
      weakChapters: await this.getWeakChapters(userId, courseIds),
    };
  }

  async getQuestions(userId: string, mode: PracticeMode, courseId?: string) {
    if (!['quick', 'weak', 'course'].includes(mode)) {
      throw new BadRequestException('Unsupported practice mode');
    }

    const courseIds = await this.getAvailableCourseIds();
    if (courseId && !courseIds.includes(courseId)) {
      throw new ForbiddenException('This course is not available');
    }

    const weakChapters = mode === 'weak'
      ? await this.getWeakChapters(userId, courseId ? [courseId] : courseIds)
      : [];
    if (mode === 'weak' && weakChapters.length === 0) return { mode, questions: [] };
    return this.loadQuestions({
      courseIds: courseId ? [courseId] : courseIds,
      chapterIds: weakChapters.map((chapter) => chapter.id),
      count: 10,
      mode,
    });
  }

  async generateAiPractice(userId: string, body: GenerateAiPracticeDto) {
    if (body.lesson_id) {
      return this.generateLessonAiPractice(userId, body);
    }

    const courseIds = await this.getAvailableCourseIds();
    if (body.course_id && !courseIds.includes(body.course_id)) {
      throw new ForbiddenException('This course is not available');
    }

    const supabase = this.supabaseService.getClient();
    let selectedChapter: { id: string; course_id: string; title: string; description: string | null } | null = null;
    if (body.chapter_id) {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, course_id, title, description')
        .eq('id', body.chapter_id)
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw new InternalServerErrorException('Unable to load practice chapter');
      if (!data || !courseIds.includes(data.course_id) || (body.course_id && data.course_id !== body.course_id)) {
        throw new ForbiddenException('This chapter is not available');
      }
      selectedChapter = data;
    }

    if (body.prompt?.trim()) {
      if (!selectedChapter) throw new BadRequestException('Select a chapter for AI practice');
      const chapter = selectedChapter;
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title, description')
        .eq('id', chapter.course_id)
        .single();
      if (courseError || !course) throw new InternalServerErrorException('Unable to load practice course');
      const courseContext = `${course.title}: ${course.description || ''}\nChapter: ${chapter.title}: ${chapter.description || ''}`;
      const count = Math.min(Math.max(body.count ?? 5, 3), 10);
      
      const aiQuestions = await this.aiService.generatePracticeQuestions(
        body.prompt,
        count,
        courseContext,
        body.difficulty ?? 'mixed',
      );
      
      if (aiQuestions.length > 0) {
        const insertedQuestionIds = [];
        
        for (const aq of aiQuestions) {
          const { data: qData, error: qError } = await supabase.from('questions').insert({
            course_id: chapter.course_id,
            chapter_id: chapter.id,
            question_type: aq.question_type,
            difficulty: aq.difficulty || 'medium',
            content: aq.content,
            explanation: aq.explanation || null,
            status: 'approved',
            is_ai_generated: true,
            generated_for_user_id: userId,
          }).select('id').single();
          
          if (qData && !qError) {
            insertedQuestionIds.push(qData.id);
            const options = (aq.options || []).map((opt: any, idx: number) => ({
              question_id: qData.id,
              option_text: opt.option_text,
              is_correct: opt.is_correct,
              order_index: opt.order_index ?? idx,
            }));
            if (options.length > 0) {
              await supabase.from('question_options').insert(options);
            }
          }
        }
        
        if (insertedQuestionIds.length > 0) {
          const { data: fetchedQuestions } = await supabase
            .from('questions')
            .select('id, course_id, chapter_id, lesson_id, question_type, difficulty, content, courses(id, title), chapters(id, title), lessons(id, title), question_options(id, option_text, order_index)')
            .in('id', insertedQuestionIds);
            
          return {
            mode: 'ai',
            difficulty: 'mixed',
            rationale: `Tạo bộ câu hỏi luyện tập dựa trên yêu cầu: "${body.prompt.substring(0, 50)}${body.prompt.length > 50 ? '...' : ''}".`,
            questions: (fetchedQuestions ?? []).map((question) => ({
              ...question,
              question_options: (question.question_options ?? [])
                .sort((left: any, right: any) => left.order_index - right.order_index)
                .map(({ id, option_text, order_index }: any) => ({ id, option_text, order_index })),
            })),
          };
        }
      }
    }

    const weakChapters = await this.getWeakChapters(userId, selectedChapter ? [selectedChapter.course_id] : body.course_id ? [body.course_id] : courseIds);
    const recentAccuracy = weakChapters.length
      ? weakChapters.reduce((sum, chapter) => sum + chapter.accuracy, 0) / weakChapters.length
      : 50;
    const difficulty = selectedChapter ? 'mixed' : await this.aiService.recommendDifficulty(recentAccuracy);
    
    const chapterIdsToLoad = selectedChapter
      ? [selectedChapter.id]
      : weakChapters.slice(0, 3).map((chapter) => chapter.id);
    const rationale = selectedChapter
      ? `Luyện tập chương ${selectedChapter.title}.`
      : weakChapters.length
        ? `Ưu tiên ${weakChapters.slice(0, 2).map((chapter) => chapter.name).join(' và ')} dựa trên kết quả gần đây.`
        : 'Chưa có đủ lịch sử làm bài, bộ câu hỏi bắt đầu ở độ khó trung bình.';

    const questions = await this.loadQuestions({
      courseIds: selectedChapter ? [selectedChapter.course_id] : body.course_id ? [body.course_id] : courseIds,
      chapterIds: chapterIdsToLoad,
      difficulty: selectedChapter ? undefined : difficulty,
      count: Math.min(Math.max(body.count ?? 10, 3), 10),
      mode: 'ai',
    });

    return {
      mode: 'ai',
      difficulty,
      rationale,
      questions,
    };
  }

  async createAiPracticeSet(userId: string, body: CreateAiPracticeSetDto) {
    const count = Math.min(Math.max(body.count ?? 5, 3), 10);
    await this.assertAiPracticeSetQuota(userId, count);
    const context = await this.loadPublishedLessonContext(body.lesson_id);
    const supabase = this.supabaseService.getClient();
    const now = new Date().toISOString();
    const { data: practiceSet, error } = await supabase
      .from('ai_practice_sets')
      .insert({
        user_id: userId,
        course_id: context.course.id,
        chapter_id: context.chapter.id,
        lesson_id: context.lesson.id,
        status: 'generating',
        difficulty: body.difficulty ?? 'mixed',
        requested_count: count,
        generated_count: 0,
        prompt: body.prompt?.trim() || null,
        error_code: null,
        attempt_count: 1,
        processing_started_at: now,
        completed_at: null,
      })
      .select('id, course_id, chapter_id, lesson_id, status, difficulty, requested_count, generated_count, created_at')
      .single();

    if (error || !practiceSet) {
      throw new InternalServerErrorException('Unable to create AI practice set');
    }

    setImmediate(() => {
      void this.processAiPracticeSet(userId, practiceSet.id, context);
    });

    return practiceSet;
  }

  async listAiPracticeSets(userId: string, chapterId: string) {
    const supabase = this.supabaseService.getClient();
    const staleBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const completedAt = new Date().toISOString();

    const { error: staleError } = await supabase
      .from('ai_practice_sets')
      .update({
        status: 'failed',
        error_code: 'AI_GENERATION_INTERRUPTED',
        completed_at: completedAt,
      })
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .eq('status', 'generating')
      .lt('processing_started_at', staleBefore);
    if (staleError) {
      throw new InternalServerErrorException('Unable to refresh AI practice sets');
    }

    const { data, error } = await supabase
      .from('ai_practice_sets')
      .select('id, course_id, chapter_id, lesson_id, status, difficulty, requested_count, generated_count, error_code, attempt_count, created_at, completed_at, lessons(id, title)')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false });
    if (error) throw new InternalServerErrorException('Unable to load AI practice sets');

    return {
      sets: (data ?? []).map((practiceSet: any) => ({
        id: practiceSet.id,
        course_id: practiceSet.course_id,
        chapter_id: practiceSet.chapter_id,
        lesson_id: practiceSet.lesson_id,
        lesson_title: Array.isArray(practiceSet.lessons)
          ? practiceSet.lessons[0]?.title ?? 'Bài học'
          : practiceSet.lessons?.title ?? 'Bài học',
        status: practiceSet.status,
        difficulty: practiceSet.difficulty,
        requested_count: practiceSet.requested_count,
        generated_count: practiceSet.generated_count,
        error_code: practiceSet.error_code,
        attempt_count: practiceSet.attempt_count,
        created_at: practiceSet.created_at,
        completed_at: practiceSet.completed_at,
      })),
    };
  }

  async getAiPracticeSetQuestions(userId: string, setId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: practiceSet, error: setError } = await supabase
      .from('ai_practice_sets')
      .select('id, course_id, chapter_id, lesson_id, status, difficulty, generated_count, lessons(id, title)')
      .eq('id', setId)
      .eq('user_id', userId)
      .maybeSingle();
    if (setError) throw new InternalServerErrorException('Unable to load AI practice set');
    if (!practiceSet) throw new NotFoundException('AI practice set not found');
    if (practiceSet.status !== 'ready') {
      throw new ConflictException('AI practice set is not ready');
    }

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, course_id, chapter_id, lesson_id, question_type, difficulty, content, created_at, courses(id, title), chapters(id, title), lessons(id, title), question_options(id, option_text, order_index)')
      .eq('ai_practice_set_id', setId)
      .eq('generated_for_user_id', userId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });
    if (questionsError) throw new InternalServerErrorException('Unable to load AI practice questions');
    if ((questions ?? []).length !== practiceSet.generated_count) {
      throw new InternalServerErrorException('AI practice set is incomplete');
    }

    return {
      mode: 'ai' as const,
      set: {
        id: practiceSet.id,
        course_id: practiceSet.course_id,
        chapter_id: practiceSet.chapter_id,
        lesson_id: practiceSet.lesson_id,
        difficulty: practiceSet.difficulty,
        lesson_title: Array.isArray(practiceSet.lessons)
          ? practiceSet.lessons[0]?.title ?? 'Bài học'
          : (practiceSet.lessons as any)?.title ?? 'Bài học',
      },
      questions: (questions ?? []).map((question: any) => ({
        ...question,
        question_options: (question.question_options ?? [])
          .sort((left: any, right: any) => left.order_index - right.order_index)
          .map(({ id, option_text, order_index }: any) => ({ id, option_text, order_index })),
      })),
    };
  }

  async retryAiPracticeSet(userId: string, setId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: failedSet, error: loadError } = await supabase
      .from('ai_practice_sets')
      .select('id, requested_count, attempt_count')
      .eq('id', setId)
      .eq('user_id', userId)
      .eq('status', 'failed')
      .maybeSingle();
    if (loadError) throw new InternalServerErrorException('Unable to load AI practice set');
    if (!failedSet) throw new NotFoundException('Failed AI practice set not found');

    await this.assertAiPracticeSetQuota(userId, failedSet.requested_count);
    const now = new Date().toISOString();
    const { data: practiceSet, error } = await supabase
      .from('ai_practice_sets')
      .update({
        status: 'generating',
        generated_count: 0,
        error_code: null,
        attempt_count: failedSet.attempt_count + 1,
        processing_started_at: now,
        completed_at: null,
      })
      .eq('id', setId)
      .eq('user_id', userId)
      .eq('status', 'failed')
      .select('id, course_id, chapter_id, lesson_id, status, difficulty, requested_count, generated_count, created_at')
      .maybeSingle();
    if (error) throw new InternalServerErrorException('Unable to retry AI practice set');
    if (!practiceSet) throw new ConflictException('AI practice set is already being processed');

    setImmediate(() => {
      void this.processAiPracticeSet(userId, setId);
    });

    return practiceSet;
  }

  private async processAiPracticeSet(
    userId: string,
    setId: string,
    preparedContext?: LessonAiContext,
  ) {
    let errorCode = 'AI_PROVIDER_UNAVAILABLE';
    try {
      const supabase = this.supabaseService.getClient();
      const { data: practiceSet, error: setError } = await supabase
        .from('ai_practice_sets')
        .select('id, user_id, lesson_id, status, difficulty, requested_count, prompt')
        .eq('id', setId)
        .eq('user_id', userId)
        .eq('status', 'generating')
        .maybeSingle();
      if (setError) throw new Error('AI_SET_LOAD_FAILED');
      if (!practiceSet) return;

      const context = preparedContext ?? await this.loadPublishedLessonContext(practiceSet.lesson_id);
      const aiQuestions = await this.aiService.generatePracticeQuestions(
        practiceSet.prompt ?? undefined,
        practiceSet.requested_count,
        context.lessonContext,
        practiceSet.difficulty,
      );

      errorCode = 'AI_PRACTICE_SAVE_FAILED';
      const { data: savedRows, error: saveError } = await supabase.rpc(
        'save_ai_practice_set_questions',
        {
          p_user_id: userId,
          p_set_id: setId,
          p_questions: aiQuestions,
        },
      );
      if (saveError || (savedRows ?? []).length !== practiceSet.requested_count) {
        throw new Error('AI_SET_SAVE_FAILED');
      }
      this.logger.log(`AI practice set ready: set=${setId}, questions=${practiceSet.requested_count}`);
    } catch (error) {
      if (error instanceof BadRequestException) errorCode = 'AI_OUTPUT_INVALID';
      await this.markAiPracticeSetFailed(userId, setId, errorCode);
      this.logger.warn(`AI practice set failed: set=${setId}, code=${errorCode}`);
    }
  }

  private async markAiPracticeSetFailed(userId: string, setId: string, errorCode: string) {
    const { error } = await this.supabaseService.getClient()
      .from('ai_practice_sets')
      .update({
        status: 'failed',
        error_code: errorCode,
        completed_at: new Date().toISOString(),
      })
      .eq('id', setId)
      .eq('user_id', userId)
      .eq('status', 'generating');
    if (error) this.logger.error(`Unable to mark AI practice set failed: set=${setId}`);
  }

  private async assertAiPracticeSetQuota(userId: string, requestedCount: number) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.supabaseService.getClient()
      .from('ai_practice_sets')
      .select('requested_count')
      .eq('user_id', userId)
      .in('status', ['generating', 'ready'])
      .gte('created_at', since);
    if (error) throw new InternalServerErrorException('Unable to check AI practice limit');
    const used = (data ?? []).reduce(
      (total: number, practiceSet: { requested_count: number }) => total + practiceSet.requested_count,
      0,
    );
    if (used + requestedCount > 50) {
      throw new HttpException('AI practice limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async loadPublishedLessonContext(lessonId: string): Promise<LessonAiContext> {
    const supabase = this.supabaseService.getClient();
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, chapter_id, title, content, code_example, status')
      .eq('id', lessonId)
      .maybeSingle();
    if (lessonError) throw new InternalServerErrorException('Unable to load lesson');
    if (!lesson || lesson.status !== 'published') {
      throw new ForbiddenException('Lesson is not available for this learner');
    }

    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('id, course_id, title, status')
      .eq('id', lesson.chapter_id)
      .maybeSingle();
    if (chapterError) throw new InternalServerErrorException('Unable to load lesson chapter');
    if (!chapter || chapter.status !== 'published') {
      throw new ForbiddenException('Lesson is not available for this learner');
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, description, status')
      .eq('id', chapter.course_id)
      .maybeSingle();
    if (courseError) throw new InternalServerErrorException('Unable to load lesson course');
    if (!course || course.status !== 'published') {
      throw new ForbiddenException('Lesson is not available for this learner');
    }

    const lessonContext = [
      `Khóa học: ${course.title}`,
      course.description ? `Mô tả khóa học: ${course.description}` : '',
      `Chương: ${chapter.title}`,
      `Bài học: ${lesson.title}`,
      `Nội dung:\n${lesson.content?.trim() || 'Bài học chưa có nội dung văn bản.'}`,
      lesson.code_example?.trim() ? `Ví dụ code:\n${lesson.code_example.trim()}` : '',
    ].filter(Boolean).join('\n\n').slice(0, 20_000);

    return { lesson, chapter, course, lessonContext };
  }

  private async generateLessonAiPractice(userId: string, body: GenerateAiPracticeDto) {
    const supabase = this.supabaseService.getClient();
    const count = Math.min(Math.max(body.count ?? 5, 3), 10);
    await this.assertAiPracticeQuota(userId, count);
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, chapter_id, title, content, code_example, status')
      .eq('id', body.lesson_id!)
      .maybeSingle();
    if (lessonError) throw new InternalServerErrorException('Unable to load lesson');
    if (!lesson || lesson.status !== 'published') {
      throw new ForbiddenException('Lesson is not available for this learner');
    }

    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('id, course_id, title, status')
      .eq('id', lesson.chapter_id)
      .maybeSingle();
    if (chapterError) throw new InternalServerErrorException('Unable to load lesson chapter');
    if (!chapter || chapter.status !== 'published') {
      throw new ForbiddenException('Lesson is not available for this learner');
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, description, status')
      .eq('id', chapter.course_id)
      .maybeSingle();
    if (courseError) throw new InternalServerErrorException('Unable to load lesson course');
    if (!course || course.status !== 'published') {
      throw new ForbiddenException('Lesson is not available for this learner');
    }

    const lessonContext = [
      `Khóa học: ${course.title}`,
      course.description ? `Mô tả khóa học: ${course.description}` : '',
      `Chương: ${chapter.title}`,
      `Bài học: ${lesson.title}`,
      `Nội dung:\n${lesson.content?.trim() || 'Bài học chưa có nội dung văn bản.'}`,
      lesson.code_example?.trim() ? `Ví dụ code:\n${lesson.code_example.trim()}` : '',
    ].filter(Boolean).join('\n\n').slice(0, 20_000);

    const aiQuestions = await this.aiService.generatePracticeQuestions(
      body.prompt,
      count,
      lessonContext,
      body.difficulty ?? 'mixed',
    );

    const { data: savedRows, error: saveError } = await supabase.rpc(
      'save_ai_practice_questions',
      {
        p_user_id: userId,
        p_lesson_id: lesson.id,
        p_questions: aiQuestions,
      },
    );
    if (saveError) throw new InternalServerErrorException('Unable to save AI practice questions');

    const questionIds = (savedRows ?? []).map((row: { id: string }) => row.id);
    if (questionIds.length !== count) {
      throw new InternalServerErrorException('Unable to save the complete AI practice set');
    }

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, course_id, chapter_id, lesson_id, question_type, difficulty, content, courses(id, title), chapters(id, title), lessons(id, title), question_options(id, option_text, order_index)')
      .in('id', questionIds)
      .eq('generated_for_user_id', userId);
    if (questionsError) throw new InternalServerErrorException('Unable to load AI practice questions');

    const order = new Map<string, number>(
      questionIds.map((id: string, index: number): [string, number] => [id, index]),
    );
    return {
      mode: 'ai' as const,
      difficulty: body.difficulty ?? 'mixed',
      rationale: `Câu hỏi được tạo riêng từ bài học “${lesson.title}”.`,
      questions: (questions ?? [])
        .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
        .map((question) => ({
          ...question,
          question_options: (question.question_options ?? [])
            .sort((left, right) => left.order_index - right.order_index)
            .map(({ id, option_text, order_index }) => ({ id, option_text, order_index })),
        })),
    };
  }

  private async assertAiPracticeQuota(userId: string, requestedCount: number) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await this.supabaseService.getClient()
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('generated_for_user_id', userId)
      .eq('is_ai_generated', true)
      .gte('created_at', since);
    if (error) throw new InternalServerErrorException('Unable to check AI practice limit');
    if ((count ?? 0) + requestedCount > 50) {
      throw new HttpException('AI practice limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async createAttempt(userId: string, body: { mode: PracticeMode; course_id?: string; total_questions: number }) {
    if (!['quick', 'weak', 'course', 'ai'].includes(body.mode)) {
      throw new BadRequestException('Unsupported practice mode');
    }

    const courseIds = await this.getAvailableCourseIds();
    if (body.course_id && !courseIds.includes(body.course_id)) {
      throw new ForbiddenException('This course is not available');
    }

    const { data, error } = await this.supabaseService.getClient()
      .from('practice_attempts')
      .insert({
        user_id: userId,
        mode: body.mode,
        course_id: body.course_id ?? null,
        total_questions: body.total_questions,
      })
      .select('id, mode, total_questions, started_at')
      .single();
    if (error || !data) throw new InternalServerErrorException('Unable to create practice attempt');
    return data;
  }

  async checkAnswer(
    userId: string,
    body: { question_id: string; option_ids?: string[]; answer_text?: string; attempt_id?: string },
  ) {
    const courseIds = await this.getAvailableCourseIds();
    const supabase = this.supabaseService.getClient();
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, course_id, question_type, explanation, generated_for_user_id')
      .eq('id', body.question_id)
      .eq('status', 'approved')
      .maybeSingle();
    if (questionError) throw new InternalServerErrorException('Unable to check answer');
    const belongsToLearner = question?.generated_for_user_id === null
      || question?.generated_for_user_id === userId;
    if (!question || !courseIds.includes(question.course_id) || !belongsToLearner) {
      throw new ForbiddenException('Question is not available for this learner');
    }

    const { data: options, error: optionsError } = await supabase
      .from('question_options')
      .select('id, option_text, is_correct')
      .eq('question_id', question.id);
    if (optionsError) throw new InternalServerErrorException('Unable to check answer');

    const correctOptionIds = (options ?? [])
      .filter((option) => option.is_correct)
      .map((option) => option.id)
      .sort();
    const selectedOptionIds = [...new Set(body.option_ids ?? [])].sort();
    const optionAnswer = correctOptionIds.length > 0
      && JSON.stringify(correctOptionIds) === JSON.stringify(selectedOptionIds);
    const fillAnswer = question.question_type === 'fill_in_blank'
      && (body.answer_text ?? '').trim().toLowerCase() === (options ?? [])
        .find((option) => option.is_correct)?.option_text.trim().toLowerCase();

    const isCorrect = question.question_type === 'fill_in_blank' ? fillAnswer : optionAnswer;
    if (body.attempt_id) {
      const { data: attempt, error: attemptError } = await supabase
        .from('practice_attempts')
        .select('id')
        .eq('id', body.attempt_id)
        .eq('user_id', userId)
        .is('completed_at', null)
        .maybeSingle();
      if (attemptError) throw new InternalServerErrorException('Unable to load practice attempt');
      if (!attempt) throw new ForbiddenException('Practice attempt is not available');

      const { error: detailError } = await supabase.from('practice_attempt_details').upsert({
        attempt_id: body.attempt_id,
        question_id: question.id,
        course_id: question.course_id,
        answer_text: body.answer_text ?? null,
        selected_option_ids: selectedOptionIds,
        is_correct: isCorrect,
      }, { onConflict: 'attempt_id,question_id' });
      if (detailError) throw new InternalServerErrorException('Unable to save practice answer');
    }

    return {
      is_correct: isCorrect,
      explanation: question.explanation,
    };
  }

  async completeAttempt(userId: string, attemptId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: attempt, error: attemptError } = await supabase
      .from('practice_attempts')
      .select('id, total_questions, completed_at')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .maybeSingle();
    if (attemptError) throw new InternalServerErrorException('Unable to load practice attempt');
    if (!attempt) throw new ForbiddenException('Practice attempt is not available');
    if (attempt.completed_at) return attempt;

    const { data: details, error: detailsError } = await supabase
      .from('practice_attempt_details')
      .select('is_correct')
      .eq('attempt_id', attemptId);
    if (detailsError) throw new InternalServerErrorException('Unable to load practice answers');

    const rows = details ?? [];
    const correctAnswers = rows.filter((detail) => detail.is_correct).length;
    const totalQuestions = Number(attempt.total_questions) || rows.length;
    const scorePercentage = totalQuestions ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2)) : 0;
    const completedAt = new Date().toISOString();

    const { data: completedAttempt, error: updateError } = await supabase
      .from('practice_attempts')
      .update({ correct_answers: correctAnswers, score_percentage: scorePercentage, completed_at: completedAt })
      .eq('id', attemptId)
      .eq('user_id', userId)
      .is('completed_at', null)
      .select('*')
      .single();
    if (updateError || !completedAttempt) throw new InternalServerErrorException('Unable to complete practice attempt');

    return { ...completedAttempt, score: correctAnswers, percentage: scorePercentage };
  }

  private async getAvailableCourseIds(): Promise<string[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('courses')
      .select('id')
      .eq('status', 'published');
    if (error) throw new InternalServerErrorException('Unable to load published courses');
    return (data ?? []).map((row) => row.id);
  }

  private async getWeakChapters(userId: string, courseIds: string[]) {
    if (courseIds.length === 0) return [];
    const supabase = this.supabaseService.getClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('id')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('started_at', since);
    if (attemptsError) throw new InternalServerErrorException('Unable to load practice history');
    const attemptIds = (attempts ?? []).map((attempt) => attempt.id);
    const { data: practiceAttempts, error: practiceAttemptsError } = await supabase
      .from('practice_attempts')
      .select('id')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('started_at', since);
    if (practiceAttemptsError) throw new InternalServerErrorException('Unable to load practice history');
    const practiceAttemptIds = (practiceAttempts ?? []).map((attempt) => attempt.id);

    const { data: quizDetails, error: detailsError } = attemptIds.length
      ? await supabase.from('quiz_attempt_details').select('question_id, is_correct').in('attempt_id', attemptIds)
      : { data: [], error: null };
    if (detailsError) throw new InternalServerErrorException('Unable to load practice results');
    const { data: practiceDetails, error: practiceDetailsError } = practiceAttemptIds.length
      ? await supabase.from('practice_attempt_details').select('question_id, is_correct').in('attempt_id', practiceAttemptIds)
      : { data: [], error: null };
    if (practiceDetailsError) throw new InternalServerErrorException('Unable to load practice results');
    const details = [...(quizDetails ?? []), ...(practiceDetails ?? [])];
    const questionIds = [...new Set(details.map((detail) => detail.question_id))];
    if (questionIds.length === 0) return [];

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, course_id, chapter_id, chapters(id, title, status)')
      .in('id', questionIds)
      .in('course_id', courseIds);
    if (questionsError) throw new InternalServerErrorException('Unable to load practice questions');
    const questionsById = new Map((questions ?? []).map((question) => [question.id, question]));
    const chapterStats = new Map<string, { name: string; total: number; correct: number }>();
    for (const detail of details) {
      const question = questionsById.get(detail.question_id);
      if (!question?.chapter_id) continue;
      const chapter = Array.isArray(question.chapters) ? question.chapters[0] : question.chapters;
      if (!chapter || chapter.status !== 'published') continue;
      const stats = chapterStats.get(question.chapter_id) ?? { name: chapter.title, total: 0, correct: 0 };
      stats.total += 1;
      if (detail.is_correct) stats.correct += 1;
      chapterStats.set(question.chapter_id, stats);
    }
    return [...chapterStats.entries()]
      .map(([id, stats]) => ({ id, name: stats.name, accuracy: Math.round((stats.correct / stats.total) * 100), attempts: stats.total }))
      .sort((left, right) => left.accuracy - right.accuracy)
      .slice(0, 8);
  }

  private async loadQuestions(filters: {
    courseIds: string[];
    chapterIds?: string[];
    difficulty?: string;
    count: number;
    mode: PracticeMode | 'ai';
  }) {
    if (filters.courseIds.length === 0) return { mode: filters.mode, questions: [] };
    const supabase = this.supabaseService.getClient();
    let query = supabase
      .from('questions')
      .select('id, course_id, chapter_id, lesson_id, question_type, difficulty, content, courses(id, title), chapters(id, title), lessons(id, title), question_options(id, option_text, order_index)')
      .eq('status', 'approved')
      .is('generated_for_user_id', null)
      .in('course_id', filters.courseIds);
    if (filters.chapterIds?.length) query = query.in('chapter_id', filters.chapterIds);
    if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
    const { data, error } = await query;
    if (error) throw new InternalServerErrorException('Unable to load practice questions');

    const questions = (data ?? []).sort(() => Math.random() - 0.5).slice(0, filters.count);
    return {
      mode: filters.mode,
      questions: questions.map((question) => ({
        ...question,
        question_options: (question.question_options ?? [])
          .sort((left, right) => left.order_index - right.order_index)
          .map(({ id, option_text, order_index }) => ({ id, option_text, order_index })),
      })),
    };
  }
}
