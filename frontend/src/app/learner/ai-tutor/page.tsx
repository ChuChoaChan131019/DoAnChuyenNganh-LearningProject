'use client';

import React, { Suspense, startTransition, useEffect, useState } from 'react';
import { Bot, History, MessageSquarePlus, Send, Sparkles, X } from 'lucide-react';
import { aiTutorApi } from '@/lib/api';
import { formatDate } from '@/lib/date';

const SUGGESTIONS = [
  'Explain polymorphism with an example',
  'What is the difference between an interface and an abstract class?',
  'How does LINQ GroupBy work?',
  'When should I use try/catch/finally?',
];

function truncatePreview(text: string, maxLength = 52) {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength).trim()}...` : singleLine;
}

function formatAssistantMessage(text: string) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let codeLines: string[] = [];
  let isCodeBlock = false;

  const renderInline = (line: string) => line.split(/(\*\*.*?\*\*|`.*?`)/g).map((part, partIndex) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`part-${partIndex}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`part-${partIndex}`} className="rounded bg-slate-200/70 px-1 py-0.5 text-[0.9em] text-[#145a68]">{part.slice(1, -1)}</code>;
    }
    return <React.Fragment key={`part-${partIndex}`}>{part}</React.Fragment>;
  });

  const flushCodeBlock = () => {
    if (!codeLines.length) return;
    blocks.push(
      <pre key={`code-${blocks.length}`} className="my-2 overflow-x-auto rounded-lg bg-[#0f3741] p-3 text-xs leading-5 text-slate-100">
        <code>{codeLines.join('\n')}</code>
      </pre>,
    );
    codeLines = [];
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      if (isCodeBlock) flushCodeBlock();
      isCodeBlock = !isCodeBlock;
      return;
    }
    if (isCodeBlock) {
      codeLines.push(line);
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const orderedItem = line.match(/^\s*\d+[.)]\s+(.+)$/);

    if (heading) {
      blocks.push(<h3 key={`heading-${index}`} className="mt-3 text-sm font-bold text-[#0f3741]">{renderInline(heading[2])}</h3>);
    } else if (bullet) {
      blocks.push(<div key={`bullet-${index}`} className="pl-3 before:mr-2 before:text-[#f7444e] before:content-['•']">{renderInline(bullet[1])}</div>);
    } else if (orderedItem) {
      blocks.push(<div key={`ordered-${index}`} className="pl-1">{renderInline(line)}</div>);
    } else if (line.trim()) {
      blocks.push(<p key={`paragraph-${index}`} className="mb-2 last:mb-0">{renderInline(line)}</p>);
    }
  });

  if (isCodeBlock) flushCodeBlock();
  return <div className="space-y-1">{blocks}</div>;
}

