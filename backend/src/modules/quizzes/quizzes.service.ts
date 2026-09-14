import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { ConfigureQuizQuestionsDto, CreateQuizDto, SubmitQuizDto, UpdateQuizDto } from './dto/quiz.dto.js';

type QuizQuestionRow = {
  question_id: string;
  score_weight: number;
  questions: unknown;
};

type QuestionRecord = {
  content?: string;
  question_type?: string;
  options?: Array<{ id: string; option_text: string; is_correct?: boolean }>;
};

@Injectable()
export class QuizzesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async list(filters: { course_id?: string; status?: string; visibility?: string }) {
    let query = this.supabaseService.getClient().from('quizzes').select('*').order('created_at', { ascending: false });
    if (filters.course_id) query = query.eq('course_id', filters.course_id);
    if (filters.status === 'published') query = query.eq('is_active', true);
    if (filters.status === 'archived') query = query.eq('is_active', false);
    if (filters.visibility === 'public') query = query.eq('is_active', true);
    if (filters.visibility === 'private') query = query.eq('is_active', false);
    const { data, error } = await query;
    this.throwQueryError(error);
    return data ?? [];
  }

  async getById(id: string, role?: string) {
    const quiz = await this.requireQuiz(id, role);
    return { ...quiz, ...(await this.getTotals(id)) };
  }

  async create(dto: CreateQuizDto, actorId: string) {
    const insertPayload: Record<string, any> = {
      title: dto.title,
      course_id: dto.course_id,
      chapter_id: dto.chapter_id ?? null,
      duration_minutes: dto.duration_minutes ?? 15,
      pass_percentage: (dto as any).pass_percentage ?? dto.pass_score ?? 50,
      quiz_type: dto.quiz_type ?? 'exam',
      shuffle_questions: dto.shuffle_questions ?? true,
      shuffle_options: dto.shuffle_options ?? true,
      is_active: (dto as any).is_active ?? true,
      is_required: (dto as any).is_required ?? true,
      counts_toward_progress: (dto as any).counts_toward_progress ?? true,
    };

    const { data, error } = await this.supabaseService
      .getClient()
      .from('quizzes')
      .insert(insertPayload)
      .select('*')
      .single();

    this.throwMutationError(error);
    if (!data) throw new BadRequestException('Unable to create quiz');
    return data;
  }

  async update(id: string, dto: UpdateQuizDto) {
    const updatePayload: Record<string, any> = {};
    if (dto.title !== undefined) updatePayload.title = dto.title;
    if (dto.course_id !== undefined) updatePayload.course_id = dto.course_id;
    if (dto.chapter_id !== undefined) updatePayload.chapter_id = dto.chapter_id ?? null;
    if (dto.duration_minutes !== undefined) updatePayload.duration_minutes = dto.duration_minutes;
    if (dto.quiz_type !== undefined) updatePayload.quiz_type = dto.quiz_type;
    if (dto.shuffle_questions !== undefined) updatePayload.shuffle_questions = dto.shuffle_questions;
    if (dto.shuffle_options !== undefined) updatePayload.shuffle_options = dto.shuffle_options;
    if (dto.pass_score !== undefined) updatePayload.pass_percentage = dto.pass_score;
    if (dto.visibility !== undefined) updatePayload.is_active = dto.visibility === 'public';

    const { data, error } = await this.supabaseService
      .getClient()
      .from('quizzes')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    this.throwMutationError(error);
    if (!data) throw new NotFoundException('Quiz not found');
    return data;
  }

  async setStatus(id: string, status: 'published' | 'archived') {
    if (status === 'published' && !(await this.getTotals(id)).total_questions) {
      throw new BadRequestException('A quiz must contain at least one question');
    }
    const { data, error } = await this.supabaseService.getClient().from('quizzes').update({ is_active: status === 'published' }).eq('id', id).select('*').single();
    this.throwMutationError(error);
    if (!data) throw new NotFoundException('Quiz not found');
    return data;
  }

  async configureQuestions(quizId: string, dto: ConfigureQuizQuestionsDto) {
    await this.requireQuiz(quizId);
    const ids = dto.questions.map((question) => question.question_id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Question ids must be unique');
    }

    if (ids.length) {
      const { data, error } = await this.supabaseService.getClient().from('questions').select('id,status').in('id', ids);
      this.throwQueryError(error);
      if ((data ?? []).length !== ids.length || (data ?? []).some((question) => question.status !== 'approved')) {
        throw new BadRequestException('Only approved questions can be added to a quiz');
      }
    }

    const supabase = this.supabaseService.getClient();
    const { error: deleteError } = await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
    this.throwMutationError(deleteError);

    if (dto.questions.length) {
      const insertRows = dto.questions.map((q) => ({
        quiz_id: quizId,
        question_id: q.question_id,
        score_weight: q.score_weight || 1.0,
      }));

      const { error } = await supabase.from('quiz_questions').insert(insertRows);
      this.throwMutationError(error);
    }
    return this.getTotals(quizId);
  }

 async getQuestions(quizId: string, role?: string) {
    await this.requireQuiz(quizId, role);
    const { data, error } = await this.supabaseService.getClient().from('quiz_questions')
      .select('question_id,score_weight,questions(id,content,question_type,explanation,options:question_options(id,option_text,order_index,is_correct))')
      .eq('quiz_id', quizId);
    this.throwQueryError(error);
    return data ?? [];
  }

  async startAttempt(quizId: string, learnerId: string) {
    const quiz = await this.requireQuiz(quizId, 'learner');
    if (!quiz.is_active) throw new BadRequestException('Only published quizzes can be attempted');
    const questions = await this.getScoringQuestions(quizId);
    const supabase = this.supabaseService.getClient();

    // 1. Kiểm tra xem học viên có attempt nào đang làm dở dang (chưa submit) hay không
    let existingQuery = supabase
      .from('quiz_attempts')
      .select('id, quiz_id, started_at')
      .eq('quiz_id', quizId)
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1);

    if (learnerId) {
      existingQuery = existingQuery.eq('user_id', learnerId);
    }

    const { data: existingAttempt } = await existingQuery.maybeSingle();

    // Nếu đã có attempt đang mở, tái sử dụng attempt này (chống nhân bản khi mount/strict mode)
    let attemptData = existingAttempt;

    // 2. Nếu chưa có attempt nào dở dang, tạo mới hoàn toàn
    if (!attemptData) {
      const insertPayload: Record<string, any> = {
        quiz_id: quizId,
        total_score: 0,
        pass_percentage: Number(quiz.pass_percentage ?? 50),
        is_passed: false,
      };

      if (learnerId) {
        insertPayload.user_id = learnerId;
      }

      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert(insertPayload)
        .select('id, quiz_id, started_at')
        .single();

      this.throwMutationError(error);
      if (!data) throw new BadRequestException('Unable to start quiz attempt');
      attemptData = data;
    }

    return {
      attempt_id: attemptData.id,
      ...attemptData,
      questions: questions.map((item) => {
        const question = this.questionRecord(item);
        return {
          question_id: item.question_id,
          content: question?.content,
          question_type: question?.question_type,
          difficulty: (question as any)?.difficulty,
          options: (question?.options ?? []).map(({ id, option_text }) => ({ id, option_text })),
        };
      }),
    };
  }

  async submitAttempt(attemptId: string, dto: SubmitQuizDto, learnerId: string) {
    const supabase = this.supabaseService.getClient();

    // 1. Kiểm tra attempt hợp lệ
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('*, quizzes(*)')
      .eq('id', attemptId)
      .eq('user_id', learnerId)
      .maybeSingle();

    this.throwQueryError(attemptError);
    if (!attempt) throw new NotFoundException('Quiz attempt not found');

    const questions = await this.getScoringQuestions(attempt.quiz_id);
    const answerMap = new Map(dto.answers.map((answer) => [answer.question_id, answer]));
    let earnedScore = 0;
    let totalMaxScore = 0;

    // 2. Duyệt từng câu hỏi và lưu vào quiz_attempt_details + quiz_attempt_answers
    for (const item of questions) {
      const weight = Number(item.score_weight || 1.0);
      totalMaxScore += weight;

      const answer = answerMap.get(item.question_id);
      const options = this.questionRecord(item)?.options ?? [];
      const correctIds = options.filter((option) => option.is_correct).map((option) => option.id);
      const selected = answer?.selected_option_ids ?? [];

      const isCorrect = answer?.answer !== undefined
        ? answer.answer.trim().toLowerCase() === String(options.find((option) => option.is_correct)?.option_text ?? '').trim().toLowerCase()
        : selected.length === correctIds.length && selected.every((id) => correctIds.includes(id));

      if (isCorrect) {
        earnedScore += weight;
      }

      // Insert vào bảng quiz_attempt_details
      const { data: detailData, error: detailError } = await supabase
        .from('quiz_attempt_details')
        .insert({
          attempt_id: attemptId,
          question_id: item.question_id,
          answer_text: answer?.answer ?? null,
          is_correct: isCorrect,
          ai_feedback: null,
        })
        .select('id')
        .single();

      this.throwMutationError(detailError);

      // Nếu có chọn đáp án trắc nghiệm, lưu vào bảng quiz_attempt_answers
      if (detailData && selected.length > 0) {
        const optionRows = selected.map((optId) => ({
          detail_id: detailData.id,
          option_id: optId,
        }));
        const { error: optionsInsertError } = await supabase
          .from('quiz_attempt_answers')
          .insert(optionRows);

        this.throwMutationError(optionsInsertError);
      }
    }

    // 3. Tính % và trạng thái đỗ/trượt
    const percentage = totalMaxScore > 0 ? Number(((earnedScore / totalMaxScore) * 100).toFixed(2)) : 0;
    const isPassed = percentage >= Number(attempt.pass_percentage ?? 50);

    // Cập nhật lại bảng quiz_attempts
    const { data: updatedAttempt, error: updateError } = await supabase
      .from('quiz_attempts')
      .update({
        total_score: earnedScore,
        completed_at: new Date().toISOString(),
        is_passed: isPassed,
      })
      .eq('id', attemptId)
      .select('*')
      .single();

    this.throwMutationError(updateError);

    return {
      ...updatedAttempt,
      score: earnedScore,
      max_score: totalMaxScore,
      percentage,
      passed: isPassed,
    };
  }

  async latestResult(quizId: string, learnerId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('quiz_attempts')
      .select('id, quiz_id, total_score, pass_percentage, is_passed, completed_at')
      .eq('quiz_id', quizId)
      .eq('user_id', learnerId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    this.throwQueryError(error);

    return data
      ? {
          quiz_id: quizId,
          latest_attempt_id: data.id,
          score: data.total_score,
          percentage: data.total_score !== null ? data.total_score : null,
          is_passed: data.is_passed,
          completed_at: data.completed_at,
        }
      : {
          quiz_id: quizId,
          latest_attempt_id: null,
          score: null,
          percentage: null,
          is_passed: null,
          completed_at: null,
        };
  }

  private async requireQuiz(id: string, role?: string) {
    const { data, error } = await this.supabaseService.getClient().from('quizzes').select('*').eq('id', id).maybeSingle();
    this.throwQueryError(error);
    if (!data) throw new NotFoundException('Quiz not found');
    if (role === 'learner' && !data.is_active) {
      throw new ForbiddenException('This quiz is not available to learners');
    }
    return data;
  }

  private async getScoringQuestions(quizId: string): Promise<QuizQuestionRow[]> {
    const { data, error } = await this.supabaseService.getClient().from('quiz_questions')
      .select('question_id,score_weight,questions(id,content,question_type,options:question_options(id,option_text,order_index,is_correct))')
      .eq('quiz_id', quizId);
    this.throwQueryError(error);
    return (data ?? []) as QuizQuestionRow[];
  }

  private async getTotals(quizId: string) {
    const { data, error } = await this.supabaseService.getClient().from('quiz_questions').select('score_weight').eq('quiz_id', quizId);
    this.throwQueryError(error);
    return { quiz_id: quizId, total_questions: data?.length ?? 0, total_score: this.totalScore((data ?? []) as Array<{ score_weight: number }>) };
  }

  private totalScore(rows: Array<{ score_weight: number }>) { return rows.reduce((total, row) => total + Number(row.score_weight ?? 0), 0); }
  private questionRecord(item: QuizQuestionRow): QuestionRecord | null { return Array.isArray(item.questions) ? (item.questions[0] as QuestionRecord | undefined) ?? null : item.questions as QuestionRecord | null; }
  private throwQueryError(error: { message: string } | null) { if (error) throw new BadRequestException(error.message); }
  private throwMutationError(error: { message: string } | null) { if (error) throw new ConflictException(error.message); }
}
