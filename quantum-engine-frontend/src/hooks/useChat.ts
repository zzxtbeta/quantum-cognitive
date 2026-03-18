import { useCallback, useRef, useState } from 'react';
import { streamDeepResearch, clearDeepThread, getDeepHistory } from '../api/chat';
import { ChatMessage } from '../types';

export interface ThreadMeta {
  id: string;
  title: string;
  ts: string;
}

const THREADS_KEY = 'gravity:threads';
const ACTIVE_THREAD_KEY = 'gravity:active-thread';

function getStoredThreads(): ThreadMeta[] {
  try {
    return JSON.parse(localStorage.getItem(THREADS_KEY) || '[]');
  } catch {
    return [];
  }
}

function persistActiveThread(threadId: string) {
  try {
    localStorage.setItem(ACTIVE_THREAD_KEY, threadId);
  } catch {
    // Ignore storage failures in private mode or restricted browsers.
  }
}

function upsertThread(meta: ThreadMeta): ThreadMeta[] {
  const list = getStoredThreads().filter((thread) => thread.id !== meta.id);
  const updated = [meta, ...list].slice(0, 40);
  localStorage.setItem(THREADS_KEY, JSON.stringify(updated));
  return updated;
}

let threadCounter = Date.now();

function newThreadId() {
  return `thread-${threadCounter++}`;
}

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [threadId, setThreadIdState] = useState<string>(() => {
    const initial = newThreadId();
    persistActiveThread(initial);
    return initial;
  });
  const [savedThreads, setSavedThreads] = useState<ThreadMeta[]>(() => getStoredThreads());
  const [activeSubagent, setActiveSubagent] = useState<string | null>(null);
  const [toolSteps, setToolSteps] = useState<{ id: number; tool: string; content: string }[]>([]);
  const stepCounterRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const setThreadId = useCallback((nextThreadId: string) => {
    persistActiveThread(nextThreadId);
    setThreadIdState(nextThreadId);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      abortRef.current?.abort();

      if (messages.length === 0) {
        const meta: ThreadMeta = {
          id: threadId,
          title: content.slice(0, 48),
          ts: new Date().toISOString(),
        };
        setSavedThreads(upsertThread(meta));
      }

      persistActiveThread(threadId);

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

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setLoading(true);
      setError(null);
      setActiveSubagent(null);
      setToolSteps([]);
      stepCounterRef.current = 0;

      abortRef.current = streamDeepResearch(content, threadId, {
        onToken: (token: string) => {
          setActiveSubagent(null);
          setMessages((prev) =>
            prev.map((message) =>
              message.id === aiMsgId ? { ...message, content: message.content + token } : message,
            ),
          );
        },
        onFinalReport: (finalContent: string) => {
          setActiveSubagent(null);
          setMessages((prev) =>
            prev.map((message) =>
              message.id === aiMsgId ? { ...message, content: finalContent } : message,
            ),
          );
        },
        onSubagentToken: (agent: string) => {
          setActiveSubagent(agent);
        },
        onAgentStart: (agent: string) => {
          setActiveSubagent(agent);
        },
        onStep: (tool: string, stepContent: string) => {
          const id = stepCounterRef.current++;
          setToolSteps((prev) => [...prev, { id, tool, content: stepContent }]);
        },
        onDone: () => {
          setLoading(false);
          setActiveSubagent(null);
          abortRef.current = null;
        },
        onError: (message: string) => {
          setError(new Error(message));
          setMessages((prev) =>
            prev.map((item) =>
              item.id === aiMsgId
                ? { ...item, content: item.content || `[生成失败: ${message}]` }
                : item,
            ),
          );
          setLoading(false);
          setActiveSubagent(null);
          abortRef.current = null;
        },
      });
    },
    [messages, threadId],
  );

  const clearMessages = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setError(null);
    setActiveSubagent(null);
    setToolSteps([]);

    const oldThreadId = threadId;
    setThreadId(newThreadId());

    try {
      await clearDeepThread(oldThreadId);
    } catch {
      // Ignore failed cleanup; the new thread is already isolated on the client.
    }
  }, [setThreadId, threadId]);

  const switchThread = useCallback(
    async (meta: ThreadMeta) => {
      abortRef.current?.abort();
      abortRef.current = null;
      setMessages([]);
      setError(null);
      setActiveSubagent(null);
      setToolSteps([]);
      setThreadId(meta.id);

      try {
        const data = await getDeepHistory(meta.id);
        const loaded: ChatMessage[] = data.messages
          .filter((message) => message.content && (message.role === 'user' || message.role === 'assistant'))
          .map((message, index) => ({
            id: `hist-${index}-${Date.now()}`,
            role: message.role as 'user' | 'assistant',
            content: message.content,
            timestamp: new Date().toISOString(),
          }));
        setMessages(loaded);
      } catch {
        // Ignore history failures and leave the thread empty.
      }
    },
    [setThreadId],
  );

  const deleteThread = useCallback(
    async (meta: ThreadMeta) => {
      const updated = getStoredThreads().filter((thread) => thread.id !== meta.id);
      localStorage.setItem(THREADS_KEY, JSON.stringify(updated));
      setSavedThreads(updated);

      try {
        await clearDeepThread(meta.id);
      } catch {
        // Ignore backend cleanup failures for deleted local history.
      }

      if (meta.id === threadId) {
        abortRef.current?.abort();
        abortRef.current = null;
        setMessages([]);
        setError(null);
        setActiveSubagent(null);
        setToolSteps([]);
        setThreadId(newThreadId());
      }
    },
    [setThreadId, threadId],
  );

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
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
    switchThread,
    deleteThread,
  };
};
