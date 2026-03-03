import { useState, useCallback, useRef } from 'react';
import { streamChat, clearChatThread, getChatHistory } from '../api/chat';
import { ChatMessage } from '../types';

let threadCounter = Date.now();
function newThreadId() {
  return `thread-${threadCounter++}`;
}

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [threadId] = useState<string>(newThreadId);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    // 取消上一个未完成的请求
    abortRef.current?.abort();

    // 先追加用户消息
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    // 预先插入空的 AI 占位消息
    const aiMsgId = `ai-${Date.now()}`;
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setLoading(true);
    setError(null);

    const controller = streamChat(
      content,
      threadId,
      {
        onToken: (token) => {
          setMessages(prev =>
            prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + token } : m)
          );
        },
        onDone: () => {
          setLoading(false);
          abortRef.current = null;
        },
        onError: (msg) => {
          setError(new Error(msg));
          setMessages(prev =>
            prev.map(m => m.id === aiMsgId ? { ...m, content: m.content || `[错误: ${msg}]` } : m)
          );
          setLoading(false);
          abortRef.current = null;
        },
      },
    );

    abortRef.current = controller;
  }, [threadId]);

  const clearMessages = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setError(null);
    try {
      await clearChatThread(threadId);
    } catch { /* 清除失败也没关系 */ }
  }, [threadId]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await getChatHistory(threadId);
      const loaded: ChatMessage[] = data.messages.map((m, i) => ({
        id: `hist-${i}`,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date().toISOString(),
      }));
      setMessages(loaded);
    } catch { /* ignore */ }
  }, [threadId]);

  return {
    messages,
    loading,
    error,
    threadId,
    sendMessage,
    clearMessages,
    loadHistory,
  };
};

