import { X, Building2, User, Lightbulb, ExternalLink, MessageSquare, Bookmark, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SignalDetail } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { domainApi } from '../api/domains';
import { useLayout } from '../contexts/LayoutContext';

interface SignalDetailModalProps {
  signal: SignalDetail;
  onClose: () => void;
  onOpenChat?: () => void;
}

// Priority config — dot only, no heavy color backgrounds
const priorityConfig = {
  high: { dot: 'bg-red-500',   label: '高优先级', text: 'text-red-400' },
  mid:  { dot: 'bg-amber-400', label: '中优先级', text: 'text-amber-400' },
  low:  { dot: 'bg-slate-500', label: '低优先级', text: 'text-slate-400' },
};

// Generic labelled section with left-border accent
function Section({
  label,
  accent = 'border-blue-500/60',
  children,
}: {
  label: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`border-l-2 ${accent} pl-4 py-0.5`}>
      <p className="text-[10px] uppercase tracking-widest text-[var(--th-text-muted)] mb-2">{label}</p>
      {children}
    </div>
  );
}

// Collapsible abstract
function AbstractSection({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const needsExpand = text.length > 200;
  const preview = text.slice(0, 200);
  return (
    <Section label="论文摘要" accent="border-slate-500/40">
      <p className="text-sm text-[var(--th-text-muted)] leading-relaxed">
        {open || !needsExpand ? text : preview + '…'}
      </p>
      {needsExpand && (
        <button
          onClick={() => setOpen(v => !v)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {open ? <><ChevronUp className="w-3 h-3" />收起</> : <><ChevronDown className="w-3 h-3" />展开</>}
        </button>
      )}
    </Section>
  );
}

function EntityCard({ icon, label, count, unit }: { icon: React.ReactNode; label: string; count: number; unit: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[var(--th-bg-elevated)] border border-[var(--th-border-card)]">
      {icon}
      <div>
        <p className="text-xs text-[var(--th-text-muted)]">{label}</p>
        <p className="text-sm font-semibold text-[var(--th-text)]">
          {count} <span className="text-xs font-normal text-[var(--th-text-muted)]">{unit}</span>
        </p>
      </div>
    </div>
  );
}

export default function SignalDetailModal({ signal, onClose, onOpenChat }: SignalDetailModalProps) {
  const { addFocusItem, addNote, focusItems } = useAppContext();
  const { isChatOpen, chatWidth, isSidebarCollapsed } = useLayout();
  const [showToast, setShowToast] = useState(false);
  const [domainNames, setDomainNames] = useState<Record<number, string>>({});

  // 加载领域名称映射
  useEffect(() => {
    domainApi.getFlatDomains().then(map => {
      const record: Record<number, string> = {};
      map.forEach((node, id) => { record[id] = node.name; });
      setDomainNames(record);
    }).catch(() => {}); // 加载失败静默忽略（降级显示 ID）
  }, []);
  const [toastMessage, setToastMessage] = useState('');

  const config = priorityConfig[signal.priority];

  const showToastMessage = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleAddToFocus = () => {
    const companyName =
      signal.title.includes('本源量子') ? '本源量子' :
      signal.title.includes('图灵量子') ? '图灵量子' :
      signal.title.includes('启科量子') ? '启科量子' :
      signal.title.includes('国盾量子') ? '国盾量子' : '相关公司';
    if (focusItems.some(f => f.name === companyName)) {
      showToastMessage(`${companyName} 已在关注列表中`);
    } else {
      addFocusItem({ id: `focus-${Date.now()}`, type: 'company', name: companyName,
        description: signal.summary.substring(0, 50) + '...', signalCount: 1,
        lastUpdate: signal.timestamp, tags: [signal.type] });
      showToastMessage(`已将 ${companyName} 添加到关注列表`);
    }
  };

  const handleAddNote = () => {
    addNote({ id: `note-${Date.now()}`, title: `${signal.title} — 笔记`,
      content: `信号摘要：\n${signal.summary}\n\n我的分析：\n[待补充]`,
      tags: [signal.type, signal.priority === 'high' ? '高优先级' : ''],
      relatedSignals: 1, createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0] });
    showToastMessage('已创建笔记，可在「我的笔记」中查看和编辑');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      style={{
        paddingLeft: (isSidebarCollapsed ? 8 : 248),
        paddingRight: (isChatOpen ? chatWidth + 8 : 8),
        paddingTop: 16,
        paddingBottom: 16,
      }}
    >
      <div className="glass-card rounded-xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="sticky top-0 bg-[var(--th-bg-nav)] backdrop-blur-lg border-b border-[var(--th-divider)] px-6 py-4 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-2.5">
              {!signal.id.startsWith('news-') && (
                <span className="inline-flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${config.dot} shrink-0`} />
                  <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
                </span>
              )}
              <span className="px-2 py-0.5 bg-[var(--th-bg-hover)] text-[var(--th-text)] text-xs rounded border border-[var(--th-border-card)]">
                {signal.type}
              </span>
              <span className="text-[var(--th-text-muted)] text-xs">{signal.timestamp}</span>
              {signal.source && (
                <>
                  <span className="text-[var(--th-text-muted)] text-xs">·</span>
                  {(signal.metadata?.sourceUrl as string | undefined) ? (
                    <a
                      href={signal.metadata!.sourceUrl as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[rgba(59,130,246,0.10)] border border-[rgba(59,130,246,0.25)] text-blue-300 text-xs font-medium rounded hover:bg-[rgba(59,130,246,0.18)] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {signal.source}
                    </a>
                  ) : (
                    <span className="text-[var(--th-text-muted)] text-xs">{signal.source}</span>
                  )}
                </>
              )}
            </div>
            <h2 className="text-xl font-semibold leading-snug text-[var(--th-text)] line-clamp-2">{signal.title}</h2>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 hover:bg-[var(--th-bg-hover)] rounded-lg transition-colors text-[var(--th-text-muted)] hover:text-[var(--th-text)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Summary */}
          <Section label="信号摘要">
            <p className="text-sm text-[var(--th-text)] leading-relaxed">{signal.summary}</p>
          </Section>

          {/* Why Important */}
          {signal.whyImportant && signal.whyImportant.length > 0 && (
            <Section label="为什么重要" accent="border-amber-500/60">
              <ul className="space-y-1">
                {signal.whyImportant.map((reason, idx) => (
                  <li key={idx} className="text-sm text-[var(--th-text)] flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5 shrink-0">·</span>{reason}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Paper structured content */}
          {signal.type === '论文' && signal.metadata && (() => {
            const m = signal.metadata;
            return (
              <div className="space-y-5">
                {/* Authors */}
                {m.authors && m.authors.length > 0 && (
                  <Section label="作者">
                    <div className="flex flex-wrap gap-2">
                      {m.authors.map((author: any, idx: number) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--th-bg-elevated)] border border-[var(--th-divider)] rounded-md text-xs text-[var(--th-text)]">
                          <User className="w-3 h-3 text-[var(--th-text-muted)] shrink-0" />
                          <span className="font-medium">{author.name}</span>
                          {author.affiliation && <span className="text-[var(--th-text-muted)] before:content-['·'] before:mx-1">{author.affiliation}</span>}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Research Problem */}
                {m.research_problem && (
                  <Section label="研究问题" accent="border-blue-500/60">
                    {m.research_problem.summary && <p className="text-sm text-[var(--th-text)] leading-relaxed mb-1.5">{m.research_problem.summary}</p>}
                    {m.research_problem.detail && <p className="text-xs text-[var(--th-text-muted)] leading-relaxed">{m.research_problem.detail}</p>}
                  </Section>
                )}

                {/* Tech Route */}
                {m.tech_route && (
                  <Section label="技术路线" accent="border-violet-500/60">
                    {m.tech_route.summary && <p className="text-sm text-[var(--th-text)] leading-relaxed mb-1.5">{m.tech_route.summary}</p>}
                    {m.tech_route.detail && <p className="text-xs text-[var(--th-text-muted)] leading-relaxed">{m.tech_route.detail}</p>}
                  </Section>
                )}

                {/* Key Contributions */}
                {m.key_contributions && m.key_contributions.length > 0 && (
                  <Section label="关键贡献" accent="border-emerald-500/60">
                    <ol className="space-y-3">
                      {m.key_contributions.map((contrib: any, idx: number) => (
                        <li key={idx} className="flex gap-3">
                          <span className="text-xs text-emerald-400 font-mono mt-0.5 w-4 shrink-0">{idx + 1}.</span>
                          <div>
                            {contrib.summary && <p className="text-sm text-[var(--th-text)] leading-snug">{contrib.summary}</p>}
                            {contrib.detail && <p className="text-xs text-[var(--th-text-muted)] leading-relaxed mt-0.5">{contrib.detail}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </Section>
                )}

                {/* Metrics */}
                {m.metrics && m.metrics.length > 0 && (
                  <Section label="关键指标" accent="border-slate-500/40">
                    <div className="grid grid-cols-2 gap-2">
                      {m.metrics.map((metric: any, idx: number) => (
                        <div key={idx} className="bg-[var(--th-bg-elevated)] border border-[var(--th-border-card)] rounded-lg px-3 py-2.5">
                          {metric.name && <p className="text-[10px] text-[var(--th-text-muted)] uppercase tracking-wider mb-0.5">{metric.name}</p>}
                          {metric.value && <p className="text-sm font-semibold text-blue-300">{metric.value}</p>}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Influence Score */}
                {m.influence_score != null && (
                  <Section label="影响力分数" accent="border-slate-500/40">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-[var(--th-text)] tabular-nums">{m.influence_score}</span>
                      <div className="flex-1 h-1.5 bg-[var(--th-bg-hover)] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(m.influence_score, 100)}%` }} />
                      </div>
                      <span className="text-xs text-[var(--th-text-muted)]">/ 100</span>
                    </div>
                  </Section>
                )}

                {/* Abstract */}
                {m.abstract && <AbstractSection text={m.abstract} />}

                {/* Publish Info */}
                {(m.publish_date || m.paper_id || (m.domain_ids && m.domain_ids.length > 0)) && (
                  <Section label="发表信息" accent="border-slate-600/40">
                    <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
                      {m.publish_date && <span className="text-[var(--th-text-muted)]"><span className="text-[var(--th-text-muted)] mr-1.5">日期</span>{m.publish_date}</span>}
                      {m.paper_id && <span className="text-[var(--th-text-muted)] font-mono text-xs"><span className="not-italic text-[var(--th-text-muted)] mr-1.5 font-sans">ID</span>{m.paper_id}</span>}
                    </div>
                    {m.domain_ids && m.domain_ids.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.domain_ids.map((id: number, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-[var(--th-bg-elevated)] border border-[var(--th-divider)] text-[var(--th-text-muted)] text-xs rounded">{domainNames[id] ?? `领域 ${id}`}</span>
                        ))}
                      </div>
                    )}
                  </Section>
                )}
              </div>
            );
          })()}

          {/* 非论文类型展示摘要 */}
          {signal.type !== '论文' && signal.summary && (
            <Section label="事件摘要">
              <p className="text-sm text-[var(--th-text)] leading-relaxed">{signal.summary}</p>
            </Section>
          )}

          {/* Related Entities */}
          {(signal.relatedEntities.companies > 0 || signal.relatedEntities.people > 0 || signal.relatedEntities.technologies > 0) && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--th-text-muted)] mb-2.5">关联对象</p>
              <div className="grid grid-cols-3 gap-2">
                {signal.relatedEntities.companies > 0 && <EntityCard icon={<Building2 className="w-4 h-4 text-blue-400" />} label="公司" count={signal.relatedEntities.companies} unit="家" />}
                {signal.relatedEntities.people > 0 && <EntityCard icon={<User className="w-4 h-4 text-blue-400" />} label="关键人物" count={signal.relatedEntities.people} unit="人" />}
                {signal.relatedEntities.technologies > 0 && <EntityCard icon={<Lightbulb className="w-4 h-4 text-blue-400" />} label="相关技术" count={signal.relatedEntities.technologies} unit="条" />}
              </div>
            </div>
          )}

          <div className="h-1" />
        </div>

        {/* ── Actions Bar ── */}
        <div className="border-t border-[var(--th-divider)] px-6 py-3 bg-[var(--th-bg-nav)] flex items-center gap-2">
          <button onClick={handleAddNote} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
            <FileText className="w-3.5 h-3.5" />记录笔记
          </button>
          <button onClick={handleAddToFocus} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--th-bg-hover)] hover:bg-[var(--th-bg-active)] text-[var(--th-text)] rounded-lg text-sm font-medium border border-[var(--th-border-card)] transition-colors">
            <Bookmark className="w-3.5 h-3.5" />加入关注
          </button>
          <button onClick={() => { onClose(); onOpenChat?.(); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--th-bg-hover)] hover:bg-[var(--th-bg-active)] text-[var(--th-text)] rounded-lg text-sm font-medium border border-[var(--th-border-card)] transition-colors">
            <MessageSquare className="w-3.5 h-3.5" />Chat 分析
          </button>
          <a href="#" className="p-2 text-[var(--th-text-muted)] hover:text-blue-400 transition-colors" title="查看原文">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[210]">
          <div className="bg-[var(--th-bg-card)] border border-[var(--th-border)] rounded-lg px-5 py-2.5 shadow-2xl flex items-center gap-3">
            <span className="w-1 h-6 bg-blue-500 rounded-full shrink-0" />
            <p className="text-sm text-[var(--th-text)]">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
