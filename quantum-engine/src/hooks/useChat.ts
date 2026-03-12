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
  /** 所有工具调用步骤（本轮对话累积，不清空，显示完整调用链） */
  const [toolSteps, setToolSteps] = useState<{ id: number; tool: string; content: string }[]>([]);
  const stepCounterRef = useRef(0);
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
    setToolSteps([]);
    stepCounterRef.current = 0;

    const callbacks = {
      onToken: (token: string) => {
        setActiveSubagent(null);
        setMessages(prev =>
          prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + token } : m)
        );
      },
      onSubagentToken: (agent: string, _content: string) => {
        setActiveSubagent(agent);
      },
      onAgentStart: (agent: string, _content: string) => {
        setActiveSubagent(agent);
      },
      onStep: (tool: string, content: string) => {
        const id = stepCounterRef.current++;
        setToolSteps(prev => [...prev, { id, tool, content }]);
      },
      onDone: () => {
        setLoading(false);
        setActiveSubagent(null);
        abortRef.current = null;
      },
      onError: (msg: string) => {
        setError(new Error(msg));
        setMessages(prev =>
          prev.map(m => m.id === aiMsgId ? { ...m, content: m.content || `[错误: ${msg}]` } : m)
        );
        setLoading(false);
        setActiveSubagent(null);
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
    setToolSteps([]);
    // 立即生成新 thread_id，确保下一条消息开始新会话
    const oldThreadId = threadId;
    setThreadId(newThreadId());
    try {
      if (mode === 'deep') {
        await clearDeepThread(oldThreadId);
      } else {
        await clearChatThread(oldThreadId);
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
    setToolSteps([]);
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

  /** 删除某条历史记录（localStorage + 后端状态 + 工具日志），若删的是当前 thread 则重置 */
  const deleteThread = useCallback(async (meta: ThreadMeta) => {
    const updated = getStoredThreads().filter(t => t.id !== meta.id);
    localStorage.setItem(THREADS_KEY, JSON.stringify(updated));
    setSavedThreads(updated);
    try {
      await clearDeepThread(meta.id);
    } catch { /* ignore */ }
    if (meta.id === threadId) {
      abortRef.current?.abort();
      abortRef.current = null;
      setMessages([]);
      setError(null);
      setActiveSubagent(null);
      setToolSteps([]);
      setThreadId(newThreadId());
    }
  }, [threadId]);

  /** 仅中断当前流式输出，保留已有消息（不清空 thread）。 */
  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    // loading will be reset via onDone callback triggered by AbortError handling in _fetchSSE
  }, []);

  return {
    messages,
    loading,
    error,
    threadId,
    activeSubagent,
    toolSteps,
    savedThreads,
    sendMessage,
    clearMessages,
    cancelGeneration,
    loadHistory,
    switchThread,
    deleteThread,
  };
};

