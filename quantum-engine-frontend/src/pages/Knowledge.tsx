import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FilePenLine,
  FileText,
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
  deleteKnowledgeTopic,
  downloadKnowledgeItem,
  exportKnowledgeAsPdf,
  fetchKnowledgeCategories,
  fetchKnowledgeDetail,
  fetchKnowledgeItems,
  updateKnowledgeTopic,
} from '../api/knowledge';

marked.setOptions({ breaks: true, gfm: true });

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  'paper-analysis': { label: '论文分析', color: 'text-fuchsia-800 bg-fuchsia-100 border-fuchsia-300' },
  'people-intel': { label: '人才情报', color: 'text-cyan-800 bg-cyan-100 border-cyan-300' },
  'market-intel': { label: '市场情报', color: 'text-amber-800 bg-amber-100 border-amber-300' },
  'investment-report': { label: '投研报告', color: 'text-emerald-800 bg-emerald-100 border-emerald-300' },
  general: { label: '通用文档', color: 'text-blue-800 bg-blue-100 border-blue-300' },
};

type TopicGroup = {
  key: string;
  title: string;
  latest: string;
  count: number;
  itemIds: number[];
  items: KnowledgeItem[];
  hasExplicitTopic: boolean;
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
  return <div className="markdown-body prose prose-sm max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: html }} />;
}

function getExplicitTopic(item: KnowledgeItem) {
  const topic = typeof item.metadata?.research_topic === 'string' ? item.metadata.research_topic.trim() : '';
  return topic;
}

function getTopicKey(item: KnowledgeItem) {
  const topicKey = typeof item.metadata?.topic_key === 'string' ? item.metadata.topic_key.trim() : '';
  if (topicKey) return topicKey;
  if (item.thread_id) return `thread:${item.thread_id}`;
  return `item:${item.id}`;
}

function sortTopicItems(a: KnowledgeItem, b: KnowledgeItem) {
  if (a.category === 'investment-report' && b.category !== 'investment-report') return -1;
  if (a.category !== 'investment-report' && b.category === 'investment-report') return 1;
  return b.created_at.localeCompare(a.created_at);
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
  return (
    <div className="group flex flex-col rounded-xl border border-slate-300 bg-white/85 p-4 shadow-sm transition-all hover:shadow-md">
      <div className="mb-3 flex items-center gap-2">
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${categoryColor(item.category)}`}>
          {categoryLabel(item.category)}
        </span>
        <span className="text-[11px] font-mono text-slate-500">{item.agent_name}</span>
        <span className="flex-1" />
        <button
          onClick={(event) => {
            event.stopPropagation();
            downloadKnowledgeItem(item.id);
          }}
          className="rounded-md p-1 text-slate-400 opacity-0 transition-all hover:bg-blue-100 hover:text-blue-600 group-hover:opacity-100"
          title="下载 Markdown"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            if (window.confirm('确定要删除这篇知识库文档吗？')) {
              onDelete(item.id);
            }
          }}
          className="rounded-md p-1 text-slate-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
          title="删除文档"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        onClick={() => onOpen(item.id)}
        className="mb-3 line-clamp-2 text-left text-[15px] font-semibold text-slate-800 transition-colors hover:text-blue-700"
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
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <button onClick={onClose} className="rounded p-1 text-slate-600 transition-colors hover:bg-slate-200">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${categoryColor(item.category)}`}>
          {categoryLabel(item.category)}
        </span>
        <span className="text-[11px] font-mono text-slate-500">{item.agent_name}</span>
        <span className="flex-1" />
        <button
          onClick={() => downloadKnowledgeItem(item.id)}
          className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-100 px-3 py-1.5 text-[12px] text-blue-800 transition-all hover:bg-blue-200"
        >
          <Download className="h-3 w-3" />
          下载
        </button>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-[12px] text-slate-700 transition-all hover:bg-slate-200"
        >
          <Copy className="h-3 w-3" />
          复制全文
        </button>
        <button
          onClick={onExportPdf}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-[12px] text-emerald-800 transition-all hover:bg-emerald-200"
        >
          <FileText className="h-3 w-3" />
          导出 PDF
        </button>
        <button onClick={onClose} className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-200">
          <X className="h-4 w-4" />
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
          <div className="mt-1 text-[13px] leading-relaxed text-slate-800">{getExplicitTopic(item) || '未归类主题'}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-5 leading-relaxed">
          <MarkdownContent content={item.content ?? ''} />
        </div>
      </div>
    </div>
  );
}

