import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ─── ENROLL ─────────────────────────────────────────────────────────────────

  async enroll(learnerId: string, courseId: string) {
    const supabase = this.supabaseService.getClient();

    // Kiểm tra khóa học tồn tại và đã published
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, status')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError) {
      this.logger.error('Error fetching course', courseError);
      throw new InternalServerErrorException('Không thể kiểm tra thông tin khóa học');
    }
    if (!course) {
      throw new NotFoundException('Khóa học không tồn tại');
    }
    if (course.status !== 'published') {
      throw new ForbiddenException('Khóa học này chưa được phát hành');
    }

    // Kiểm tra đã enroll chưa
    const { data: existing, error: existingError } = await supabase
      .from('course_enrollments')
      .select('id, status')
      .eq('learner_id', learnerId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingError) {
      this.logger.error('Error checking existing enrollment', existingError);
      throw new InternalServerErrorException('Không thể kiểm tra trạng thái đăng ký');
    }

    // Đã active rồi → idempotent, trả về ngay
    if (existing && existing.status === 'active') {
      return {
        courseId,
        learnerId,
        status: 'active',
        message: 'Bạn đã đăng ký khóa học này rồi',
      };
    }

    // Đã có nhưng status = 'left' → reactivate
    if (existing && existing.status === 'left') {
      const { error: updateError } = await supabase
        .from('course_enrollments')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (updateError) {
        this.logger.error('Error reactivating enrollment', updateError);
        throw new InternalServerErrorException('Không thể đăng ký lại khóa học');
      }

      return {
        courseId,
        learnerId,
        status: 'active',
        message: 'Đăng ký khóa học thành công',
      };
    }

    // Chưa có → insert mới
    const { error: insertError } = await supabase
      .from('course_enrollments')
      .insert({
        learner_id: learnerId,
        course_id: courseId,
        status: 'active',
      });

    if (insertError) {
      this.logger.error('Error inserting enrollment', insertError);
      throw new InternalServerErrorException('Không thể đăng ký khóa học');
    }

    return {
      courseId,
      learnerId,
      status: 'active',
      message: 'Đăng ký khóa học thành công',
    };
  }

  // ─── CHECK ENROLLMENT ────────────────────────────────────────────────────────

  async checkEnrollment(learnerId: string, courseId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('course_enrollments')
      .select('id, status')
      .eq('learner_id', learnerId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (error) {
      this.logger.error('Error checking enrollment', error);
      throw new InternalServerErrorException('Không thể kiểm tra trạng thái đăng ký');
    }

    if (!data) {
      return { isEnrolled: false, status: null };
    }

    return {
      isEnrolled: data.status === 'active',
      status: data.status as 'active' | 'left',
    };
  }

  // ─── COMPLETE LESSON ─────────────────────────────────────────────────────────

  async completeLesson(learnerId: string, lessonId: string, courseId: string) {
    const supabase = this.supabaseService.getClient();

    // Kiểm tra learner đã enroll chưa (Phương án B)
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select('id, status')
      .eq('learner_id', learnerId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (enrollmentError) {
      this.logger.error('Error checking enrollment for lesson complete', enrollmentError);
      throw new InternalServerErrorException('Không thể xác thực đăng ký');
    }

    if (!enrollment || enrollment.status !== 'active') {
      throw new ForbiddenException('Bạn cần đăng ký khóa học trước khi đánh dấu hoàn thành bài học');
    }

    // Kiểm tra đã complete chưa (idempotent)
    const { data: existing, error: existingError } = await supabase
      .from('lesson_progress')
      .select('id, completed_at')
      .eq('learner_id', learnerId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (existingError) {
      this.logger.error('Error checking lesson progress', existingError);
      throw new InternalServerErrorException('Không thể kiểm tra tiến độ bài học');
    }

    if (existing) {
      return {
        lessonId,
        courseId,
        completedAt: existing.completed_at,
        alreadyCompleted: true,
      };
    }

    // Insert mới
    const completedAt = new Date().toISOString();
    const { error: insertError } = await supabase
      .from('lesson_progress')
      .insert({
        learner_id: learnerId,
        lesson_id: lessonId,
        course_id: courseId,
        completed_at: completedAt,
      });

    if (insertError) {
      this.logger.error('Error inserting lesson progress', insertError);
      throw new InternalServerErrorException('Không thể lưu tiến độ bài học');
    }

    return {
      lessonId,
      courseId,
      completedAt,
      alreadyCompleted: false,
    };
  }

  // ─── GET COMPLETED LESSONS ───────────────────────────────────────────────────

  async getCompletedLessons(learnerId: string, courseId: string): Promise<string[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('learner_id', learnerId)
      .eq('course_id', courseId);

    if (error) {
      this.logger.error('Error fetching completed lessons', error);
      throw new InternalServerErrorException('Không thể tải tiến độ khóa học');
    }

    return (data ?? []).map((row) => row.lesson_id as string);
  }
}
