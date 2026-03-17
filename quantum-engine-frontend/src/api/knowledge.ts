const CHAT_BASE = import.meta.env.DEV
  ? '/chat-api'
  : (import.meta.env.VITE_CHAT_BASE_URL || 'http://localhost:8001');

export interface KnowledgeItem {
  id: number;
  thread_id: string | null;
  turn_id: string | null;
  agent_name: string;
  category: string;
  title: string;
  size_chars: number;
  created_at: string;
  metadata: Record<string, unknown>;
  content?: string; // only present in detail response
}

export interface CategorySummary {
  category: string;
  count: number;
  latest: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function fetchKnowledgeItems(params: {
  category?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.append(k, String(v));
  });
  const qs = search.toString();
  return getJson<{ items: KnowledgeItem[] }>(`${CHAT_BASE}/deep/knowledge${qs ? `?${qs}` : ''}`)
    .then(r => r.items);
}

export function fetchKnowledgeCategories() {
  return getJson<{ categories: CategorySummary[] }>(`${CHAT_BASE}/deep/knowledge/categories`)
    .then(r => r.categories);
}

export function fetchKnowledgeDetail(id: number) {
  return getJson<KnowledgeItem>(`${CHAT_BASE}/deep/knowledge/${id}`);
}

export function downloadKnowledgeItem(id: number) {
  window.open(`${CHAT_BASE}/deep/knowledge/${id}/download`, '_blank');
}

export async function deleteKnowledgeItem(id: number): Promise<boolean> {
  const res = await fetch(`${CHAT_BASE}/deep/knowledge/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}
