import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { SupabaseService } from '../../config/supabase.service.js';

export class CreateNoteDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID()
  @IsOptional()
  lesson_id?: string;
}

export class UpdateNoteDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content?: string;

  @IsUUID()
  @IsOptional()
  lesson_id?: string;
}

export interface NoteLessonInfo {
  id: string;
  title: string;
  chapter_id?: string;
  chapter_title?: string;
  course_id?: string;
  course_title?: string;
  course_slug?: string;
}

export interface Note {
  id: string;
  learner_id: string;
  lesson_id?: string;
  title?: string;
  content: string;
  created_at: string;
  updated_at: string;
  lesson?: NoteLessonInfo | null;
}

function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/[%_]/g, '\\$&')
    .replace(/"/g, '\\"');
}

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private isUuid(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }

  /**
   * Đính kèm thông tin bài học và khóa học cho các note có lesson_id
   */
  private async attachLessonInfo(notes: any[]): Promise<Note[]> {
    if (!notes || notes.length === 0) return [];

    const validLessonIds = [
      ...new Set(
        notes
          .map((n) => n.lesson_id)
          .filter((id): id is string => typeof id === 'string' && this.isUuid(id)),
      ),
    ];

    const lessonsMap = new Map<string, any>();

    if (validLessonIds.length > 0) {
      const client = this.supabaseService.getClient();
      const { data: lessons, error: lessonsError } = await client
        .from('lessons')
        .select(`
          id,
          title,
          chapter_id,
          chapters (
            id,
            title,
            course_id,
            courses (
              id,
              title,
              slug
            )
          )
        `)
        .in('id', validLessonIds);

      if (lessonsError) {
        this.logger.error('Error fetching lessons for notes enrichment', lessonsError);
      } else if (lessons) {
        for (const lesson of lessons as any[]) {
          lessonsMap.set(lesson.id, lesson);
        }
      }
    }

    return notes.map((n) => {
      if (!n.lesson_id) {
        return {
          ...n,
          lesson: null,
        };
      }

      const lessonData = lessonsMap.get(n.lesson_id);
      return {
        ...n,
        lesson: lessonData
          ? {
              id: lessonData.id,
              title: lessonData.title,
              chapter_id: lessonData.chapter_id,
              chapter_title: lessonData.chapters?.title,
              course_id: lessonData.chapters?.course_id,
              course_title: lessonData.chapters?.courses?.title,
              course_slug: lessonData.chapters?.courses?.slug,
            }
          : null,
      };
    });
  }

  async findAll(userId: string, filter?: { lessonId?: string; search?: string }): Promise<Note[]> {
    const client = this.supabaseService.getClient();

    let query = client.from('notes').select('*').eq('learner_id', userId);

    if (filter?.lessonId) {
      query = query.eq('lesson_id', filter.lessonId);
    }

    if (filter?.search) {
      const escapedSearch = escapeLikePattern(filter.search);
      query = query.or(`title.ilike."%${escapedSearch}%",content.ilike."%${escapedSearch}%"`);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      this.logger.error('Error fetching notes', error);
      throw error;
    }

    return this.attachLessonInfo(data || []);
  }

  async findOne(id: string, userId: string): Promise<Note> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('learner_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Note not found');
    }

    const [enriched] = await this.attachLessonInfo([data]);
    return enriched;
  }

  async create(userId: string, data: CreateNoteDto): Promise<Note> {
    if (!data.content?.trim()) {
      throw new BadRequestException('Content is required');
    }

    const client = this.supabaseService.getClient();

    const { data: note, error } = await client
      .from('notes')
      .insert({ ...data, learner_id: userId })
      .select()
      .single();

    if (error) {
      this.logger.error('Error creating note', error);
      throw error;
    }

    const [enriched] = await this.attachLessonInfo([note]);
    return enriched;
  }

  async update(id: string, userId: string, data: UpdateNoteDto): Promise<Note> {
    if (data.content !== undefined && !data.content.trim()) {
      throw new BadRequestException('Content cannot be empty');
    }

    const client = this.supabaseService.getClient();

    const { data: note, error } = await client
      .from('notes')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('learner_id', userId)
      .select()
      .single();

    if (error || !note) {
      throw new NotFoundException('Note not found');
    }

    const [enriched] = await this.attachLessonInfo([note]);
    return enriched;
  }

  async delete(id: string, userId: string): Promise<void> {
    const client = this.supabaseService.getClient();

    // Verify ownership first
    const { data: existing } = await client
      .from('notes')
      .select('id')
      .eq('id', id)
      .eq('learner_id', userId)
      .single();

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    const { error } = await client.from('notes').delete().eq('id', id);

    if (error) {
      this.logger.error('Error deleting note', error);
      throw error;
    }
  }
}
