const CHAT_BASE = import.meta.env.DEV
  ? '/chat-api'
  : (import.meta.env.VITE_CHAT_BASE_URL || 'http://localhost:8001');

export interface ToolLogEntry {
  id: number;
  run_id: string;
  thread_id: string;
  turn_id?: string;
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

export interface ToolLogTurn {
  turn_id: string;
  started_at: string;
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
  turn_id?: string;
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
  return getJson<{ logs: ToolLogEntry[] }>(url).then(r =>
    (r.logs || []).map(item => ({
      ...item,
      turn_id: item.turn_id || 'legacy',
    }))
  );
}

export function fetchToolLogSessions() {
  return getJson<{ sessions: ToolLogSession[] }>(`${CHAT_BASE}/deep/tool-logs/sessions`)
    .then(r => r.sessions);
}

export function fetchToolNames() {
  return getJson<{ tools: string[] }>(`${CHAT_BASE}/deep/tool-logs/tools`)
    .then(r => r.tools);
}

export function fetchToolTurns(threadId: string) {
  const qs = new URLSearchParams({ thread_id: threadId }).toString();
  return getJson<{ turns: ToolLogTurn[] }>(`${CHAT_BASE}/deep/tool-logs/turns?${qs}`)
    .then(r => r.turns);
}
