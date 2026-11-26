export type TutorHistoryConversation = {
  id: string;
  title: string;
  preview: string;
  created_at: string;
};

export type TutorHistoryMessage = {
  id: string;
  conversation_id: string;
  sender_role: "user" | "assistant" | "system";
  message_content: string;
  created_at: string;
};