import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';

@Injectable()
export class CoursesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createCourseDto: CreateCourseDto, creatorId: string) {
    const { category_id: categoryId, ...courseFields } = createCourseDto;
    const supabase = this.supabaseService.getClient();

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .single();

    if (categoryError?.code === 'PGRST116' || !category) {
      throw new NotFoundException('Category not found');
    }

    if (categoryError) {
      throw new InternalServerErrorException('Unable to validate category');
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({
        ...courseFields,
        title: courseFields.title.trim(),
        slug: courseFields.slug.trim(),
        description: courseFields.description?.trim() || null,
        level: courseFields.level ?? 'Beginner',
        thumbnail_url: courseFields.thumbnail_url?.trim() || null,
        category_id: categoryId,
        created_by: creatorId,
        status: 'draft',
      })
      .select('id, title, slug, description, level, status, category_id, thumbnail_url, created_at, updated_at')
      .single();

    if (error?.code === '23505') {
      throw new ConflictException('A course with this slug already exists');
    }

    if (error) {
      throw new InternalServerErrorException('Unable to create course');
    }

    return data;
  }
}
