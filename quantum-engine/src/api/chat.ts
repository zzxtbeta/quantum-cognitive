// Chat/LLM相关 API —— LangGraph 后端（流式 SSE）

const CHAT_BASE = import.meta.env.DEV
  ? '/chat-api'
  : (import.meta.env.VITE_CHAT_BASE_URL || 'http://localhost:8001');

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}

/**
 * 向 LangGraph 后端发送消息，流式接收 token。
 * 返回一个 AbortController 可用于中断请求。
 */
export function streamChat(
  message: string,
  threadId: string,
  callbacks: StreamCallbacks,
  systemPrompt?: string,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${CHAT_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, thread_id: threadId, system_prompt: systemPrompt }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE lines: "data: {...}\n\n"
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.startsWith('data: ') ? line.slice(6) : line;
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === 'token') callbacks.onToken(parsed.content);
            else if (parsed.type === 'done') callbacks.onDone();
            else if (parsed.type === 'error') callbacks.onError(parsed.content);
          } catch { /* ignore non-JSON lines */ }
        }
      }
      callbacks.onDone();
    } catch (err: any) {
      if (err?.name !== 'AbortError') callbacks.onError(err?.message ?? 'Unknown error');
    }
  })();

  return controller;
}

/** 获取某个线程的历史消息 */
export async function getChatHistory(threadId: string) {
  const res = await fetch(`${CHAT_BASE}/chat/history/${threadId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ thread_id: string; messages: { role: string; content: string }[] }>;
}

/** 清空某个线程的历史 */
export async function clearChatThread(threadId: string) {
  const res = await fetch(`${CHAT_BASE}/chat/thread/${threadId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
