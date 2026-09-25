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

export interface Note {
  id: string;
  learner_id: string;
  lesson_id?: string;
  title?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(userId: string, filter?: { lessonId?: string; search?: string }): Promise<Note[]> {
    const client = this.supabaseService.getClient();

    let query = client.from('notes').select('*').eq('learner_id', userId);

    if (filter?.lessonId) {
      query = query.eq('lesson_id', filter.lessonId);
    }

    if (filter?.search) {
      query = query.or(`title.ilike.%${filter.search}%,content.ilike.%${filter.search}%`);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      this.logger.error('Error fetching notes', error);
      throw error;
    }

    return data || [];
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

    return data;
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

    return note;
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

    return note;
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
