import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../config/supabase.service.js';
import {
  SaveCodeExerciseDto,
  UpdateCodeExerciseDto,
} from './dto/save-code-exercise.dto.js';

type Actor = {
  id: string;
  role: string;
};

type DbError = {
  code?: string;
  message: string;
};

@Injectable()
export class CodeExercisesService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  // Chuyển lỗi PostgreSQL thành HTTP exception
  private databaseError(error: DbError): never {
    switch (error.code) {
      case 'P0002':
        throw new NotFoundException(error.message);

      case '42501':
        throw new ForbiddenException('Bạn không có quyền thao tác');

      case 'PT409':
      case '23505':
        throw new ConflictException(error.message);

      case '23502':
      case '23503':
      case '23514':
      case '22023':
      case '22P02':
        throw new BadRequestException('Dữ liệu không hợp lệ');

      default:
        throw new InternalServerErrorException(
          'Không thể xử lý dữ liệu bài thực hành',
        );
    }
  }

  // 1. Danh sách bài của người biên soạn
  async findAll(
    actor: Actor,
    lessonId?: string,
    search?: string,
  ) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('code_exercises')
      .select(`
        id,
        lesson_id,
        created_by,
        published_revision_id,
        archived_at,
        created_at,
        updated_at
      `)
      .is('archived_at', null)
      .order('updated_at', { ascending: false });

    // Content manager chỉ quản lý bài của mình
    // Admin được xem tất cả
    if (actor.role !== 'admin') {
      query = query.eq('created_by', actor.id);
    }

    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }

    const { data: exercises, error } = await query;

    if (error) this.databaseError(error);
    if (!exercises?.length) return [];

    const ids = exercises.map((item) => item.id);

    const { data: revisions, error: revisionError } =
      await supabase
        .from('code_exercise_revisions')
        .select(`
          id,
          exercise_id,
          revision_no,
          title,
          difficulty,
          status,
          edit_version
        `)
        .in('exercise_id', ids)
        .in('status', ['draft', 'published'])
        .order('revision_no', { ascending: false });

    if (revisionError) {
      this.databaseError(revisionError);
    }

    return exercises
      .map((exercise) => {
        const related = (revisions ?? []).filter(
          (r) => r.exercise_id === exercise.id,
        );

        const draft = related.find(
          (r) => r.status === 'draft',
        );

        const published = related.find(
          (r) => r.id === exercise.published_revision_id,
        );

        const current = draft ?? published ?? related[0];

        return {
          ...exercise,
          title: current?.title ?? '',
          difficulty: current?.difficulty ?? 'easy',
          status: current?.status ?? 'draft',
          revision_no: current?.revision_no ?? 1,
          edit_version: current?.edit_version ?? 1,
          has_draft: Boolean(draft),
          is_published: Boolean(
            exercise.published_revision_id,
          ),
        };
      })
      .filter((item) => {
        if (!search) return true;

        return item.title
          .toLowerCase()
          .includes(search.toLowerCase().trim());
      });
  }

  // 2. Lấy toàn bộ chi tiết của một bài
  async findOne(id: string, actor: Actor) {
    const supabase = this.supabaseService.getClient();

    const { data: exercise, error } = await supabase
      .from('code_exercises')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) this.databaseError(error);

    if (!exercise) {
      throw new NotFoundException(
        'Không tìm thấy bài thực hành',
      );
    }

    // Không cho content manager đọc bài của người khác
    if (
      actor.role !== 'admin' &&
      exercise.created_by !== actor.id
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền xem bài này',
      );
    }

    const { data: revisions, error: revisionError } =
      await supabase
        .from('code_exercise_revisions')
        .select('*')
        .eq('exercise_id', id)
        .order('revision_no', { ascending: false });

    if (revisionError) {
      this.databaseError(revisionError);
    }

    const rows = revisions ?? [];

    // Ưu tiên hiển thị nháp đang sửa
    const activeRevision =
      rows.find((r) => r.status === 'draft') ??
      rows.find(
        (r) => r.id === exercise.published_revision_id,
      ) ??
      rows[0];

    if (!activeRevision) {
      throw new NotFoundException(
        'Bài thực hành chưa có phiên bản',
      );
    }

    const { data: testCases, error: testError } =
      await supabase
        .from('code_test_cases')
        .select(`
          id,
          input_text,
          expected_output,
          is_public,
          order_index
        `)
        .eq('revision_id', activeRevision.id)
        .order('order_index');

    if (testError) this.databaseError(testError);

    return {
      ...exercise,
      revision: {
        ...activeRevision,
        test_cases: (testCases ?? []).map((t) => ({
          id: t.id,
          input: t.input_text,
          expected_output: t.expected_output,
          is_public: t.is_public,
          order_index: t.order_index,
        })),
      },
      revisions: rows.map((r) => ({
        id: r.id,
        revision_no: r.revision_no,
        status: r.status,
        edit_version: r.edit_version,
      })),
    };
  }

  // 3. Tạo bài mới ở trạng thái draft
  async create(
    dto: SaveCodeExerciseDto,
    actor: Actor,
  ) {
    const { data, error } =
      await this.supabaseService
        .getClient()
        .rpc('save_code_exercise_draft', {
          p_actor_id: actor.id,
          p_payload: dto,
          p_exercise_id: null,
          p_expected_version: 0,
        });

    if (error) this.databaseError(error);

    return data;
  }

  // 4. Lưu nội dung + test cases + gợi ý + lời giải
  async updateDraft(
    id: string,
    dto: UpdateCodeExerciseDto,
    actor: Actor,
  ) {
    const { edit_version, ...payload } = dto;

    const { data, error } =
      await this.supabaseService
        .getClient()
        .rpc('save_code_exercise_draft', {
          p_actor_id: actor.id,
          p_payload: payload,
          p_exercise_id: id,
          p_expected_version: edit_version,
        });

    if (error) this.databaseError(error);

    return data;
  }

  // 5. Sao chép một bài thành nháp mới
  async copy(id: string, actor: Actor) {
    const original = await this.findOne(id, actor);
    const r = original.revision;

    const payload: SaveCodeExerciseDto = {
      lesson_id: original.lesson_id,
      title: `${r.title.slice(0, 145)} (bản sao)`,
      difficulty: r.difficulty,
      objective: r.objective,
      description: r.description,
      input_format: r.input_format,
      output_format: r.output_format,
      starter_code: r.starter_code,
      hint_1: r.hint_1,
      hint_2: r.hint_2,
      hint_3: r.hint_3,
      solution_code: r.solution_code,
      solution_explanation: r.solution_explanation,
      test_cases: r.test_cases.map((t: {
        input: string;
        expected_output: string;
        is_public: boolean;
      }) => ({
        input: t.input,
        expected_output: t.expected_output,
        is_public: t.is_public,
      })),
    };

    return this.create(payload, actor);
  }

  // 6. Lưu trữ bài thay vì xóa hẳn
  async archive(id: string, actor: Actor) {
    const exercise = await this.findOne(id, actor);

    if (exercise.archived_at) {
      throw new ConflictException(
        'Bài đã được lưu trữ trước đó',
      );
    }

    const { error } = await this.supabaseService
      .getClient()
      .from('code_exercises')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) this.databaseError(error);

    return {
      id,
      archived: true,
    };
  }
}