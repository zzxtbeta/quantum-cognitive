import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Copy,
  Download,
  FileText,
  FolderTree,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  CategorySummary,
  KnowledgeItem,
  copyKnowledgeContent,
  deleteKnowledgeItem,
  downloadKnowledgeItem,
  exportKnowledgeAsPdf,
  fetchKnowledgeCategories,
  fetchKnowledgeDetail,
  fetchKnowledgeItems,
} from '../api/knowledge';

marked.setOptions({ breaks: true, gfm: true });

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  'paper-analysis': {
    label: '论文分析',
    color: 'text-fuchsia-800 bg-fuchsia-100 border-fuchsia-300',
  },
  'people-intel': {
    label: '人才情报',
    color: 'text-cyan-800 bg-cyan-100 border-cyan-300',
  },
  'market-intel': {
    label: '市场情报',
    color: 'text-amber-800 bg-amber-100 border-amber-300',
  },
  'investment-report': {
    label: '投研报告',
    color: 'text-emerald-800 bg-emerald-100 border-emerald-300',
  },
  general: {
    label: '通用文档',
    color: 'text-blue-800 bg-blue-100 border-blue-300',
  },
};

function categoryLabel(category: string) {
  return CATEGORY_META[category]?.label ?? category;
}

function categoryColor(category: string) {
  return CATEGORY_META[category]?.color ?? 'text-slate-700 bg-slate-100 border-slate-300';
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sizeLabel(chars: number): string {
  if (chars < 1000) return `${chars} 字`;
  return `${(chars / 1000).toFixed(1)}k 字`;
}

function renderMarkdownHtml(content: string) {
  const raw = marked.parse(content) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}

function MarkdownContent({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdownHtml(content), [content]);

  return (
    <div
      className="markdown-body prose prose-sm max-w-none text-slate-800"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function getTopicTitle(item: KnowledgeItem) {
  const topic = typeof item.metadata?.research_topic === 'string' ? item.metadata.research_topic.trim() : '';
  return topic || '未归类主题';
}

function getTopicKey(item: KnowledgeItem) {
  const topicKey = typeof item.metadata?.topic_key === 'string' ? item.metadata.topic_key.trim() : '';
  if (topicKey) return topicKey;
  return `${item.thread_id || 'standalone'}:${getTopicTitle(item)}`;
}

function KnowledgeCard({
  item,
  onOpen,
  onDelete,
}: {
  item: KnowledgeItem;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const topic = getTopicTitle(item);

  return (
    <div className="group border border-slate-300 rounded-xl bg-white/85 shadow-sm hover:shadow-md transition-all p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center text-[11px] font-semibold border rounded-md px-2 py-0.5 ${categoryColor(item.category)}`}>
          {categoryLabel(item.category)}
        </span>
        <span className="text-[11px] text-slate-500 font-mono">{item.agent_name}</span>
        <span className="flex-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadKnowledgeItem(item.id);
          }}
          className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-all"
          title="下载 Markdown"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('确认删除这份知识库文档吗？')) onDelete(item.id);
          }}
          className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-100 text-slate-400 hover:text-red-600 transition-all"
          title="删除文档"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="text-[11px] font-semibold text-slate-500">调研主题</div>
        <div className="mt-1 text-[12px] text-slate-700 line-clamp-2">{topic}</div>
      </div>

      <button
        onClick={() => onOpen(item.id)}
        className="text-left text-[15px] font-semibold text-slate-800 hover:text-blue-700 transition-colors line-clamp-2 mb-3"
      >
        {item.title}
      </button>

      <div className="mt-auto flex items-center gap-3 text-[11px] text-slate-500">
        <span>{formatDate(item.created_at)}</span>
        <span>{sizeLabel(item.size_chars)}</span>
      </div>
    </div>
  );
}

