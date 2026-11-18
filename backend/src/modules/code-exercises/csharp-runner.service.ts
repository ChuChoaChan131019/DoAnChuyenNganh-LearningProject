import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { spawn } from 'node:child_process';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';

const IMAGE = 'mcr.microsoft.com/dotnet/sdk:10.0';

const MAX_CODE_BYTES = 64 * 1024;
const MAX_INPUT_BYTES = 16 * 1024;
const MAX_OUTPUT_BYTES = 32 * 1024;
const MAX_CONCURRENT_RUNS = 2;

export type CsharpRunStatus =
  | 'success'
  | 'compile_error'
  | 'runtime_error'
  | 'time_limit'
  | 'resource_limit'
  | 'output_limit';

export type CsharpRunResult = {
  status: CsharpRunStatus;
  stdout: string;
  stderr: string;
  exit_code: number | null;
  elapsed_ms: number;
};

const PROJECT_FILE = `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <EnableDefaultCompileItems>false</EnableDefaultCompileItems>
    <UseSharedCompilation>false</UseSharedCompilation>
    <NuGetAudit>false</NuGetAudit>
  </PropertyGroup>
  <ItemGroup>
    <Compile Include="Program.cs" />
  </ItemGroup>
</Project>
`.trim();

const NUGET_CONFIG = `
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
  </packageSources>
</configuration>
`.trim();

// Script này là cố định.
// Tuyệt đối không ghép mã học viên vào script.
const RUN_SCRIPT = `
cd /workspace || exit 125

cp /source/Program.cs ./Program.cs || exit 125
cp /source/Runner.csproj ./Runner.csproj || exit 125
cp /source/NuGet.Config ./NuGet.Config || exit 125

read_oom_kills() {
  if [ -r /sys/fs/cgroup/memory.events ]; then
    awk '$1 == "oom_kill" { count = $2 } END { print count+0 }' /sys/fs/cgroup/memory.events
  elif [ -r /sys/fs/cgroup/memory/memory.oom_control ]; then
    awk '$1 == "oom_kill" { count = $2 } END { print count+0 }' /sys/fs/cgroup/memory/memory.oom_control
  else
    echo 0
  fi
}

oom_before=$(read_oom_kills)

timeout -k 1s 20s sh -c '
  dotnet restore Runner.csproj --configfile NuGet.Config --ignore-failed-sources --verbosity quiet &&
  dotnet build Runner.csproj -c Release -o /workspace/out --no-restore --verbosity quiet
' > /workspace/build.log 2>&1

build_status=$?
oom_after=$(read_oom_kills)

if [ "$oom_after" -gt "$oom_before" ]; then
  cat /workspace/build.log >&2
  echo "Lượt biên dịch vượt giới hạn bộ nhớ." >&2
  exit 25
fi

if [ "$build_status" -ne 0 ]; then
  cat /workspace/build.log >&2

  if [ "$build_status" -eq 124 ] || [ "$build_status" -eq 137 ]; then
    exit 23
  fi

  exit 21
fi

timeout -k 1s 3s dotnet /workspace/out/Runner.dll
run_status=$?
oom_after=$(read_oom_kills)

if [ "$oom_after" -gt "$oom_before" ]; then
  echo "Chương trình vượt giới hạn bộ nhớ." >&2
  exit 25
fi

if [ "$run_status" -eq 124 ] || [ "$run_status" -eq 137 ]; then
  echo "Chương trình chạy quá thời gian cho phép." >&2
  exit 24
fi

if [ "$run_status" -ne 0 ]; then
  exit 22
fi

exit 0
`;

@Injectable()
export class CsharpRunnerService {
  private activeRuns = 0;
  private readonly logger = new Logger(CsharpRunnerService.name);

  async run(code: string, stdin = ''): Promise<CsharpRunResult> {
    if (!code.trim()) {
      throw new BadRequestException('Mã C# không được để trống');
    }

    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
      throw new BadRequestException('Mã nguồn vượt quá 64 KiB');
    }