function AITutorContent() {
  const [inputValue, setInputValue] = useState('');
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([]);
  const [history, setHistory] = useState<Array<{ id: string; title: string; preview: string; created_at: string }>>([]);
  const [allHistoryMessages, setAllHistoryMessages] = useState<Array<{ conversation_id: string; sender_role: 'user' | 'assistant' | 'system'; message_content: string }>>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setConversationId(undefined);
      setMessages([]);
    });

    void aiTutorApi.history().then((data) => {
      setHistory(data.conversations);
      setAllHistoryMessages(data.messages);
      const latestConversation = data.conversations[0]?.id;
      setConversationId(latestConversation);
      setMessages(
        data.messages
          .filter((message) => message.conversation_id === latestConversation)
          .map((message) => ({
            sender: message.sender_role === 'user' ? 'user' : 'assistant',
            text: message.message_content,
          })),
      );
      setIsReady(true);
    }).catch(() => setIsReady(true));
  }, []);

  const startNewConversation = () => {
    setConversationId(undefined);
    setMessages([]);
    setInputValue('');
    setIsHistoryOpen(false);
  };

  const openConversation = (selectedConversationId: string) => {
    setConversationId(selectedConversationId);
    setMessages(
      allHistoryMessages
        .filter((message) => message.conversation_id === selectedConversationId)
        .map((message) => ({
          sender: message.sender_role === 'user' ? 'user' : 'assistant',
          text: message.message_content,
        })),
    );
    setIsHistoryOpen(false);
  };

  const sendMessage = async () => {
    const message = inputValue.trim();
    if (!message || !isReady || isSending) return;

    setInputValue('');
    setMessages((current) => [...current, { sender: 'user', text: message }]);
    setIsSending(true);
    try {
      const result = await aiTutorApi.send({ conversationId, message });
      setConversationId(result.conversationId);
      setMessages((current) => [...current, { sender: 'assistant', text: result.message.message_content }]);
    } catch {
      setMessages((current) => [
        ...current,
        { sender: 'assistant', text: 'Không thể gửi câu hỏi lúc này. Vui lòng thử lại.' },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1216px] space-y-[22px]">
      {/* Header */}
      <div>
        <p className="mb-1 text-sm font-medium text-[#145a68]">Learn</p>
        <h1 className="text-[32px] font-bold tracking-tight text-[#0f3741]">AI Tutor</h1>
        <p className="mt-1 text-sm text-slate-500">
          Course-aware explanations with real C# examples, available any time.
        </p>
      </div>

      <div className="grid gap-[22px] lg:grid-cols-[minmax(0,1fr)_276px]">
        {/* Left: Chat Interface */}
        <div className="relative flex h-[520px] min-h-0 flex-col overflow-hidden rounded-[16px] border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.06)]">
          {/* Chat Header (Có đường kẻ ngang giống ảnh mẫu) */}
          <div className="flex items-center justify-between border-b border-slate-100 px-[18px] py-[15px]">
            <h2 className="text-[15px] font-bold text-[#0f3741]">Conversation</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="New chat"
                title="New chat"
                onClick={startNewConversation}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#145a68]"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={isHistoryOpen ? 'Close chat history' : 'Open chat history'}
                onClick={() => setIsHistoryOpen((open) => !open)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#145a68]"
              >
                {isHistoryOpen ? <X className="h-4 w-4" /> : <History className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isHistoryOpen && (
            <div className="absolute right-4 top-[52px] z-10 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <p className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Chat history</p>
              {!history.length ? (
                <p className="px-2 py-4 text-sm text-slate-500">No saved conversations yet.</p>
              ) : (
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {history.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => openConversation(conversation.id)}
                      className="w-full rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span className="block truncate font-medium" title={conversation.preview || conversation.title}>
                        {truncatePreview(conversation.preview || conversation.title)}
                      </span>
                      {conversation.created_at && (
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {formatDate(conversation.created_at)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat History Area */}
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-[18px]">
            {/* AI Welcome Message */}
            {messages.length === 0 && <div className="flex items-start gap-4">
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#e8a3a0] text-white">
                <Bot className="h-[15px] w-[15px]" />
              </div>
              <div className="rounded-[18px] rounded-tl-sm bg-[#f4f5f0] px-4 py-[13px] text-[15px] leading-[1.45] text-slate-700">
                Mình sẽ trả lời ngắn gọn các câu hỏi liên quan đến nội dung các bài học hiện có.
              </div>
            </div>}
            {messages.map((message, index) => (
              <div key={`${message.sender}-${index}`} className={`flex items-start gap-4 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                {message.sender === 'assistant' && <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#e8a3a0] text-white"><Bot className="h-[15px] w-[15px]" /></div>}
                <div className={`max-w-[80%] break-words rounded-[18px] px-4 py-[13px] text-[15px] leading-[1.45] ${message.sender === 'user' ? 'rounded-tr-sm bg-[#145a68] text-white' : 'rounded-tl-sm bg-[#f4f5f0] text-slate-700'}`}>
                  {message.sender === 'assistant' ? formatAssistantMessage(message.text) : message.text}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex items-start gap-4">
                <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#e8a3a0] text-white">
                  <Bot className="h-[15px] w-[15px]" />
                </div>
                <div className="flex h-[47px] items-center gap-1 rounded-[18px] rounded-tl-sm bg-[#f4f5f0] px-4 text-[#145a68]" aria-label="AI is typing">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#78bcc4] [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#78bcc4] [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#78bcc4]" />
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Area */}
          <div className="border-t border-slate-100 px-[18px] py-[14px]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about a C# or OOP concept..."
                disabled={isSending}
                className="h-[35px] flex-1 rounded-[13px] border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder-slate-400 shadow-sm transition-all focus:border-[#78bcc4] focus:outline-none focus:ring-4 focus:ring-[#78bcc4]/10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <button
                type="button"
                aria-label="Send question"
                onClick={() => void sendMessage()}
                disabled={!isReady || isSending || !inputValue.trim()}
                className="flex h-[35px] w-[45px] shrink-0 items-center justify-center rounded-[12px] bg-[#f7949a] text-white shadow-sm transition-colors hover:bg-rose-400"
              >
                <Send className="ml-0.5 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Suggested Questions */}
        <div className="w-full shrink-0 rounded-[16px] border border-[#dfe6df] bg-[#fbfdf9] p-[18px] shadow-[0_8px_18px_rgba(0,44,62,0.06)]">
          <h2 className="text-[15px] font-bold text-[#0f3741]">Try asking</h2>
          <div className="mt-4 flex flex-col gap-2">
            {SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setInputValue(suggestion)}
                className="flex items-start gap-2 rounded-[13px] border border-slate-200/80 bg-white px-3 py-[9px] text-left transition-all hover:border-[#78bcc4] hover:shadow-sm"
              >
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#78bcc4]" />
                <span className="text-sm leading-[1.4] text-[#145a68]">{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AITutorPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1216px] text-sm text-slate-500">Loading tutor...</div>}>
      <AITutorContent />
    </Suspense>
  );
}