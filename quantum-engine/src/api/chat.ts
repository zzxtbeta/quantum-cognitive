// Chat/LLM相关 API —— LangGraph 后端（流式 SSE）

const CHAT_BASE = import.meta.env.DEV
  ? '/chat-api'
  : (import.meta.env.VITE_CHAT_BASE_URL || 'http://localhost:8001');

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
  /** DeepAgent 模式：子Agent 输出 token */
  onSubagentToken?: (agent: string, content: string) => void;
  /** DeepAgent 模式：子Agent 启动（显示正在调用哪个 Agent） */
  onAgentStart?: (agent: string, content: string) => void;
  /** DeepAgent 模式：工具调用进度 */
  onStep?: (tool: string, content: string) => void;
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
  return _fetchSSE(
    `${CHAT_BASE}/chat/stream`,
    { message, thread_id: threadId, system_prompt: systemPrompt },
    callbacks,
  );
}

/**
 * 向 DeepAgent 后端发送深度研究请求（多子Agent 模式）。
 * endpoint: POST /deep/stream
 */
export function streamDeepResearch(
  message: string,
  threadId: string,
  callbacks: StreamCallbacks,
): AbortController {
  return _fetchSSE(
    `${CHAT_BASE}/deep/stream`,
    { message, thread_id: threadId },
    callbacks,
  );
}

/** 清空 DeepAgent 会话 */
export async function clearDeepThread(threadId: string) {
  const res = await fetch(`${CHAT_BASE}/deep/thread/${threadId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function _fetchSSE(
  url: string,
  body: object,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.startsWith('data: ') ? line.slice(6) : line;
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === 'token') callbacks.onToken(parsed.content);
            else if (parsed.type === 'subagent_token') callbacks.onSubagentToken?.(parsed.agent, parsed.content);
            else if (parsed.type === 'agent_start') callbacks.onAgentStart?.(parsed.agent, parsed.content);
            else if (parsed.type === 'step') callbacks.onStep?.(parsed.tool, parsed.content);
            else if (parsed.type === 'step_done') { /* handled by onStep clearing */ }
            else if (parsed.type === 'done') callbacks.onDone();
            else if (parsed.type === 'error') callbacks.onError(parsed.content);
          } catch { /* ignore non-JSON */ }
        }
      }
      callbacks.onDone();
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        callbacks.onDone(); // ensure loading resets on manual abort
      } else {
        callbacks.onError(err?.message ?? 'Unknown error');
      }
    }
  })();

  return controller;
}

/** 获取普通对话线程的历史消息 */
export async function getChatHistory(threadId: string) {
  const res = await fetch(`${CHAT_BASE}/chat/history/${threadId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ thread_id: string; messages: { role: string; content: string }[] }>;
}

/** 获取 DeepAgent 线程的历史消息 */
export async function getDeepHistory(threadId: string) {
  const res = await fetch(`${CHAT_BASE}/deep/history/${threadId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ thread_id: string; messages: { role: string; content: string }[] }>;
}

/** 清空某个线程的历史 */
export async function clearChatThread(threadId: string) {
  const res = await fetch(`${CHAT_BASE}/chat/thread/${threadId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── 模型管理 ────────────────────────────────────────────────────────────────

export interface ModelPreset {
  display_name: string;
  model: string;
}

export interface ModelsResponse {
  active: string;
  active_model: string;
  presets: Record<string, ModelPreset>;
}

export async function getModels(): Promise<ModelsResponse> {
  const res = await fetch(`${CHAT_BASE}/models`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function switchModel(preset: string): Promise<{ active: string; model: string; display_name: string }> {
  const res = await fetch(`${CHAT_BASE}/models/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preset }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

