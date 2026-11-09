"use client";

import { useState, type KeyboardEvent } from "react";

import { Bot, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";

import { aiTutorApi } from "@/lib/api";
import { buildTutorHistory } from "@/lib/tutor-chat";
import { useAuth } from "@/contexts/auth-context";
import { useTutorContext } from "@/contexts/tutor-context";
import { TutorMessage } from "@/components/learner/tutor-message";

import type {
  TutorChatMessage,
  TutorContext,
  TutorContextResponse,
} from "@/types/context-tutor";

type DisplayMessage = TutorChatMessage & {
  sources?: TutorContextResponse["sources"];
};

function FloatingWindow({ context }: { context: TutorContext }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contextLabel =
    context.mode === "lesson"
      ? "Đang hỗ trợ bài học"
      : context.mode === "practice"
        ? "Đang hỗ trợ luyện tập"
        : "Đang hỗ trợ bài trắc nghiệm";

  async function sendMessage() {
    const question = input.trim();

    if (!question || sending) return;

    // Giữ 6 tin nhắn gần nhất để AI hiểu
    // ngữ cảnh hội thoại trong cùng bài học.
    const history = buildTutorHistory(messages);

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: question,
      },
    ]);

    setInput("");
    setSending(true);
    setError(null);

    try {
      const response = await aiTutorApi.sendContext({
        ...context,
        message: question,
        history,
      });

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.answer,
          sources: response.sources,
        },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể kết nối với AI Tutor.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className="fixed bottom-5 right-4 z-[80] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {/* CỬA SỔ CHAT THU NHỎ */}
      {open && (
        <section
          role="dialog"
          aria-label="Trợ giảng AI theo bài học"
          className="flex h-[min(520px,75vh)] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-2xl"
        >
          {/* Header */}
          <header className="flex shrink-0 items-center justify-between bg-[#145a68] px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <Bot className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-bold">AI Tutor</h2>

                <p className="text-[11px] text-teal-100">{contextLabel}</p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Đóng AI Tutor"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* Khu vực tin nhắn */}
          <div
            aria-live="polite"
            className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#f8faf8] p-4"
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="rounded-full bg-[#e0f3f2] p-2 text-[#145a68]">
                    <Bot className="h-4 w-4" />
                  </div>

                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white p-3 text-sm leading-6 text-slate-700 shadow-sm">
                    Xin chào! Mình là AI Tutor. Mình sẽ giúp bạn hiểu nội dung
                    đang học, dựa trên tài liệu của khóa học.
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    "Giải thích kiến thức quan trọng trong bài này",
                    "Cho mình một ví dụ dựa trên bài học",
                    "Tóm tắt nội dung cần ghi nhớ",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setInput(suggestion)}
                      className="flex w-full items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-3 py-2 text-left text-xs text-[#145a68] transition hover:border-[#78bcc4] hover:bg-[#eef7f7]"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => {
              const fromUser = message.role === "user";

              return (
                <div
                  key={index}
                  className={`flex ${
                    fromUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`min-w-0 max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                      fromUser
                        ? "rounded-tr-sm bg-[#145a68] text-white"
                        : "rounded-tl-sm bg-white text-slate-700 shadow-sm"
                    }`}
                  >
                    {fromUser ? (
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    ) : (
                      <TutorMessage content={message.content} />
                    )}

                    {!fromUser &&
                      message.sources &&
                      message.sources.length > 0 && (
                        <div className="mt-3 border-t border-slate-100 pt-2">
                          <p className="mb-1 text-[11px] font-bold text-[#145a68]">
                            Tài liệu tham khảo
                          </p>

                          {message.sources.map((source) => (
                            <p
                              key={source.lessonId}
                              className="text-[11px] text-slate-500"
                            >
                              • {source.title}
                            </p>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#145a68]" />
                AI đang tìm trong tài liệu bài học...
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
              >
                {error}
              </p>
            )}
          </div>

          {/* Form nhập câu hỏi */}
          <div className="shrink-0 border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                aria-label="Nhập câu hỏi cho AI Tutor"
                rows={2}
                value={input}
                maxLength={2000}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi về nội dung đang học..."
                disabled={sending}
                className="min-h-11 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#78bcc4] disabled:opacity-60"
              />

              <button
                type="button"
                aria-label="Gửi câu hỏi"
                onClick={() => void sendMessage()}
                disabled={sending || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F7444E] text-white transition hover:bg-[#e13a45] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-400">
              AI có thể sai. Hãy đối chiếu với tài liệu gốc.
            </p>
          </div>
        </section>
      )}

      {/* BONG BÓNG CHAT */}
      <button
        type="button"
        aria-label={open ? "Thu nhỏ AI Tutor" : "Mở AI Tutor"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#F7444E] text-white shadow-xl transition hover:scale-105 hover:bg-[#e13a45] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#78bcc4]"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}

        {!open && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#145a68]">
            <Sparkles className="h-2.5 w-2.5" />
          </span>
        )}
      </button>
    </div>
  );
}

// Chỉ hiển thị ở trang có ngữ cảnh học tập.
export function AiTutorFloating() {
  const { context } = useTutorContext();
  const { isAuthenticated, role } = useAuth();

  if (!context || !isAuthenticated || role !== "learner") {
    return null;
  }

  // Thay bài học/chương => tạo cửa sổ chat mới.
  // Tránh đem tin nhắn bài trước sang bài tiếp theo.
  const contextKey = [
    context.mode,
    context.lessonId ?? "",
    context.chapterId ?? "",
    context.courseId ?? "",
    context.courseSlug ?? "",
    context.quizId ?? "",
    context.questionId ?? "",
  ].join(":");

  return <FloatingWindow key={contextKey} context={context} />;
}
