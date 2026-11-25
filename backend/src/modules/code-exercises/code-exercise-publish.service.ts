import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../config/supabase.service.js';
import { CodeExercisesService } from './code-exercises.service.js';
import { CsharpRunnerService } from './csharp-runner.service.js';
import { codeOutputMatches } from './code-exercise-output.js';

type Actor = {
  id: string;
  role: string;
};

type TestCase = {
  input: string;
  expected_output: string;
  is_public: boolean;
};

type CaseResult = {
  index: number;
  is_public: boolean;
  status: string;
  expected_output: string;
  actual_output: string;
  stderr: string;
};

@Injectable()
export class CodeExercisePublishService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly exercises: CodeExercisesService,
    private readonly runner: CsharpRunnerService,
  ) {}

  // Bài thực hành chỉ được xuất bản khi
  // khóa học, chương và bài học đã xuất bản.
  private async checkPublishedLesson(lessonId: string): Promise<void> {
    const db = this.supabase.getClient();

    const { data: lesson, error: lessonError } = await db
      .from('lessons')
      .select('id, chapter_id, status')
      .eq('id', lessonId)
      .maybeSingle();

    if (lessonError) {
      throw new InternalServerErrorException('Không thể kiểm tra bài học');
    }

    if (!lesson || lesson.status !== 'published') {
      throw new BadRequestException('Bài học liên quan chưa được xuất bản');
    }

    const { data: chapter, error: chapterError } = await db
      .from('chapters')
      .select('id, course_id, status')
      .eq('id', lesson.chapter_id)
      .maybeSingle();

    if (chapterError) {
      throw new InternalServerErrorException('Không thể kiểm tra chương');
    }

    if (!chapter || chapter.status !== 'published') {
      throw new BadRequestException('Chương liên quan chưa được xuất bản');
    }

    const { data: course, error: courseError } = await db
      .from('courses')
      .select('id, status')
      .eq('id', chapter.course_id)
      .maybeSingle();

    if (courseError) {
      throw new InternalServerErrorException('Không thể kiểm tra khóa học');
    }

    if (!course || course.status !== 'published') {
      throw new BadRequestException('Khóa học liên quan chưa được xuất bản');
    }
  }

  async validate(id: string, actor: Actor, expectedVersion: number) {
    // Mọi content manager và admin đều có thể kiểm tra bài đã tạo.
    const detail = await this.exercises.findOne(id, actor);

    return this.validateSnapshot(detail, expectedVersion);
  }

  private async validateSnapshot(
    detail: Awaited<ReturnType<CodeExercisesService['findOne']>>,
    expectedVersion: number,
  ) {
    if (detail.archived_at) {
      throw new NotFoundException('Bài thực hành đã được lưu trữ');
    }

    const revision = detail.revision;

    if (revision.status !== 'draft') {
      throw new ConflictException(
        'Hãy tạo hoặc lưu bản nháp trước khi kiểm tra',
      );
    }

    if (revision.edit_version !== expectedVersion) {
      throw new ConflictException(
        'Bản nháp đã thay đổi. Hãy tải lại trước khi kiểm tra.',
      );
    }

    const tests = revision.test_cases as TestCase[];
    const errors: string[] = [];

    // Kiểm tra nội dung bắt buộc.
    const requiredFields = [
      { value: revision.title, label: 'Tiêu đề' },
      { value: revision.objective, label: 'Mục tiêu' },
      { value: revision.description, label: 'Mô tả' },
      { value: revision.input_format, label: 'Định dạng đầu vào' },
      { value: revision.output_format, label: 'Định dạng đầu ra' },
      { value: revision.hint_1, label: 'Gợi ý mức 1' },
      { value: revision.hint_2, label: 'Gợi ý mức 2' },
      { value: revision.hint_3, label: 'Gợi ý mức 3' },
      { value: revision.solution_code, label: 'Mã lời giải' },
      {
        value: revision.solution_explanation,
        label: 'Giải thích lời giải',
      },
    ];

    for (const field of requiredFields) {
      if (!String(field.value ?? '').trim()) {
        errors.push(`Thiếu ${field.label.toLowerCase()}.`);
      }
    }

    if (!tests.some((test) => test.is_public)) {
      errors.push('Phải có ít nhất một test công khai.');
    }

    if (!tests.some((test) => !test.is_public)) {
      errors.push('Phải có ít nhất một test ẩn.');
    }

    // Giới hạn tạm thời cho lần kiểm tra đồng bộ:
    // mỗi test cần khởi tạo runner C03 riêng.
    if (tests.length > 20) {
      errors.push(
        'Phiên bản C04 hiện hỗ trợ tối đa 20 test khi kiểm tra xuất bản.',
      );
    }

    if (
      Buffer.byteLength(String(revision.solution_code ?? ''), 'utf8') >
      64 * 1024
    ) {
      errors.push('Mã lời giải vượt giới hạn runner C03.');
    }

    tests.forEach((test, index) => {
      if (Buffer.byteLength(test.input, 'utf8') > 16 * 1024) {
        errors.push(`Test ${index + 1} có đầu vào quá 16 KiB.`);
      }
    });

    if (errors.length) {
      return {
        can_publish: false,
        errors,
        cases: [] as CaseResult[],
      };
    }

    await this.checkPublishedLesson(detail.lesson_id);

    const results: CaseResult[] = [];

    // Chạy lần lượt để không vượt giới hạn
    // container song song của C03.
    for (const [index, test] of tests.entries()) {
      const execution = await this.runner.run(
        revision.solution_code,
        test.input,
      );

      const passed =
        execution.status === 'success' &&
        codeOutputMatches(execution.stdout, test.expected_output);

      results.push({
        index: index + 1,
        is_public: test.is_public,
        status: passed
          ? 'passed'
          : execution.status === 'success'
            ? 'wrong_answer'
            : execution.status,
        expected_output: test.expected_output,
        actual_output: execution.stdout,
        stderr: execution.stderr,
      });
    }

    return {
      can_publish:
        results.length === tests.length &&
        results.every((item) => item.status === 'passed'),
      errors: [] as string[],
      cases: results,
    };
  }

  async publish(id: string, actor: Actor, expectedVersion: number) {
    // Bắt buộc chạy kiểm tra lại trên server.
    // Không tin kết quả can_publish từ trình duyệt.
    const detail = await this.exercises.findOne(id, actor);
    const validation = await this.validateSnapshot(detail, expectedVersion);

    if (!validation.can_publish) {
      throw new BadRequestException(
        validation.errors[0] ??
          'Lời giải tham khảo chưa vượt qua tất cả bộ kiểm tra.',
      );
    }

    // RPC xuất bản nguyên tử: lock bài,
    // kiểm tra phiên bản, chuyển published cũ
    // thành superseded, rồi cập nhật published mới.
    // Giữ đúng revision đã chạy kiểm tra. Nếu nó đã được xuất bản hoặc
    // thay đổi trong lúc runner chạy, RPC phải từ chối thay vì lấy nháp mới.

    const { data, error } = await this.supabase
      .getClient()
      .rpc('publish_code_exercise_draft', {
        p_actor_id: actor.id,
        p_exercise_id: id,
        p_revision_id: detail.revision.id,
        p_expected_edit_version: expectedVersion,
      });

    if (error) {
      switch (error.code) {
        case '42501':
          throw new BadRequestException('Không có quyền xuất bản bài này');
        case 'P0002':
          throw new NotFoundException('Không tìm thấy bản nháp cần xuất bản');
        case 'PT409':
        case '23505':
          throw new ConflictException(
            'Bản nháp hoặc trạng thái xuất bản đã thay đổi. Hãy tải lại.',
          );
        case '22023':
          throw new BadRequestException(
            'Nội dung bài chưa đáp ứng điều kiện xuất bản.',
          );
        default:
          throw new InternalServerErrorException(
            'Không thể xuất bản bài thực hành',
          );
      }
    }

    return data;
  }
}
