import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { ConfigureQuizQuestionsDto, CreateQuizDto, QuizAnswerDto, SaveQuizConfigurationDto, SubmitQuizDto, UpdateQuizDto } from './dto/quiz.dto.js';

type QuizQuestionRow = {
  question_id: string;
  score_weight: number;
  questions: unknown;
};

type AttemptQuestion = {
  question_id: string;
  score_weight: number;
  question: QuestionRecord;
};

type QuestionOptionRecord = { id: string; option_text: string; order_index?: number | null; is_correct?: boolean };

type QuestionRecord = {
  id?: string;
  status?: string;
  content?: string;
  question_type?: string;
  difficulty?: string;
  explanation?: string | null;
  deleted_at?: string | null;
  options?: QuestionOptionRecord[];
};

type AttemptDetailRow = {
  id: string;
  question_id: string;
  answer_text: string | null;
  is_correct: boolean;
  score_weight: number | null;
  earned_score: number | null;
  question_snapshot?: QuestionRecord | null;
  selected_option_ids?: string[] | null;
  quiz_attempt_answers?: Array<{ option_id: string }> | null;
  questions?: unknown;
};

type RpcError = { message: string; code?: string } | null;

/** Câu trả lời đã chấm, gửi vào RPC submit_quiz_attempt. */
export type GradedAnswer = {
  question_id: string;
  answer_text: string | null;
  is_correct: boolean;
  score_weight: number;
  earned_score: number;
  selected_option_ids: string[];
};

/** Chấm một câu theo trọng số. Chỉ giữ những phương án thuộc câu hỏi. */
export function gradeAnswer(
  questionId: string,
  weight: number,
  options: QuestionOptionRecord[],
  answer: QuizAnswerDto | undefined,
): GradedAnswer {
  const optionIds = new Set(options.map((option) => option.id));
  const correctIds = options.filter((option) => option.is_correct).map((option) => option.id);
  const selected = [...new Set(answer?.selected_option_ids ?? [])].filter((id) => optionIds.has(id));
  const text = typeof answer?.answer === 'string' ? answer.answer : null;

  let isCorrect: boolean;
  if (text !== null && selected.length === 0) {
    const normalized = text.trim().toLowerCase();
    isCorrect = normalized.length > 0 && options
      .filter((option) => option.is_correct)
      .some((option) => String(option.option_text ?? '').trim().toLowerCase() === normalized);
  } else {
    isCorrect = correctIds.length > 0
      && selected.length === correctIds.length
      && selected.every((id) => correctIds.includes(id));
  }

  return {
    question_id: questionId,
    answer_text: text,
    is_correct: isCorrect,
    score_weight: weight,
    earned_score: isCorrect ? weight : 0,
    selected_option_ids: selected,
  };
}

export function scorePercentage(score: number | null | undefined, maxScore: number | null | undefined): number | null {
  if (score === null || score === undefined) return null;
  const max = Number(maxScore ?? 0);
  if (!(max > 0)) return 0;
  return Math.min(100, Math.round((Number(score) / max) * 10000) / 100);
}

@Injectable()
export class QuizzesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async list(filters: { course_id?: string; status?: string; visibility?: string }, role?: string) {
    let query = this.supabaseService.getClient().from('quizzes').select('*').order('created_at', { ascending: false });
    if (filters.course_id) query = query.eq('course_id', filters.course_id);
    const { data, error } = await query;
    this.throwQueryError(error);
    let quizzes = data ?? [];
    const quizIds = quizzes.map((quiz) => quiz.id);
    const eligibleIds = new Set<string>();
    if (quizIds.length) {
      const { data: eligibleLinks, error: eligibilityError } = await this.supabaseService.getClient()
        .from('quiz_questions')
        .select('quiz_id,questions!inner(status)')
        .in('quiz_id', quizIds)
        .eq('questions.status', 'approved');
      this.throwQueryError(eligibilityError);
      for (const link of eligibleLinks ?? []) eligibleIds.add(link.quiz_id);
    }

