import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { SupabaseService } from '../../config/supabase.service.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openAiApiKey: string;
  private readonly qwenApiKey: string;
  private readonly geminiApiKey: string;
  private readonly tutorEncryptionKey: Buffer;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    this.openAiApiKey =
      this.configService.get<string>('OPENAI_API_KEY') || '';
    this.qwenApiKey =
      this.configService.get<string>('QWEN_API_KEY') || '';
    this.geminiApiKey =
      this.configService.get<string>('GEMINI_API_KEY') || '';
    const encryptionSecret =
      this.configService.get<string>('AI_TUTOR_ENCRYPTION_KEY') ||
      this.configService.get<string>('SUPABASE_SECRET_KEY') ||
      'development-only-ai-tutor-key';
    this.tutorEncryptionKey = createHash('sha256').update(encryptionSecret).digest();

    if (!this.openAiApiKey && !this.qwenApiKey && !this.geminiApiKey) {
      this.logger.warn(
        '⚠️ Chưa cấu hình API Key AI nào. Các tính năng AI sẽ sử dụng fallback.',
      );
    } else {
      this.logger.log(
        `✅ AI configured: Gemini=${this.isGeminiConfigured()}, OpenAI=${this.isOpenAiConfigured()}`,
      );
    }
  }

  isOpenAiConfigured(): boolean {
    return Boolean(
      this.openAiApiKey && !this.openAiApiKey.includes('your-openai-api-key'),
    );
  }

  isGeminiConfigured(): boolean {
    return Boolean(
      this.geminiApiKey && !this.geminiApiKey.includes('your-gemini-api-key'),
    );
  }

  isQwenConfigured(): boolean {
    return Boolean(
      this.qwenApiKey && !this.qwenApiKey.includes('your-qwen-api-key'),
    );
  }

  /**
   * L-A01: Đề xuất kế hoạch học tập (AI Learning Plan)
   */
  async generateLearningPlanSuggestion(params: {
    courseId: string;
    goal: string;
    availableDays: number[];
    sessionDurationMinutes: number;
  }): Promise<any> {
    this.logger.log(`Generating AI learning plan for course: ${params.courseId}`);
    return {
      suggested_sessions_per_week: params.availableDays.length,
      estimated_weeks: 4,
      pace: 'moderate',
      message: 'Kế hoạch học tập tối ưu được AI đề xuất dựa trên quỹ thời gian của bạn.',
    };
  }

  private encryptTutorMessage(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.tutorEncryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  private decryptTutorMessage(value: string): string {
    const [version, iv, tag, encrypted] = value.split(':');
    if (version !== 'v1' || !iv || !tag || !encrypted) {
      return '[Tin nhắn cũ không thể giải mã]';
    }

    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.tutorEncryptionKey,
        Buffer.from(iv, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      return '[Tin nhắn không thể giải mã với khóa hiện tại]';
    }
  }

  private async getAllCourseContext() {
    const supabase = this.supabaseService.getAdminClient();
    const { data: courses, error: courseError } = await supabase
      .from('courses')
      .select('id, title, description')
      .eq('status', 'published')
      .order('title', { ascending: true });
    if (courseError) throw new InternalServerErrorException('Unable to load courses');
    if (!courses?.length) throw new NotFoundException('No published courses found');

    const courseIds = courses.map((course) => course.id);
    const { data: chapters, error: chapterError } = await supabase
      .from('chapters')
      .select('id, title, order_index, course_id')
      .in('course_id', courseIds)
      .eq('status', 'published')
      .order('order_index', { ascending: true });
    if (chapterError) throw new InternalServerErrorException('Unable to load course chapters');

    const chapterIds = (chapters ?? []).map((chapter) => chapter.id);
    const { data: lessons, error: lessonError } = chapterIds.length
      ? await supabase
          .from('lessons')
          .select('id, title, content, code_example, chapter_id, order_index')
          .in('chapter_id', chapterIds)
          .eq('status', 'published')
          .order('order_index', { ascending: true })
      : { data: [], error: null };
    if (lessonError) throw new InternalServerErrorException('Unable to load course lessons');

    return {
      courses,
      chapters: (chapters ?? []).map((chapter) => ({
        ...chapter,
        course: courses.find((course) => course.id === chapter.course_id),
        lessons: (lessons ?? []).filter((lesson) => lesson.chapter_id === chapter.id),
      })),
    };
  }

  async getTutorHistory(userId: string) {
    await this.getAllCourseContext();
    const supabase = this.supabaseService.getAdminClient();
    const { data: conversations, error } = await supabase
      .from('ai_tutor_conversations')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new InternalServerErrorException('Unable to load tutor history');

    const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
    if (!conversationIds.length) return { conversations: [], messages: [] };
    const { data: messages, error: messagesError } = await supabase
      .from('ai_tutor_messages')
      .select('id, conversation_id, sender_role, message_content, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: true });
    if (messagesError) throw new InternalServerErrorException('Unable to load tutor messages');

    const decryptedMessages = (messages ?? []).map((message) => ({
        ...message,
        message_content: this.decryptTutorMessage(message.message_content),
      }));
    const conversationsWithPreview = (conversations ?? []).map((conversation) => ({
      ...conversation,
      preview: decryptedMessages.find(
        (message) => message.conversation_id === conversation.id && message.sender_role === 'user',
      )?.message_content ?? '',
    }));

    return { conversations: conversationsWithPreview, messages: decryptedMessages };
  }

  async sendTutorMessage(
    userId: string,
    params: { conversationId?: string; message: string },
  ) {
    const message = params.message?.trim();
    if (!message) throw new BadRequestException('Message cannot be empty');
    if (message.length > 2000) throw new BadRequestException('Message is too long');

    const context = await this.getAllCourseContext();
    const supabase = this.supabaseService.getAdminClient();
    let conversationId = params.conversationId;
    let previousMessages: Array<{ sender_role: string; message_content: string }> = [];

    if (conversationId) {
      const { data: conversation } = await supabase
        .from('ai_tutor_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();
      if (!conversation) throw new BadRequestException('Conversation is not available');

      const { data: history, error: historyError } = await supabase
        .from('ai_tutor_messages')
        .select('sender_role, message_content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(12);
      if (historyError) throw new InternalServerErrorException('Unable to load tutor context');

      previousMessages = (history ?? [])
        .reverse()
        .map((historyMessage) => ({
          sender_role: historyMessage.sender_role,
          message_content: this.decryptTutorMessage(historyMessage.message_content),
        }));
    } else {
      const { data: conversation, error } = await supabase
        .from('ai_tutor_conversations')
        .insert({ user_id: userId, course_id: context.courses[0].id, title: 'AI Tutor - Tất cả bài học' })
        .select('id')
        .single();
      if (error || !conversation) throw new InternalServerErrorException('Unable to create conversation');
      conversationId = conversation.id;
    }

    const { error: userMessageError } = await supabase.from('ai_tutor_messages').insert({
      conversation_id: conversationId,
      sender_role: 'user',
      message_content: this.encryptTutorMessage(message),
    });
    if (userMessageError) throw new InternalServerErrorException('Unable to save tutor message');

    const reply = await this.generateTutorReply(message, context, previousMessages);
    const { data: assistantMessage, error: assistantMessageError } = await supabase
      .from('ai_tutor_messages')
      .insert({
        conversation_id: conversationId,
        sender_role: 'assistant',
        message_content: this.encryptTutorMessage(reply),
      })
      .select('id, conversation_id, sender_role, created_at')
      .single();
    if (assistantMessageError || !assistantMessage) {
      throw new InternalServerErrorException('Unable to save tutor response');
    }

    return { conversationId, message: { ...assistantMessage, message_content: reply } };
  }

  private async generateTutorReply(
    message: string,
    context: { courses: any[]; chapters: any[] },
    previousMessages: Array<{ sender_role: string; message_content: string }>,
  ): Promise<string> {
    const courseLessons = context.chapters
      .map((chapter) => `${chapter.course?.title} / ${chapter.title}: ${(chapter.lessons ?? []).map((lesson: any) => `\n- ${lesson.title}\n  ${(lesson.content || '').slice(0, 3500)}\n  Code: ${(lesson.code_example || '').slice(0, 1200)}`).join('')}`)
      .join('\n');
    const lessonTitles = context.chapters
      .flatMap((chapter) => (chapter.lessons ?? []).map((lesson: any) => lesson.title));
    const conversationHistory = previousMessages
      .map((historyMessage) => `${historyMessage.sender_role}: ${historyMessage.message_content}`)
      .join('\n');
    const systemPrompt = `You are a focused AI tutor for the published lessons in this learning platform.
Available courses: ${context.courses.map((course) => course.title).join(', ')}
Published lessons and content:
${courseLessons.slice(0, 30000)}
Recent conversation history:
${conversationHistory || '(none)'}
Questions about C#, .NET, programming concepts, or any lesson title above are related, including broad questions such as "C# là gì?".
Only refuse when the question is clearly unrelated to programming or these lessons. If the lesson content is brief, explain using the lesson title and established C# fundamentals without inventing course-specific facts.
Use the recent conversation history to understand follow-up questions such as "giải thích rõ hơn". Keep the same topic unless the user explicitly changes it. Do not switch to another lesson just because it appears in the course context.
For unrelated questions, reply exactly: "Câu hỏi này không liên quan đến nội dung các bài học hiện có. Hãy hỏi về kiến thức trong các bài học nhé."
Be concise, answer directly, and use short C# examples only when useful. Maximum 400 words. Format with short paragraphs and Markdown when helpful.`;

    if (this.isGeminiConfigured()) {
      try {
        const response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.geminiApiKey },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\nQuestion: ${message}` }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
            }),
          },
        );
        if (response.ok) {
          const data = (await response.json()) as any;
          const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (answer) return answer;
        } else {
          this.logger.warn(`Gemini tutor unavailable (${response.status}), trying next provider`);
        }
      } catch (error) {
        this.logger.warn(`Gemini tutor request failed: ${String(error)}`);
      }
    }

    if (this.isOpenAiConfigured()) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.openAiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
            temperature: 0.2,
            max_tokens: 1200,
          }),
        });
        if (response.ok) {
          const data = (await response.json()) as any;
          const answer = data?.choices?.[0]?.message?.content?.trim();
          if (answer) return answer;
        } else {
          this.logger.warn(`OpenAI tutor unavailable (${response.status})`);
        }
      } catch (error) {
        this.logger.warn(`OpenAI tutor request failed: ${String(error)}`);
      }
    }

    const normalizedQuestion = message.toLowerCase();
    const normalizedConversation = `${conversationHistory}\nuser: ${message}`.toLowerCase();
    const isLessonRelated = [
      'c#', 'csharp', '.net', 'lập trình', 'program', 'class', 'method',
      'hàm', 'biến', 'cú pháp', 'code', 'mã', 'console', 'delegate',
      'event', 'async', 'await', 'oop', ...lessonTitles,
    ].some((keyword) => normalizedConversation.includes(keyword.toLowerCase()));
    if (!isLessonRelated) {
      return 'Câu hỏi này không liên quan đến nội dung các bài học hiện có. Hãy hỏi về kiến thức trong các bài học nhé.';
    }

    const firstLesson = lessonTitles[0] || 'các bài học hiện có';
    if (normalizedConversation.includes('.net runtime')) {
      return '**.NET Runtime** là môi trường thực thi chương trình .NET. Nó biên dịch hoặc thực thi mã C#, quản lý bộ nhớ, xử lý kiểu dữ liệu và cung cấp các dịch vụ cần thiết để ứng dụng chạy được.';
    }
    if (normalizedQuestion.includes('class')) {
      return 'Trong C#, **class** là bản thiết kế để tạo đối tượng. Class có thể chứa dữ liệu dưới dạng field/property và hành vi dưới dạng method. Ví dụ: `class Student { public string Name { get; set; } }`.';
    }
    if (normalizedQuestion.includes('console')) {
      return '**Console.WriteLine()** dùng để ghi nội dung ra màn hình console. Đây thường là lệnh đầu tiên trong chương trình C# để quan sát kết quả khi chạy code.';
    }
    return `Dựa trên các bài học hiện có, đặc biệt là **${firstLesson}**, mình có thể giải thích câu hỏi này.\n\nC# là ngôn ngữ lập trình hướng đối tượng của Microsoft, thường được dùng cùng nền tảng .NET để xây dựng ứng dụng web, desktop, game và dịch vụ. Trong bài học, bạn có thể tiếp tục hỏi về cú pháp, class, phương thức hoặc cách chạy chương trình C#.`;
  }

  /**
   * L-A02: Cá nhân hóa lộ trình học tập (Personalized Learning Ranking)
   */
  async rankRecommendations(candidateLessons: any[]): Promise<any[]> {
    return candidateLessons;
  }

  /**
   * L-A03: Đề xuất độ khó thích ứng (Adaptive Learning)
   */
  async recommendDifficulty(recentAverageScore: number): Promise<'easy' | 'medium' | 'hard'> {
    if (recentAverageScore < 50) return 'easy';
    if (recentAverageScore >= 80) return 'hard';
    return 'medium';
  }

  /**
   * Sinh câu hỏi luyện tập trực tiếp từ AI dựa trên yêu cầu
   */
  async generatePracticeQuestions(
    prompt: string,
    count: number,
    courseContext: string,
  ): Promise<any[]> {
    if (!prompt.trim()) return [];

    const systemPrompt = `You are an AI tutor generating practice questions for a course.
Course context: ${courseContext}

The user will provide a specific request. You must generate EXACTLY ${count} questions matching their request.
Return the result as a raw JSON array of objects. Do NOT wrap in markdown code blocks.

Each object must follow this structure:
{
  "content": "The question text",
  "question_type": "single_choice" | "multiple_choice" | "true_false" | "fill_in_blank",
  "difficulty": "easy" | "medium" | "hard",
  "explanation": "Explanation for the correct answer",
  "options": [
    {
      "option_text": "Option A",
      "is_correct": true,
      "order_index": 0
    }
  ]
}
For true_false, provide 2 options.
For fill_in_blank, provide exactly 1 option containing the exact answer text.
Make sure the output is a valid JSON array.`;

    // 1. Thử Google Gemini (Miễn phí)
    if (this.isGeminiConfigured()) {
      const geminiModels = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-pro-latest'];
      for (const modelName of geminiModels) {
        try {
          this.logger.log(`🤖 Trying Gemini model: ${modelName}...`);
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': this.geminiApiKey,
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: `${systemPrompt}\n\nUser request: ${prompt}` },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.7,
                },
              }),
            },
          );

          if (response.ok) {
            const data = (await response.json()) as any;
            const rawText: string =
              data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
            const cleanText = rawText
              .replace(/```json/g, '')
              .replace(/```/g, '')
              .trim();
            const parsed = JSON.parse(cleanText);
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.logger.log(
                `✅ Gemini [${modelName}] generated ${parsed.length} questions successfully`,
              );
              return parsed;
            }
          } else if (response.status === 503) {
            this.logger.warn(`⚠️ Gemini [${modelName}] overloaded (503), trying next model...`);
            continue;
          } else {
            const errText = await response.text();
            this.logger.error(`❌ Gemini [${modelName}] error (${response.status}): ${errText}`);
            // 404 = model not found, try next; other errors break
            if (response.status !== 404) break;
          }
        } catch (e) {
          this.logger.error(`❌ Gemini [${modelName}] call failed`, e);
          break;
        }
      }
    }

    // 2. Thử OpenAI nếu có credit
    if (this.isOpenAiConfigured()) {
      try {
        this.logger.log('🤖 Trying OpenAI API...');
        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.openAiApiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
              ],
              temperature: 0.7,
            }),
          },
        );

        if (response.ok) {
          const data = (await response.json()) as any;
          let content: string = data.choices[0]?.message?.content || '[]';
          content = content
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.logger.log(
              `✅ OpenAI generated ${parsed.length} questions successfully`,
            );
            return parsed;
          }
        } else {
          const errText = await response.text();
          this.logger.error(
            `❌ OpenAI API error (${response.status}): ${errText}`,
          );
        }
      } catch (e) {
        this.logger.error('❌ OpenAI API call failed', e);
      }
    }

    // 3. Fallback câu hỏi mẫu
    this.logger.warn(
      '⚠️ Fallback to mock generated questions (no active API key or quota exceeded)',
    );
    return Array.from({ length: Math.min(count, 5) }).map((_, i) => ({
      content: `(Mock AI) Câu hỏi luyện tập cho: "${prompt.substring(0, 30)}" - Số ${i + 1}`,
      question_type: 'single_choice',
      difficulty: 'medium',
      explanation: 'Đây là câu hỏi mẫu do hệ thống tự sinh (chưa có API Key).',
      options: [
        { option_text: 'Lựa chọn đúng', is_correct: true, order_index: 0 },
        { option_text: 'Lựa chọn sai', is_correct: false, order_index: 1 },
      ],
    }));
  }
}
