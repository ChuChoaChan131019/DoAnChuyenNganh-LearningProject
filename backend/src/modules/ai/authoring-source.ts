import { BadRequestException } from '@nestjs/common';

type Source = {
  course: { title: string };
  chapter: { title: string };
  lesson: {
    title: string;
    content?: string | null;
    code_example?: string | null;
  };
};
const meaningful = (text: string) =>
  text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|#160|#xA0);/gi, ' ')
    .replace(/[^\p{L}\p{N}]/gu, '');

export function hasAuthoringLessonContent(lesson: Source['lesson'], minimum = 40): boolean {
  const content = lesson.content ?? '';
  const code = lesson.code_example?.trim() ?? '';
  const prose = content.replace(/```[\s\S]*?```/g, ' ');
  const fences = [...content.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(
    (match) => match[1],
  );
  const hasCode = [code, ...fences].some(
    (value) =>
      value.replace(/\s/g, '').length >= 16 &&
      meaningful(value).length >= 8 &&
      /[;{}()=]/.test(value),
  );
  return meaningful(prose).length >= Math.max(1, minimum) || hasCode;
}

/** Titles are metadata, never evidence that a lesson contains teaching material. */
export function buildAuthoringSource(
  source: Source,
  topic = '',
  minimum = 40,
  limit = 20_000,
) {
  const content = source.lesson.content ?? '';
  const code = source.lesson.code_example?.trim() ?? '';
  if (!hasAuthoringLessonContent(source.lesson, minimum)) {
    throw new BadRequestException('Bài học chưa có đủ nội dung hoặc mã nguồn hữu ích để tạo câu hỏi.');
  }
  const header = `Khóa học: ${source.course.title.slice(0, 400)}\nChương: ${source.chapter.title.slice(0, 400)}\nBài học: ${source.lesson.title.slice(0, 400)}\n`;
  const blocks: Array<{ text: string; code: boolean; index: number }> = [];
  // Fenced blocks and the dedicated code example are indivisible.
  for (const block of content.match(
    /```[^\n]*\n[\s\S]*?```|[^\n]+(?:\n(?!\n|```)[^\n]+)*/g,
  ) ?? []) {
    blocks.push({
      text: block,
      code: block.startsWith('```'),
      index: blocks.length,
    });
  }
  if (code)
    blocks.push({
      text: `Ví dụ mã nguồn:\n\`\`\`csharp\n${code}\n\`\`\``,
      code: true,
      index: blocks.length,
    });
  const tokens = topic.toLocaleLowerCase('vi-VN').split(/\s+/).filter(Boolean);
  const score = (block: (typeof blocks)[number]) =>
    tokens.reduce(
      (sum, token) =>
        sum + Number(block.text.toLocaleLowerCase('vi-VN').includes(token)),
      0,
    );
  const selected: typeof blocks = [];
  let remaining = limit - header.length;
  for (const block of [...blocks].sort(
    (a, b) => score(b) - score(a) || a.index - b.index,
  )) {
    const cost = block.text.length + 2;
    if (cost <= remaining) {
      selected.push(block);
      remaining -= cost;
    } else if (!block.code && remaining > 100) {
      selected.push({ ...block, text: block.text.slice(0, remaining - 2) });
      remaining = 0;
    }
  }
  const retained = selected
    .sort((a, b) => a.index - b.index)
    .map((block) => block.text)
    .join('\n\n');
  if (
    meaningful(retained.replace(/```[^\n]*\n[\s\S]*?```/g, '')).length <
      Math.max(1, minimum) &&
    !selected.some(
      (block) => block.code && block.text.replace(/\s/g, '').length >= 16,
    )
  ) {
    throw new BadRequestException(
      'Nội dung nguồn vượt giới hạn; hãy chia nhỏ bài học hoặc ví dụ mã nguồn trước khi tạo câu hỏi.',
    );
  }
  return {
    text: header + retained,
    truncated:
      selected.length !== blocks.length ||
      selected.some((block) => block.text !== blocks[block.index].text),
  };
}


export type AuthoringLessonSource = {
  id: string;
  chapter_id: string;
  chapter_title: string;
  title: string;
  content?: string | null;
  code_example?: string | null;
};

/** Keep the selected sources inside one prompt budget, preserving complete code blocks. */
export function buildScopedAuthoringSource(
  course: { title: string }, lessons: AuthoringLessonSource[], topic = '', minimum = 40,
  limit = 20_000, maximumSources = 10,
) {
  const usable = lessons.filter(lesson => hasAuthoringLessonContent(lesson, minimum));
  if (!usable.length) throw new BadRequestException('Phạm vi đã chọn chưa có bài học chứa đủ nội dung hoặc mã nguồn để tạo câu hỏi.');
  const tokens = topic.toLocaleLowerCase('vi-VN').split(/\s+/).filter(Boolean);
  const score = (lesson: AuthoringLessonSource) => {
    const text = `${lesson.title} ${lesson.content ?? ''} ${lesson.code_example ?? ''}`.toLocaleLowerCase('vi-VN');
    return tokens.reduce((sum, token) => sum + Number(text.includes(token)), 0);
  };
  const groups = new Map<string, AuthoringLessonSource[]>();
  for (const lesson of usable) groups.set(lesson.chapter_id, [...(groups.get(lesson.chapter_id) ?? []), lesson]);
  const queues = [...groups.values()].map(group => [...group].sort((a, b) => score(b) - score(a)))
    .sort((a, b) => score(b[0]) - score(a[0]));
  const ordered: AuthoringLessonSource[] = [];
  for (let round = 0; queues.some(queue => round < queue.length); round++) {
    for (const queue of queues) if (queue[round]) ordered.push(queue[round]);
  }
  const selected: Array<AuthoringLessonSource & { contextText: string }> = [];
  let text = '';
  let truncated = false;
  for (let index = 0; index < ordered.length && selected.length < maximumSources; index++) {
    const lesson = ordered[index];
    const opening = `<BAI_HOC source_lesson_id="${lesson.id}">\n`;
    const closing = '\n</BAI_HOC>\n';
    const remaining = limit - text.length - opening.length - closing.length;
    if (remaining < 400) { truncated = true; break; }
    const slots = Math.max(1, Math.min(maximumSources - selected.length, ordered.length - index));
    const budget = Math.max(400, Math.floor(remaining / slots));
    const source = { course, chapter: { title: lesson.chapter_title }, lesson };
    let built: ReturnType<typeof buildAuthoringSource>;
    try { built = buildAuthoringSource(source, topic, minimum, budget); }
    catch (error) {
      if (!(error instanceof BadRequestException)) throw error;
      // A complete code example may exceed its fair share. Include it whole if it fits.
      try { built = buildAuthoringSource(source, topic, minimum, remaining); }
      catch (fallbackError) {
        if (!(fallbackError instanceof BadRequestException)) throw fallbackError;
        truncated = true; continue;
      }
    }
    if (built.text.length > remaining) { truncated = true; continue; }
    text += opening + built.text + closing;
    selected.push({ ...lesson, contextText: built.text });
    truncated ||= built.truncated;
  }
  if (!selected.length) throw new BadRequestException('Không thể lấy đủ nội dung trong giới hạn xử lý. Hãy chọn chương hoặc bài học cụ thể hơn.');
  return { text, lessons: selected, truncated: truncated || selected.length < lessons.length };
}
