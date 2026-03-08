const CHAT_BASE = import.meta.env.DEV
  ? '/chat-api'
  : (import.meta.env.VITE_CHAT_BASE_URL || 'http://localhost:8001');

export interface ToolLogEntry {
  id: number;
  run_id: string;
  thread_id: string;
  tool: string;
  label: string | null;
  input_str: string | null;
  output_str: string | null;
  duration_ms: number | null;
  ts: string;
}

export interface ToolLogSession {
  thread_id: string;
  last_activity: string;
  call_count: number;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function fetchToolLogs(params: {
  thread_id?: string;
  tool?: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.append(k, String(v));
  });
  const qs = search.toString();
  const url = `${CHAT_BASE}/deep/tool-logs${qs ? `?${qs}` : ''}`;
  return getJson<{ logs: ToolLogEntry[] }>(url).then(r => r.logs);
}

export function fetchToolLogSessions() {
  return getJson<{ sessions: ToolLogSession[] }>(`${CHAT_BASE}/deep/tool-logs/sessions`)
    .then(r => r.sessions);
}

export function fetchToolNames() {
  return getJson<{ tools: string[] }>(`${CHAT_BASE}/deep/tool-logs/tools`)
    .then(r => r.tools);
}