    // Legacy active quizzes without an approved question are treated as drafts
    // in manager responses too, until the cleanup migration has been applied.
    quizzes = quizzes.map((quiz) => ({
      ...quiz,
      is_active: Boolean(quiz.is_active && eligibleIds.has(quiz.id)),
    }));
    if (filters.status === 'published' || filters.visibility === 'public') {
      quizzes = quizzes.filter((quiz) => quiz.is_active);
    }
    if (filters.status === 'draft' || filters.status === 'archived') quizzes = quizzes.filter((quiz) => !quiz.is_active);
    if (filters.visibility === 'private') quizzes = quizzes.filter((quiz) => !quiz.is_active);
    if (role === 'learner' && quizzes.length) {
      const client = this.supabaseService.getClient();
      const courseIds = [...new Set(quizzes.map((quiz) => quiz.course_id).filter(Boolean))];
      const chapterIds = [...new Set(quizzes.map((quiz) => quiz.chapter_id).filter(Boolean))];
      if (!courseIds.length) return [];
      const { data: courses, error: courseError } = await client.from('courses').select('id,status').in('id', courseIds);
      this.throwQueryError(courseError);
      const publishedCourses = new Set((courses ?? []).filter((course) => course.status === 'published').map((course) => course.id));
      let publishedChapters = new Set<string>();
      if (chapterIds.length) {
        const { data: chapters, error: chapterError } = await client.from('chapters').select('id,course_id,status').in('id', chapterIds);
        this.throwQueryError(chapterError);
        publishedChapters = new Set((chapters ?? [])
          .filter((chapter) => chapter.status === 'published' && publishedCourses.has(chapter.course_id))
          .map((chapter) => chapter.id));
      }
      quizzes = quizzes.filter((quiz) => publishedCourses.has(quiz.course_id)
        && (!quiz.chapter_id || publishedChapters.has(quiz.chapter_id)));
    }
    return quizzes.map((quiz) => this.presentQuiz(quiz));
  }

  async getById(id: string, role?: string) {
    const quiz = await this.requireQuiz(id, role);
    const isEligibleForPublication = await this.hasApprovedQuestion(id);
    return this.presentQuiz({
      ...quiz,
      is_active: Boolean(quiz.is_active && isEligibleForPublication),
      ...(await this.getTotals(id)),
    });
  }

  async create(dto: CreateQuizDto, actorId: string) {
    await this.assertChapterBelongsToCourse(dto.course_id, dto.chapter_id ?? null);
    const insertPayload: Record<string, any> = {
      title: dto.title,
      description: dto.description ?? null,
      course_id: dto.course_id,
      chapter_id: dto.chapter_id ?? null,
      duration_minutes: dto.duration_minutes ?? 15,
      pass_percentage: (dto as any).pass_percentage ?? dto.pass_score ?? 50,
      quiz_type: dto.quiz_type ?? 'exam',
      shuffle_questions: dto.shuffle_questions ?? true,
      shuffle_options: dto.shuffle_options ?? true,
      // A quiz is private until the explicit publish action succeeds.
      is_active: false,
      is_required: dto.is_required ?? true,
      counts_toward_progress: dto.counts_toward_progress ?? true,
    };

    const { data, error } = await this.supabaseService
      .getClient()
      .from('quizzes')
      .insert(insertPayload)
      .select('*')
      .single();

    this.throwMutationError(error);
    if (!data) throw new BadRequestException('Unable to create quiz');
    return this.presentQuiz(data);
  }

  async update(id: string, dto: UpdateQuizDto) {
    if (dto.course_id !== undefined || dto.chapter_id !== undefined) {
      const quiz = await this.requireQuiz(id);
      await this.assertChapterBelongsToCourse(dto.course_id ?? quiz.course_id, dto.chapter_id === undefined ? quiz.chapter_id : dto.chapter_id);
    }
    // Saving edits always returns the quiz to draft. Publication can only be
    // changed through setStatus(), which validates the assigned questions.
    const updatePayload: Record<string, any> = { is_active: false };
    if (dto.title !== undefined) updatePayload.title = dto.title;
    if (dto.description !== undefined) updatePayload.description = dto.description;
    if (dto.course_id !== undefined) updatePayload.course_id = dto.course_id;
    if (dto.chapter_id !== undefined) updatePayload.chapter_id = dto.chapter_id ?? null;
    if (dto.duration_minutes !== undefined) updatePayload.duration_minutes = dto.duration_minutes;
    if (dto.quiz_type !== undefined) updatePayload.quiz_type = dto.quiz_type;
    if (dto.shuffle_questions !== undefined) updatePayload.shuffle_questions = dto.shuffle_questions;
    if (dto.shuffle_options !== undefined) updatePayload.shuffle_options = dto.shuffle_options;
    if (dto.pass_score !== undefined) updatePayload.pass_percentage = dto.pass_score;
    if (dto.is_required !== undefined) updatePayload.is_required = dto.is_required;
    if (dto.counts_toward_progress !== undefined) updatePayload.counts_toward_progress = dto.counts_toward_progress;
    const { data, error } = await this.supabaseService
      .getClient()
      .from('quizzes')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    this.throwMutationError(error);
    if (!data) throw new NotFoundException('Quiz not found');
    return this.presentQuiz(data);
  }

  async setStatus(id: string, status: 'published' | 'archived') {
    if (status === 'published' && !(await this.hasApprovedQuestion(id))) {
      throw new BadRequestException('Thêm ít nhất một câu hỏi đã duyệt trước khi xuất bản.');
    }
    const { data, error } = await this.supabaseService.getClient().from('quizzes').update({ is_active: status === 'published' }).eq('id', id).select('*').single();
    this.throwMutationError(error);
    if (!data) throw new NotFoundException('Quiz not found');
    return this.presentQuiz(data);
  }

  async configureQuestions(quizId: string, dto: ConfigureQuizQuestionsDto, settings?: UpdateQuizDto) {
    const quiz = await this.requireQuiz(quizId);
    await this.assertChapterBelongsToCourse(settings?.course_id ?? quiz.course_id,
      settings?.chapter_id === undefined ? quiz.chapter_id : settings.chapter_id);
    const ids = dto.questions.map((question) => question.question_id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Question ids must be unique');
    }

    const supabase = this.supabaseService.getClient();
    if (ids.length) {
      const { data, error } = await supabase.from('questions').select('id,status,deleted_at,course_id').in('id', ids);
      this.throwQueryError(error);
      if ((data ?? []).length !== ids.length || (data ?? []).some((question) => question.status !== 'approved')) {
        throw new BadRequestException('Only approved questions can be added to a quiz');
      }
      const targetCourseId = settings?.course_id ?? quiz.course_id;
      if ((data ?? []).some((question) => question.course_id !== targetCourseId)) {
        throw new BadRequestException('Question belongs to another course');
      }

      // Câu đã xóa mềm chỉ được giữ nếu nó vốn đã nằm trong đề này.
      const deletedIds = (data ?? []).filter((question) => question.deleted_at).map((question) => question.id as string);
      if (deletedIds.length) {
        const { data: existing, error: existingError } = await supabase
          .from('quiz_questions')
          .select('question_id')
          .eq('quiz_id', quizId)
          .in('question_id', deletedIds);
        this.throwQueryError(existingError);
        const kept = new Set((existing ?? []).map((row) => row.question_id as string));
        if (deletedIds.some((id) => !kept.has(id))) {
          throw new BadRequestException('Deleted questions cannot be added to a quiz');
        }
      }
    }

    const { error } = await supabase.rpc('replace_quiz_questions', {
      p_quiz_id: quizId,
      p_settings: settings ? {
        title: settings.title,
        course_id: settings.course_id,
        chapter_id: settings.chapter_id,
        duration_minutes: settings.duration_minutes,
        pass_score: settings.pass_score,
        quiz_type: settings.quiz_type,
        shuffle_questions: settings.shuffle_questions,
        shuffle_options: settings.shuffle_options,
        description: settings.description,
        is_required: settings.is_required,
        counts_toward_progress: settings.counts_toward_progress,
      } : null,
      p_questions: dto.questions.map((q) => ({
        question_id: q.question_id,
        score_weight: q.score_weight,
      })),
    });
    this.throwRpcError(error);
    return this.getTotals(quizId);
  }

  async saveConfiguration(quizId: string, dto: SaveQuizConfigurationDto) {
    await this.configureQuestions(quizId, dto, dto.settings);
    return this.getById(quizId);
  }

  async getQuestions(quizId: string, role?: string) {
    await this.requireQuiz(quizId, role);
    if (role === 'learner') {
      // Người học chỉ nhận nội dung câu hỏi và phương án; không có đáp án hay lời giải.
      const { data, error } = await this.supabaseService.getClient().from('quiz_questions')
        .select('question_id,score_weight,order_index,questions(id,status,content,question_type,difficulty,options:question_options(id,option_text,order_index))')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });
      this.throwQueryError(error);
      return ((data ?? []) as QuizQuestionRow[])
        .filter((item) => this.questionRecord(item)?.status === 'approved')
        .map((item) => {
          const question = this.questionRecord(item);
          return {
            question_id: item.question_id,
            score_weight: item.score_weight,
            questions: {
              id: question?.id ?? item.question_id,
              content: question?.content,
              question_type: question?.question_type,
              difficulty: question?.difficulty,
              options: question?.question_type === 'fill_in_blank' ? []
                : (question?.options ?? []).map(({ id, option_text, order_index }) => ({ id, option_text, order_index })),
            },
          };
        });
    }

    const { data, error } = await this.supabaseService.getClient().from('quiz_questions')
      .select('question_id,score_weight,order_index,questions(id,course_id,status,content,question_type,difficulty,explanation,deleted_at,options:question_options(id,option_text,order_index,is_correct))')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });
    this.throwQueryError(error);
    return (data ?? []) as QuizQuestionRow[];
  }

  async startAttempt(quizId: string, learnerId: string) {
    // The RPC checks publication only for a new attempt. An existing attempt
    // remains resumable after a manager archives or edits the quiz.
    const quiz = await this.requireQuiz(quizId);
    const { data, error } = await this.supabaseService.getClient().rpc('start_quiz_attempt', {
      p_quiz_id: quizId,
      p_user_id: learnerId,
      p_grace_seconds: 0,
    });
    this.throwRpcError(error);
    const attempt = (Array.isArray(data) ? data[0] : data) as {
      id: string; quiz_id: string; started_at: string; expires_at: string | null; server_now: string;
      questions: AttemptQuestion[];
    } | null;
    if (!attempt?.id) throw new BadRequestException('Unable to start quiz attempt');
    if (!attempt.questions?.length) throw new ConflictException('This quiz attempt has no saved questions');

    return {
      attempt_id: attempt.id,
      id: attempt.id,
      quiz_id: attempt.quiz_id,
      quiz_title: quiz.title,
      duration_minutes: quiz.duration_minutes ?? null,
      started_at: attempt.started_at,
      expires_at: attempt.expires_at,
      server_now: attempt.server_now,
      questions: attempt.questions.map((item) => {
        const question = item.question;
        return {
          question_id: item.question_id,
          content: question?.content,
          question_type: question?.question_type,
          difficulty: question?.difficulty,
          options: question?.question_type === 'fill_in_blank' ? []
            : (question?.options ?? []).map(({ id, option_text }) => ({ id, option_text })),
        };
      }),
    };
  }

  async submitAttempt(attemptId: string, dto: SubmitQuizDto, learnerId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('id, quiz_id, completed_at')
      .eq('id', attemptId)
      .eq('user_id', learnerId)
      .maybeSingle();
    this.throwQueryError(attemptError);
    if (!attempt) throw new NotFoundException('Quiz attempt not found');

    let questions: AttemptQuestion[] = [];
    if (!attempt.completed_at) {
      const { data: snapshot, error: snapshotError } = await supabase.rpc('get_quiz_attempt_snapshot', {
        p_attempt_id: attemptId,
        p_user_id: learnerId,
      });
      this.throwRpcError(snapshotError);
      questions = (snapshot ?? []) as AttemptQuestion[];
    }
    if (!attempt.completed_at && !questions.length) {
      throw new ConflictException('This quiz attempt has no saved questions');
    }
    const answerMap = new Map(dto.answers.map((answer) => [answer.question_id, answer]));
    let maxScore = 0;
    const graded = questions.map((item) => {
      const weight = Number(item.score_weight || 1.0);
      maxScore += weight;
      const question = item.question;
      return {
        ...gradeAnswer(item.question_id, weight, question?.options ?? [], answerMap.get(item.question_id)),
        question_snapshot: question && {
          id: question.id ?? item.question_id,
          content: question.content,
          question_type: question.question_type,
          difficulty: question.difficulty,
          explanation: question.explanation,
          options: question.options ?? [],
        },
      };
    });

    // Lưu nguyên tử trong database: lượt đã nộp thì trả lại kết quả cũ, quá hạn thì từ chối.
    const { data, error } = await supabase.rpc('submit_quiz_attempt', {
      p_attempt_id: attemptId,
      p_user_id: learnerId,
      p_details: graded,
      p_max_score: maxScore,
      p_grace_seconds: 0,
    });
    this.throwRpcError(error);
    const result = (Array.isArray(data) ? data[0] : data) as Record<string, any> | null;
    if (!result) throw new BadRequestException('Unable to submit quiz attempt');

    if (result.status === 'expired') {
      throw new ConflictException({
        error: { code: 'QUIZ_ATTEMPT_EXPIRED', message: 'The submission deadline for this quiz attempt has passed' },
      });
    }
    if (result.end_reason === 'expired') {
      throw new ConflictException({
        error: { code: 'QUIZ_ATTEMPT_EXPIRED', message: 'This quiz attempt ended because time ran out' },
      });
    }

    return {
      attempt_id: result.attempt_id,
      id: result.attempt_id,
      quiz_id: result.quiz_id,
      started_at: result.started_at,
      completed_at: result.completed_at,
      end_reason: result.end_reason,
      already_submitted: result.status === 'already_submitted',
      score: Number(result.score ?? 0),
      max_score: Number(result.max_score ?? 0),
      percentage: result.percentage === null || result.percentage === undefined
        ? scorePercentage(result.score, result.max_score)
        : Number(result.percentage),
      pass_percentage: Number(result.pass_percentage ?? 50),
      passed: Boolean(result.passed),
    };
  }

  async getAttemptReview(attemptId: string, learnerId: string) {
    const supabase = this.supabaseService.getClient();
    const attemptColumns = 'id, quiz_id, user_id, started_at, expires_at, completed_at, total_score, max_score, score_percentage, pass_percentage, is_passed, end_reason';
    const loadAttempt = async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(attemptColumns)
        .eq('id', attemptId)
        .eq('user_id', learnerId)
        .maybeSingle();
      this.throwQueryError(error);
      return data as Record<string, any> | null;
    };

    let attempt = await loadAttempt();
    if (!attempt) throw new NotFoundException('Quiz attempt not found');
    if (!attempt.completed_at) {
      await this.expireOverdueAttempts(attempt.quiz_id, learnerId);
      attempt = await loadAttempt();
      if (!attempt) throw new NotFoundException('Quiz attempt not found');
    }

    // A timed-out attempt was never submitted successfully. Never reveal its answer key.
    if (attempt.end_reason === 'expired') {
      return {
        attempt_id: attempt.id,
        quiz_id: attempt.quiz_id,
        started_at: attempt.started_at,
        expires_at: attempt.expires_at,
        completed_at: attempt.completed_at,
        end_reason: 'expired',
        score: Number(attempt.total_score ?? 0),
        max_score: Number(attempt.max_score ?? 0),
        percentage: Number(attempt.score_percentage ?? 0),
        pass_percentage: Number(attempt.pass_percentage ?? 50),
        passed: false,
        correct_count: 0,
        total_questions: 0,
        questions: [],
      };
    }
    if (!attempt.completed_at) {
      throw new ConflictException({
        error: { code: 'QUIZ_ATTEMPT_IN_PROGRESS', message: 'This quiz attempt has not been submitted yet' },
      });
    }

    // The saved attempt snapshot retains the exact question order shown to this learner.
    // Historical completed attempts may not have one, so keep the link/detail fallback.
    const { data: savedSnapshot, error: snapshotError } = await supabase.rpc('get_quiz_attempt_snapshot', {
      p_attempt_id: attemptId,
      p_user_id: learnerId,
    });
    if (snapshotError && snapshotError.code !== 'P0002') this.throwRpcError(snapshotError);
    const snapshotOrder = !snapshotError && Array.isArray(savedSnapshot)
      ? (savedSnapshot as AttemptQuestion[]).map((item) => item.question_id)
      : null;

    const questionColumns = 'id,content,question_type,difficulty,explanation,options:question_options(id,option_text,order_index,is_correct)';
    const [{ data: details, error: detailsError }, { data: links, error: linksError }] = await Promise.all([
      supabase
        .from('quiz_attempt_details')
        .select(`id,question_id,answer_text,is_correct,score_weight,earned_score,question_snapshot,selected_option_ids,quiz_attempt_answers(option_id),questions(${questionColumns})`)
        .eq('attempt_id', attemptId),
      supabase
        .from('quiz_questions')
        .select(`question_id,score_weight,order_index,questions(${questionColumns})`)
        .eq('quiz_id', attempt.quiz_id)
        .order('order_index', { ascending: true }),
    ]);
    this.throwQueryError(detailsError);
    this.throwQueryError(linksError);

    // Mỗi câu chỉ lấy một dòng chi tiết (dữ liệu cũ có thể bị trùng do nộp lại).
    const detailByQuestion = new Map<string, AttemptDetailRow>();
    for (const detail of (details ?? []) as AttemptDetailRow[]) {
      if (!detailByQuestion.has(detail.question_id)) detailByQuestion.set(detail.question_id, detail);
    }
    const linkRows = (links ?? []) as QuizQuestionRow[];
    const weightByQuestion = new Map(linkRows.map((link) => [link.question_id, Number(link.score_weight || 1)]));

    // Thứ tự: theo đề; câu đã bị gỡ khỏi đề nhưng có trong bài nộp được thêm vào cuối.
    const orderedIds = detailByQuestion.size
      ? [
          ...(snapshotOrder ?? linkRows.map((link) => link.question_id)).filter((id) => detailByQuestion.has(id)),
          ...[...detailByQuestion.keys()].filter((id) => !(snapshotOrder ?? linkRows.map((link) => link.question_id)).includes(id)),
        ]
      : linkRows.filter((link) => this.questionRecord(link)?.content !== undefined).map((link) => link.question_id);
    const questionById = new Map<string, QuestionRecord | null>();
    for (const link of linkRows) questionById.set(link.question_id, this.questionRecord(link));
    for (const detail of detailByQuestion.values()) {
      const record = this.questionRecord(detail as unknown as QuizQuestionRow);
      if (record) questionById.set(detail.question_id, record);
    }

    const questions = orderedIds.map((questionId) => {
      const detail = detailByQuestion.get(questionId);
      const question = detail?.question_snapshot ?? questionById.get(questionId) ?? null;
      const weight = Number(detail?.score_weight ?? weightByQuestion.get(questionId) ?? 1);
      const isCorrect = Boolean(detail?.is_correct);
      return {
        question_id: questionId,
        content: question?.content ?? '',
        question_type: question?.question_type ?? 'single_choice',
        difficulty: question?.difficulty ?? null,
        explanation: question?.explanation ?? null,
        score_weight: weight,
        earned_score: Number(detail?.earned_score ?? (isCorrect ? weight : 0)),
        is_correct: isCorrect,
        answered: Boolean(detail && ((detail.selected_option_ids?.length ?? 0) > 0 || (detail.quiz_attempt_answers?.length ?? 0) > 0 || detail.answer_text)),
        answer_text: detail?.answer_text ?? null,
        selected_option_ids: detail?.selected_option_ids ?? (detail?.quiz_attempt_answers ?? []).map((row) => row.option_id),
        options: (detail?.question_snapshot
          ? [...(question?.options ?? [])]
          : [...(question?.options ?? [])].sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0)))
          .map(({ id, option_text, is_correct }) => ({ id, option_text, is_correct: Boolean(is_correct) })),
      };
    });

    const maxScore = attempt.max_score ?? questions.reduce((sum, item) => sum + item.score_weight, 0);
    return {
      attempt_id: attempt.id,
      quiz_id: attempt.quiz_id,
      started_at: attempt.started_at,
      expires_at: attempt.expires_at,
      completed_at: attempt.completed_at,
      end_reason: attempt.end_reason ?? 'submitted',
      score: Number(attempt.total_score ?? 0),
      max_score: Number(maxScore),
      percentage: attempt.score_percentage === null || attempt.score_percentage === undefined
        ? scorePercentage(attempt.total_score, maxScore)
        : Number(attempt.score_percentage),
      pass_percentage: Number(attempt.pass_percentage ?? 50),
      passed: Boolean(attempt.is_passed),
      correct_count: questions.filter((item) => item.is_correct).length,
      total_questions: questions.length,
      questions,
    };
  }

  async latestResult(quizId: string, learnerId: string) {
    await this.expireOverdueAttempts(quizId, learnerId);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('quiz_attempts')
      .select('id, quiz_id, total_score, max_score, score_percentage, pass_percentage, is_passed, completed_at, end_reason')
      .eq('quiz_id', quizId)
      .eq('user_id', learnerId)
      .not('completed_at', 'is', null)
      // Lượt làm gần nhất là lượt bắt đầu sau cùng; lượt hết giờ có completed_at = expires_at.
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    this.throwQueryError(error);

    if (!data) {
      return {
        quiz_id: quizId,
        latest_attempt_id: null,
        score: null,
        max_score: null,
        percentage: null,
        is_passed: null,
        end_reason: null,
        completed_at: null,
      };
    }

    const maxScore = data.max_score ?? (await this.getTotals(quizId)).total_score;
    return {
      quiz_id: quizId,
      latest_attempt_id: data.id,
      score: data.total_score,
      max_score: maxScore,
      percentage: data.score_percentage === null || data.score_percentage === undefined
        ? scorePercentage(data.total_score, maxScore)
        : Number(data.score_percentage),
      is_passed: data.is_passed,
      end_reason: data.end_reason ?? 'submitted',
      completed_at: data.completed_at,
    };
  }

  private async expireOverdueAttempts(quizId: string, learnerId: string) {
    const { error } = await this.supabaseService.getClient().rpc('expire_overdue_quiz_attempts', {
      p_quiz_id: quizId,
      p_user_id: learnerId,
      p_grace_seconds: 0,
    });
    this.throwRpcError(error);
  }

  private async requireQuiz(id: string, role?: string) {
    const { data, error } = await this.supabaseService.getClient().from('quizzes').select('*').eq('id', id).maybeSingle();
    this.throwQueryError(error);
    if (!data) throw new NotFoundException('Quiz not found');
    if (role === 'learner' && !data.is_active) {
      throw new ForbiddenException('This quiz is not available to learners');
    }
    if (role === 'learner') await this.assertPublishedPlacement(data.course_id, data.chapter_id);
    if (role === 'learner' && !(await this.hasApprovedQuestion(id))) {
      throw new ForbiddenException('Bài kiểm tra hiện không khả dụng với người học.');
    }
    return data;
  }

  private async assertChapterBelongsToCourse(courseId: string, chapterId?: string | null) {
    if (!chapterId) return;
    const { data, error } = await this.supabaseService.getClient().from('chapters')
      .select('id,course_id').eq('id', chapterId).maybeSingle();
    this.throwQueryError(error);
    if (!data || data.course_id !== courseId) throw new BadRequestException('Chapter belongs to another course');
  }

  private async assertPublishedPlacement(courseId: string, chapterId?: string | null) {
    const client = this.supabaseService.getClient();
    const { data: course, error: courseError } = await client.from('courses').select('status').eq('id', courseId).maybeSingle();
    this.throwQueryError(courseError);
    if (course?.status !== 'published') throw new ForbiddenException('This course is not published');
    if (!chapterId) return;
    const { data: chapter, error: chapterError } = await client.from('chapters')
      .select('course_id,status').eq('id', chapterId).maybeSingle();
    this.throwQueryError(chapterError);
    if (chapter?.course_id !== courseId || chapter.status !== 'published')
      throw new ForbiddenException('This chapter is not published');
  }

  private async getTotals(quizId: string) {
    const { data, error } = await this.supabaseService.getClient().from('quiz_questions').select('score_weight').eq('quiz_id', quizId);
    this.throwQueryError(error);
    return { quiz_id: quizId, total_questions: data?.length ?? 0, total_score: this.totalScore((data ?? []) as Array<{ score_weight: number }>) };
  }

  private async hasApprovedQuestion(quizId: string) {
    const { data, error } = await this.supabaseService.getClient().from('quiz_questions')
      .select('question_id,questions(status)')
      .eq('quiz_id', quizId);
    this.throwQueryError(error);
    return (data ?? []).some((item) => this.questionRecord(item as QuizQuestionRow)?.status === 'approved');
  }

  private presentQuiz<T extends { is_active?: boolean }>(quiz: T) {
    const isPublished = Boolean(quiz.is_active);
    return {
      ...quiz,
      status: isPublished ? 'published' : 'draft',
      visibility: isPublished ? 'public' : 'private',
    };
  }

  private totalScore(rows: Array<{ score_weight: number }>) { return rows.reduce((total, row) => total + Number(row.score_weight ?? 0), 0); }
  private questionRecord(item: QuizQuestionRow): QuestionRecord | null { return Array.isArray(item.questions) ? (item.questions[0] as QuestionRecord | undefined) ?? null : item.questions as QuestionRecord | null; }
  private throwQueryError(error: { message: string } | null) { if (error) throw new BadRequestException(error.message); }
  private throwMutationError(error: { message: string } | null) { if (error) throw new ConflictException(error.message); }
  private throwRpcError(error: RpcError) {
    if (!error) return;
    if (error.code === 'P0002' || error.message.includes('not found')) throw new NotFoundException(error.message);
    if (error.code === '23505') throw new ConflictException(error.message);
    throw new BadRequestException(error.message);
  }
}
