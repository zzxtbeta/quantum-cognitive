const CHAT_BASE = import.meta.env.DEV
  ? '/chat-api'
  : (import.meta.env.VITE_CHAT_BASE_URL || 'http://localhost:8001');

export interface KnowledgeMetadata {
  original_filename?: string;
  persisted_by?: string;
  research_topic?: string;
  topic_key?: string;
  [key: string]: unknown;
}

export interface KnowledgeItem {
  id: number;
  thread_id: string | null;
  turn_id: string | null;
  agent_name: string;
  category: string;
  title: string;
  size_chars: number;
  created_at: string;
  metadata: KnowledgeMetadata;
  content?: string;
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
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const qs = search.toString();
  return getJson<{ items: KnowledgeItem[] }>(
    `${CHAT_BASE}/deep/knowledge${qs ? `?${qs}` : ''}`,
  ).then((r) => r.items);
}

export function fetchKnowledgeCategories() {
  return getJson<{ categories: CategorySummary[] }>(
    `${CHAT_BASE}/deep/knowledge/categories`,
  ).then((r) => r.categories);
}

export function fetchKnowledgeDetail(id: number) {
  return getJson<KnowledgeItem>(`${CHAT_BASE}/deep/knowledge/${id}`);
}

export function downloadKnowledgeItem(id: number) {
  window.open(`${CHAT_BASE}/deep/knowledge/${id}/download`, '_blank');
}

function fallbackCopyText(content: string) {
  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!copied) {
    throw new Error('浏览器复制失败，请手动复制内容');
  }
}

export async function copyKnowledgeContent(content: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }
  fallbackCopyText(content);
}

export function exportKnowledgeAsPdf(title: string, html: string) {
  const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '_');
  const documentHtml = `<!DOCTYPE html>
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
    .meta {
      margin-bottom: 24px;
      color: var(--muted);
      font-size: 12px;
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
    <div class="meta">导出后请在浏览器打印面板中选择“另存为 PDF”。</div>
    ${html}
  </main>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 120);
    });
  </script>
</body>
</html>`;

  const blob = new Blob([documentHtml], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const popup = window.open(blobUrl, '_blank');
  if (!popup) {
    URL.revokeObjectURL(blobUrl);
    throw new Error('浏览器拦截了 PDF 导出窗口，请允许弹窗后重试');
  }

  const revoke = () => URL.revokeObjectURL(blobUrl);
  popup.addEventListener?.('beforeunload', revoke);
  window.setTimeout(revoke, 60_000);
}

export async function deleteKnowledgeItem(id: number): Promise<boolean> {
  const res = await fetch(`${CHAT_BASE}/deep/knowledge/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

export async function updateKnowledgeTopic(
  itemIds: number[],
  researchTopic: string,
): Promise<number> {
  const res = await fetch(`${CHAT_BASE}/deep/knowledge/topic`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_ids: itemIds, research_topic: researchTopic }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  const payload = (await res.json()) as { updated: number };
  return payload.updated;
}

export async function deleteKnowledgeTopic(itemIds: number[]): Promise<number> {
  const res = await fetch(`${CHAT_BASE}/deep/knowledge/topic`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_ids: itemIds }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  const payload = (await res.json()) as { deleted: number };
  return payload.deleted;
}
