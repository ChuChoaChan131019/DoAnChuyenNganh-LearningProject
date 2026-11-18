import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { course, exercises } from './csharp-fundamentals.dataset.mjs';

const samples = course.chapters.flatMap((chapter, chapterIndex) =>
  chapter.lessons.map((lesson, lessonIndex) => ({
    name: `Chương ${chapterIndex + 1}, bài ${lessonIndex + 1}: ${lesson.title}`,
    code: lesson.code,
  })),
);
for (const [index, exercise] of exercises.entries()) {
  samples.push({ name: `Lời giải bài tập ${index + 1}: ${exercise.title}`, code: exercise.solution });
}

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'csharp-seed-'));
const projectPath = path.join(tempDirectory, 'SeedValidation.csproj');
const programPath = path.join(tempDirectory, 'Program.cs');

try {
  fs.writeFileSync(projectPath, `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net9.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <LangVersion>latest</LangVersion>
  </PropertyGroup>
</Project>\n`);
  const restore = spawnSync('dotnet', ['restore', projectPath, '--nologo', '--verbosity', 'quiet'], { encoding: 'utf8' });
  if (restore.status !== 0) throw new Error(restore.stderr || restore.stdout || 'dotnet restore thất bại.');

  for (const sample of samples) {
    let source = sample.code;
    if (!/\bMain\s*\(/.test(source) && !/Console\.|\bint\s+\w+\s*=|\bdouble\s+\w+\s*=|\bdecimal\s+\w+\s*=|\bvar\s+\w+\s*=|\bIShape\s+\w+\s*=|\bAnimal\s+\w+\s*=/.test(source.split(/\b(class|interface)\b/)[0])) {
      source += '\n\nstatic class SeedEntry { public static void Main() { } }\n';
    }
    fs.writeFileSync(programPath, source);
    const build = spawnSync('dotnet', ['build', projectPath, '--no-restore', '--nologo', '--verbosity', 'quiet'], { encoding: 'utf8' });
    if (build.status !== 0) {
      throw new Error(`${sample.name} không biên dịch được:\n${build.stdout}\n${build.stderr}`);
    }
  }
  console.log(JSON.stringify({ compiled: samples.length, framework: 'net9.0' }, null, 2));
} finally {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
}

