import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import {
  ConfigureQuizQuestionsDto,
  QuestionDto,
  QuestionStatus,
} from './dto/question.dto.js';
import { SaveAiDraftBatchDto } from './dto/ai-draft.dto.js';
import {
  getQuestionValidationErrors,
  type QuestionValidationInput,
} from './question-validation.js';

@Injectable()
export class QuestionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async countPendingReview() {
    const { count, error } = await this.supabaseService
      .getClient()
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('status', QuestionStatus.DRAFT)
      .is('generated_for_user_id', null)
      .not('submitted_for_review_at', 'is', null);
    this.throwQueryError(error);
    return { count: count ?? 0 };
  }

  async listCourses() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('courses')
      .select('id,title,slug')
      .order('title');
    this.throwQueryError(error);
    return data ?? [];
  }

  async listChapters(courseId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('chapters')
      .select('id,course_id,title,order_index')
      .eq('course_id', courseId)
      .order('order_index');
    this.throwQueryError(error);
    return data ?? [];
  }

  async listLessons(chapterId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('lessons')
      .select('id,chapter_id,title')
      .eq('chapter_id', chapterId)
      .order('title');
    this.throwQueryError(error);
    return data ?? [];
  }

  async create(dto: QuestionDto, actorId: string) {
    await this.assertQuestionManager(actorId);
    this.validateQuestion(dto);
    await this.validatePlacement(dto);

    const { data, error } = await this.supabaseService
      .getAdminClient()
      .rpc('create_shared_question_with_history', {
        p_actor_id: actorId,
        p_payload: {
          course_id: dto.course_id,
          chapter_id: dto.chapter_id,
          lesson_id: dto.lesson_id ?? null,
          question_type: dto.question_type,
          difficulty: dto.difficulty,
          content: dto.content,
          explanation: dto.explanation ?? '',
          options: dto.options,
        },
      });
    this.throwRpcError(error);
    const created = Array.isArray(data) ? data[0] : data;
    if (!created) throw new BadRequestException('Unable to create question');
    return created;
  }

  async update(id: string, dto: QuestionDto, actorId: string) {
    await this.assertQuestionManager(actorId);
    this.assertNotDeleted(await this.getReviewState(id));
    this.validateQuestion(dto);
    await this.validatePlacement(dto);
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .rpc('update_shared_question_with_history', {
        p_actor_id: actorId,
        p_question_id: id,
        p_expected_version: dto.expected_version ?? null,
        p_payload: {
          course_id: dto.course_id,
          chapter_id: dto.chapter_id,
          lesson_id: dto.lesson_id,
          question_type: dto.question_type,
          difficulty: dto.difficulty,
          content: dto.content,
          explanation: dto.explanation ?? '',
          options: dto.options,
        },
      });
    this.throwRpcError(error);
    const updated = Array.isArray(data) ? data[0] : data;
    if (!updated) throw new NotFoundException('Question not found');
    return updated;
  }

  async updateStatus(
    id: string,
    status: QuestionStatus | undefined,
    actorId: string,
    reason?: string,
    expectedVersion?: number,
  ) {
    await this.assertQuestionManager(actorId);
    if (
      status !== QuestionStatus.APPROVED &&
      status !== QuestionStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Only approved or rejected is a valid review decision',
      );
    }
    if (status === QuestionStatus.REJECTED && !reason?.trim()) {
      throw new BadRequestException(
        'A reason is required when rejecting a question',
      );
    }
    const current = await this.getReviewState(id);
    this.assertNotDeleted(current);
    if (expectedVersion !== undefined && expectedVersion !== current.version) {
      throw new ConflictException(
        'Question has changed; reload before reviewing it',
      );
    }
    if (current.status !== QuestionStatus.DRAFT) {
      throw new ConflictException('Only draft questions can be reviewed');
    }
    if (status === QuestionStatus.APPROVED) {
      const question = await this.getById(id);
      this.validateQuestion({
        ...question,
        options: question.options ?? [],
      } as QuestionDto);
      await this.assertQuestionHasChapter(id);
    }

    const { data, error } = await this.supabaseService
      .getAdminClient()
      .rpc('transition_shared_question_with_history', {
        p_actor_id: actorId,
        p_question_id: id,
        p_action: status === QuestionStatus.APPROVED ? 'approve' : 'reject',
        p_expected_version: expectedVersion ?? current.version,
        p_reason: reason?.trim() || null,
      });
    this.throwRpcError(error);
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) throw new NotFoundException('Question not found');
    return result;
  }

  async revokeApproval(
    id: string,
    actorId: string,
    reason: string,
    expectedVersion: number,
  ) {
    if (!reason?.trim())
      throw new BadRequestException('Cần nhập lý do gỡ duyệt.');
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException('Phiên bản câu hỏi không hợp lệ.');
    }
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .rpc('revoke_shared_question_approval', {
        p_actor_id: actorId,
        p_question_id: id,
        p_expected_version: expectedVersion,
        p_reason: reason.trim(),
      });
    this.throwRpcError(error);
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) throw new NotFoundException('Question not found');
    return result;
  }

  async submitForReview(
    id: string,
    actorId: string,
    _role: string,
    expectedVersion?: number,
  ) {
    await this.assertQuestionManager(actorId);
    const current = await this.getReviewState(id);
    this.assertNotDeleted(current);
    if (expectedVersion !== undefined && expectedVersion !== current.version) {
      throw new ConflictException(
        'Question has changed; reload before submitting it',
      );
    }
    const question = await this.getById(id);
    this.validateQuestion({
      ...question,
      options: question.options ?? [],
    } as QuestionDto);
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .rpc('transition_shared_question_with_history', {
        p_actor_id: actorId,
        p_question_id: id,
        p_action: 'submit',
        p_expected_version: expectedVersion ?? current.version,
        p_reason: null,
      });
    this.throwRpcError(error);
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) throw new NotFoundException('Question not found');
    return { ...result, review_pending: true };
  }

  async getById(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('questions')
      .select(
        `
        *,
        course:courses(id, title),
        chapter:chapters(id, title),
        lesson:lessons(id, title),
        options:question_options(*)
      `,
      )
      .eq('id', id)
      .is('generated_for_user_id', null)
      .maybeSingle();
    this.throwQueryError(error);
    if (!data) throw new NotFoundException('Question not found');
    return data;
  }

  async getHistory(id: string) {
    await this.getById(id);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('question_history')
      .select(
        'id,question_id,version,action,from_status,to_status,actor_id,reason,snapshot,created_at',
      )
      .eq('question_id', id)
      .order('created_at', { ascending: false });
    this.throwQueryError(error);
    return data ?? [];
  }

  /** Xóa mềm: câu hỏi chuyển sang mục "Đã xóa" cho mọi người, vẫn giữ trong các đề và bài nộp cũ. */
  async remove(id: string, actorId: string) {
    return this.setDeleted(id, actorId, true);
  }

  async restore(id: string, actorId: string) {
    return this.setDeleted(id, actorId, false);
  }

  private async setDeleted(id: string, actorId: string, deleted: boolean) {
    await this.assertQuestionManager(actorId);
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .rpc('set_shared_question_deleted', {
        p_actor_id: actorId,
        p_question_id: id,
        p_deleted: deleted,
      });
    if (error?.code === '22023') throw new ConflictException(error.message);
    this.throwRpcError(error);
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) throw new NotFoundException('Question not found');
    return result;
  }

  async saveAiDrafts(dto: SaveAiDraftBatchDto, actorId: string) {
    const normalizedQuestions = dto.questions.map((question) => ({
      ...question,
      content: question.content.trim(),
      explanation: question.explanation.trim(),
      options: question.options.map((option, index) => ({
        ...option,
        option_text: option.option_text.trim(),
        order_index: index,
      })),
    }));
    for (const question of normalizedQuestions)
      this.validateQuestion(question as unknown as QuestionValidationInput);

    const { data, error } = await this.supabaseService
      .getAdminClient()
      .rpc('save_ai_question_drafts', {
        p_actor_id: actorId,
        p_batch_id: dto.batch_id,
        p_questions: normalizedQuestions,
      });
    this.throwRpcError(error);
    const saved = data ?? [];
    return { saved };
  }

  async configureQuiz(
    quizId: string,
    dto: ConfigureQuizQuestionsDto,
    actorId: string,
  ) {
    await this.assertQuestionManager(actorId);
    const supabase = this.supabaseService.getClient();
    const questionIds = dto.questions.map((question) => question.question_id);

    if (questionIds.length > 0) {
      const { data: sharedQuestions, error: sharedQuestionsError } =
        await supabase
          .from('questions')
          .select('id')
          .in('id', questionIds)
          .eq('status', QuestionStatus.APPROVED)
          .is('generated_for_user_id', null);
      this.throwQueryError(sharedQuestionsError);
      if ((sharedQuestions ?? []).length !== new Set(questionIds).size) {
        throw new BadRequestException(
          'Quiz can only use shared question bank content',
        );
      }
    }

    const { data: existingLinks, error: existingLinksError } = await supabase
      .from('quiz_questions')
      .select('question_id')
      .eq('quiz_id', quizId);
    this.throwQueryError(existingLinksError);

    const questionIdsToRemove = (existingLinks ?? [])
      .map((link) => link.question_id)
      .filter((questionId) => !questionIds.includes(questionId));
    if (questionIdsToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizId)
        .in('question_id', questionIdsToRemove);
      this.throwMutationError(deleteError);
    }

    if (dto.questions.length > 0) {
      const { error: upsertError } = await supabase
        .from('quiz_questions')
        .upsert(
          dto.questions.map((question) => ({
            quiz_id: quizId,
            question_id: question.question_id,
            order_index: question.order_index,
            score_weight: question.score_weight,
          })),
          { onConflict: 'quiz_id,question_id' },
        );
      this.throwMutationError(upsertError);
    }

    const { data: configuredQuestions, error: configuredQuestionsError } =
      await supabase
        .from('quiz_questions')
        .select('score_weight')
        .eq('quiz_id', quizId);
    this.throwQueryError(configuredQuestionsError);

    return {
      quiz_id: quizId,
      total_questions: configuredQuestions?.length ?? 0,
      total_score: (configuredQuestions ?? []).reduce(
        (total, question) => total + Number(question.score_weight ?? 0),
        0,
      ),
    };
  }

  async getQuizQuestions(quizId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('quiz_questions')
      .select('question_id,score_weight,questions(*)')
      .eq('quiz_id', quizId);
    this.throwQueryError(error);
    return data ?? [];
  }

  private async assertQuestionManager(actorId: string): Promise<string> {
    const { data: profile, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .select('role')
      .eq('id', actorId)
      .maybeSingle();
    this.throwQueryError(error);

    if (!profile || !['content_manager', 'admin'].includes(profile.role)) {
      throw new BadRequestException(
        'question management requires content_manager or admin',
      );
    }

    return profile.role;
  }

  private async validatePlacement(dto: QuestionDto) {
    if (!dto.chapter_id) throw new BadRequestException('A chapter is required');
    const supabase = this.supabaseService.getClient();
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('id')
      .eq('id', dto.chapter_id)
      .eq('course_id', dto.course_id)
      .maybeSingle();
    this.throwQueryError(chapterError);
    if (!chapter)
      throw new BadRequestException('Chapter does not belong to this course');

    if (dto.lesson_id) {
      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('id')
        .eq('id', dto.lesson_id)
        .eq('chapter_id', dto.chapter_id)
        .maybeSingle();
      this.throwQueryError(lessonError);
      if (!lesson)
        throw new BadRequestException('Lesson does not belong to this chapter');
    }
  }

  private async assertQuestionHasChapter(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('questions')
      .select('id, course_id, chapter_id, lesson_id')
      .eq('id', id)
      .is('generated_for_user_id', null)
      .maybeSingle();
    this.throwQueryError(error);
    if (!data) throw new NotFoundException('Question not found');
    if (!data.chapter_id)
      throw new BadRequestException(
        'Select a chapter before approving this question',
      );
    await this.validatePlacement({
      course_id: data.course_id,
      chapter_id: data.chapter_id,
      lesson_id: data.lesson_id,
    } as QuestionDto);
  }

  private validateQuestion(dto: QuestionValidationInput) {
    const errors = getQuestionValidationErrors(dto);
    if (errors.length > 0) throw new BadRequestException(errors.join('; '));
  }

  private async getReviewState(id: string): Promise<{
    id: string;
    status: QuestionStatus;
    submitted_for_review_at: string | null;
    version: number;
    deleted_at: string | null;
  }> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('questions')
      .select('id,status,submitted_for_review_at,version,deleted_at')
      .eq('id', id)
      .is('generated_for_user_id', null)
      .maybeSingle();
    this.throwQueryError(error);
    if (!data) throw new NotFoundException('Question not found');
    return {
      id: data.id,
      status: data.status as QuestionStatus,
      submitted_for_review_at: data.submitted_for_review_at ?? null,
      version: Number(data.version ?? 1),
      deleted_at: data.deleted_at ?? null,
    };
  }

  private assertNotDeleted(question: { deleted_at?: string | null }) {
    if (question.deleted_at)
      throw new ConflictException('Restore this question before changing it');
  }

  private throwRpcError(error: { message: string; code?: string } | null) {
    if (!error) return;
    if (
      error.code === '23505' ||
      error.code === '40001' ||
      error.message.includes('already used') ||
      error.message.includes('conflict')
    ) {
      throw new ConflictException(error.message);
    }
    if (error.code === 'P0002' || error.message.includes('not found'))
      throw new NotFoundException(error.message);
    if (error.code === '42501')
      throw new ForbiddenException(
        'Question management requires content_manager or admin',
      );
    if (error.code === '22023') throw new BadRequestException(error.message);
    throw new InternalServerErrorException(
      'Unable to save question transaction',
    );
  }

  private throwQueryError(error: { message: string } | null) {
    if (error) throw new BadRequestException(error.message);
  }

  private throwMutationError(error: { message: string } | null) {
    if (!error) return;
    if (
      error.message.includes('attempt') ||
      error.message.includes('quiz_questions')
    ) {
      throw new ConflictException(error.message);
    }
    if (error.message.includes('not found'))
      throw new NotFoundException(error.message);
    throw new BadRequestException(error.message);
  }

  async listQuestions(filters?: {
    search?: string;
    course_id?: string;
    chapter_id?: string;
    lesson_id?: string;
    question_type?: string;
    difficulty?: string;
    status?: string;
    is_ai_generated?: string;
    submitted_for_review?: string;
    is_deleted?: string;
  }) {
    const supabase = this.supabaseService.getClient();
    let query = supabase
      .from('questions')
      .select(
        `
      id,
      content,
      question_type,
      difficulty,
      status,
      explanation,
      is_ai_generated,
       submitted_for_review_at,
       version,
       created_by,
       updated_by,
       reviewed_by,
       reviewed_at,
      deleted_at,
      deleted_by,
      created_at,
      course_id,
      chapter_id,
      lesson_id,
      course:courses(id, title),
      chapter:chapters(id, title),
      lesson:lessons(id, title),
      options:question_options(id, option_text, is_correct, order_index)
    `,
      )
      .is('generated_for_user_id', null)
      .order('created_at', { ascending: false });

    if (filters?.search) {
      query = query.ilike('content', `%${filters.search}%`);
    }
    if (filters?.course_id) {
      query = query.eq('course_id', filters.course_id);
    }
    if (filters?.chapter_id) {
      query = query.eq('chapter_id', filters.chapter_id);
    }
    if (filters?.lesson_id) {
      query = query.eq('lesson_id', filters.lesson_id);
    }
    if (filters?.question_type) {
      query = query.eq('question_type', filters.question_type);
    }
    if (filters?.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (
      filters?.is_ai_generated === 'true' ||
      filters?.is_ai_generated === 'false'
    ) {
      query = query.eq('is_ai_generated', filters.is_ai_generated === 'true');
    }
    query =
      filters?.is_deleted === 'true'
        ? query.not('deleted_at', 'is', null)
        : query.is('deleted_at', null);
    if (filters?.submitted_for_review === 'true') {
      query = query.not('submitted_for_review_at', 'is', null);
    }
    const { data, error } = await query;
    this.throwQueryError(error);
    return (data ?? []).map((question) => ({
      ...question,
      lesson: question.lesson ?? null,
    }));
  }

  async listQuestionsPaged(filters: Record<string, string> = {}) {
    const rawPage = Number(filters.page ?? 1);
    const rawSize = Number(filters.page_size ?? 10);

    if (
      !Number.isSafeInteger(rawPage) ||
      rawPage < 1 ||
      rawPage > 1000000 ||
      !Number.isSafeInteger(rawSize) ||
      rawSize < 1 ||
      rawSize > 50
    ) {
      throw new BadRequestException('page hoặc page_size không hợp lệ');
    }

    const page = rawPage;
    const pageSize = rawSize;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('questions')
      .select(
        `
      id,
      content,
      question_type,
      difficulty,
      status,
      explanation,
      is_ai_generated,
      submitted_for_review_at,
      version,
      created_by,
      updated_by,
      reviewed_by,
      reviewed_at,
      deleted_at,
      deleted_by,
      created_at,
      course_id,
      chapter_id,
      lesson_id,
      course:courses(id, title),
      chapter:chapters(id, title),
      lesson:lessons(id, title),
      options:question_options(
        id, option_text, is_correct, order_index
      )
      `,
        { count: 'exact' },
      )
      .is('generated_for_user_id', null);

    // Các bộ lọc giống API danh sách cũ.
    if (filters.search?.trim()) {
      query = query.ilike('content', `%${filters.search.trim()}%`);
    }

    if (filters.course_id) {
      query = query.eq('course_id', filters.course_id);
    }

    if (filters.chapter_id) {
      query = query.eq('chapter_id', filters.chapter_id);
    }

    if (filters.lesson_id) {
      query = query.eq('lesson_id', filters.lesson_id);
    }

    if (filters.question_type) {
      query = query.eq('question_type', filters.question_type);
    }

    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (
      filters.is_ai_generated === 'true' ||
      filters.is_ai_generated === 'false'
    ) {
      query = query.eq('is_ai_generated', filters.is_ai_generated === 'true');
    }

    if (filters.is_deleted === 'true') {
      query = query.not('deleted_at', 'is', null);
    } else {
      query = query.is('deleted_at', null);
    }

    if (filters.submitted_for_review === 'true') {
      query = query.not('submitted_for_review_at', 'is', null);
    }

    // Sắp xếp cố định trước khi lấy trang.
    // ID dùng để phân biệt các bản ghi cùng thời điểm.
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);

    if (error) {
      this.throwQueryError(error);
    }

    const total = count ?? 0;

    return {
      items: (data ?? []).map((question) => ({
        ...question,
        lesson: question.lesson ?? null,
      })),
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    };
  }
}
