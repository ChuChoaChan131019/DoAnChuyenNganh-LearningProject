import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';

export interface BookmarkItem {
  id: string;
  learner_id: string;
  target_type: string;
  target_id: string;
  lesson_id?: string;
  is_completed?: boolean;
  created_at: string;
  lessons?: {
    id: string;
    title: string;
    estimated_duration_minutes?: number;
    chapters?: {
      id: string;
      title: string;
      courses?: {
        id: string;
        title: string;
        slug: string;
      };
    };
  };
}

@Injectable()
export class BookmarksService {
  private readonly logger = new Logger(BookmarksService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private isUuid(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }

  // ─── CHECK BOOKMARK ────────────────────────────────────────────────────────
  async checkBookmark(learnerId: string, lessonId: string): Promise<{ isBookmarked: boolean }> {
    if (!lessonId) return { isBookmarked: false };

    if (!this.isUuid(lessonId)) {
      return { isBookmarked: false };
    }

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('learner_id', learnerId)
      .eq('target_type', 'lesson')
      .eq('target_id', lessonId)
      .maybeSingle();

    if (error) {
      this.logger.error('Error checking bookmark', error);
      return { isBookmarked: false };
    }

    return { isBookmarked: !!data };
  }

  // ─── TOGGLE BOOKMARK ───────────────────────────────────────────────────────
  async toggleBookmark(
    learnerId: string,
    lessonId: string,
  ): Promise<{ isBookmarked: boolean; message: string }> {
    if (!lessonId) {
      throw new BadRequestException('Mã bài học (lessonId) không được để trống');
    }

    if (!this.isUuid(lessonId)) {
      throw new BadRequestException('Mã bài học (lessonId) không đúng định dạng UUID');
    }

    const supabase = this.supabaseService.getClient();

    // 1. Kiểm tra bài học có tồn tại không
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title')
      .eq('id', lessonId)
      .maybeSingle();

    if (lessonError) {
      this.logger.error('Error fetching lesson for bookmark', lessonError);
      throw new InternalServerErrorException('Không thể kiểm tra thông tin bài học');
    }
    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }

    // 2. Kiểm tra đã bookmark chưa (target_type = 'lesson', target_id = lessonId)
    const { data: existing, error: existingError } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('learner_id', learnerId)
      .eq('target_type', 'lesson')
      .eq('target_id', lessonId)
      .maybeSingle();

    if (existingError) {
      this.logger.error('Error checking existing bookmark', existingError);
      throw new InternalServerErrorException('Không thể kiểm tra trạng thái bookmark');
    }

    if (existing) {
      // Đã có -> Xóa bookmark (Bỏ lưu)
      const { error: deleteError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        this.logger.error('Error removing bookmark', deleteError);
        throw new InternalServerErrorException('Không thể bỏ lưu bài học');
      }

      return {
        isBookmarked: false,
        message: 'Đã bỏ lưu bài học',
      };
    }

    // Chưa có -> Tạo mới bookmark (target_type = 'lesson', target_id = lessonId)
    const { error: insertError } = await supabase.from('bookmarks').insert({
      learner_id: learnerId,
      target_type: 'lesson',
      target_id: lessonId,
    });

    if (insertError) {
      this.logger.error('Error creating bookmark', insertError);
      throw new InternalServerErrorException('Không thể lưu bài học');
    }

    return {
      isBookmarked: true,
      message: 'Đã lưu bài học vào danh mục yêu thích',
    };
  }

  // ─── LIST BOOKMARKS ────────────────────────────────────────────────────────
  async listBookmarks(learnerId: string): Promise<any[]> {
    const supabase = this.supabaseService.getClient();

    // 1. Lấy danh sách bookmark của học viên theo learner_id
    const { data: bookmarkRows, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('id, created_at, target_type, target_id')
      .eq('learner_id', learnerId)
      .order('created_at', { ascending: false });

    if (bookmarksError) {
      this.logger.error('Error fetching bookmarks list', bookmarksError);
      return [];
    }

    if (!bookmarkRows || bookmarkRows.length === 0) {
      return [];
    }

    // 2. Lấy danh sách bài học tương ứng với các bookmark có target_type = 'lesson'
    const lessonBookmarks = bookmarkRows.filter((b) => b.target_type === 'lesson' && b.target_id);
    const lessonIds = [...new Set(lessonBookmarks.map((b) => b.target_id))];

    const lessonsMap = new Map<string, any>();
    const completedLessonSet = new Set<string>();

    if (lessonIds.length > 0) {
      // 2.1 Thông tin bài học, chương, khóa học
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          estimated_duration_minutes,
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
        .in('id', lessonIds);

      if (lessonsError) {
        this.logger.error('Error fetching lessons for bookmarks', lessonsError);
      } else {
        for (const lesson of lessons ?? []) {
          lessonsMap.set(lesson.id, lesson);
        }
      }

      // 2.2 Kiểm tra bài học đã hoàn thành chưa từ bảng lesson_progress
      const { data: progressRows, error: progressError } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('learner_id', learnerId)
        .in('lesson_id', lessonIds);

      if (progressError) {
        this.logger.error('Error fetching lesson progress for bookmarks', progressError);
      } else {
        for (const row of progressRows ?? []) {
          if (row.lesson_id) {
            completedLessonSet.add(row.lesson_id);
          }
        }
      }
    }

    // 3. Ghép thông tin bài học và trạng thái hoàn thành vào kết quả trả về
    return bookmarkRows.map((b) => ({
      id: b.id,
      created_at: b.created_at,
      target_type: b.target_type,
      target_id: b.target_id,
      lesson_id: b.target_id, // Tương thích ngược với Frontend
      is_completed: completedLessonSet.has(b.target_id),
      lessons: lessonsMap.get(b.target_id) || null,
    }));
  }
}