export default function Knowledge() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<KnowledgeItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});
  const [editingTopicKey, setEditingTopicKey] = useState<string | null>(null);
  const [topicDraft, setTopicDraft] = useState('');

  const loadListData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setErrorMsg(null);
    try {
      const [categoryData, listData] = await Promise.all([
        fetchKnowledgeCategories(),
        fetchKnowledgeItems({
          category: selectedCategory || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          limit: 100,
        }),
      ]);
      setCategories(categoryData);
      setItems(listData);
      setDetailItem((current) => {
        if (!current) return current;
        const summary = listData.find((item) => item.id === current.id);
        return summary ? { ...current, ...summary } : current;
      });
    } catch (error) {
      if (!silent) {
        setErrorMsg(error instanceof Error ? error.message : '加载知识库失败');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [endDate, selectedCategory, startDate]);

  const loadDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    setErrorMsg(null);
    try {
      const detail = await fetchKnowledgeDetail(id);
      setDetailItem(detail);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '加载知识库详情失败');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadListData();
  }, [loadListData]);

  useEffect(() => {
    const refreshVisibleData = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      void loadListData(true);
    };
    const timer = window.setInterval(() => refreshVisibleData(), 12000);
    window.addEventListener('focus', refreshVisibleData);
    document.addEventListener('visibilitychange', refreshVisibleData);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshVisibleData);
      document.removeEventListener('visibilitychange', refreshVisibleData);
    };
  }, [loadListData]);

  useEffect(() => {
    if (!noticeMsg) return undefined;
    const timer = window.setTimeout(() => setNoticeMsg(null), 2600);
    return () => window.clearTimeout(timer);
  }, [noticeMsg]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteKnowledgeItem(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
        if (detailItem?.id === id) {
          setDetailItem(null);
        }
        setNoticeMsg('文档已删除');
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : '删除知识文档失败');
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
      setErrorMsg(error instanceof Error ? error.message : '复制全文失败');
    }
  }, [detailItem]);

  const handleExportPdf = useCallback(() => {
    if (!detailItem?.content) return;
    try {
      exportKnowledgeAsPdf(detailItem.title, renderMarkdownHtml(detailItem.content));
      setNoticeMsg('已打开 PDF 导出页，请在浏览器中另存为 PDF');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '导出 PDF 失败');
    }
  }, [detailItem]);

  const topicGroups = useMemo(() => {
    const map = new Map<string, TopicGroup>();
    const sorted = [...items].sort(sortTopicItems);

    for (const item of sorted) {
      const explicitTopic = getExplicitTopic(item);
      const key = getTopicKey(item);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          title: explicitTopic || '未归类主题',
          latest: item.created_at,
          count: 1,
          itemIds: [item.id],
          items: [item],
          hasExplicitTopic: Boolean(explicitTopic),
        });
      } else {
        existing.count += 1;
        existing.itemIds.push(item.id);
        existing.items.push(item);
        if (item.created_at > existing.latest) {
          existing.latest = item.created_at;
        }
        if (!existing.hasExplicitTopic && explicitTopic) {
          existing.title = explicitTopic;
          existing.hasExplicitTopic = true;
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.latest.localeCompare(a.latest));
  }, [items]);

  const handleRenameTopic = useCallback(
    async (group: TopicGroup) => {
      const nextTitle = topicDraft.trim();
      if (!nextTitle) {
        setErrorMsg('调研主题不能为空');
        return;
      }
      try {
        await updateKnowledgeTopic(group.itemIds, nextTitle);
        setItems((prev) =>
          prev.map((item) =>
            group.itemIds.includes(item.id)
              ? {
                  ...item,
                  metadata: {
                    ...item.metadata,
                    research_topic: nextTitle,
                    topic_key: group.key,
                  },
                }
              : item,
          ),
        );
        if (detailItem && group.itemIds.includes(detailItem.id)) {
          setDetailItem({
            ...detailItem,
            metadata: {
              ...detailItem.metadata,
              research_topic: nextTitle,
              topic_key: group.key,
            },
          });
        }
        setEditingTopicKey(null);
        setTopicDraft('');
        setNoticeMsg('调研主题已更新');
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : '更新调研主题失败');
      }
    },
    [detailItem, topicDraft],
  );

  const handleDeleteTopic = useCallback(
    async (group: TopicGroup) => {
      if (!window.confirm(`确定要删除主题“${group.title}”下的 ${group.count} 篇文档吗？`)) return;
      try {
        await deleteKnowledgeTopic(group.itemIds);
        setItems((prev) => prev.filter((item) => !group.itemIds.includes(item.id)));
        if (detailItem && group.itemIds.includes(detailItem.id)) {
          setDetailItem(null);
        }
        setNoticeMsg('主题文档已删除');
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : '删除主题失败');
      }
    },
    [detailItem],
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-5">
      <div className={`${detailItem ? 'w-[42%] min-w-[28rem]' : 'w-full'} flex min-w-0 flex-col`}>
        <div className="mb-4">
          <h1 className="mb-1 font-display text-4xl tracking-widest text-shimmer">KNOWLEDGE</h1>
          <p className="text-sm text-slate-700">
            研究成果知识库
            <span className="ml-2 text-blue-700">总 {items.length} 条</span>
            <span className="ml-2 font-semibold text-fuchsia-700">当前 {items.length} 条</span>
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-300 bg-white/80 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">日期</div>
          <button
            onClick={() => {
              const today = new Date();
              const start = new Date(today);
              start.setDate(today.getDate() - 7);
              setDraftStartDate(start.toISOString().slice(0, 10));
              setDraftEndDate(today.toISOString().slice(0, 10));
            }}
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-[12px] text-slate-700 transition-all hover:bg-slate-200"
          >
            近7天
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const start = new Date(today);
              start.setDate(today.getDate() - 30);
              setDraftStartDate(start.toISOString().slice(0, 10));
              setDraftEndDate(today.toISOString().slice(0, 10));
            }}
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-[12px] text-slate-700 transition-all hover:bg-slate-200"
          >
            近30天
          </button>
          <input
            type="date"
            value={draftStartDate}
            onChange={(event) => setDraftStartDate(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] text-slate-700"
          />
          <span className="text-slate-400">~</span>
          <input
            type="date"
            value={draftEndDate}
            onChange={(event) => setDraftEndDate(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] text-slate-700"
          />
          <button
            onClick={() => {
              setStartDate(draftStartDate);
              setEndDate(draftEndDate);
            }}
            className="rounded-lg border border-blue-300 bg-blue-600 px-4 py-1.5 text-[12px] text-white transition-all hover:bg-blue-700"
          >
            应用
          </button>
          <button
            onClick={() => {
              setDraftStartDate('');
              setDraftEndDate('');
              setStartDate('');
              setEndDate('');
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-[12px] text-slate-700 transition-all hover:bg-slate-100"
          >
            清空
          </button>
          <span className="flex-1" />
          <button
            onClick={() => void loadListData()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] text-slate-700 transition-all hover:bg-slate-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`rounded-lg border px-3 py-1.5 text-[12px] transition-all ${
              !selectedCategory
                ? 'border-blue-300 bg-blue-100 text-blue-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            全部 {items.length}
          </button>
          {categories.map((category) => (
            <button
              key={category.category}
              onClick={() => setSelectedCategory(category.category)}
              className={`rounded-lg border px-3 py-1.5 text-[12px] transition-all ${
                selectedCategory === category.category
                  ? 'border-blue-300 bg-blue-100 text-blue-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {categoryLabel(category.category)} {category.count}
            </button>
          ))}
        </div>

        {errorMsg && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>}
        {noticeMsg && <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{noticeMsg}</div>}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-xl border border-slate-300 bg-white/80 px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
              正在加载知识库…
            </div>
          ) : topicGroups.length === 0 ? (
            <div className="rounded-xl border border-slate-300 bg-white/80 px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
              当前筛选条件下没有找到知识库文档。
            </div>
          ) : (
            <div className="space-y-5">
              {topicGroups.map((group) => {
                const collapsed = collapsedTopics[group.key] ?? false;
                const isEditing = editingTopicKey === group.key;

                return (
                  <section key={group.key} className="rounded-2xl border border-slate-300 bg-white/85 p-4 shadow-sm">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex-1">
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">调研主题</div>
                        {isEditing ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input
                              value={topicDraft}
                              onChange={(event) => setTopicDraft(event.target.value)}
                              placeholder="输入调研主题"
                              className="min-w-[20rem] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                            />
                            <button
                              onClick={() => void handleRenameTopic(group)}
                              className="rounded-lg border border-blue-300 bg-blue-600 px-3 py-2 text-[12px] text-white transition-all hover:bg-blue-700"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => {
                                setEditingTopicKey(null);
                                setTopicDraft('');
                              }}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-700 transition-all hover:bg-slate-100"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1 text-[16px] font-semibold text-slate-800">{group.title}</div>
                        )}
                        <div className="mt-1 text-[12px] text-slate-500">
                          共 {group.count} 篇文档 · 最近更新 {formatDate(group.latest)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingTopicKey(group.key);
                            setTopicDraft(group.hasExplicitTopic ? group.title : '');
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-600 transition-all hover:bg-slate-100"
                          title={group.hasExplicitTopic ? '编辑调研主题' : '手动设置调研主题'}
                        >
                          <FilePenLine className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void handleDeleteTopic(group)}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-600 transition-all hover:bg-red-50 hover:text-red-600"
                          title="删除整个主题"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            setCollapsedTopics((prev) => ({
                              ...prev,
                              [group.key]: !collapsed,
                            }))
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-600 transition-all hover:bg-slate-100"
                        >
                          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {!collapsed && (
                      <div className="grid gap-4 xl:grid-cols-3">
                        {group.items.map((item) => (
                          <KnowledgeCard key={item.id} item={item} onOpen={(id) => void loadDetail(id)} onDelete={handleDelete} />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {detailItem && (
        <div className="flex min-w-[30rem] flex-1 flex-col rounded-2xl border border-slate-300 bg-white/85 p-5 shadow-sm">
          {loadingDetail ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">正在加载详情…</div>
          ) : (
            <DetailPanel
              item={detailItem}
              onClose={() => setDetailItem(null)}
              onCopy={() => void handleCopyDetail()}
              onExportPdf={handleExportPdf}
            />
          )}
        </div>
      )}
    </div>
  );
}
