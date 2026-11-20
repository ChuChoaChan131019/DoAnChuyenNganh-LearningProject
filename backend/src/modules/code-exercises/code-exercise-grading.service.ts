import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { SupabaseService } from '../../config/supabase.service.js';
import { CsharpRunnerService } from './csharp-runner.service.js';
import type { CsharpRunResult } from './csharp-runner.service.js';

import { LearnerCodeExercisesService } from './learner-code-exercises.service.js';
import { codeOutputMatches } from './code-exercise-output.js';

export type GradeMode = 'public' | 'all';

export type GradeStatus =
  | 'passed'
  | 'wrong_answer'
  | 'compile_error'
  | 'runtime_error'
  | 'time_limit'
  | 'resource_limit'
  | 'output_limit'
  | 'not_run';

type TestCaseRow = {
  order_index: number;
  input_text: string;
  expected_output: string;
  is_public: boolean;
};

export type GradedCase = {
  index: number;
  is_public: boolean;
  status: GradeStatus;
  message: string;

  // Chỉ tồn tại đối với test công khai.
  input?: string;
  expected_output?: string;
  actual_output?: string;
  stderr?: string;
};

export type GradingResponse = {
  exercise_id: string;
  revision_id: string;
  mode: GradeMode;
  total_cases: number;
  passed_cases: number;
  all_passed: boolean;
  cases: GradedCase[];
};

// C04 hiện cũng hỗ trợ tối đa 20 test đồng bộ.
const MAX_TEST_CASES = 20;

function statusMessage(status: GradeStatus): string {
  switch (status) {
    case 'passed':
      return 'Đạt';
    case 'wrong_answer':
      return 'Sai kết quả';
    case 'compile_error':
      return 'Lỗi biên dịch';
    case 'runtime_error':
      return 'Lỗi khi chạy';
    case 'time_limit':
      return 'Hết thời gian';
    case 'resource_limit':
      return 'Vượt giới hạn tài nguyên';
    case 'output_limit':
      return 'Vượt giới hạn đầu ra';
    case 'not_run':
      return 'Chưa chạy do mã biên dịch không thành công';
  }
}

@Injectable()
export class CodeExerciseGradingService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly learnerExercises: LearnerCodeExercisesService,
    private readonly runner: CsharpRunnerService,
  ) {}

  /**
   * Chấm theo mode:
   * - public: chỉ chạy test công khai.
   * - all: chạy tất cả test.
   *
   * Không lưu kết quả nộp bài tại đây.
   */
  async grade(
    exerciseId: string,
    learnerId: string,
    code: string,
    mode: GradeMode,
    expectedRevisionId: string,
  ): Promise<GradingResponse> {
    if (!code.trim()) {
      throw new BadRequestException('Mã C# không được để trống');
    }

    // 1. Kiểm tra bài thực hành có khả dụng hay không.
    // findOne đã kiểm tra bài, revision, bài học,
    // chương và khóa học đều đang được xuất bản.
    const exercise = await this.learnerExercises.findOne(exerciseId, learnerId);

    // Client chỉ chỉ định phiên bản đang xem. Luôn đối chiếu với bản
    // xuất bản trên server trước khi đọc test; không chấm một revision tùy ý.
    const revisionId = exercise.published_revision.id;

    if (revisionId !== expectedRevisionId) {
      throw new ConflictException(
        'Đề bài đã có phiên bản mới. Hãy tải lại đề trước khi chấm mã.',
      );
    }

    // 2. Lấy bộ kiểm tra ở Backend.
    // SupabaseService.getClient() là client backend
    // có quyền service role trong project này.
    const { data, error } = await this.supabase
      .getClient()
      .from('code_test_cases')
      .select(
        `
        order_index,
        input_text,
        expected_output,
        is_public
      `,
      )
      .eq('revision_id', revisionId)
      .order('order_index', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('Không thể tải bộ kiểm tra');
    }

    const allTests = (data ?? []) as TestCaseRow[];

    if (!allTests.length) {
      throw new ConflictException('Bài thực hành chưa có bộ kiểm tra hợp lệ');
    }

    // 3. Chọn đúng phạm vi chấm.
    const selectedTests =
      mode === 'public' ? allTests.filter((test) => test.is_public) : allTests;

    if (!selectedTests.length) {
      throw new ConflictException(
        'Bài thực hành chưa có bộ kiểm tra công khai',
      );
    }

    if (selectedTests.length > MAX_TEST_CASES) {
      throw new BadRequestException(
        `Chỉ hỗ trợ tối đa ${MAX_TEST_CASES} bộ kiểm tra trong một lượt chấm.`,
      );
    }

    // 4. Chạy từng test với môi trường riêng.
    const results: GradedCase[] = [];

    let compilationFailed = false;

    for (const test of selectedTests) {
      // Nếu code đã lỗi biên dịch,
      // các test còn lại chưa thực sự được chạy.
      if (compilationFailed) {
        results.push(this.toSafeResult(test, 'not_run'));
        continue;
      }

      // C03 tạo container riêng cho từng lần gọi.
      // Không dùng chung stdin hay tiến trình C#.
      const execution = await this.runner.run(code, test.input_text);

      let status: GradeStatus;

      if (execution.status === 'success') {
        status = codeOutputMatches(execution.stdout, test.expected_output)
          ? 'passed'
          : 'wrong_answer';
      } else {
        status = execution.status;
      }

      results.push(this.toSafeResult(test, status, execution));

      if (status === 'compile_error') {
        compilationFailed = true;
      }
    }

    // 5. Kiểm tra revision chưa bị thay đổi
    // trong lúc chương trình đang được chấm.
    const currentExercise = await this.learnerExercises.findOne(
      exerciseId,
      learnerId,
    );

    if (currentExercise.published_revision.id !== revisionId) {
      throw new ConflictException(
        'Đề bài đã có phiên bản mới. Hãy tải lại và kiểm tra lại mã.',
      );
    }

    const passedCases = results.filter(
      (test) => test.status === 'passed',
    ).length;

    return {
      exercise_id: exerciseId,
      revision_id: revisionId,
      mode,
      total_cases: selectedTests.length,
      passed_cases: passedCases,
      all_passed: passedCases === selectedTests.length,
      cases: results,
    };
  }

  /**
   * Chỉ test công khai được kèm dữ liệu.
   *
   * Test ẩn không trả:
   * - input
   * - expected_output
   * - actual_output
   * - stdout/stderr
   * - thời gian riêng của từng test
   */
  private toSafeResult(
    test: TestCaseRow,
    status: GradeStatus,
    execution?: CsharpRunResult,
  ): GradedCase {
    const base: GradedCase = {
      index: test.order_index,
      is_public: test.is_public,
      status,
      message: statusMessage(status),
    };

    // Quan trọng: kết thúc ở đây với test ẩn.
    if (!test.is_public) {
      return base;
    }

    return {
      ...base,
      input: test.input_text,
      expected_output: test.expected_output,
      actual_output: execution?.stdout ?? '',
      stderr: execution?.stderr ?? '',
    };
  }
}
