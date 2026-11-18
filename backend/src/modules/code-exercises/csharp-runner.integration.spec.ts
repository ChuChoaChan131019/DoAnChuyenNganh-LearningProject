import { describe, expect, it } from 'vitest';
import { CsharpRunnerService } from './csharp-runner.service.js';

// Chạy riêng với RUN_CSHARP_DOCKER_TESTS=1 và image SDK đã tải sẵn.
describe.skipIf(process.env.RUN_CSHARP_DOCKER_TESTS !== '1')(
  'C03 real Docker sandbox',
  () => {
    it('accepts multiline Vietnamese stdin verbatim', async () => {
      const result = await new CsharpRunnerService().run(
        'var a = Console.ReadLine(); var b = Console.ReadLine(); Console.WriteLine($"{a}|{b}");',
        'Xin chào\n  hai dòng  \n',
      );
      expect(result).toMatchObject({
        status: 'success',
        stdout: 'Xin chào|  hai dòng  \n',
        stderr: '',
      });
    }, 40000);

    it('preserves UTF-8 split across writes on both output streams', async () => {
      const code =
        'using var o = Console.OpenStandardOutput(); using var e = Console.OpenStandardError(); foreach (var b in System.Text.Encoding.UTF8.GetBytes("Tiếng Việt")) { o.WriteByte(b); o.Flush(); e.WriteByte(b); e.Flush(); Thread.Sleep(30); }';
      const result = await new CsharpRunnerService().run(code);
      expect(result).toMatchObject({
        status: 'success',
        stdout: 'Tiếng Việt',
        stderr: 'Tiếng Việt',
      });
    }, 40000);

    it('reports a compiler diagnostic', async () => {
      const result = await new CsharpRunnerService().run(
        'Console.WriteLine( ;',
      );
      expect(result.status).toBe('compile_error');
      expect(result.stderr).toContain('error CS');
    }, 40000);

    it('reports an ordinary runtime exception separately', async () => {
      const result = await new CsharpRunnerService().run(
        'throw new InvalidOperationException("C03_RUNTIME_TEST");',
      );
      expect(result.status).toBe('runtime_error');
      expect(result.stderr).toContain('C03_RUNTIME_TEST');
    }, 40000);

    it('terminates an infinite loop', async () => {
      const result = await new CsharpRunnerService().run('while (true) {}');
      expect(result.status).toBe('time_limit');
    }, 40000);

    it('reports managed allocation failure as a resource limit', async () => {
      const code =
        'var buffers = new System.Collections.Generic.List<byte[]>(); while (true) { var b = new byte[16 * 1024 * 1024]; Array.Fill(b, (byte)1); buffers.Add(b); }';
      expect((await new CsharpRunnerService().run(code)).status).toBe(
        'resource_limit',
      );
    }, 40000);

    it('reports a native cgroup OOM kill as a resource limit', async () => {
      const code =
        'var data = new byte[16 * 1024 * 1024]; Array.Fill(data, (byte)1); while (true) { var p = System.Runtime.InteropServices.Marshal.AllocHGlobal(data.Length); System.Runtime.InteropServices.Marshal.Copy(data, 0, p, data.Length); }';
      expect((await new CsharpRunnerService().run(code)).status).toBe(
        'resource_limit',
      );
    }, 40000);

    it('caps an output flood', async () => {
      const result = await new CsharpRunnerService().run(
        "while (true) Console.Write(new string('x', 1000));",
      );
      expect(result.status).toBe('output_limit');
      expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(32768);
    }, 40000);

    it('blocks networking and root writes and resets the temporary filesystem', async () => {
      const service = new CsharpRunnerService();
      const code =
        'Console.WriteLine("memory=" + File.ReadAllText("/sys/fs/cgroup/memory.max").Trim()); Console.WriteLine("pids=" + File.ReadAllText("/sys/fs/cgroup/pids.max").Trim()); Console.WriteLine("socket=" + File.Exists("/var/run/docker.sock")); try { File.WriteAllText("/etc/c03-integration-test", "x"); Console.WriteLine("ROOT_WRITE_ALLOWED"); } catch { Console.WriteLine("ROOT_WRITE_BLOCKED"); } using var socket = new System.Net.Sockets.Socket(System.Net.Sockets.SocketType.Stream, System.Net.Sockets.ProtocolType.Tcp); try { await socket.ConnectAsync("192.0.2.1", 80).WaitAsync(TimeSpan.FromMilliseconds(500)); Console.WriteLine("NETWORK_ALLOWED"); } catch { Console.WriteLine("NETWORK_BLOCKED"); } File.WriteAllText("/tmp/c03-integration-marker", "x");';
      const first = await service.run(code);
      expect(first.status).toBe('success');
      for (const text of [
        'memory=536870912',
        'pids=64',
        'socket=False',
        'ROOT_WRITE_BLOCKED',
        'NETWORK_BLOCKED',
      ])
        expect(first.stdout).toContain(text);
      const second = await service.run(
        'Console.WriteLine(File.Exists("/tmp/c03-integration-marker"));',
      );
      expect(second).toMatchObject({ status: 'success', stdout: 'False\n' });
    }, 70000);

    it('allows two concurrent runs, rejects the third and recovers its slots', async () => {
      const service = new CsharpRunnerService();
      const first = service.run('Thread.Sleep(500); Console.WriteLine(1);');
      const second = service.run('Thread.Sleep(500); Console.WriteLine(2);');
      await expect(service.run('Console.WriteLine(3);')).rejects.toMatchObject({
        status: 429,
      });
      expect((await Promise.all([first, second])).map((r) => r.status)).toEqual(
        ['success', 'success'],
      );
      expect((await service.run('Console.WriteLine(4);')).status).toBe(
        'success',
      );
    }, 70000);
  },
);
