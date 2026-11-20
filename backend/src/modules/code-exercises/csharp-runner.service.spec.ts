import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  spawn: vi.fn(),
  chmod: vi.fn(),
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  writeFile: vi.fn(),
}));
vi.mock('node:child_process', () => ({ spawn: mocks.spawn }));
vi.mock('node:fs/promises', () => ({
  chmod: mocks.chmod,
  mkdtemp: mocks.mkdtemp,
  rm: mocks.rm,
  writeFile: mocks.writeFile,
}));
import { CsharpRunnerService } from './csharp-runner.service.js';

class DockerProcess extends EventEmitter {
  stdin = new PassThrough();
  stdout = new PassThrough();
  stderr = new PassThrough();
  kill = vi.fn(() => {
    this.close(null);
    return true;
  });
  close(code: number | null) {
    this.stdout.end();
    this.stderr.end();
    this.emit('close', code);
  }
}

let children: DockerProcess[];
beforeEach(() => {
  vi.resetAllMocks();
  children = [];
  mocks.mkdtemp.mockResolvedValue('/unit-test/csharp-source');
  mocks.writeFile.mockResolvedValue(undefined);
  mocks.chmod.mockResolvedValue(undefined);
  mocks.rm.mockResolvedValue(undefined);
  mocks.spawn.mockImplementation((_command: string, args: string[]) => {
    const child = new DockerProcess();
    if (args[0] === 'run') children.push(child);
    return child;
  });
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function started(
  service: CsharpRunnerService,
  code = 'Console.WriteLine(1);',
  stdin = '',
) {
  const count = children.length;
  const result = service.run(code, stdin);
  for (let i = 0; i < 20 && children.length === count; i++)
    await Promise.resolve();
  expect(children).toHaveLength(count + 1);
  return { result, child: children[count] };
}

describe('CsharpRunnerService', () => {
  it('keeps multiline stdin verbatim and isolates the source from shell arguments', async () => {
    const code = 'Console.WriteLine("$(do-not-execute)");';
    const stdin = 'Xin chào\r\n  dòng hai  \n';
    const { result, child } = await started(
      new CsharpRunnerService(),
      code,
      stdin,
    );
    expect(child.stdin.read().toString()).toBe(stdin);
    expect(
      mocks.writeFile.mock.calls.some(
        (call) => call[0].endsWith('Program.cs') && call[1] === code,
      ),
    ).toBe(true);
    const [command, args, options] = mocks.spawn.mock.calls[0];
    expect(command).toBe('docker');
    expect(args.join('\n')).not.toContain(code);
    expect(options).toMatchObject({ shell: false, windowsHide: true });
    for (const flag of [
      '--network=none',
      '--cpus=1',
      '--memory=512m',
      '--memory-swap=512m',
      '--pids-limit=64',
      '--read-only',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--user=65534:65534',
      '--pull=never',
    ])
      expect(args).toContain(flag);
    expect(args).toContain(
      'type=bind,source=/unit-test/csharp-source,target=/source,readonly',
    );
    child.close(0);
    await expect(result).resolves.toMatchObject({
      status: 'success',
      exit_code: 0,
    });
  });

  it.each(['stdout', 'stderr'] as const)(
    'preserves fragmented Vietnamese UTF-8 on %s',
    async (stream) => {
      const { result, child } = await started(new CsharpRunnerService());
      for (const byte of Buffer.from('Tiếng Việt 😀'))
        child[stream].write(Buffer.from([byte]));
      child.close(0);
      expect((await result)[stream]).toBe('Tiếng Việt 😀');
    },
  );

  it('keeps independent decoders when stdout and stderr interleave', async () => {
    const { result, child } = await started(new CsharpRunnerService());
    const out = Buffer.from('ề');
    const err = Buffer.from('ộ');
    child.stdout.write(out.subarray(0, 1));
    child.stderr.write(err.subarray(0, 2));
    child.stdout.write(out.subarray(1));
    child.stderr.write(err.subarray(2));
    child.close(0);
    await expect(result).resolves.toMatchObject({ stdout: 'ề', stderr: 'ộ' });
  });

  it('caps stdout and stderr together and terminates an output flood', async () => {
    const { result, child } = await started(new CsharpRunnerService());
    child.stdout.write(Buffer.alloc(20000, 'x'));
    child.stderr.write(Buffer.alloc(20000, 'y'));
    const response = await result;
    expect(response.status).toBe('output_limit');
    expect(
      Buffer.byteLength(response.stdout) + Buffer.byteLength(response.stderr),
    ).toBe(32768);
    expect(child.kill).toHaveBeenCalledOnce();
    const runArgs = mocks.spawn.mock.calls[0][1] as string[];
    expect(mocks.spawn.mock.calls[1][1]).toEqual([
      'rm',
      '-f',
      runArgs[runArgs.indexOf('--name') + 1],
    ]);
  });

  it('does not return a replacement character when the byte cap cuts a UTF-8 character', async () => {
    const { result, child } = await started(new CsharpRunnerService());
    child.stdout.write(Buffer.from('x'.repeat(32767) + 'ề'));
    const response = await result;
    expect(response.status).toBe('output_limit');
    expect(response.stdout).toBe('x'.repeat(32767));
  });

  it.each([
    [0, 'success'],
    [21, 'compile_error'],
    [22, 'runtime_error'],
    [23, 'time_limit'],
    [24, 'time_limit'],
    [25, 'resource_limit'],
    [137, 'resource_limit'],
  ] as const)('maps wrapper exit %i to %s', async (code, status) => {
    const { result, child } = await started(new CsharpRunnerService());
    child.close(code);
    await expect(result).resolves.toMatchObject({ status, exit_code: code });
  });

  it.each([1, 2, 17, 125, 126, 127, null])(
    'reports Docker startup failure %s as infrastructure failure',
    async (code) => {
      const { result, child } = await started(new CsharpRunnerService());
      child.close(code);
      await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(mocks.rm).toHaveBeenCalledOnce();
    },
  );

  it('recovers execution slots after Docker connection failures', async () => {
    const service = new CsharpRunnerService();
    for (let i = 0; i < 3; i++) {
      const { result, child } = await started(service);
      child.stderr.write('failed to connect to Docker API');
      child.close(1);
      await expect(result).rejects.toMatchObject({ status: 503 });
    }
    const { result, child } = await started(service);
    child.stdout.write('1\n');
    child.close(0);
    await expect(result).resolves.toMatchObject({
      status: 'success',
      stdout: '1\n',
    });
  });

  it.each([
    [
      22,
      'Unhandled exception. System.OutOfMemoryException: Insufficient memory.\n',
    ],
    [24, 'Out of memory.\nKilled\nChương trình chạy quá thời gian cho phép.\n'],
    [21, 'Out of memory.\n'],
  ])(
    'recognizes CLR OOM even when the wrapper exits %i',
    async (code, message) => {
      const { result, child } = await started(new CsharpRunnerService());
      child.stderr.write(Buffer.from(message));
      child.close(code);
      await expect(result).resolves.toMatchObject({ status: 'resource_limit' });
    },
  );

  it('does not change successful execution based on text printed by student code', async () => {
    const { result, child } = await started(new CsharpRunnerService());
    child.stderr.write(Buffer.from('Out of memory.\n'));
    child.close(0);
    await expect(result).resolves.toMatchObject({ status: 'success' });
  });

  it('cleans sources after the Docker CLI cannot be spawned', async () => {
    const { result, child } = await started(new CsharpRunnerService());
    child.emit('error', new Error('ENOENT'));
    await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(mocks.rm).toHaveBeenCalledOnce();
  });

  it('returns slots even if cleanup fails repeatedly', async () => {
    const service = new CsharpRunnerService();
    mocks.rm.mockRejectedValue(new Error('EPERM'));
    for (let i = 0; i < 3; i++) {
      const { result, child } = await started(service);
      child.close(0);
      await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
    }
    mocks.rm.mockResolvedValue(undefined);
    const { result, child } = await started(service);
    child.close(0);
    await expect(result).resolves.toMatchObject({ status: 'success' });
    expect(mocks.rm).toHaveBeenLastCalledWith(
      '/unit-test/csharp-source',
      expect.objectContaining({
        recursive: true,
        maxRetries: 3,
        retryDelay: 100,
      }),
    );
  });

  it('recovers slots when source creation fails before Docker starts', async () => {
    const service = new CsharpRunnerService();
    mocks.mkdtemp.mockRejectedValue(new Error('ENOSPC'));
    for (let i = 0; i < 3; i++)
      await expect(service.run('Console.WriteLine(1);')).rejects.toThrow(
        'ENOSPC',
      );
    expect(mocks.spawn).not.toHaveBeenCalled();
    mocks.mkdtemp.mockResolvedValue('/unit-test/csharp-source');
    const { result, child } = await started(service);
    child.close(0);
    await expect(result).resolves.toMatchObject({ status: 'success' });
  });

  it('rejects a third concurrent run and admits it when a slot is freed', async () => {
    const service = new CsharpRunnerService();
    const first = await started(service);
    const second = await started(service);
    await expect(service.run('Console.WriteLine(3);')).rejects.toMatchObject({
      status: 429,
    });
    first.child.close(0);
    await first.result;
    const third = await started(service);
    second.child.close(0);
    third.child.close(0);
    await Promise.all([second.result, third.result]);
  });

  it('kills the container at the overall deadline and clears the timeout after completion', async () => {
    vi.useFakeTimers();
    const { result, child } = await started(new CsharpRunnerService());
    await vi.advanceTimersByTimeAsync(30000);
    await expect(result).resolves.toMatchObject({
      status: 'time_limit',
      exit_code: null,
    });
    expect(child.kill).toHaveBeenCalledOnce();
    const next = await started(new CsharpRunnerService());
    next.child.close(0);
    await next.result;
    await vi.advanceTimersByTimeAsync(30000);
    expect(next.child.kill).not.toHaveBeenCalled();
  });

  it.each([
    ['', ''],
    ['   ', ''],
    ['a'.repeat(65537), ''],
    ['ề'.repeat(22000), ''],
    ['Console.WriteLine(1);', 'a'.repeat(16385)],
    ['Console.WriteLine(1);', 'ề'.repeat(5500)],
  ])(
    'rejects empty code or oversized UTF-8 before allocating resources',
    async (code, stdin) => {
      await expect(
        new CsharpRunnerService().run(code, stdin),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.mkdtemp).not.toHaveBeenCalled();
      expect(mocks.spawn).not.toHaveBeenCalled();
    },
  );
});
