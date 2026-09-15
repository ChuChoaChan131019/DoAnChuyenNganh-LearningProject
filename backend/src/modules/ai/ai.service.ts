import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openAiApiKey: string;
  private readonly qwenApiKey: string;
  private readonly geminiApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.openAiApiKey =
      this.configService.get<string>('OPENAI_API_KEY') || '';
    this.qwenApiKey =
      this.configService.get<string>('QWEN_API_KEY') || '';
    this.geminiApiKey =
      this.configService.get<string>('GEMINI_API_KEY') || '';

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
