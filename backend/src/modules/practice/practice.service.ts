import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { AiService } from '../ai/ai.service.js';

type PracticeMode = 'quick' | 'weak' | 'course' | 'ai';

@Injectable()
export class PracticeService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly aiService: AiService,
  ) {}

  async getOverview(userId: string) {
    const courseIds = await this.getActiveCourseIds(userId);
    if (courseIds.length === 0) return { courses: [], weakTopics: [] };

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, slug')
      .in('id', courseIds)
      .order('title');
    if (error) throw new InternalServerErrorException('Unable to load practice courses');

    return {
      courses: data ?? [],
      weakTopics: await this.getWeakTopics(userId, courseIds),
    };
  }

  async getQuestions(userId: string, mode: PracticeMode, courseId?: string) {
    if (!['quick', 'weak', 'course'].includes(mode)) {
      throw new BadRequestException('Unsupported practice mode');
    }

    const courseIds = await this.getActiveCourseIds(userId);
    if (courseId && !courseIds.includes(courseId)) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    const weakTopics = mode === 'weak' ? await this.getWeakTopics(userId, courseIds) : [];
    return this.loadQuestions({
      courseIds: courseId ? [courseId] : courseIds,
      topicIds: weakTopics.map((topic) => topic.id),
      count: 10,
      mode,
    });
  }

  async generateAiPractice(userId: string, body: { course_id?: string; count?: number; prompt?: string }) {
    const courseIds = await this.getActiveCourseIds(userId);
    if (body.course_id && !courseIds.includes(body.course_id)) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    if (body.prompt?.trim()) {
      const supabase = this.supabaseService.getClient();
      const targetCourseIds = body.course_id ? [body.course_id] : courseIds;
      if (targetCourseIds.length === 0) {
        throw new ForbiddenException('You are not enrolled in any courses');
      }
      
      const { data: courses } = await supabase.from('courses').select('id, title, description').in('id', targetCourseIds);
      const courseContext = (courses ?? []).map(c => `${c.title}: ${c.description || ''}`).join('\n');
      const count = Math.min(Math.max(body.count ?? 10, 5), 20);
      
      const aiQuestions = await this.aiService.generatePracticeQuestions(body.prompt, count, courseContext);
      
      if (aiQuestions.length > 0) {
        const targetCourseId = courses?.[0]?.id ?? targetCourseIds[0];
        const insertedQuestionIds = [];
        
        for (const aq of aiQuestions) {
          const { data: qData, error: qError } = await supabase.from('questions').insert({
            course_id: targetCourseId,
            question_type: aq.question_type,
            difficulty: aq.difficulty || 'medium',
            content: aq.content,
            explanation: aq.explanation || null,
            status: 'approved',
            is_ai_generated: true,
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
            .select('id, course_id, chapter_id, lesson_id, question_type, difficulty, content, explanation, courses(id, title), chapters(id, title), lessons(id, title), question_options(id, option_text, order_index)')
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

    const weakTopics = await this.getWeakTopics(userId, courseIds);
    const recentAccuracy = weakTopics.length
      ? weakTopics.reduce((sum, topic) => sum + topic.accuracy, 0) / weakTopics.length
      : 50;
    const difficulty = await this.aiService.recommendDifficulty(recentAccuracy);
    
    let topicIdsToLoad = weakTopics.slice(0, 3).map((topic) => topic.id);
    let rationale = weakTopics.length
      ? `Ưu tiên ${weakTopics.slice(0, 2).map((topic) => topic.name).join(' và ')} dựa trên kết quả gần đây.`
      : 'Chưa có đủ lịch sử làm bài, bộ câu hỏi bắt đầu ở độ khó trung bình.';

    const questions = await this.loadQuestions({
      courseIds: body.course_id ? [body.course_id] : courseIds,
      topicIds: topicIdsToLoad,
      difficulty,
      count: Math.min(Math.max(body.count ?? 10, 5), 20),
      mode: 'ai',
    });

    return {
      mode: 'ai',
      difficulty,
      rationale,
      questions,
    };
  }

  async createAttempt(userId: string, body: { mode: PracticeMode; course_id?: string; total_questions: number }) {
    if (!['quick', 'weak', 'course', 'ai'].includes(body.mode)) {
      throw new BadRequestException('Unsupported practice mode');
    }

    const courseIds = await this.getActiveCourseIds(userId);
    if (body.course_id && !courseIds.includes(body.course_id)) {
      throw new ForbiddenException('You are not enrolled in this course');
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
    const courseIds = await this.getActiveCourseIds(userId);
    const supabase = this.supabaseService.getClient();
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, course_id, question_type, explanation')
      .eq('id', body.question_id)
      .eq('status', 'approved')
      .maybeSingle();
    if (questionError) throw new InternalServerErrorException('Unable to check answer');
    if (!question || !courseIds.includes(question.course_id)) {
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
      .select('course_id, is_correct')
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

    const courseIds = [...new Set(rows.map((detail) => detail.course_id))];
    if (courseIds.length) {
      const { error: historyError } = await supabase.from('learning_history').insert(courseIds.map((courseId) => ({
        learner_id: userId,
        course_id: courseId,
        activity_type: 'practice_completed',
        activity_id: attemptId,
        event_type: 'practice_completed',
        occurred_at: completedAt,
        source: 'user_module',
      })));
      if (historyError) throw new InternalServerErrorException('Unable to save practice history');
    }

    return { ...completedAttempt, score: correctAnswers, percentage: scorePercentage };
  }

  private async getActiveCourseIds(userId: string): Promise<string[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('course_enrollments')
      .select('course_id')
      .eq('learner_id', userId)
      .eq('status', 'active');
    if (error) throw new InternalServerErrorException('Unable to load enrolled courses');
    return [...new Set((data ?? []).map((row) => row.course_id))];
  }

  private async getWeakTopics(userId: string, courseIds: string[]) {
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
      .select('id, course_id')
      .in('id', questionIds)
      .in('course_id', courseIds);
    if (questionsError) throw new InternalServerErrorException('Unable to load practice questions');
    const validQuestionIds = new Set((questions ?? []).map((question) => question.id));
    const questionStats = new Map<string, { total: number; correct: number }>();
    for (const detail of details ?? []) {
      if (!validQuestionIds.has(detail.question_id)) continue;
      const stats = questionStats.get(detail.question_id) ?? { total: 0, correct: 0 };
      stats.total += 1;
      if (detail.is_correct) stats.correct += 1;
      questionStats.set(detail.question_id, stats);
    }

    const { data: links, error: linksError } = await supabase
      .from('question_topics')
      .select('question_id, topic_id, topics(id, name)')
      .in('question_id', [...questionStats.keys()]);
    if (linksError) throw new InternalServerErrorException('Unable to load weak topics');
    const topicStats = new Map<string, { name: string; total: number; correct: number }>();
    for (const link of links ?? []) {
      const questionStat = questionStats.get(link.question_id);
      const topic = Array.isArray(link.topics) ? link.topics[0] : link.topics;
      if (!questionStat || !topic) continue;
      const stats = topicStats.get(link.topic_id) ?? { name: topic.name, total: 0, correct: 0 };
      stats.total += questionStat.total;
      stats.correct += questionStat.correct;
      topicStats.set(link.topic_id, stats);
    }
    return [...topicStats.entries()]
      .map(([id, stats]) => ({ id, name: stats.name, accuracy: Math.round((stats.correct / stats.total) * 100), attempts: stats.total }))
      .sort((left, right) => left.accuracy - right.accuracy)
      .slice(0, 8);
  }

  private async loadQuestions(filters: {
    courseIds: string[];
    topicIds?: string[];
    difficulty?: string;
    count: number;
    mode: PracticeMode | 'ai';
  }) {
    if (filters.courseIds.length === 0) return { mode: filters.mode, questions: [] };
    const supabase = this.supabaseService.getClient();
    let query = supabase
      .from('questions')
      .select('id, course_id, chapter_id, lesson_id, question_type, difficulty, content, explanation, courses(id, title), chapters(id, title), lessons(id, title), question_options(id, option_text, order_index)')
      .eq('status', 'approved')
      .in('course_id', filters.courseIds);
    if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
    const { data, error } = await query;
    if (error) throw new InternalServerErrorException('Unable to load practice questions');

    let questions = data ?? [];
    if (filters.topicIds?.length) {
      const { data: links, error: linksError } = await supabase
        .from('question_topics')
        .select('question_id')
        .in('topic_id', filters.topicIds);
      if (linksError) throw new InternalServerErrorException('Unable to filter practice topics');
      const matchingIds = new Set((links ?? []).map((link) => link.question_id));
      questions = questions.filter((question) => matchingIds.has(question.id));
    }

    questions = questions.sort(() => Math.random() - 0.5).slice(0, filters.count);
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