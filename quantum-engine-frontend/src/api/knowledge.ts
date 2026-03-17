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

export async function copyKnowledgeContent(content: string): Promise<void> {
  await navigator.clipboard.writeText(content);
}

export function exportKnowledgeAsPdf(title: string, html: string) {
  const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '_');
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
  if (!popup) {
    throw new Error('浏览器拦截了 PDF 导出窗口，请允许弹窗后重试');
  }

  popup.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #0f172a;
      --muted: #475569;
      --line: #cbd5e1;
      --bg: #f8fafc;
      --card: #ffffff;
      --link: #1d4ed8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px;
      font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
      color: var(--ink);
      background: linear-gradient(180deg, #eff6ff 0%, var(--bg) 35%, #ffffff 100%);
    }
    main {
      max-width: 900px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 40px 48px;
      box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
    }
    h1, h2, h3, h4 { color: var(--ink); }
    h1 { margin-top: 0; font-size: 28px; }
    p, li, td, th, blockquote { font-size: 14px; line-height: 1.8; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 13px;
    }
    th, td {
      border: 1px solid var(--line);
      padding: 10px 12px;
      vertical-align: top;
    }
    th { background: #eff6ff; }
    code, pre {
      font-family: "JetBrains Mono", "Cascadia Code", monospace;
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: #0f172a;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 12px;
    }
    a { color: var(--link); word-break: break-all; }
    blockquote {
      margin: 20px 0;
      padding: 12px 16px;
      border-left: 4px solid #60a5fa;
      background: #f8fafc;
      color: var(--muted);
    }
    @media print {
      body { padding: 0; background: #fff; }
      main {
        max-width: none;
        border: 0;
        box-shadow: none;
        border-radius: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <main>
    <h1>${safeTitle}</h1>
    ${html}
  </main>
  <script>
    window.addEventListener('load', () => {
      window.print();
    });
  </script>
</body>
</html>`);
  popup.document.close();
}

export async function deleteKnowledgeItem(id: number): Promise<boolean> {
  const res = await fetch(`${CHAT_BASE}/deep/knowledge/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}