    if (Buffer.byteLength(stdin, 'utf8') > MAX_INPUT_BYTES) {
      throw new BadRequestException('Dữ liệu đầu vào vượt quá 16 KiB');
    }

    if (this.activeRuns >= MAX_CONCURRENT_RUNS) {
      throw new HttpException(
        'Hệ thống đang xử lý nhiều lượt chạy. Hãy thử lại sau.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.activeRuns++;

    let sourceDir: string | null = null;

    try {
      // Chỉ tạo các file tối thiểu để biên dịch.
      sourceDir = await mkdtemp(join(tmpdir(), 'csharp-c03-'));

      await Promise.all([
        writeFile(join(sourceDir, 'Program.cs'), code, {
          encoding: 'utf8',
          mode: 0o644,
        }),
        writeFile(join(sourceDir, 'Runner.csproj'), PROJECT_FILE, {
          encoding: 'utf8',
          mode: 0o644,
        }),
        writeFile(join(sourceDir, 'NuGet.Config'), NUGET_CONFIG, {
          encoding: 'utf8',
          mode: 0o644,
        }),
      ]);

      // Cho user không đặc quyền trong container
      // đọc thư mục source (chỉ chứa 3 file trên).
      await chmod(sourceDir, 0o755);

      const containerName = `csharp-c03-${randomUUID()}`;

      return await this.runContainer(sourceDir, stdin, containerName);
    } finally {
      try {
        await this.cleanupSource(sourceDir);
      } finally {
        // Cleanup thất bại cũng phải trả lại slot, không để runner kẹt 429.
        this.activeRuns--;
      }
    }
  }

  private async cleanupSource(sourceDir: string | null): Promise<void> {
    if (!sourceDir) return;
    try {
      // Retry các lỗi khóa file tạm thời trên Windows.
      await rm(sourceDir, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      });
    } catch {
      this.logger.error('Không thể xóa thư mục mã nguồn tạm của lượt chạy C#.');
      throw new ServiceUnavailableException(
        'Không thể hoàn tất dọn môi trường chạy C#. Hãy thử lại sau.',
      );
    }
  }