function DetailPanel({
  item,
  onClose,
  onCopy,
  onExportPdf,
}: {
  item: KnowledgeItem;
  onClose: () => void;
  onCopy: () => void;
  onExportPdf: () => void;
}) {
  const topic = getTopicTitle(item);

  return (
    <div className="flex flex-col h-full gap-4">
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
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 transition-all"
        >
          <Copy className="w-3 h-3" />
          复制全文
        </button>
        <button
          onClick={onExportPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg text-emerald-800 transition-all"
        >
          <FileText className="w-3 h-3" />
          导出 PDF
        </button>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 text-slate-500">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{item.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span>{formatDate(item.created_at)}</span>
            <span>{sizeLabel(item.size_chars)}</span>
            {item.thread_id && <span className="font-mono">thread: {item.thread_id}</span>}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-[11px] font-semibold text-slate-500">调研主题</div>
          <div className="mt-1 text-[13px] leading-relaxed text-slate-800">{topic}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-5 leading-relaxed">
          <MarkdownContent content={item.content ?? ''} />
        </div>
      </div>
    </div>
  );
}

export default function Knowledge() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [draftStartDate, setDraftStartDate] = useState<string>('');
  const [draftEndDate, setDraftEndDate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<KnowledgeItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [cats, list] = await Promise.all([
        fetchKnowledgeCategories(),
        fetchKnowledgeItems({
          category: selectedCategory || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          limit: 100,
        }),
      ]);
      setCategories(cats);
      setItems(list);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '知识库加载失败');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, startDate, endDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!noticeMsg) return undefined;
    const timer = window.setTimeout(() => setNoticeMsg(null), 2600);
    return () => window.clearTimeout(timer);
  }, [noticeMsg]);

  const handleOpen = useCallback(async (id: number) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchKnowledgeDetail(id);
      setDetailItem(detail);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '文档详情加载失败');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteKnowledgeItem(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
        if (detailItem?.id === id) setDetailItem(null);
        setNoticeMsg('知识库文档已删除');
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : '删除失败');
      }
    },
    [detailItem],
  );

  const handleCopyDetail = useCallback(async () => {
    if (!detailItem?.content) return;
    try {
      await copyKnowledgeContent(detailItem.content);
      setNoticeMsg('全文已复制到剪贴板');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '复制失败');
    }
  }, [detailItem]);

  const handleExportPdf = useCallback(() => {
    if (!detailItem?.content) return;
    try {
      exportKnowledgeAsPdf(detailItem.title, renderMarkdownHtml(detailItem.content));
      setNoticeMsg('已打开打印友好页，请在浏览器中选择“另存为 PDF”');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'PDF 导出失败');
    }
  }, [detailItem]);

  const totalCount = categories.reduce((sum, category) => sum + category.count, 0);

  const filteredItems = useMemo(() => {
    if (!startDate && !endDate) return items;
    return items.filter((item) => {
      const day = (item.created_at || '').slice(0, 10);
      if (startDate && day < startDate) return false;
      if (endDate && day > endDate) return false;
      return true;
    });
  }, [items, startDate, endDate]);

  const topicGroups = useMemo(() => {
    const groups = new Map<
      string,
      { title: string; latest: string; count: number; items: KnowledgeItem[] }
    >();

    filteredItems.forEach((item) => {
      const key = getTopicKey(item);
      const title = getTopicTitle(item);
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
        existing.count += 1;
        if (item.created_at > existing.latest) existing.latest = item.created_at;
      } else {
        groups.set(key, {
          title,
          latest: item.created_at,
          count: 1,
          items: [item],
        });
      }
    });

    return Array.from(groups.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.latest.localeCompare(a.latest));
  }, [filteredItems]);

  const applyDateFilter = useCallback(() => {
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
  }, [draftEndDate, draftStartDate]);

  const clearDateFilter = useCallback(() => {
    setDraftStartDate('');
    setDraftEndDate('');
    setStartDate('');
    setEndDate('');
  }, []);

  const setRecentDays = useCallback((days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);
    const format = (value: Date) => value.toISOString().slice(0, 10);
    setDraftStartDate(format(start));
    setDraftEndDate(format(end));
  }, []);

  if (detailItem) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col gap-3">
        {errorMsg && (
          <div className="px-3 py-2 text-[12px] rounded-lg border border-red-300 bg-red-50 text-red-700">
            {errorMsg}
          </div>
        )}
        {noticeMsg && (
          <div className="px-3 py-2 text-[12px] rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800">
            {noticeMsg}
          </div>
        )}
        <DetailPanel
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onCopy={handleCopyDetail}
          onExportPdf={handleExportPdf}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4 animate-fade-up">
        <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">KNOWLEDGE</h1>
        <p className="text-slate-700 text-sm">
          研究成果知识库
          {totalCount > 0 && <span className="ml-2 text-blue-700 font-semibold">总 {totalCount} 条</span>}
          <span className="ml-2 text-fuchsia-700 font-semibold">当前 {filteredItems.length} 条</span>
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 text-[12px] rounded-lg border transition-all ${
            selectedCategory === ''
              ? 'bg-blue-100 border-blue-300 text-blue-800'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          全部 {totalCount}
        </button>
        {categories.map((category) => (
          <button
            key={category.category}
            onClick={() => setSelectedCategory(category.category)}
            className={`px-3 py-1.5 text-[12px] rounded-lg border transition-all ${
              selectedCategory === category.category
                ? 'bg-blue-100 border-blue-300 text-blue-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {categoryLabel(category.category)} {category.count}
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-[12px] text-slate-600 flex-wrap">
          <span className="font-semibold">日期</span>
          <button onClick={() => setRecentDays(7)} className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
            近7天
          </button>
          <button onClick={() => setRecentDays(30)} className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
            近30天
          </button>
          <input
            type="date"
            value={draftStartDate}
            onChange={(e) => setDraftStartDate(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-lg"
          />
          <span>~</span>
          <input
            type="date"
            value={draftEndDate}
            onChange={(e) => setDraftEndDate(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-lg"
          />
          <button onClick={applyDateFilter} className="px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            应用
          </button>
          <button onClick={clearDateFilter} className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50">
            清空
          </button>
        </div>

        <button
          onClick={() => void loadData()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 px-3 py-2 text-[12px] rounded-lg border border-red-300 bg-red-50 text-red-700">
          {errorMsg}
        </div>
      )}
      {noticeMsg && (
        <div className="mb-4 px-3 py-2 text-[12px] rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800">
          {noticeMsg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            正在加载知识库...
          </div>
        ) : topicGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 bg-white border border-slate-200 rounded-2xl">
            <FolderTree className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">当前筛选条件下暂无知识库文档</p>
          </div>
        ) : (
          <div className="space-y-6">
            {topicGroups.map((group) => (
              <section key={group.key} className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      调研主题
                    </div>
                    <h2 className="mt-1 text-lg font-semibold text-slate-800">{group.title}</h2>
                    <div className="mt-2 text-[12px] text-slate-500">
                      共 {group.count} 份文档 · 最近更新 {formatDate(group.latest)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  {group.items.map((item) => (
                    <KnowledgeCard
                      key={item.id}
                      item={item}
                      onOpen={handleOpen}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {loadingDetail && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center text-white text-sm">
          正在打开文档...
        </div>
      )}
    </div>
  );
}
