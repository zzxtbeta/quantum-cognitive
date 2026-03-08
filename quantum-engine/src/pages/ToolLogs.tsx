import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Clock, RefreshCw, Filter, Inbox } from 'lucide-react';
import {
  fetchToolLogs,
  fetchToolLogSessions,
  fetchToolNames,
  ToolLogEntry,
  ToolLogSession,
} from '../api/toolLogs';

// ── 工具名 → 颜色映射（同 deep_research.py 中的类别） ───────────────────────
function toolColor(tool: string): string {
  if (tool.includes('paper') || tool.includes('scan')) return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
  if (tool.includes('news') || tool.includes('market')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  if (tool.includes('people') || tool.includes('search_people')) return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  if (tool.includes('task')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (tool.includes('file') || tool.includes('write') || tool.includes('read')) return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
}

function formatTs(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return ts; }
}

function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 8) + '…' + id.slice(-4) : id;
}

// ── 单条日志卡片 ──────────────────────────────────────────────────────────────
function LogCard({ entry }: { entry: ToolLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const color = toolColor(entry.tool);

  return (
    <div className="border border-[rgba(59,130,246,0.10)] rounded-xl overflow-hidden bg-[rgba(8,10,24,0.5)] transition-all">
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(59,130,246,0.04)] transition-colors text-left"
      >
        <span className={`inline-flex items-center gap-1.5 text-[11px] border rounded-md px-2 py-0.5 font-mono shrink-0 ${color}`}>
          🔧 {entry.label ?? entry.tool}
        </span>
        <span className="text-[11px] text-[#8892aa] shrink-0 font-mono">
          {entry.tool !== (entry.label ?? entry.tool) && (
            <span className="mr-2 opacity-60">{entry.tool}</span>
          )}
        </span>
        <span className="flex-1" />
        {entry.duration_ms != null && (
          <span className="flex items-center gap-1 text-[11px] text-[#8892aa] shrink-0">
            <Clock className="w-3 h-3" />
            {entry.duration_ms < 1000
              ? `${entry.duration_ms}ms`
              : `${(entry.duration_ms / 1000).toFixed(1)}s`}
          </span>
        )}
        <span className="text-[11px] text-[#8892aa] shrink-0 ml-3">{formatTs(entry.ts)}</span>
        <span className="ml-2 text-[#8892aa]">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* Expandable detail */}
      {expanded && (
        <div className="border-t border-[rgba(59,130,246,0.08)] px-4 py-3 space-y-3">
          {entry.input_str && (
            <div>
              <p className="text-[10px] text-[#8892aa] uppercase tracking-widest mb-1 font-semibold">输入</p>
              <pre className="text-[11px] text-[#c8d4f0] whitespace-pre-wrap break-all font-mono bg-[rgba(0,0,0,0.3)] rounded-lg px-3 py-2 max-h-48 overflow-y-auto">
                {entry.input_str}
              </pre>
            </div>
          )}
          {entry.output_str ? (
            <div>
              <p className="text-[10px] text-[#8892aa] uppercase tracking-widest mb-1 font-semibold">输出</p>
              <pre className="text-[11px] text-[#c8d4f0] whitespace-pre-wrap break-all font-mono bg-[rgba(0,0,0,0.3)] rounded-lg px-3 py-2 max-h-64 overflow-y-auto">
                {entry.output_str}
              </pre>
            </div>
          ) : (
            <p className="text-[11px] text-[#8892aa] italic">（尚无输出记录）</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function ToolLogs() {
  const [sessions, setSessions] = useState<ToolLogSession[]>([]);
  const [toolNames, setToolNames] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [logs, setLogs] = useState<ToolLogEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const LIMIT = 50;

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    setErrorMsg(null);
    try {
      const data = await fetchToolLogSessions();
      setSessions(data);
      const names = await fetchToolNames();
      setToolNames(names);
    } catch (e: any) {
      setErrorMsg(e?.message || '加载会话失败');
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const loadLogs = useCallback(async (reset = true) => {
    setLoadingLogs(true);
    setErrorMsg(null);
    const nextOffset = reset ? 0 : offset;
    try {
      const data = await fetchToolLogs({
        thread_id: selectedSession ?? undefined,
        tool: selectedTool || undefined,
        limit: LIMIT,
        offset: nextOffset,
      });
      setLogs(prev => reset ? data : [...prev, ...data]);
      setOffset(nextOffset + data.length);
      setHasMore(data.length === LIMIT);
    } catch (e: any) {
      setErrorMsg(e?.message || '加载日志失败');
    } finally {
      setLoadingLogs(false);
    }
  }, [selectedSession, selectedTool, offset]);

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    setOffset(0);
    loadLogs(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession, selectedTool]);

  return (
    <div className="flex gap-5 h-[calc(100vh-8rem)]">
      {/* ── 左侧：会话列表 ────────────────────────────────────────────────── */}
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[11px] text-[#8892aa] uppercase tracking-widest font-semibold">会话</h2>
          <button
            onClick={loadSessions}
            className="p-1 rounded hover:bg-[rgba(59,130,246,0.08)] text-[#8892aa] hover:text-blue-400 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* 全部 */}
        <button
          onClick={() => setSelectedSession(null)}
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-[12px] transition-all ${
            selectedSession === null
              ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
              : 'text-[#8892aa] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#c8d4f0] border border-transparent'
          }`}
        >
          <span>全部会话</span>
          <span className="font-mono text-[10px] opacity-70">{sessions.reduce((s, x) => s + x.call_count, 0)}</span>
        </button>

        {loadingSessions ? (
          <div className="text-[11px] text-[#8892aa] pl-2 animate-pulse">加载中…</div>
        ) : (
          <div className="flex flex-col gap-1 overflow-y-auto min-h-0">
            {sessions.map(s => (
              <button
                key={s.thread_id}
                onClick={() => setSelectedSession(s.thread_id)}
                className={`flex flex-col items-start px-3 py-2 rounded-lg text-left transition-all ${
                  selectedSession === s.thread_id
                    ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
                    : 'text-[#8892aa] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#c8d4f0] border border-transparent'
                }`}
              >
                <span className="font-mono text-[11px] truncate w-full">{shortId(s.thread_id)}</span>
                <span className="text-[10px] opacity-60 flex gap-2 mt-0.5">
                  <span>{s.call_count} 次调用</span>
                  <span>{formatTs(s.last_activity)}</span>
                </span>
              </button>
            ))}
            {sessions.length === 0 && (
              <p className="text-[11px] text-[#8892aa] pl-2">暂无记录</p>
            )}
          </div>
        )}
      </div>

      {/* ── 右侧：日志主区域 ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="mb-4 animate-fade-up">
          <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">TOOL LOGS</h1>
          <p className="text-[#8892aa] text-sm">
            工具调用记录
            {selectedSession && (
              <span className="ml-2 font-mono text-blue-400 text-xs"># {shortId(selectedSession)}</span>
            )}
            {logs.length > 0 && (
              <span className="ml-2 text-blue-400 font-medium">{logs.length} 条</span>
            )}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-[#8892aa]">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <select
            value={selectedTool}
            onChange={e => setSelectedTool(e.target.value)}
            className="bg-[rgba(16,16,31,0.6)] border border-[rgba(59,130,246,0.15)] rounded-lg px-3 py-1.5 text-[12px] text-[#c8d4f0] focus:outline-none focus:border-blue-500/50 transition-all"
          >
            <option value="">全部工具</option>
            {toolNames.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={() => loadLogs(true)}
            disabled={loadingLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-[rgba(59,130,246,0.08)] hover:bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.15)] rounded-lg text-blue-400 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 px-3 py-2 text-[12px] rounded-lg border border-red-500/20 bg-red-500/10 text-red-300">
            工具日志加载失败：{errorMsg}
          </div>
        )}

        {/* Log entries */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loadingLogs && logs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[#8892aa] text-sm animate-pulse">
              加载中…
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[#8892aa]">
              <Inbox className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">暂无工具调用记录</p>
              <p className="text-xs mt-1 opacity-60">在 DeepAgent 模式发起一次对话后，记录将出现在此处</p>
            </div>
          ) : (
            <>
              {logs.map(entry => <LogCard key={entry.id} entry={entry} />)}
              {hasMore && (
                <button
                  onClick={() => loadLogs(false)}
                  disabled={loadingLogs}
                  className="w-full py-2 text-[12px] text-[#8892aa] hover:text-blue-400 border border-dashed border-[rgba(59,130,246,0.15)] rounded-xl transition-colors disabled:opacity-50"
                >
                  {loadingLogs ? '加载中…' : '加载更多'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
