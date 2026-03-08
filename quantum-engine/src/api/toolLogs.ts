import { apiClient } from './client';

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

export function fetchToolLogs(params: {
  thread_id?: string;
  tool?: string;
  limit?: number;
  offset?: number;
}) {
  return apiClient
    .get<{ logs: ToolLogEntry[] }>('/deep/tool-logs', params as Record<string, any>)
    .then(r => r.logs);
}

export function fetchToolLogSessions() {
  return apiClient
    .get<{ sessions: ToolLogSession[] }>('/deep/tool-logs/sessions')
    .then(r => r.sessions);
}

export function fetchToolNames() {
  return apiClient
    .get<{ tools: string[] }>('/deep/tool-logs/tools')
    .then(r => r.tools);
}
