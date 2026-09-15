import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import {
  ConfigureQuizQuestionsDto,
  QuestionDto,
  QuestionStatus,
  QuestionType,
} from './dto/question.dto.js';

@Injectable()
export class QuestionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

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
    this.validateOptions(dto);

    const supabase = this.supabaseService.getClient();
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .insert({
        course_id: dto.course_id,
        chapter_id: dto.chapter_id,
        lesson_id: dto.lesson_id,
        question_type: dto.question_type,
        difficulty: dto.difficulty,
        content: dto.content,
        explanation: dto.explanation ?? null,
        status: dto.status,
      })
      .select('id')
      .single();
    this.throwMutationError(questionError);
    if (!question) throw new BadRequestException('Unable to create question');

    const questionId = question.id;
    if (dto.options.length > 0) {
      const { error: optionsError } = await supabase.from('question_options').insert(
        dto.options.map((option) => ({
          question_id: questionId,
          option_text: option.option_text,
          is_correct: option.is_correct,
          order_index: option.order_index,
        })),
      );
      this.throwMutationError(optionsError);
    }

    if (dto.topic_ids.length > 0) {
      const { error: topicsError } = await supabase.from('question_topics').insert(
        dto.topic_ids.map((topicId) => ({
          question_id: questionId,
          topic_id: topicId,
        })),
      );
      this.throwMutationError(topicsError);
    }

    return { id: questionId, status: dto.status };
  }

  async update(id: string, dto: QuestionDto, actorId: string) {
    await this.assertQuestionManager(actorId);
    this.validateOptions(dto);

    const supabase = this.supabaseService.getClient();
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .update({
        course_id: dto.course_id,
        chapter_id: dto.chapter_id,
        lesson_id: dto.lesson_id,
        question_type: dto.question_type,
        difficulty: dto.difficulty,
        content: dto.content,
        explanation: dto.explanation ?? null,
        status: dto.status,
      })
      .eq('id', id)
      .select('id')
      .single();
    this.throwMutationError(questionError);
    if (!question) throw new NotFoundException('Question not found');

    const { error: deleteOptionsError } = await supabase
      .from('question_options')
      .delete()
      .eq('question_id', id);
    this.throwMutationError(deleteOptionsError);

    if (dto.options.length > 0) {
      const { error: optionsError } = await supabase.from('question_options').insert(
        dto.options.map((option) => ({
          question_id: id,
          option_text: option.option_text,
          is_correct: option.is_correct,
          order_index: option.order_index,
        })),
      );
      this.throwMutationError(optionsError);
    }

    const { error: deleteTopicsError } = await supabase
      .from('question_topics')
      .delete()
      .eq('question_id', id);
    this.throwMutationError(deleteTopicsError);

    if (dto.topic_ids.length > 0) {
      const { error: topicsError } = await supabase.from('question_topics').insert(
        dto.topic_ids.map((topicId) => ({
          question_id: id,
          topic_id: topicId,
        })),
      );
      this.throwMutationError(topicsError);
    }

    return { id: question.id, status: dto.status };
  }

  async updateStatus(id: string, status: QuestionStatus, actorId: string) {
    await this.assertQuestionManager(actorId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('questions')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .single();
    this.throwMutationError(error);
    if (!data) throw new NotFoundException('Question not found');
    return data;
  }

  async submitForReview(id: string, actorId: string, _role: string) {
    const actorRole = await this.assertQuestionManager(actorId);
    const status = actorRole === 'admin' ? QuestionStatus.APPROVED : QuestionStatus.DRAFT;
    const { data, error } = await this.supabaseService
      .getClient()
      .from('questions')
      .update({ status })
      .eq('id', id)
      .select('id')
      .single();
    this.throwMutationError(error);
    if (!data) throw new NotFoundException('Question not found');
    return { id: data.id, status, review_pending: actorRole !== 'admin' };
  }

  async getById(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('questions')
      .select(`
        *,
        course:courses(id, title),
        chapter:chapters(id, title),
        lesson:lessons(id, title),
        options:question_options(*),
        topics:question_topics(topic_id)
      `)
      .eq('id', id)
      .maybeSingle();
    this.throwQueryError(error);
    if (!data) throw new NotFoundException('Question not found');
    return data;
  }

  async remove(id: string, actorId: string) {
    await this.assertQuestionManager(actorId);
    return { id, deleted: true };
  }

  async configureQuiz(quizId: string, dto: ConfigureQuizQuestionsDto, actorId: string) {
    await this.assertQuestionManager(actorId);
    const supabase = this.supabaseService.getClient();
    const questionIds = dto.questions.map((question) => question.question_id);

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

    const { data: configuredQuestions, error: configuredQuestionsError } = await supabase
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
      throw new BadRequestException('question management requires content_manager or admin');
    }

    return profile.role;
  }

  private validateOptions(dto: QuestionDto) {
    if (dto.question_type === QuestionType.FILL_IN_BLANK) {
      if (dto.options.length > 0) {
        throw new BadRequestException('fill_in_blank questions cannot contain options');
      }
      return;
    }

    if (dto.options.length < 2) {
      throw new BadRequestException('At least two options are required');
    }

    const correctCount = dto.options.filter((option) => option.is_correct).length;
    if (dto.question_type === QuestionType.MULTIPLE_CHOICE && correctCount < 1) {
      throw new BadRequestException('multiple_choice requires at least one correct option');
    }
    if (dto.question_type !== QuestionType.MULTIPLE_CHOICE && correctCount !== 1) {
      throw new BadRequestException('This question type requires exactly one correct option');
    }
  }

  private throwQueryError(error: { message: string } | null) {
    if (error) throw new BadRequestException(error.message);
  }

  private throwMutationError(error: { message: string } | null) {
    if (!error) return;
    if (error.message.includes('attempt') || error.message.includes('quiz_questions')) {
      throw new ConflictException(error.message);
    }
    if (error.message.includes('not found')) throw new NotFoundException(error.message);
    throw new BadRequestException(error.message);
  }

  async listQuestions(filters?: {
    search?: string;
    course_id?: string;
    difficulty?: string;
    status?: string;
    is_ai_generated?: string;
  }) {
  const supabase = this.supabaseService.getClient();
  let query = supabase
    .from('questions')
    .select(`
      id,
      content,
      question_type,
      difficulty,
      status,
      explanation,
      is_ai_generated,
      created_at,
      course:courses(id, title),
      chapter:chapters(id, title),
      lesson:lessons(id, title),
      options:question_options(id, option_text, is_correct, order_index),
      topics:question_topics(topic:topics(id, name))
    `)
    .order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.ilike('content', `%${filters.search}%`);
  }
  if (filters?.course_id) {
    query = query.eq('course_id', filters.course_id);
  }
  if (filters?.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.is_ai_generated === 'true' || filters?.is_ai_generated === 'false') {
    query = query.eq('is_ai_generated', filters.is_ai_generated === 'true');
  }
  const { data, error } = await query;
  this.throwQueryError(error);
  return (data ?? []).map((question) => ({
    ...question,
    lesson: question.lesson ?? null,
    topics: (question.topics ?? []).flatMap((item) => item.topic ?? []).map((topic) => topic.name).filter(Boolean),
  }));
  }

  async listTopics() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('topics')
      .select('id, name, slug, description')
      .order('name');
    this.throwQueryError(error);
    return data ?? [];
  }

  async createTopic(name: string, description?: string) {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const { data, error } = await this.supabaseService
      .getClient()
      .from('topics')
      .insert({
        name,
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        description: description ?? null,
      })
      .select('id, name, slug, description')
      .single();

    this.throwMutationError(error);
    return data;
  }
}