  private runContainer(
    sourceDir: string,
    stdin: string,
    containerName: string,
  ): Promise<CsharpRunResult> {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();

      let stdout = '';
      let stderr = '';
      let outputBytes = 0;
      const stdoutDecoder = new StringDecoder('utf8');
      const stderrDecoder = new StringDecoder('utf8');

      let forcedStatus: 'time_limit' | 'output_limit' | null = null;

      let finished = false;

      const args = [
        'run',
        '--rm',
        '--pull=never',
        '-i',

        '--name',
        containerName,

        '--network=none',
        '--cpus=1',
        '--memory=512m',
        '--memory-swap=512m',
        '--pids-limit=64',

        '--read-only',
        '--cap-drop=ALL',
        '--security-opt=no-new-privileges',
        '--user=65534:65534',

        '--tmpfs=/tmp:rw,nosuid,nodev,size=128m,mode=1777',
        '--tmpfs=/workspace:rw,nosuid,nodev,size=256m,mode=1777',

        '--mount',
        `type=bind,source=${sourceDir},target=/source,readonly`,

        '--workdir=/workspace',

        '-e',
        'HOME=/tmp',
        '-e',
        'DOTNET_CLI_HOME=/tmp',
        '-e',
        'NUGET_PACKAGES=/tmp/nuget',
        '-e',
        'DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1',
        '-e',
        'DOTNET_CLI_TELEMETRY_OPTOUT=1',
        '-e',
        'DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE=1',

        IMAGE,
        '/bin/sh',
        '-c',
        RUN_SCRIPT,
      ];

      const child = spawn('docker', args, {
        shell: false,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Buộc xóa container khi request vượt giới hạn.
      const forceRemoveContainer = () => {
        const killer = spawn('docker', ['rm', '-f', containerName], {
          shell: false,
          windowsHide: true,
          stdio: 'ignore',
        });

        killer.on('error', () => undefined);
        child.kill('SIGKILL');
      };

      // Giới hạn output ở cả stdout + stderr.
      const collectOutput = (chunk: Buffer, isError: boolean) => {
        const remaining = MAX_OUTPUT_BYTES - outputBytes;

        if (remaining > 0) {
          const kept = chunk.subarray(0, remaining);

          if (isError) {
            stderr += stderrDecoder.write(kept);
          } else {
            stdout += stdoutDecoder.write(kept);
          }
        }

        outputBytes += chunk.length;

        if (outputBytes > MAX_OUTPUT_BYTES && !forcedStatus) {
          forcedStatus = 'output_limit';
          forceRemoveContainer();
        }
      };

      child.stdout.on('data', (chunk: Buffer) => {
        collectOutput(chunk, false);
      });

      child.stderr.on('data', (chunk: Buffer) => {
        collectOutput(chunk, true);
      });

      // Chương trình kết thúc sớm có thể đóng stdin.
      child.stdin.on('error', () => undefined);

      // Truyền nguyên dữ liệu nhiều dòng,
      // không tách thành nhiều lệnh.
      child.stdin.end(stdin);

      const timeout = setTimeout(() => {
        if (finished) return;

        forcedStatus = 'time_limit';
        forceRemoveContainer();
      }, 30000);

      child.once('error', () => {
        if (finished) return;

        finished = true;
        clearTimeout(timeout);

        reject(
          new ServiceUnavailableException(
            'Không thể khởi động Docker. Kiểm tra Docker Desktop và Docker CLI.',
          ),
        );
      });

      child.once('close', (code) => {
        if (finished) return;

        finished = true;
        clearTimeout(timeout);

        // Khi cắt output ở byte giới hạn, bỏ ký tự cuối còn thiếu byte.
        if (forcedStatus !== 'output_limit') {
          stdout += stdoutDecoder.end();
          stderr += stderrDecoder.end();
        }

        const elapsedMs = Date.now() - startedAt;

        if (forcedStatus) {
          resolve({
            status: forcedStatus,
            stdout,
            stderr:
              stderr ||
              (forcedStatus === 'time_limit'
                ? 'Lượt chạy vượt quá 30 giây.'
                : 'Chương trình xuất quá nhiều dữ liệu.'),
            exit_code: null,
            elapsed_ms: elapsedMs,
          });
          return;
        }

        // Docker CLI không chạy được hoặc
        // không tạo được container.
        if (code === null || code === 125 || code === 126 || code === 127) {
          reject(
            new ServiceUnavailableException(
              'Docker không thể tạo container thực thi C#.',
            ),
          );
          return;
        }

        let status: CsharpRunStatus;

        switch (code) {
          case 0:
            status = 'success';
            break;

          case 21:
            status = 'compile_error';
            break;

          case 22:
            status = 'runtime_error';
            break;

          case 23:
          case 24:
            status = 'time_limit';
            break;

          case 25:
          case 137:
            status = 'resource_limit';
            break;

          default:
            status = 'runtime_error';
        }

        // CLR có thể chặn cấp phát và abort trước khi kernel OOM-kill.
        // Chỉ tinh chỉnh kết quả đã thất bại; output không quyết định thành công.
        if (
          [21, 22, 23, 24].includes(code) &&
          /^(?:Out of memory\.|Unhandled exception\. System\.OutOfMemoryException(?::|\r?$))/m.test(
            stderr,
          )
        ) {
          status = 'resource_limit';
        }

        resolve({
          status,
          stdout,
          stderr,
          // Exit code của wrapper trong container,
          // không phải exit code gốc của ứng dụng C#.
          exit_code: code,
          elapsed_ms: elapsedMs,
        });
      });
    });
  }
}
