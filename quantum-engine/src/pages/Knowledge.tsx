import { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, Trash2, ChevronLeft, RefreshCw, Inbox, X } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  fetchKnowledgeItems,
  fetchKnowledgeCategories,
  fetchKnowledgeDetail,
  downloadKnowledgeItem,
  deleteKnowledgeItem,
  KnowledgeItem,
  CategorySummary,
} from '../api/knowledge';

// ── Markdown 渲染器（带 XSS 防护）────────────────────────────────────────────

marked.setOptions({ breaks: true, gfm: true } as Parameters<typeof marked.setOptions>[0]);

function MarkdownContent({ content }: { content: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(content) as string;
    return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  }, [content]);

  return (
    <div
      className="markdown-body prose prose-sm max-w-none text-slate-800"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ── 分类 → 颜色 / 中文标签 ──────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; color: string }> = {
  'paper-analysis':     { label: '论文分析',   color: 'text-fuchsia-800 bg-fuchsia-100 border-fuchsia-300' },
  'people-intel':       { label: '人才情报',   color: 'text-cyan-800 bg-cyan-100 border-cyan-300' },
  'market-intel':       { label: '市场情报',   color: 'text-amber-800 bg-amber-100 border-amber-300' },
  'investment-report':  { label: '投研报告',   color: 'text-emerald-800 bg-emerald-100 border-emerald-300' },
  'general':            { label: '综合',       color: 'text-blue-800 bg-blue-100 border-blue-300' },
};

function categoryLabel(cat: string) {
  return CATEGORY_META[cat]?.label ?? cat;
}
function categoryColor(cat: string) {
  return CATEGORY_META[cat]?.color ?? 'text-slate-700 bg-slate-100 border-slate-300';
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function sizeLabel(chars: number): string {
  if (chars < 1000) return `${chars} 字`;
  return `${(chars / 1000).toFixed(1)}k 字`;
}

// ── 知识卡片 ──────────────────────────────────────────────────────────────────
function KnowledgeCard({
  item,
  onOpen,
  onDelete,
}: {
  item: KnowledgeItem;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="group border border-slate-300 rounded-xl bg-white/85 shadow-sm hover:shadow-md transition-all p-4 flex flex-col">
      {/* Top row: category + actions */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center text-[11px] font-semibold border rounded-md px-2 py-0.5 ${categoryColor(item.category)}`}>
          {categoryLabel(item.category)}
        </span>
        <span className="text-[11px] text-slate-500 font-mono">{item.agent_name}</span>
        <span className="flex-1" />
        <button
          onClick={(e) => { e.stopPropagation(); downloadKnowledgeItem(item.id); }}
          className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-all"
          title="下载 Markdown"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('确认删除此知识条目？')) onDelete(item.id);
          }}
          className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-100 text-slate-400 hover:text-red-600 transition-all"
          title="删除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Title — clickable */}
      <button
        onClick={() => onOpen(item.id)}
        className="text-left text-[14px] font-semibold text-slate-800 hover:text-blue-700 transition-colors line-clamp-2 mb-2"
      >
        {item.title}
      </button>

      {/* Footer meta */}
      <div className="mt-auto flex items-center gap-3 text-[11px] text-slate-500">
        <span>{formatDate(item.created_at)}</span>
        <span>{sizeLabel(item.size_chars)}</span>
      </div>
    </div>
  );
}

// ── 详情面板 ──────────────────────────────────────────────────────────────────
function DetailPanel({
  item,
  onClose,
}: {
  item: KnowledgeItem;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className={`inline-flex items-center text-[11px] font-semibold border rounded-md px-2 py-0.5 ${categoryColor(item.category)}`}>
          {categoryLabel(item.category)}
        </span>
        <span className="text-[11px] text-slate-500 font-mono">{item.agent_name}</span>
        <span className="flex-1" />
        <button
          onClick={() => downloadKnowledgeItem(item.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-lg text-blue-800 transition-all"
        >
          <Download className="w-3 h-3" />
          下载
        </button>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 text-slate-500">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Title + meta */}
      <div className="py-4">
        <h2 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h2>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>{formatDate(item.created_at)}</span>
          <span>{sizeLabel(item.size_chars)}</span>
          {item.thread_id && <span className="font-mono">thread: {item.thread_id.slice(0, 10)}…</span>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-5 leading-relaxed">
          <MarkdownContent content={item.content ?? ''} />
        </div>
      </div>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function Knowledge() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<KnowledgeItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [cats, list] = await Promise.all([
        fetchKnowledgeCategories(),
        fetchKnowledgeItems({ category: selectedCategory || undefined, limit: 100 }),
      ]);
      setCategories(cats);
      setItems(list);
    } catch (e: any) {
      setErrorMsg(e?.message || '加载知识库失败');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOpen = useCallback(async (id: number) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchKnowledgeDetail(id);
      setDetailItem(detail);
    } catch (e: any) {
      setErrorMsg(e?.message || '加载详情失败');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteKnowledgeItem(id);
      setItems(prev => prev.filter(x => x.id !== id));
      if (detailItem?.id === id) setDetailItem(null);
    } catch { /* ignore */ }
  }, [detailItem]);

  const totalCount = categories.reduce((s, c) => s + c.count, 0);

  // ── 详情视图 ────────────────────────────────────────────────────────────
  if (detailItem) {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <DetailPanel item={detailItem} onClose={() => setDetailItem(null)} />
      </div>
    );
  }

  // ── 列表视图 ────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="mb-4 animate-fade-up">
        <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">KNOWLEDGE</h1>
        <p className="text-slate-700 text-sm">
          研究成果知识库
          {totalCount > 0 && <span className="ml-2 text-blue-700 font-semibold">{totalCount} 条</span>}
        </p>
      </div>

      {/* Category tabs + refresh */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 text-[12px] rounded-lg border transition-all ${
            selectedCategory === ''
              ? 'bg-blue-100 border-blue-300 text-blue-800'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          全部 {totalCount > 0 && <span className="ml-1 font-mono">{totalCount}</span>}
        </button>
        {categories.map(c => (
          <button
            key={c.category}
            onClick={() => setSelectedCategory(c.category)}
            className={`px-3 py-1.5 text-[12px] rounded-lg border transition-all ${
              selectedCategory === c.category
                ? categoryColor(c.category)
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {categoryLabel(c.category)} <span className="ml-1 font-mono">{c.count}</span>
          </button>
        ))}
        <span className="flex-1" />
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-lg text-blue-800 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {errorMsg && (
        <div className="mb-3 px-3 py-2 text-[12px] rounded-lg border border-red-400/40 bg-red-900/30 text-red-100">
          {errorMsg}
        </div>
      )}

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-700 text-sm animate-pulse">
            加载中…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-700">
            <Inbox className="w-8 h-8 mb-2 opacity-70" />
            <p className="text-sm">暂无研究成果</p>
            <p className="text-xs mt-1 opacity-90">在 DeepAgent 模式完成一次研究后，成果将自动存入知识库</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map(item => (
              <KnowledgeCard
                key={item.id}
                item={item}
                onOpen={handleOpen}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Loading detail overlay */}
      {loadingDetail && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl px-6 py-4 text-slate-700 text-sm animate-pulse shadow-xl">
            加载详情…
          </div>
        </div>
      )}
    </div>
  );
}
