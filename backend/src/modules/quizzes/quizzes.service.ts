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
      .select('question_id,score_weight,questions(id,content,question_type,options:question_options(id,option_text,order_index))')
      .eq('quiz_id', quizId);
    this.throwQueryError(error);
    return data ?? [];
  }

  async startAttempt(quizId: string, learnerId: string) {
    const quiz = await this.requireQuiz(quizId, 'learner');
    if (!quiz.is_active) throw new BadRequestException('Only published quizzes can be attempted');
    const questions = await this.getScoringQuestions(quizId);
    const { data, error } = await this.supabaseService.getClient().from('quiz_attempts').insert({
      quiz_id: quizId, learner_id: learnerId, status: 'in_progress', max_score: this.totalScore(questions),
    }).select('id,quiz_id,status,started_at,max_score').single();
    this.throwMutationError(error);
    if (!data) throw new BadRequestException('Unable to start quiz attempt');
    return {
      attempt_id: data.id,
      ...data,
      questions: questions.map((item) => {
        const question = this.questionRecord(item);
        return {
          question_id: item.question_id,
          content: question?.content,
          question_type: question?.question_type,
          options: (question?.options ?? []).map(({ id, option_text }) => ({ id, option_text })),
        };
      }),
    };
  }

  async submitAttempt(attemptId: string, dto: SubmitQuizDto, learnerId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: attempt, error: attemptError } = await supabase.from('quiz_attempts').select('*, quizzes(*)').eq('id', attemptId).eq('learner_id', learnerId).maybeSingle();
    this.throwQueryError(attemptError);
    if (!attempt) throw new NotFoundException('Quiz attempt not found');
    if (attempt.status !== 'in_progress') throw new ConflictException('Quiz attempt is no longer active');

    const questions = await this.getScoringQuestions(attempt.quiz_id);
    const answerMap = new Map(dto.answers.map((answer) => [answer.question_id, answer]));
    let score = 0;
    const answerRows: Array<Record<string, unknown>> = [];
    for (const item of questions) {
      const answer = answerMap.get(item.question_id);
      const options = this.questionRecord(item)?.options ?? [];
      const correctIds = options.filter((option) => option.is_correct).map((option) => option.id);
      const selected = answer?.selected_option_ids ?? [];
      const correct = answer?.answer !== undefined
        ? answer.answer.trim().toLowerCase() === String(options.find((option) => option.is_correct)?.option_text ?? '').trim().toLowerCase()
        : selected.length === correctIds.length && selected.every((id) => correctIds.includes(id));
      const awarded = correct ? Number(item.score_weight) : 0;
      score += awarded;
      answerRows.push({ attempt_id: attemptId, question_id: item.question_id, selected_option_ids: selected, answer: answer?.answer ?? null, is_correct: correct, awarded_score: awarded });
    }
    const maxScore = this.totalScore(questions);
    const percentage = maxScore ? Number(((score / maxScore) * 100).toFixed(2)) : 0;
    const { error: answersError } = await supabase.from('quiz_answers').insert(answerRows);
    this.throwMutationError(answersError);
    const { data, error } = await supabase.from('quiz_attempts').update({ status: 'completed', score, percentage, completed_at: new Date().toISOString() }).eq('id', attemptId).select('*').single();
    this.throwMutationError(error);
    return { ...data, passed: percentage >= Number(attempt.quizzes.pass_percentage) };
  }

  async latestResult(quizId: string, learnerId: string) {
    const { data, error } = await this.supabaseService.getClient().from('quiz_attempts').select('id,quiz_id,score,max_score,percentage,completed_at').eq('quiz_id', quizId).eq('learner_id', learnerId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(1).maybeSingle();
    this.throwQueryError(error);
    return data ? { quiz_id: quizId, latest_attempt_id: data.id, score: data.score, max_score: data.max_score, percentage: data.percentage, completed_at: data.completed_at } : { quiz_id: quizId, latest_attempt_id: null, score: null, max_score: null, percentage: null, completed_at: null };
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
