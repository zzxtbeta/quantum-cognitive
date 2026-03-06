import { useState, useCallback, useRef } from 'react';
import { streamChat, streamDeepResearch, clearChatThread, clearDeepThread, getChatHistory, getDeepHistory } from '../api/chat';
import { ChatMessage } from '../types';

export type ChatMode = 'chat' | 'deep';

// ── 历史对话本地存储 ────────────────────────────────────────────────────────────────────────
export interface ThreadMeta {
  id: string;
  title: string;
  mode: ChatMode;
  ts: string;
}

const THREADS_KEY = 'gravity:threads';

function getStoredThreads(): ThreadMeta[] {
  try { return JSON.parse(localStorage.getItem(THREADS_KEY) || '[]'); } catch { return []; }
}

function upsertThread(meta: ThreadMeta): ThreadMeta[] {
  const list = getStoredThreads().filter(t => t.id !== meta.id);
  const updated = [meta, ...list].slice(0, 40);
  localStorage.setItem(THREADS_KEY, JSON.stringify(updated));
  return updated;
}

let threadCounter = Date.now();
function newThreadId() {
  return `thread-${threadCounter++}`;
}

export const useChat = (mode: ChatMode = 'chat') => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [threadId, setThreadId] = useState<string>(newThreadId);
  const [savedThreads, setSavedThreads] = useState<ThreadMeta[]>(() => getStoredThreads());
  /** DeepAgent 模式：当前活跃子Agent 名称 */
  const [activeSubagent, setActiveSubagent] = useState<string | null>(null);
  /** DeepAgent 模式：当前进度步骤描述（工具调用信息） */
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    abortRef.current?.abort();

    if (messages.length === 0) {
      const meta: ThreadMeta = { id: threadId, title: content.slice(0, 48), mode, ts: new Date().toISOString() };
      setSavedThreads(upsertThread(meta));
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

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
    setActiveSubagent(null);
    setProgressStep(null);

    const callbacks = {
      onToken: (token: string) => {
        setActiveSubagent(null);
        setProgressStep(null);
        setMessages(prev =>
          prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + token } : m)
        );
      },
      onSubagentToken: (agent: string, _content: string) => {
        setActiveSubagent(agent);
        setProgressStep(null);
      },
      onAgentStart: (agent: string, content: string) => {
        setActiveSubagent(agent);
        setProgressStep(content);
      },
      onStep: (_tool: string, content: string) => {
        setProgressStep(content);
      },
      onDone: () => {
        setLoading(false);
        setActiveSubagent(null);
        setProgressStep(null);
        abortRef.current = null;
      },
      onError: (msg: string) => {
        setError(new Error(msg));
        setMessages(prev =>
          prev.map(m => m.id === aiMsgId ? { ...m, content: m.content || `[错误: ${msg}]` } : m)
        );
        setLoading(false);
        setActiveSubagent(null);
        setProgressStep(null);
        abortRef.current = null;
      },
    };

    const controller = mode === 'deep'
      ? streamDeepResearch(content, threadId, callbacks)
      : streamChat(content, threadId, callbacks);

    abortRef.current = controller;
  }, [messages, threadId, mode]);

  const clearMessages = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setError(null);
    setActiveSubagent(null);
    setProgressStep(null);
    try {
      if (mode === 'deep') {
        await clearDeepThread(threadId);
      } else {
        await clearChatThread(threadId);
      }
    } catch { /* 清除失败也没关系 */ }
  }, [threadId, mode]);

  const loadHistory = useCallback(async () => {
    if (mode === 'deep') return; // deep 模式暂不支持历史恢复
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
  }, [threadId, mode]);

  /** 切换到历史对话，从后端加载对应消息列表 */
  const switchThread = useCallback(async (meta: ThreadMeta) => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setError(null);
    setActiveSubagent(null);
    setProgressStep(null);
    setThreadId(meta.id);
    try {
      const data = meta.mode === 'deep'
        ? await getDeepHistory(meta.id)
        : await getChatHistory(meta.id);
      const loaded: ChatMessage[] = data.messages
        .filter(m => m.content && (m.role === 'user' || m.role === 'assistant'))
        .map((m, i) => ({
          id: `hist-${i}-${Date.now()}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date().toISOString(),
        }));
      setMessages(loaded);
    } catch { /* 加载失败不影响使用 */ }
  }, []);

  return {
    messages,
    loading,
    error,
    threadId,
    activeSubagent,
    progressStep,
    savedThreads,
    sendMessage,
    clearMessages,
    loadHistory,
    switchThread,
  };
};

