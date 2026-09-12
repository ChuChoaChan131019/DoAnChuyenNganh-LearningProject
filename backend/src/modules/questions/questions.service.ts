import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { QuestionDto, QuestionStatus, QuestionType } from './dto/question.dto.js';

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
    this.validateOptions(dto);
    return this.mutate('create_question_atomic', dto, actorId);
  }

  async update(id: string, dto: QuestionDto, actorId: string) {
    this.validateOptions(dto);
    return this.mutate('update_question_atomic', { id, ...dto }, actorId);
  }

  async submitForReview(id: string, actorId: string, role: string) {
    const status = role === 'admin' ? QuestionStatus.APPROVED : QuestionStatus.DRAFT;
    const { data, error } = await this.supabaseService.getClient().rpc('update_question_status', {
      p_question_id: id,
      p_status: status,
      p_actor_id: actorId,
    });
    this.throwMutationError(error);
    return { ...data, review_pending: role !== 'admin' };
  }

  async remove(id: string, actorId: string) {
    const { data, error } = await this.supabaseService.getClient().rpc('delete_question_atomic', {
      p_question_id: id,
      p_actor_id: actorId,
    });
    this.throwMutationError(error);
    return data;
  }

  private async mutate(functionName: string, payload: object, actorId: string) {
    const { data, error } = await this.supabaseService.getClient().rpc(functionName, {
      p_payload: payload,
      p_actor_id: actorId,
    });
    this.throwMutationError(error);
    return data;
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
}