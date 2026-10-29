import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CreateChapterDto } from './dto/create-chapter.dto.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateChapterDto } from './dto/update-chapter.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { LessonReviewActionDto } from './dto/lesson-review-action.dto.js';

type ContentStatusLabel = 'Draft' | 'In review' | 'Approved' | 'Published';

const statusLabels: Record<string, ContentStatusLabel> = {
  draft: 'Draft',
  approved: 'Approved',
  published: 'Published',
  in_review: 'In review',
};

@Injectable()
export class CoursesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findChapters(courseId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, title, description, order_index, status')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (chaptersError) {
      throw new InternalServerErrorException('Unable to load chapters');
    }

    const chapterRows = chapters ?? [];
    const chapterIds = chapterRows.map((chapter) => chapter.id);
    const { data: lessons, error: lessonsError } = chapterIds.length
      ? await supabase
          .from('lessons')
          .select('id, chapter_id, title, estimated_duration_minutes, order_index, status, is_ai_generated')
          .in('chapter_id', chapterIds)
          .order('order_index', { ascending: true })
      : { data: [], error: null };

    if (lessonsError) {
      throw new InternalServerErrorException('Unable to load chapter lessons');
    }

    const lessonsByChapter = new Map<string, typeof lessons>();
    for (const lesson of lessons ?? []) {
      const chapterLessons = lessonsByChapter.get(lesson.chapter_id) ?? [];
      chapterLessons.push(lesson);
      lessonsByChapter.set(lesson.chapter_id, chapterLessons);
    }

    return chapterRows.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      summary: chapter.description ?? '',
      status: statusLabels[chapter.status] ?? 'Draft',
      lessons: (lessonsByChapter.get(chapter.id) ?? []).map((lesson) => ({
        id: lesson.id,
        code: `L${String(lesson.order_index).padStart(2, '0')}`,
        title: lesson.title,
        duration: `${lesson.estimated_duration_minutes ?? 0}m`,
        status: statusLabels[lesson.status] ?? 'Draft',
        ai: lesson.is_ai_generated ?? false,
      })),
    }));
  }

  async findLessonsByChapter(chapterId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('lessons')
      .select('id, title, order_index')
      .eq('chapter_id', chapterId)
      .order('order_index', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('Unable to load chapter lessons');
    }

    return data ?? [];
  }

  async createLesson(courseId: string, chapterId: string, createLessonDto: CreateLessonDto, actorId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('id')
      .eq('id', chapterId)
      .eq('course_id', courseId)
      .single();

    if (chapterError?.code === 'PGRST116' || !chapter) {
      throw new NotFoundException('Chapter not found');
    }
    if (chapterError) {
      throw new InternalServerErrorException('Unable to validate chapter');
    }

    const { data: lastLesson, error: lastLessonError } = await supabase
      .from('lessons')
      .select('order_index')
      .eq('chapter_id', chapterId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLessonError) {
      throw new InternalServerErrorException('Unable to determine lesson order');
    }

    const { data, error } = await supabase
      .from('lessons')
      .insert({
        chapter_id: chapterId,
        title: createLessonDto.title.trim(),
        estimated_duration_minutes: createLessonDto.estimated_duration_minutes ?? 0,
        order_index: (lastLesson?.order_index ?? 0) + 1,
        status: 'draft',
        created_by: actorId,
        updated_by: actorId,
        content: createLessonDto.content?.trim() || null,
        code_example: createLessonDto.code_example?.trim() || null,
      })
      .select('id, title, estimated_duration_minutes, order_index, status, is_ai_generated')
      .single();

    if (error) {
      throw new InternalServerErrorException('Unable to create lesson');
    }

    return {
      id: data.id,
      code: `L${String(data.order_index).padStart(2, '0')}`,
      title: data.title,
      duration: `${data.estimated_duration_minutes ?? 0}m`,
      status: statusLabels[data.status] ?? 'Draft',
      ai: data.is_ai_generated ?? false,
    };
  }

  private reviewError(error: { code?: string; message?: string }) {
    if (error.code === 'P0002') throw new NotFoundException(error.message);
    if (error.code === '40001') throw new ConflictException(error.message);
    if (error.code === '42501') throw new ForbiddenException(error.message);
    if (error.code === '22023' || error.code === '23514' || error.code === '22P02') throw new BadRequestException(error.message);
    throw new InternalServerErrorException('Unable to save lesson review change');
  }

  async updateLesson(lessonId: string, updateLessonDto: UpdateLessonDto, actorId: string) {
    const payload = Object.fromEntries(
      Object.entries(updateLessonDto).filter(([key]) => key !== 'version')
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key,
          typeof value === 'string' && !['content', 'code_example'].includes(key)
            ? value.trim()
            : value,
        ]),
    );

    if ('content' in payload && payload.content === '') payload.content = null;
    if ('code_example' in payload && payload.code_example === '') payload.code_example = null;

    const { data, error } = await this.supabaseService.getClient().rpc('save_lesson_content', {
      p_lesson_id: lessonId, p_actor_id: actorId, p_version: updateLessonDto.version, p_content: payload,
    });
    if (error) this.reviewError(error);

    return {
      ...data,
      duration: `${data.estimated_duration_minutes ?? 0}m`,
      status: statusLabels[data.status] ?? 'Draft',
    };
  }

  async reviewAction(lessonId: string, actorId: string, body: LessonReviewActionDto) {
    const { data, error } = await this.supabaseService.getClient().rpc('apply_lesson_review_action', {
      p_lesson_id: lessonId, p_actor_id: actorId, p_version: body.version,
      p_action: body.action, p_reason: body.reason ?? null,
    });
    if (error) this.reviewError(error);
    return { ...data, status: statusLabels[data.status] ?? 'Draft' };
  }

  async reviewHistory(lessonId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: lesson, error: lessonError } = await supabase.from('lessons').select('id').eq('id', lessonId).maybeSingle();
    if (lessonError) throw new InternalServerErrorException('Unable to find lesson');
    if (!lesson) throw new NotFoundException('Lesson not found');
    const { data, error } = await supabase.from('lesson_review_events')
      .select('id, version, action, from_status, to_status, actor_id, reason, created_at')
      .eq('lesson_id', lessonId).order('created_at', { ascending: false });
    if (error) throw new InternalServerErrorException('Unable to load review history');
    const actors = [...new Set((data ?? []).map((event) => event.actor_id).filter((id): id is string => !!id))];
    const names = new Map(await Promise.all(actors.map(async (id) => {
      const { data: account } = await supabase.auth.admin.getUserById(id);
      return [id, account.user?.email ?? id] as const;
    })));
    return (data ?? []).map((event) => ({ ...event,
      actor_email: event.actor_id ? names.get(event.actor_id) ?? event.actor_id : 'System migration',
    }));
  }

  async reviewQueue() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.from('lessons')
      .select('id, title, status, version, is_ai_generated, created_by, updated_at, chapters!inner(title, courses!inner(title, status))')
      .order('updated_at', { ascending: false });
    if (error) throw new InternalServerErrorException('Unable to load review queue');
    return data ?? [];
  }

  async reviewTree() {
    const supabase = this.supabaseService.getClient();
    const { data: courses, error: coursesError } = await supabase
      .from('courses').select('id, title, slug, status').order('title');
    if (coursesError) throw new InternalServerErrorException('Unable to load review courses');

    const courseRows = courses ?? [];
    const courseIds = courseRows.map((course) => course.id);
    const { data: chapters, error: chaptersError } = courseIds.length
      ? await supabase.from('chapters').select('id, course_id, title, status, order_index').in('course_id', courseIds).order('order_index')
      : { data: [], error: null };
    if (chaptersError) throw new InternalServerErrorException('Unable to load review chapters');

    const chapterRows = chapters ?? [];
    const chapterIds = chapterRows.map((chapter) => chapter.id);
    const { data: lessons, error: lessonsError } = chapterIds.length
      ? await supabase.from('lessons').select('id, chapter_id, title, status, version, is_ai_generated, order_index').in('chapter_id', chapterIds).order('order_index')
      : { data: [], error: null };
    if (lessonsError) throw new InternalServerErrorException('Unable to load review lessons');

    const lessonsByChapter = new Map<string, typeof lessons>();
    for (const lesson of lessons ?? []) {
      const rows = lessonsByChapter.get(lesson.chapter_id) ?? [];
      rows.push(lesson);
      lessonsByChapter.set(lesson.chapter_id, rows);
    }
    const chaptersByCourse = new Map<string, typeof chapterRows>();
    for (const chapter of chapterRows) {
      const rows = chaptersByCourse.get(chapter.course_id) ?? [];
      rows.push(chapter);
      chaptersByCourse.set(chapter.course_id, rows);
    }

    return courseRows.map((course) => ({
      ...course,
      chapters: (chaptersByCourse.get(course.id) ?? []).map((chapter) => ({
        ...chapter,
        lessons: (lessonsByChapter.get(chapter.id) ?? []).map((lesson) => ({
          ...lesson,
          is_ai_generated: lesson.is_ai_generated ?? false,
        })),
      })),
    }));
  }

  private nextContainerStatus(status: string, action: 'approve' | 'publish' | 'unpublish') {
    const nextStatus = status === 'draft' && action === 'approve' ? 'approved'
      : status === 'approved' && action === 'publish' ? 'published'
        : status === 'published' && action === 'unpublish' ? 'approved' : null;
    if (!nextStatus) throw new ConflictException('Invalid status transition. Use Draft → Approved → Published.');
    return nextStatus;
  }

  async reviewChapterAction(chapterId: string, action: 'approve' | 'publish' | 'unpublish') {
    const supabase = this.supabaseService.getClient();
    const { data: chapter, error: chapterError } = await supabase.from('chapters')
      .select('id, status').eq('id', chapterId).maybeSingle();
    if (chapterError) throw new InternalServerErrorException('Unable to load chapter status');
    if (!chapter) throw new NotFoundException('Chapter not found');
    const nextStatus = this.nextContainerStatus(chapter.status, action);

    if (action === 'publish') {
      const { data: lessons, error } = await supabase.from('lessons').select('status').eq('chapter_id', chapterId);
      if (error) throw new InternalServerErrorException('Unable to verify chapter lessons');
      if (!lessons?.length || lessons.some((lesson) => !['approved', 'published'].includes(lesson.status))) {
        throw new ConflictException('Approve every lesson in this chapter before publishing it.');
      }
    }

    const { data, error } = await supabase.from('chapters').update({ status: nextStatus })
      .eq('id', chapterId).eq('status', chapter.status).select('id, status').maybeSingle();
    if (error) throw new InternalServerErrorException('Unable to save chapter status');
    if (!data) throw new ConflictException('Chapter status changed. Refresh and try again.');
    return data;
  }

  async reviewCourseAction(courseId: string, action: 'approve' | 'publish' | 'unpublish') {
    const supabase = this.supabaseService.getClient();
    const { data: course, error: courseError } = await supabase.from('courses')
      .select('id, status').eq('id', courseId).maybeSingle();
    if (courseError) throw new InternalServerErrorException('Unable to load course status');
    if (!course) throw new NotFoundException('Course not found');
    const nextStatus = this.nextContainerStatus(course.status, action);

    if (action === 'publish') {
      const { data: chapters, error } = await supabase.from('chapters').select('id, status').eq('course_id', courseId);
      if (error) throw new InternalServerErrorException('Unable to verify course chapters');
      if (!chapters?.length || chapters.some((chapter) => !['approved', 'published'].includes(chapter.status))) {
        throw new ConflictException('Approve every chapter before publishing this course.');
      }
      const { data: lessons, error: lessonsError } = await supabase.from('lessons').select('status').in('chapter_id', chapters.map((chapter) => chapter.id));
      if (lessonsError) throw new InternalServerErrorException('Unable to verify course lessons');
      if (lessons?.some((lesson) => !['approved', 'published'].includes(lesson.status))) {
        throw new ConflictException('Approve every lesson before publishing this course.');
      }
    }

    const { data, error } = await supabase.from('courses').update({ status: nextStatus })
      .eq('id', courseId).eq('status', course.status).select('id, status').maybeSingle();
    if (error) throw new InternalServerErrorException('Unable to save course status');
    if (!data) throw new ConflictException('Course status changed. Refresh and try again.');
    return data;
  }

  async updateChapter(courseId: string, chapterId: string, updateChapterDto: UpdateChapterDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('chapters')
      .update({
        title: updateChapterDto.title.trim(),
        description: updateChapterDto.description?.trim() || null,
      })
      .eq('id', chapterId)
      .eq('course_id', courseId)
      .select('id, title, description, order_index, status, course_id')
      .single();

    if (error?.code === 'PGRST116' || !data) {
      throw new NotFoundException('Chapter not found');
    }
    if (error) {
      throw new InternalServerErrorException('Unable to update chapter');
    }

    return data;
  }

  async removeChapter(courseId: string, chapterId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('id')
      .eq('id', chapterId)
      .eq('course_id', courseId)
      .single();

    if (chapterError?.code === 'PGRST116' || !chapter) {
      throw new NotFoundException('Chapter not found');
    }
    if (chapterError) {
      throw new InternalServerErrorException('Unable to validate chapter');
    }

    const { count, error: lessonsError } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('chapter_id', chapterId);

    if (lessonsError) {
      throw new InternalServerErrorException('Unable to check chapter lessons');
    }
    if ((count ?? 0) > 0) {
      throw new ConflictException('Cannot delete a chapter that has lessons');
    }

    const { error } = await supabase.from('chapters').delete().eq('id', chapterId).eq('course_id', courseId);
    if (error) {
      throw new InternalServerErrorException('Unable to delete chapter');
    }

    return { id: chapterId, message: 'Chapter deleted successfully' };
  }

  async reorderChapters(courseId: string, chapterIds: string[]) {
    const supabase = this.supabaseService.getClient();
    const { data: chapters, error } = await supabase
      .from('chapters')
      .select('id')
      .eq('course_id', courseId)
      .in('id', chapterIds);

    if (error) {
      throw new InternalServerErrorException('Unable to validate chapter order');
    }
    if ((chapters ?? []).length !== chapterIds.length) {
      throw new NotFoundException('One or more chapters were not found');
    }

    const updates = await Promise.all(
      chapterIds.map((chapterId, index) =>
        supabase.from('chapters').update({ order_index: index + 1 }).eq('id', chapterId).eq('course_id', courseId),
      ),
    );
    if (updates.some((result) => result.error)) {
      throw new InternalServerErrorException('Unable to save chapter order');
    }

    return { message: 'Chapter order updated successfully' };
  }

  async reorderLessons(courseId: string, chapterId: string, lessonIds: string[]) {
    const supabase = this.supabaseService.getClient();
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('id')
      .eq('chapter_id', chapterId)
      .in('id', lessonIds);

    if (error) {
      throw new InternalServerErrorException('Unable to validate lesson order');
    }
    if ((lessons ?? []).length !== lessonIds.length) {
      throw new NotFoundException('One or more lessons were not found');
    }

    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('id')
      .eq('id', chapterId)
      .eq('course_id', courseId)
      .single();
    if (chapterError?.code === 'PGRST116' || !chapter) {
      throw new NotFoundException('Chapter not found');
    }
    if (chapterError) {
      throw new InternalServerErrorException('Unable to validate chapter');
    }

    const updates = await Promise.all(
      lessonIds.map((lessonId, index) =>
        supabase.from('lessons').update({ order_index: index + 1 }).eq('id', lessonId).eq('chapter_id', chapterId),
      ),
    );
    if (updates.some((result) => result.error)) {
      throw new InternalServerErrorException('Unable to save lesson order');
    }

    return { message: 'Lesson order updated successfully' };
  }

  async createChapter(courseId: string, createChapterDto: CreateChapterDto) {
    const supabase = this.supabaseService.getClient();
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();

    if (courseError?.code === 'PGRST116' || !course) {
      throw new NotFoundException('Course not found');
    }
    if (courseError) {
      throw new InternalServerErrorException('Unable to validate course');
    }

    const { data: lastChapter, error: lastChapterError } = await supabase
      .from('chapters')
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastChapterError) {
      throw new InternalServerErrorException('Unable to determine chapter order');
    }

    const { data, error } = await supabase
      .from('chapters')
      .insert({
        course_id: courseId,
        title: createChapterDto.title.trim(),
        description: createChapterDto.description?.trim() || null,
        order_index: (lastChapter?.order_index ?? 0) + 1,
        status: 'draft',
      })
      .select('id, title, description, order_index, status, course_id, created_at')
      .single();

    if (error) {
      throw new InternalServerErrorException('Unable to create chapter');
    }

    return data;
  }

  async findAll() {
    const supabase = this.supabaseService.getClient();
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, slug, description, level, status, updated_at')
      .order('updated_at', { ascending: false });

    if (coursesError) {
      throw new InternalServerErrorException('Unable to load courses');
    }

    const rows = courses ?? [];
    const courseIds = rows.map((course) => course.id);
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

    const chapterCounts = new Map<string, number>();
    for (const chapter of chapterRows) {
      chapterCounts.set(chapter.course_id, (chapterCounts.get(chapter.course_id) ?? 0) + 1);
    }
    const courseByChapter = new Map(chapterRows.map((chapter) => [chapter.id, chapter.course_id]));
    const lessonCounts = new Map<string, number>();
    for (const lesson of lessons ?? []) {
      const courseId = courseByChapter.get(lesson.chapter_id);
      if (courseId) lessonCounts.set(courseId, (lessonCounts.get(courseId) ?? 0) + 1);
    }

    const statusLabels: Record<string, string> = {
      draft: 'Draft',
      in_review: 'In review',
      approved: 'Approved',
      published: 'Published',
    };

    return rows.map((course) => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description ?? '',
      level: course.level ?? 'Beginner',
      status: statusLabels[course.status] ?? 'Draft',
      chapters: chapterCounts.get(course.id) ?? 0,
      lessons: lessonCounts.get(course.id) ?? 0,
      updated: course.updated_at.slice(0, 10),
      gradient: 'from-[#d9eef0] to-[#fbe8e4]',
    }));
  }

  async findLearnerCourses() {
    const courses = await this.findAll();
    return courses.filter((course) => course.status === 'Published');
  }

  async create(createCourseDto: CreateCourseDto, creatorId: string) {
    const courseFields = createCourseDto;
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('courses')
      .insert({
        ...courseFields,
        title: courseFields.title.trim(),
        slug: courseFields.slug.trim(),
        description: courseFields.description?.trim() || null,
        level: courseFields.level?.toLowerCase() ?? 'beginner',
        thumbnail_url: courseFields.thumbnail_url?.trim() || null,
        created_by: creatorId,
        status: 'draft',
      })
      .select('id, title, slug, description, level, status, thumbnail_url, created_at, updated_at')
      .single();

    if (error?.code === '23505') {
      throw new ConflictException('A course with this slug already exists');
    }

    if (error) {
      throw new InternalServerErrorException('Unable to create course');
    }

    return data;
  }

  async findBySlug(slug: string) {
    const supabase = this.supabaseService.getClient();
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, slug, description, level, status, created_by, thumbnail_url, created_at, updated_at')
      .eq('slug', slug)
      .single();

    if (courseError?.code === 'PGRST116' || !course) {
      throw new NotFoundException('Course not found');
    }
    if (courseError) {
      throw new InternalServerErrorException('Unable to load course');
    }

    const [chaptersResult, questionsResult, authorResult] = await Promise.all([
      supabase.from('chapters').select('id, title, order_index, status').eq('course_id', course.id).order('order_index'),
      supabase.from('questions').select('id').eq('course_id', course.id),
      supabase.auth.admin.getUserById(course.created_by),
    ]);

    if (chaptersResult.error || questionsResult.error) {
      throw new InternalServerErrorException('Unable to load course details');
    }

    const chapterRows = chaptersResult.data ?? [];
    const chapterIds = chapterRows.map((chapter) => chapter.id);
    const { data: lessons, error: lessonsError } = chapterIds.length
      ? await supabase.from('lessons').select('chapter_id').in('chapter_id', chapterIds)
      : { data: [], error: null };

    if (lessonsError) {
      throw new InternalServerErrorException('Unable to load course lessons');
    }

    const lessonsByChapter = new Map<string, number>();
    for (const lesson of lessons ?? []) {
      lessonsByChapter.set(lesson.chapter_id, (lessonsByChapter.get(lesson.chapter_id) ?? 0) + 1);
    }

    const statusLabels: Record<string, string> = {
      draft: 'Draft',
      in_review: 'In review',
      approved: 'Approved',
      published: 'Published',
    };
    const levelLabels: Record<string, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description ?? '',
      level: levelLabels[course.level] ?? 'Beginner',
      status: statusLabels[course.status] ?? 'Draft',
      chapters: chapterRows.length,
      lessons: (lessons ?? []).length,
      questions: (questionsResult.data ?? []).length,
      author: authorResult.data.user?.email ?? 'Unknown author',
      created: course.created_at.slice(0, 10),
      updated: course.updated_at.slice(0, 10),
      thumbnailUrl: course.thumbnail_url,
      gradient: 'from-[#d9eef0] to-[#fbe8e4]',
      chapterList: chapterRows.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        lessons: lessonsByChapter.get(chapter.id) ?? 0,
        status: statusLabels[chapter.status] ?? 'Draft',
      })),
    };
  }

  async findLearnerLessons(slug: string) {
    const supabase = this.supabaseService.getClient();
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, slug, status, level, description, updated_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (courseError?.code === 'PGRST116' || !course) {
      throw new NotFoundException('Course not found');
    }
    if (courseError) {
      throw new InternalServerErrorException('Unable to load course');
    }

    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, title, order_index, status')
      .eq('course_id', course.id)
      .eq('status', 'published')
      .order('order_index', { ascending: true });

    if (chaptersError) {
      throw new InternalServerErrorException('Unable to load course chapters');
    }

    const chapterIds = (chapters ?? []).map((chapter) => chapter.id);
    const { data: lessons, error: lessonsError } = chapterIds.length
      ? await supabase
          .from('lessons')
          .select('id, chapter_id, title, estimated_duration_minutes, order_index, status, content, code_example')
          .in('chapter_id', chapterIds)
          .eq('status', 'published')
          .order('order_index', { ascending: true })
      : { data: [], error: null };

    if (lessonsError) {
      throw new InternalServerErrorException('Unable to load course lessons');
    }

    const lessonsByChapter = new Map<string, typeof lessons>();
    for (const lesson of lessons ?? []) {
      const chapterLessons = lessonsByChapter.get(lesson.chapter_id) ?? [];
      chapterLessons.push(lesson);
      lessonsByChapter.set(lesson.chapter_id, chapterLessons);
    }

    return {
      course,
      chapters: (chapters ?? []).map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        status: chapter.status,
        lessons: (lessonsByChapter.get(chapter.id) ?? []).map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          duration: lesson.estimated_duration_minutes ?? 0,
          status: lesson.status,
          content: lesson.content,
          codeExample: lesson.code_example,
        })),
      })),
    };
  }

  async findLesson(lessonId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, chapter_id, title, content, code_example, estimated_duration_minutes, order_index, status, is_ai_generated, version, created_by, submitted_by, submitted_at, reviewed_by, reviewed_at')
      .eq('id', lessonId)
      .single();

    if (lessonError?.code === 'PGRST116' || !lesson) {
      throw new NotFoundException('Lesson not found');
    }
    if (lessonError) {
      throw new InternalServerErrorException('Unable to load lesson');
    }

    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('id, title, course_id')
      .eq('id', lesson.chapter_id)
      .single();

    if (chapterError || !chapter) {
      throw new InternalServerErrorException('Unable to load lesson chapter');
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, slug')
      .eq('id', chapter.course_id)
      .single();

    if (courseError || !course) {
      throw new InternalServerErrorException('Unable to load lesson course');
    }

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, content, question_type, difficulty, status')
      .eq('lesson_id', lesson.id)
      .order('created_at', { ascending: true });

    if (questionsError) {
      throw new InternalServerErrorException('Unable to load lesson exercises');
    }

    return {
      ...lesson,
      chapter: {
        id: chapter.id,
        title: chapter.title,
      },
      course,
      exercises: (questions ?? []).map((question) => ({
        id: question.id,
        content: question.content,
        type: question.question_type,
        difficulty: question.difficulty,
        status: question.status,
      })),
    };
  }

  async removeLesson(lessonId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, status')
      .eq('id', lessonId)
      .maybeSingle();

    if (lessonError) throw new InternalServerErrorException('Unable to find lesson');
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.status !== 'draft') throw new ConflictException('Only draft lessons can be deleted');

    const relatedTables = [
      'materials',
      'questions',
    ] as const;
    const relatedResults = await Promise.all(
      relatedTables.map((table) =>
        supabase.from(table).select('*', { count: 'exact', head: true }).eq('lesson_id', lessonId),
      ),
    );

    const relatedError = relatedResults.find((result) => result.error);
    if (relatedError?.error) {
      throw new InternalServerErrorException('Unable to check lesson dependencies');
    }

    const blockingTable = relatedTables.find((_, index) => (relatedResults[index].count ?? 0) > 0);
    if (blockingTable) {
      throw new ConflictException(`Lesson cannot be deleted because it has related ${blockingTable.replaceAll('_', ' ')} data`);
    }

    const { error: deleteError } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (deleteError) throw new InternalServerErrorException('Unable to delete lesson');

    return { id: lessonId, message: 'Lesson deleted successfully' };
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    const payload = Object.fromEntries(
      Object.entries(updateCourseDto)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim() : value,
        ]),
    );
    if (payload.level) payload.level = String(payload.level).toLowerCase();
    if (payload.description === '') payload.description = null;

    const { data, error } = await this.supabaseService
      .getClient()
      .from('courses')
      .update(payload)
      .eq('id', id)
      .select('id, title, slug, description, level, status, updated_at')
      .single();

    if (error?.code === '23505') throw new ConflictException('A course with this slug already exists');
    if (error?.code === 'PGRST116' || !data) throw new NotFoundException('Course not found');
    if (error) throw new InternalServerErrorException('Unable to update course');

    return data;
  }

  async remove(id: string) {
    const supabase = this.supabaseService.getClient();
    const [{ count: chapters }, { count: lessons }, { count: questions }] = await Promise.all([
      supabase.from('chapters').select('id', { count: 'exact', head: true }).eq('course_id', id),
      supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('chapter_id', id),
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('course_id', id),
    ]);
    if ((chapters ?? 0) > 0 || (lessons ?? 0) > 0 || (questions ?? 0) > 0) {
      throw new ConflictException('Cannot delete a course that has related content');
    }

    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) throw new InternalServerErrorException('Unable to delete course');
    return { id, message: 'Course deleted successfully' };
  }


  
}
