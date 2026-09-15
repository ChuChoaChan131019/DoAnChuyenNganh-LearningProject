import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  status: 'draft' | 'in_review' | 'approved' | 'published';
}

interface CourseRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  level: string | null;
  status: 'draft' | 'in_review' | 'approved' | 'published';
  updated_at: string;
}

const statusLabels = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  published: 'Published',
} as const;

@Injectable()
export class CategoriesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll() {
    const supabase = this.supabaseService.getClient();
    const [{ data: categoryRows, error: categoryError }, { data: courses, error: coursesError }] =
      await Promise.all([
        supabase
          .from('categories')
          .select('id, name, slug, description, created_at, status')
          .order('created_at', { ascending: true }),
        supabase.from('courses').select('category_id'),
      ]);

    if (categoryError || coursesError) {
      throw new InternalServerErrorException('Unable to load categories');
    }

    const courseCounts = new Map<string, number>();
    for (const course of courses ?? []) {
      if (course.category_id) {
        courseCounts.set(
          course.category_id,
          (courseCounts.get(course.category_id) ?? 0) + 1,
        );
      }
    }

    return (categoryRows as CategoryRow[]).map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      courses: courseCounts.get(category.id) ?? 0,
      created: category.created_at.slice(0, 10),
      status: statusLabels[category.status],
    }));
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const { name, slug, description } = createCategoryDto;
    const { data, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .insert({
        name: name.trim(),
        slug: slug.trim(),
        description: description?.trim() || null,
        status: 'published',
      })
      .select('id, name, slug, description, created_at, status')
      .single();

    if (error?.code === '23505') {
      throw new ConflictException('A category with this slug already exists');
    }

    if (error || !data) {
      throw new InternalServerErrorException('Unable to create category');
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description ?? '',
      courses: 0,
      created: data.created_at.slice(0, 10),
      status: statusLabels[data.status as keyof typeof statusLabels],
    };
  }

  async findBySlug(slug: string) {
    const supabase = this.supabaseService.getClient();
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, slug, description, created_at, status')
      .eq('slug', slug)
      .single();

    if (categoryError?.code === 'PGRST116' || !category) {
      throw new NotFoundException('Category not found');
    }

    if (categoryError) {
      throw new InternalServerErrorException('Unable to load category');
    }

    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, slug, description, level, status, updated_at')
      .eq('category_id', category.id)
      .order('created_at', { ascending: true });

    if (coursesError) {
      throw new InternalServerErrorException('Unable to load category courses');
    }

    const courseIds = (courses as CourseRow[]).map((course) => course.id);
    const { data: chapters, error: chaptersError } = courseIds.length
      ? await supabase.from('chapters').select('id, course_id').in('course_id', courseIds)
      : { data: [], error: null };

    if (chaptersError) {
      throw new InternalServerErrorException('Unable to load course chapters');
    }

    const chapterRows = chapters ?? [];
    const chapterIds = chapterRows.map((chapter) => chapter.id);
    const { data: lessons, error: lessonsError } = chapterIds.length
      ? await supabase.from('lessons').select('chapter_id').in('chapter_id', chapterIds)
      : { data: [], error: null };

    if (lessonsError) {
      throw new InternalServerErrorException('Unable to load course lessons');
    }

    const chaptersByCourse = new Map<string, number>();
    for (const chapter of chapterRows) {
      chaptersByCourse.set(
        chapter.course_id,
        (chaptersByCourse.get(chapter.course_id) ?? 0) + 1,
      );
    }

    const courseByChapter = new Map(
      chapterRows.map((chapter) => [chapter.id, chapter.course_id]),
    );
    const lessonsByCourse = new Map<string, number>();
    for (const lesson of lessons ?? []) {
      const courseId = courseByChapter.get(lesson.chapter_id);
      if (courseId) {
        lessonsByCourse.set(courseId, (lessonsByCourse.get(courseId) ?? 0) + 1);
      }
    }

    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description ?? '',
        created: category.created_at.slice(0, 10),
        status: statusLabels[category.status as keyof typeof statusLabels],
      },
      courses: (courses as CourseRow[]).map((course) => ({
        id: course.id,
        title: course.title,
        slug: course.slug,
        category: category.name,
        description: course.description ?? '',
        level: course.level ?? 'Beginner',
        status: statusLabels[course.status],
        chapters: chaptersByCourse.get(course.id) ?? 0,
        lessons: lessonsByCourse.get(course.id) ?? 0,
        updated: course.updated_at.slice(0, 10),
        gradient: 'from-[#f8cccc] to-[#e3eeee]',
      })),
    };
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const payload = Object.fromEntries(
      Object.entries(updateCategoryDto)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim() : value,
        ]),
    );

    if (payload.description === '') payload.description = null;

    const { data, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select('id, name, slug, description, created_at, status')
      .single();

    if (error?.code === '23505') {
      throw new ConflictException('A category with this slug already exists');
    }

    if (error?.code === 'PGRST116' || !data) {
      throw new NotFoundException('Category not found');
    }

    if (error) {
      throw new InternalServerErrorException('Unable to update category');
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description ?? '',
      created: data.created_at.slice(0, 10),
      status: statusLabels[data.status as keyof typeof statusLabels],
    };
  }

  async remove(id: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('categories')
      .delete()
      .eq('id', id);

    if (error?.code === '23503') {
      throw new ConflictException(
        'Cannot delete a category that still has courses assigned to it',
      );
    }

    if (error) {
      throw new InternalServerErrorException('Unable to delete category');
    }

    return { id, message: 'Category deleted successfully' };
  }
}
