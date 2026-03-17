// Deep research API adapter. The frontend now uses the orchestrator path only.
const CHAT_BASE = import.meta.env.VITE_CHAT_BASE_URL || '/chat-api';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
  onFinalReport?: (content: string) => void;
  onSubagentToken?: (agent: string, content: string) => void;
  onAgentStart?: (agent: string, content: string) => void;
  onStep?: (tool: string, content: string) => void;
}

export function streamDeepResearch(
  message: string,
  threadId: string,
  callbacks: StreamCallbacks,
): AbortController {
  return fetchSSE(
    `${CHAT_BASE}/deep/stream`,
    { message, thread_id: threadId },
    callbacks,
  );
}

export async function clearDeepThread(threadId: string) {
  const res = await fetch(`${CHAT_BASE}/deep/thread/${threadId}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

function fetchSSE(
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
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.body) {
        throw new Error('No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.startsWith('data: ') ? line.slice(6) : line;
          if (!trimmed) {
            continue;
          }
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === 'token') callbacks.onToken(parsed.content);
            else if (parsed.type === 'final_report') callbacks.onFinalReport?.(parsed.content);
            else if (parsed.type === 'subagent_token') callbacks.onSubagentToken?.(parsed.agent, parsed.content);
            else if (parsed.type === 'agent_start') callbacks.onAgentStart?.(parsed.agent, parsed.content);
            else if (parsed.type === 'step') callbacks.onStep?.(parsed.tool, parsed.content);
            else if (parsed.type === 'done') callbacks.onDone();
            else if (parsed.type === 'error') callbacks.onError(parsed.content);
          } catch {
            // Ignore malformed chunks and continue streaming.
          }
        }
      }

      callbacks.onDone();
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        callbacks.onDone();
      } else {
        callbacks.onError(err?.message ?? 'Unknown error');
      }
    }
  })();

  return controller;
}

export async function getDeepHistory(threadId: string) {
  const res = await fetch(`${CHAT_BASE}/deep/history/${threadId}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<{ thread_id: string; messages: { role: string; content: string }[] }>;
}

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
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function switchModel(preset: string): Promise<{ active: string; model: string; display_name: string }> {
  const res = await fetch(`${CHAT_BASE}/models/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preset }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}
