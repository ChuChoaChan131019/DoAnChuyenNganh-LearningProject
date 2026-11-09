import type { TutorChatMessage } from "../types/context-tutor";

// Giới hạn giống DTO backend; giữ nguyên nội dung đầy đủ ở cửa sổ chat.
export function buildTutorHistory(messages: TutorChatMessage[]): TutorChatMessage[] {
  return messages.slice(-6).map(({ role, content }) => ({
    role,
    content: content.slice(0, 2000),
  }));
}
