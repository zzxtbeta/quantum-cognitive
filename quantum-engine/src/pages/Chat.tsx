import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Sparkles, Trash2, Square, AlertCircle, CheckCircle2, Wrench, Zap, Copy, Check, History } from 'lucide-react';
import { useChat, ChatMode, ThreadMeta } from '../hooks/useChat';
import SkillsPanel from '../components/SkillsPanel';

const QUICK_QUESTIONS = [
  '超导量子计算目前的技术成熟度如何？',
  '中国量子科技赛道有哪些头部机构？',
  '量子纠错的主要技术路线对比？',
  '量子通信产业化进展如何？',
];

const DEEP_QUICK_QUESTIONS = [
  '请对量子计算赛道做全面投资研判，包括技术、人才和市场三个维度',
  '分析中国超导量子计算领域的核心科学家和头部机构',
  '近期量子赛道有哪些主要融资事件和投资信号？',
  '量子纠错近期有哪些重要论文突破？人才格局怎样？',
];

// 内联 Markdown 渲染（bold / italic / inline-code）
function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('`') && p.endsWith('`') && p.length > 2) {
          return (
            <code key={i} className="px-1 py-0.5 bg-[rgba(0,0,0,0.28)] border border-[rgba(59,130,246,0.2)] rounded text-[11px] font-mono text-[#93c5fd]">
              {p.slice(1, -1)}
            </code>
          );
        }
        if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
          return <strong key={i} className="font-semibold text-[var(--th-text)]">{p.slice(2, -2)}</strong>;
        }
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2 && !p.startsWith('**')) {
          return <em key={i} className="italic opacity-80">{p.slice(1, -1)}</em>;
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

// 完整 Markdown 块级 + 内联渲染
function MessageContent({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  if (!content && isStreaming) {
    return (
      <div className="flex items-center gap-1.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    );
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const parseCells = (row: string) => row.split('|').slice(1, -1).map(c => c.trim());
  const isSepRow = (row: string) => /^\|[-| :]+\|$/.test(row.trim());

  while (i < lines.length) {
    const line = lines[i];

    // ── Code block ──────────────────────────────────────────────────────────
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={key++}
          className={`my-2 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed border border-[rgba(59,130,246,0.18)] bg-[rgba(0,0,0,0.35)]`}
        >
          {lang && (
            <div className="px-3 py-1 text-[9px] uppercase tracking-widest text-[rgba(148,163,184,0.6)] border-b border-[rgba(59,130,246,0.12)]">{lang}</div>
          )}
          <code className="block px-3 py-2.5 text-[#e2e8f0] whitespace-pre">{codeLines.join('\n')}</code>
        </pre>
      );
      i++; // skip closing ```
      continue;
    }

    // ── Heading ─────────────────────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const cls =
        level === 1 ? 'text-base font-bold text-[var(--th-text)] mt-3.5 mb-1.5 border-b border-[var(--th-divider)] pb-1' :
        level === 2 ? 'text-[0.92rem] font-bold text-[var(--th-text)] mt-3 mb-1' :
        level === 3 ? 'text-sm font-semibold text-[var(--th-text)] mt-2.5 mb-0.5' :
                     'text-sm font-medium text-[var(--th-text-muted)] mt-2 mb-0.5';
      elements.push(<p key={key++} className={cls}><InlineMarkdown text={text} /></p>);
      i++;
      continue;
    }

    // ── Horizontal rule ─────────────────────────────────────────────────────
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      elements.push(<hr key={key++} className="my-3 border-[var(--th-divider)]" />);
      i++;
      continue;
    }

    // ── Table ───────────────────────────────────────────────────────────────
    if (line.startsWith('|')) {
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableRows.push(lines[i]);
        i++;
      }
      const headerRow = tableRows[0];
      const bodyRows = tableRows.filter((r, idx) => idx !== 0 && !isSepRow(r));
      elements.push(
        <div key={key++} className="my-2 overflow-x-auto rounded-lg border border-[rgba(59,130,246,0.18)]">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[rgba(59,130,246,0.07)] border-b border-[rgba(59,130,246,0.18)]">
                {parseCells(headerRow).map((cell, ci) => (
                  <th key={ci} className="px-3 py-2 text-left font-semibold text-[var(--th-text)] whitespace-nowrap">
                    <InlineMarkdown text={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className={`border-b border-[rgba(59,130,246,0.08)] ${ri % 2 === 1 ? 'bg-[rgba(59,130,246,0.03)]' : ''} hover:bg-[rgba(59,130,246,0.06)] transition-colors`}>
                  {parseCells(row).map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-[var(--th-text-muted)] leading-snug">
                      <InlineMarkdown text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // ── Unordered list ──────────────────────────────────────────────────────
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-1.5 space-y-0.5 pl-1">
          {items.map((item, ii) => (
            <li key={ii} className="flex items-start gap-2 text-sm text-[var(--th-text)] leading-snug">
              <span className="text-blue-400/70 mt-1.5 shrink-0 w-1 h-1 rounded-full bg-blue-400/70 flex-shrink-0" />
              <span className="leading-relaxed"><InlineMarkdown text={item} /></span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Ordered list ────────────────────────────────────────────────────────
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={key++} className="my-1.5 space-y-0.5 pl-1">
          {items.map((item, ii) => (
            <li key={ii} className="flex items-start gap-2 text-sm text-[var(--th-text)] leading-snug">
              <span className="text-blue-400 shrink-0 font-mono text-[10px] mt-0.5 min-w-[16px]">{ii + 1}.</span>
              <span className="leading-relaxed"><InlineMarkdown text={item} /></span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Blockquote ──────────────────────────────────────────────────────────
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={key++} className="my-1.5 border-l-2 border-blue-500/40 pl-3 text-sm text-[var(--th-text-muted)] italic leading-relaxed">
          <InlineMarkdown text={line.slice(2)} />
        </blockquote>
      );
      i++;
      continue;
    }

    // ── Empty line ──────────────────────────────────────────────────────────
    if (line === '') {
      elements.push(<div key={key++} className="h-1.5" />);
      i++;
      continue;
    }

    // ── Normal paragraph ─────────────────────────────────────────────────────
    elements.push(
      <p key={key++} className="text-sm leading-relaxed text-[var(--th-text)]">
        <InlineMarkdown text={line} />
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

// 后端健康状态指示
function BackendStatus() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    fetch('/chat-api/health')
      .then(r => r.ok ? setStatus('ok') : setStatus('error'))
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'checking') return null;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
      {status === 'ok'
        ? <><CheckCircle2 className="w-3 h-3" />已连接</>
        : <><AlertCircle className="w-3 h-3" />后端离线</>
      }
    </span>
  );
}

export default function Chat() {
  const [deepMode, setDeepMode] = useState<ChatMode>('chat');
  const { messages, loading, error, threadId, activeSubagent, progressStep, savedThreads, sendMessage, clearMessages, switchThread } = useChat(deepMode);
  const [input, setInput] = useState('');
  const [showSkills, setShowSkills] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // textarea 自动伸缩
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    sendMessage(text);
  }, [input, loading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = (q: string) => {
    sendMessage(q);
  };

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  };

  function formatTimeAgo(isoTs: string): string {
    const diff = Date.now() - new Date(isoTs).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins <= 0 ? '刚刚' : `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  }

  const toggleMode = () => {
    clearMessages();
    setDeepMode(m => m === 'chat' ? 'deep' : 'chat');
  };

  // 子Agent 名称映射
  const SUBAGENT_LABELS: Record<string, string> = {
    'paper-researcher': '📚 论文分析师分析中',
    'people-intel':     '👤 人才情报分析师搜索中',
    'news-market':      '📈 市场情报分析师搜索中',
  };

  // 最后一条 AI 消息是否仍在流式输出中
  const isLastAiStreaming = loading && messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  return (
    <div className="h-full flex flex-col bg-[var(--th-bg-card)] backdrop-blur-2xl border-l border-[var(--th-divider)] relative">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-[var(--th-divider)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center bg-gradient-to-br ${
                deepMode === 'deep'
                  ? 'from-violet-600 to-purple-600'
                  : 'from-blue-600 to-indigo-600'
              }`}>
                {deepMode === 'deep'
                  ? <Zap className="w-3.5 h-3.5 text-white" />
                  : <Sparkles className="w-3.5 h-3.5 text-white" />}
              </div>
              <h2 className="font-display text-xl text-shimmer tracking-widest">GRAVITY</h2>
              {deepMode === 'deep' && (
                <span className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/25">
                  DEEP
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--th-text-muted)] pl-9">
              {deepMode === 'deep' ? '深度研究 · 多子Agent · ' : '认知引擎 · '}
              <BackendStatus />
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {/* 深度模式切换 */}
            <button
              onClick={toggleMode}
              title={deepMode === 'deep' ? '切换回普通对话模式' : '开启 DeepAgent 深度研究模式'}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-[11px] font-medium border ${
                deepMode === 'deep'
                  ? 'bg-violet-500/15 text-violet-400 border-violet-500/30 hover:bg-violet-500/25'
                  : 'bg-[var(--th-bg-hover)] text-[var(--th-text-muted)] border-[var(--th-divider)] hover:text-violet-400 hover:border-violet-500/30'
              }`}
            >
              <Zap className="w-3 h-3" />
              {deepMode === 'deep' ? 'Deep ON' : 'Deep'}
            </button>
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                title="清空对话"
                className="p-1.5 hover:bg-[var(--th-bg-hover)] rounded-lg transition-colors text-[var(--th-text-muted)] hover:text-[var(--th-text)]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowHistory(v => !v)}
              title="历史对话"
              className={`p-1.5 rounded-lg transition-colors ${
                showHistory
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'hover:bg-[var(--th-bg-hover)] text-[var(--th-text-muted)] hover:text-[var(--th-text)]'
              }`}
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSkills(v => !v)}
              title="已注册 Skills"
              className={`p-1.5 rounded-lg transition-colors ${
                showSkills
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'hover:bg-[var(--th-bg-hover)] text-[var(--th-text-muted)] hover:text-[var(--th-text)]'
              }`}
            >
              <Wrench className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Skills 面板（覆盖整个 Chat 区域）*/}
      <SkillsPanel isOpen={showSkills} onClose={() => setShowSkills(false)} />

      {/* 历史对话面板 */}
      {showHistory && (
        <div className="absolute top-[70px] right-2 z-50 w-72 max-h-[420px] flex flex-col bg-[var(--th-bg-card)] border border-[var(--th-divider)] rounded-xl shadow-2xl overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-[var(--th-divider)] flex items-center justify-between bg-[var(--th-bg-hover)]">
            <span className="text-[11px] font-semibold text-[var(--th-text)] tracking-wide">历史对话</span>
            <button
              onClick={() => { clearMessages(); setShowHistory(false); }}
              className="flex items-center gap-1 text-[10px] text-[var(--th-text-muted)] hover:text-[var(--th-text)] px-1.5 py-0.5 rounded hover:bg-[var(--th-bg-active)] transition-colors"
              title="开始新对话"
            >
              <History className="w-3 h-3" />新对话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {savedThreads.length === 0 ? (
              <p className="text-[11px] text-[var(--th-text-muted)] text-center py-8">暂无历史对话</p>
            ) : (
              savedThreads.map((meta: ThreadMeta) => (
                <button
                  key={meta.id}
                  onClick={() => { switchThread(meta); setShowHistory(false); }}
                  className={`w-full flex items-start gap-2 px-3.5 py-2.5 hover:bg-[var(--th-bg-hover)] transition-colors text-left ${
                    meta.id === threadId ? 'bg-blue-500/8 border-l-2 border-blue-500' : ''
                  }`}
                >
                  <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${
                    meta.mode === 'deep' ? 'bg-violet-500/15 text-violet-400' : 'bg-blue-500/15 text-blue-400'
                  }`}>
                    {meta.mode === 'deep' ? 'DEEP' : 'CHAT'}
                  </span>
                  <span className="flex-1 text-[11px] text-[var(--th-text)] leading-snug line-clamp-2">{meta.title}</span>
                  <span className="text-[9px] text-[var(--th-text-muted)] shrink-0 pt-0.5">{formatTimeAgo(meta.ts)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="pt-6">
            {/* 欢迎语 */}
            <div className="flex items-start gap-3 mb-6">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5 bg-gradient-to-br ${
                deepMode === 'deep' ? 'from-violet-600 to-purple-600' : 'from-blue-600 to-indigo-600'
              }`}>
                AI
              </div>
              <div className="flex-1 bg-[var(--th-bg-hover)] border border-[var(--th-divider)] rounded-xl px-4 py-3">
                {deepMode === 'deep' ? (
                  <p className="text-sm text-[var(--th-text)] leading-relaxed">
                    已进入 <strong>深度研究模式</strong>（DeepAgent）。<br />
                    我会调度三个专业子Agent ——
                    📚<strong>论文分析师</strong>、👤<strong>人才情报师</strong>、📈<strong>市场情报师</strong>，
                    综合技术、人才、市场三个维度生成量子赛道投资研判报告。
                  </p>
                ) : (
                  <p className="text-sm text-[var(--th-text)] leading-relaxed">
                    你好！我是 GRAVITY 认知引擎，基于 Qwen3.5 驱动。
                    <br />可以问我量子科技赛道的技术、产业、投资等问题。
                    <br />小提示：开启右上角“<span className="text-violet-400">Deep</span>”可调用多子Agent 深度研究模式。
                  </p>
                )}
              </div>
            </div>

            {/* 快速提问 */}
            <p className="text-[10px] text-[var(--th-text-muted)] uppercase tracking-widest mb-2 font-medium px-1">快速提问</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(deepMode === 'deep' ? DEEP_QUICK_QUESTIONS : QUICK_QUESTIONS).map(q => (
                <button
                  key={q}
                  onClick={() => handleQuickQuestion(q)}
                  className="p-2.5 bg-[var(--th-bg-hover)] border border-[var(--th-divider)] hover:bg-[var(--th-bg-active)] hover:border-blue-500/30 rounded-md transition-all text-left text-xs text-[var(--th-text-muted)] hover:text-[var(--th-text)] leading-snug"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isThisStreaming = isLastAiStreaming && idx === messages.length - 1;
              return (
                <div key={msg.id} className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'group/msg'}`}>
                  {/* Avatar */}
                  {!isUser && (
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5">
                      AI
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-[var(--th-accent-muted)] border border-[var(--th-divider)] text-[var(--th-text)] rounded-tl-sm'
                  }`}>
                    <MessageContent content={msg.content} isStreaming={isThisStreaming} />
                    {isUser ? (
                      <p className="text-[10px] opacity-40 mt-1.5 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    ) : (
                      <div className="flex items-center justify-end gap-1 mt-1.5">
                        <button
                          onClick={() => copyMessage(msg.content, msg.id)}
                          className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--th-text-muted)] hover:text-[var(--th-text)]"
                          title="复制 Markdown"
                        >
                          {copiedId === msg.id
                            ? <Check className="w-3 h-3 text-emerald-400" />
                            : <Copy className="w-3 h-3" />}
                        </button>
                        <p className="text-[10px] opacity-40">
                          {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* DeepAgent 进度指示器 */}
            {deepMode === 'deep' && loading && (activeSubagent || progressStep) && (
              <div className="flex flex-col gap-1.5 pl-8 animate-in fade-in duration-300">
                {activeSubagent && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-1 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    {SUBAGENT_LABELS[activeSubagent] ?? `${activeSubagent}`}
                  </span>
                )}
                {progressStep && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-800/60 border border-slate-700/40 rounded-md px-2 py-0.5 w-fit max-w-xs truncate">
                    {progressStep}
                  </span>
                )}
              </div>
            )}

            {/* 非流式 loading（无进度信息时） */}
            {loading && !isLastAiStreaming && !activeSubagent && !progressStep && (
              <div className="flex items-center gap-2 pl-8">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            {/* 错误提示 */}
            {error && !loading && (
              <div className="mx-1 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error.message.includes('fetch') ? '无法连接到后端服务，请确认后端已启动' : error.message}
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="px-4 pb-4 pt-2 border-t border-[rgba(59,130,246,0.10)]">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入问题，Enter 发送…"
            rows={1}
            disabled={loading}
            className="flex-1 bg-[var(--th-bg-input)] border border-[var(--th-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--th-text)] placeholder:text-[var(--th-text-muted)] focus:outline-none focus:border-blue-500/50 transition-all resize-none overflow-hidden disabled:opacity-50"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={loading ? clearMessages : handleSend}
            title={loading ? '停止' : '发送'}
            className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
              loading
                ? 'bg-[var(--th-bg-hover)] hover:bg-red-500/20 text-[var(--th-text-muted)] hover:text-red-400'
                : input.trim()
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-glow-sm'
                  : 'bg-[var(--th-bg-hover)] text-[var(--th-text-muted)] cursor-not-allowed'
            }`}
          >
            {loading ? <Square className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-[var(--th-text-muted)] mt-1.5">
          {deepMode === 'deep' ? '🔬 DeepAgent 深度研究模式 · ' : 'Enter 发送 · Shift+Enter 换行 · '}
          thread: {threadId.slice(-6)}
        </p>
      </div>

    </div>
  );
}