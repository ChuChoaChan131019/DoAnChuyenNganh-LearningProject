import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../config/supabase.service.js';
import {
  decodeCodeExerciseCursor,
  encodeCodeExerciseCursor,
} from './code-exercise-cursor.js';
import { ListLearnerCodeExercisesDto } from './dto/list-learner-code-exercises.dto.js';
import { SaveLearnerCodeDto } from './dto/save-learner-code.dto.js';

type DbError = {
  code?: string;
  message?: string;
};

type LearnerExerciseRow = {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  course_id: string;
  course_slug: string;
  course_title: string;
  chapter_id: string;
  chapter_title: string;
  lesson_id: string;
  lesson_title: string;
  published_revision_id: string;
  progress_status: 'not_started' | 'in_progress' | 'completed';
  requires_resubmission: boolean;
  last_saved_at: string | null;
  published_updated_at: string;
};

@Injectable()
export class LearnerCodeExercisesService {
  private readonly logger = new Logger(LearnerCodeExercisesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private databaseError(error: DbError): never {
    this.logger.error(
      `Database request failed (${error.code || 'UNKNOWN'}): ${error.message || 'No message'}`,
    );
    switch (error.code) {
      case 'P0002':
      case 'PGRST116':
        throw new NotFoundException('Bài thực hành không còn khả dụng');
      case '42501':
        throw new ForbiddenException('Bạn không có quyền truy cập chức năng này');
      case 'PT409':
      case '23505':
        throw new ConflictException(
          error.message || 'Mã đã được cập nhật ở một phiên khác',
        );
      case '22023':
      case '22P02':
      case '23503':
      case '23514':
        throw new BadRequestException('Dữ liệu bài thực hành không hợp lệ');
      default:
        throw new InternalServerErrorException(
          'Không thể xử lý dữ liệu phòng thực hành',
        );
    }
  }

  async findAll(query: ListLearnerCodeExercisesDto, learnerId: string) {
    const cursor = decodeCodeExerciseCursor(query.cursor);
    const pageSize = query.limit ?? 20;
    const { data, error } = await this.supabaseService.getClient().rpc(
      'list_learner_code_exercises',
      {
        p_actor_id: learnerId,
        p_search: query.search?.trim() || null,
        p_course_id: query.course_id ?? null,
        p_chapter_id: query.chapter_id ?? null,
        p_lesson_id: query.lesson_id ?? null,
        p_difficulty: query.difficulty ?? null,
        p_progress_status: query.progress_status ?? null,
        p_cursor_updated_at: cursor?.updated_at ?? null,
        p_cursor_id: cursor?.id ?? null,
        p_limit: pageSize + 1,
      },
    );

    if (error) this.databaseError(error);

    const rows = (data ?? []) as LearnerExerciseRow[];
    const hasMore = rows.length > pageSize;
    const items = rows.slice(0, pageSize).map((row) => ({
      id: row.id,
      title: row.title,
      difficulty: row.difficulty,
      course: {
        id: row.course_id,
        slug: row.course_slug,
        title: row.course_title,
      },
      chapter: { id: row.chapter_id, title: row.chapter_title },
      lesson: { id: row.lesson_id, title: row.lesson_title },
      published_revision_id: row.published_revision_id,
      progress_status: row.progress_status,
      requires_resubmission: row.requires_resubmission,
      last_saved_at: row.last_saved_at,
    }));
    const last = hasMore ? rows[pageSize - 1] : null;

    return {
      items,
      next_cursor: last
        ? encodeCodeExerciseCursor({
          updated_at: last.published_updated_at,
          id: last.id,
        })
        : null,
    };
  }

  async findOne(exerciseId: string, learnerId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: exercise, error: exerciseError } = await supabase
      .from('code_exercises')
      .select('id, lesson_id, published_revision_id, archived_at')
      .eq('id', exerciseId)
      .is('archived_at', null)
      .maybeSingle();

    if (exerciseError) this.databaseError(exerciseError);
    if (!exercise?.published_revision_id) {
      throw new NotFoundException('Bài thực hành không còn khả dụng');
    }

    const { data: revision, error: revisionError } = await supabase
      .from('code_exercise_revisions')
      .select(`
        id,
        revision_no,
        title,
        objective,
        description,
        difficulty,
        input_format,
        output_format,
        starter_code,
        hint_1,
        hint_2,
        hint_3
      `)
      .eq('id', exercise.published_revision_id)
      .eq('exercise_id', exercise.id)
      .eq('status', 'published')
      .maybeSingle();

    if (revisionError) this.databaseError(revisionError);
    if (!revision) {
      throw new NotFoundException('Bài thực hành không còn khả dụng');
    }

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, chapter_id')
      .eq('id', exercise.lesson_id)
      .eq('status', 'published')
      .maybeSingle();
    if (lessonError) this.databaseError(lessonError);
    if (!lesson) throw new NotFoundException('Bài học không còn khả dụng');

    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('id, title, course_id')
      .eq('id', lesson.chapter_id)
      .eq('status', 'published')
      .maybeSingle();
    if (chapterError) this.databaseError(chapterError);
    if (!chapter) throw new NotFoundException('Chương không còn khả dụng');

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, slug')
      .eq('id', chapter.course_id)
      .eq('status', 'published')
      .maybeSingle();
    if (courseError) this.databaseError(courseError);
    if (!course) throw new NotFoundException('Khóa học không còn khả dụng');

    const [examplesResult, progressResult, submissionResult] = await Promise.all([
      supabase
        .from('code_test_cases')
        .select('id, input_text, expected_output, order_index')
        .eq('revision_id', revision.id)
        .eq('is_public', true)
        .order('order_index', { ascending: true }),
      supabase
        .from('code_exercise_progress')
        .select(`
          saved_code,
          save_version,
          status,
          run_count,
          highest_hint_level,
          last_seen_revision_id,
          completed_revision_id,
          updated_at
        `)
        .eq('learner_id', learnerId)
        .eq('exercise_id', exercise.id)
        .maybeSingle(),
      supabase
        .from('code_exercise_submissions')
        .select('id, revision_id, total_cases, passed_cases, all_passed, created_at')
        .eq('learner_id', learnerId)
        .eq('exercise_id', exercise.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (examplesResult.error) this.databaseError(examplesResult.error);
    if (progressResult.error) this.databaseError(progressResult.error);
    if (submissionResult?.error) this.databaseError(submissionResult.error);

    const progress = progressResult.data;
    const lastSubmission = submissionResult?.data ?? null;
    // Chỉ trả những gợi ý học sinh đã tự mở, đúng thứ tự.
    const hintTexts = [revision.hint_1, revision.hint_2, revision.hint_3];
    const openedHints = hintTexts
      .slice(0, progress?.highest_hint_level ?? 0)
      .map((hint, index) => ({ level: index + 1, hint }));
    const progressStatus = !progress
      ? 'not_started'
      : progress.completed_revision_id === revision.id
        ? 'completed'
        : 'in_progress';

    return {
      id: exercise.id,
      title: revision.title,
      objective: revision.objective,
      description: revision.description,
      difficulty: revision.difficulty,
      input_format: revision.input_format,
      output_format: revision.output_format,
      starter_code: revision.starter_code,
      published_revision: {
        id: revision.id,
        revision_no: revision.revision_no,
      },
      course,
      chapter: { id: chapter.id, title: chapter.title },
      lesson: { id: lesson.id, title: lesson.title },
      public_examples: (examplesResult.data ?? []).map((example) => ({
        id: example.id,
        input: example.input_text,
        expected_output: example.expected_output,
        order_index: example.order_index,
      })),
      progress: {
        has_saved_code: Boolean(progress),
        saved_code: progress?.saved_code ?? '',
        save_version: progress?.save_version ?? 0,
        status: progressStatus,
        last_seen_revision_id: progress?.last_seen_revision_id ?? null,
        requires_resubmission: Boolean(
          progress?.completed_revision_id
          && progress.completed_revision_id !== revision.id,
        ),
        updated_at: progress?.updated_at ?? null,
        run_count: progress?.run_count ?? 0,
        highest_hint_level: progress?.highest_hint_level ?? 0,
      },
      hints: { total: 3, opened: openedHints },
      last_submission: lastSubmission
        ? {
          id: lastSubmission.id,
          revision_id: lastSubmission.revision_id,
          total_cases: lastSubmission.total_cases,
          passed_cases: lastSubmission.passed_cases,
          all_passed: lastSubmission.all_passed,
          submitted_at: lastSubmission.created_at,
        }
        : null,
    };
  }

  async saveCode(
    exerciseId: string,
    dto: SaveLearnerCodeDto,
    learnerId: string,
  ) {
    const { data, error } = await this.supabaseService.getClient().rpc(
      'save_learner_code_progress',
      {
        p_actor_id: learnerId,
        p_exercise_id: exerciseId,
        p_code: dto.code,
        p_expected_version: dto.expected_save_version,
      },
    );

    if (error) this.databaseError(error);
    return data;
  }

  // C07: đếm một lượt chạy (đầu vào tự nhập hoặc chạy thử test công khai).
  // Lỗi ghi bộ đếm không được làm mất kết quả chạy đã có của học sinh.
  async recordRun(exerciseId: string, learnerId: string) {
    const { error } = await this.supabaseService.getClient().rpc(
      'record_code_exercise_run',
      { p_actor_id: learnerId, p_exercise_id: exerciseId },
    );
    if (error) {
      this.logger.warn(
        `Không thể ghi số lần chạy (${error.code || 'UNKNOWN'}): ${error.message || ''}`,
      );
    }
  }

  // C07: mở gợi ý theo thứ tự 1 -> 2 -> 3 và nhớ mức cao nhất theo học sinh.
  async openHint(exerciseId: string, level: number, learnerId: string) {
    const { data, error } = await this.supabaseService.getClient().rpc(
      'open_code_exercise_hint',
      {
        p_actor_id: learnerId,
        p_exercise_id: exerciseId,
        p_level: level,
      },
    );
    if (error) {
      if (error.code === 'PT409') {
        throw new ConflictException('Hãy mở các gợi ý theo thứ tự từ mức 1.');
      }
      this.databaseError(error);
    }
    return data;
  }

  // C07: lưu lần nộp và trạng thái hoàn thành.
  async recordSubmission(
    exerciseId: string,
    learnerId: string,
    submission: {
      revisionId: string;
      code: string;
      totalCases: number;
      passedCases: number;
      results: unknown;
    },
  ) {
    const { data, error } = await this.supabaseService.getClient().rpc(
      'submit_code_exercise',
      {
        p_actor_id: learnerId,
        p_exercise_id: exerciseId,
        p_revision_id: submission.revisionId,
        p_code: submission.code,
        p_total_cases: submission.totalCases,
        p_passed_cases: submission.passedCases,
        p_results: submission.results,
      },
    );
    if (error) {
      if (error.code === 'PT409') {
        throw new ConflictException(
          'Đề bài đã có phiên bản mới. Hãy tải lại đề trước khi nộp.',
        );
      }
      this.databaseError(error);
    }
    return data;
  }
}
