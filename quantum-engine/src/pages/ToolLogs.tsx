import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Clock, RefreshCw, Filter, Inbox } from 'lucide-react';
import {
  fetchToolLogs,
  fetchToolLogSessions,
  fetchToolNames,
  fetchToolTurns,
  ToolLogEntry,
  ToolLogSession,
  ToolLogTurn,
} from '../api/toolLogs';

// ── 工具名 → 颜色映射（同 deep_research.py 中的类别） ───────────────────────
function toolColor(tool: string): string {
  if (tool.includes('paper') || tool.includes('scan')) return 'text-fuchsia-100 bg-fuchsia-900/30 border-fuchsia-400/30';
  if (tool.includes('news') || tool.includes('market')) return 'text-amber-100 bg-amber-900/30 border-amber-400/30';
  if (tool.includes('people') || tool.includes('search_people')) return 'text-cyan-100 bg-cyan-900/30 border-cyan-400/30';
  if (tool.includes('task')) return 'text-emerald-100 bg-emerald-900/30 border-emerald-400/30';
  if (tool.includes('file') || tool.includes('write') || tool.includes('read')) return 'text-slate-100 bg-slate-700/40 border-slate-400/30';
  return 'text-blue-100 bg-blue-900/30 border-blue-400/30';
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
  return id.length > 14 ? id.slice(0, 10) + '…' + id.slice(-4) : id;
}

function turnLabel(turnId: string): string {
  const t = turnId.replace(/^turn-/, '');
  return `回合 ${shortId(t)}`;
}

// ── 单条日志卡片 ──────────────────────────────────────────────────────────────
function LogCard({ entry }: { entry: ToolLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const color = toolColor(entry.tool);

  return (
    <div className="border border-slate-500/30 rounded-xl overflow-hidden bg-slate-900/60 backdrop-blur-sm transition-all">
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/70 transition-colors text-left"
      >
        <span className={`inline-flex items-center gap-1.5 text-[12px] border rounded-md px-2 py-0.5 font-mono shrink-0 ${color}`}>
          🔧 {entry.label ?? entry.tool}
        </span>
        <span className="text-[12px] text-slate-300 shrink-0 font-mono opacity-90">
          {entry.tool !== (entry.label ?? entry.tool) ? entry.tool : ''}
        </span>
        <span className="flex-1" />
        <span className="text-[11px] text-slate-300/90 shrink-0 mr-3 font-mono">{turnLabel(entry.turn_id)}</span>
        {entry.duration_ms != null && (
          <span className="flex items-center gap-1 text-[12px] text-slate-200 shrink-0">
            <Clock className="w-3 h-3" />
            {entry.duration_ms < 1000
              ? `${entry.duration_ms}ms`
              : `${(entry.duration_ms / 1000).toFixed(1)}s`}
          </span>
        )}
        <span className="text-[12px] text-slate-300 shrink-0 ml-3">{formatTs(entry.ts)}</span>
        <span className="ml-2 text-slate-100">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
      </button>

      {/* Expandable detail */}
      {expanded && (
        <div className="border-t border-slate-500/30 px-4 py-3 space-y-3 bg-slate-950/60">
          {entry.input_str && (
            <div>
              <p className="text-[11px] text-slate-200 uppercase tracking-widest mb-1 font-semibold">输入</p>
              <pre className="text-[12px] text-slate-100 whitespace-pre-wrap break-all font-mono bg-black/40 rounded-lg px-3 py-2 max-h-48 overflow-y-auto leading-relaxed">
                {entry.input_str}
              </pre>
            </div>
          )}
          {entry.output_str ? (
            <div>
              <p className="text-[11px] text-slate-200 uppercase tracking-widest mb-1 font-semibold">输出</p>
              <pre className="text-[12px] text-slate-100 whitespace-pre-wrap break-all font-mono bg-black/40 rounded-lg px-3 py-2 max-h-64 overflow-y-auto leading-relaxed">
                {entry.output_str}
              </pre>
            </div>
          ) : (
            <p className="text-[12px] text-slate-300 italic">（尚无输出记录）</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function ToolLogs() {
  const [sessions, setSessions] = useState<ToolLogSession[]>([]);
  const [turns, setTurns] = useState<ToolLogTurn[]>([]);
  const [toolNames, setToolNames] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedTurn, setSelectedTurn] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [logs, setLogs] = useState<ToolLogEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
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

  const loadTurns = useCallback(async () => {
    if (!selectedSession) {
      setTurns([]);
      setSelectedTurn('');
      return;
    }
    try {
      const data = await fetchToolTurns(selectedSession);
      setTurns(data);
      if (selectedTurn && !data.find(t => t.turn_id === selectedTurn)) {
        setSelectedTurn('');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || '加载回合失败');
    }
  }, [selectedSession, selectedTurn]);

  const loadLogs = useCallback(async (reset = true) => {
    setLoadingLogs(true);
    setErrorMsg(null);
    const nextOffset = reset ? 0 : offset;
    try {
      const data = await fetchToolLogs({
        thread_id: selectedSession ?? undefined,
        turn_id: selectedTurn || undefined,
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
  }, [selectedSession, selectedTurn, selectedTool, offset]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    setSelectedTurn('');
    loadTurns();
  }, [selectedSession, loadTurns]);

  useEffect(() => {
    setOffset(0);
    loadLogs(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession, selectedTurn, selectedTool]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      loadSessions();
      if (selectedSession) loadTurns();
      loadLogs(true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, selectedSession, loadSessions, loadTurns, loadLogs]);

  return (
    <div className="flex gap-5 h-[calc(100vh-8rem)]">
      {/* ── 左侧：会话列表 ────────────────────────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[11px] text-slate-300 uppercase tracking-widest font-semibold">会话</h2>
          <button
            onClick={loadSessions}
            className="p-1 rounded hover:bg-slate-700/60 text-slate-300 hover:text-white transition-colors"
            title="刷新会话"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* 全部 */}
        <button
          onClick={() => setSelectedSession(null)}
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-[12px] transition-all border ${
            selectedSession === null
              ? 'bg-blue-600/25 border-blue-400/50 text-blue-100'
              : 'text-slate-200 hover:bg-slate-700/40 hover:text-white border-slate-500/30'
          }`}
        >
          <span>全部会话</span>
          <span className="font-mono text-[11px] opacity-90">{sessions.reduce((s, x) => s + x.call_count, 0)}</span>
        </button>

        {loadingSessions ? (
          <div className="text-[11px] text-slate-300 pl-2 animate-pulse">加载中…</div>
        ) : (
          <div className="flex flex-col gap-1 overflow-y-auto min-h-0">
            {sessions.map(s => (
              <button
                key={s.thread_id}
                onClick={() => setSelectedSession(s.thread_id)}
                className={`flex flex-col items-start px-3 py-2 rounded-lg text-left transition-all border ${
                  selectedSession === s.thread_id
                    ? 'bg-blue-600/25 border-blue-400/50 text-blue-100'
                    : 'text-slate-200 hover:bg-slate-700/40 hover:text-white border-slate-500/30'
                }`}
              >
                <span className="font-mono text-[12px] truncate w-full">{shortId(s.thread_id)}</span>
                <span className="text-[11px] opacity-85 flex gap-2 mt-0.5">
                  <span>{s.call_count} 次</span>
                  <span>{formatTs(s.last_activity)}</span>
                </span>
              </button>
            ))}
            {sessions.length === 0 && (
              <p className="text-[11px] text-slate-300 pl-2">暂无记录</p>
            )}
          </div>
        )}
      </div>

      {/* ── 右侧：日志主区域 ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="mb-4 animate-fade-up">
          <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">TOOL LOGS</h1>
          <p className="text-slate-200 text-sm">
            工具调用记录
            {selectedSession && (
              <span className="ml-2 font-mono text-cyan-200 text-xs"># {shortId(selectedSession)}</span>
            )}
            {selectedTurn && (
              <span className="ml-2 font-mono text-fuchsia-200 text-xs">· {turnLabel(selectedTurn)}</span>
            )}
            {logs.length > 0 && (
              <span className="ml-2 text-blue-200 font-semibold">{logs.length} 条</span>
            )}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-200">
            <Filter className="w-3.5 h-3.5" />
          </div>

          <select
            value={selectedTurn}
            onChange={e => setSelectedTurn(e.target.value)}
            disabled={!selectedSession}
            className="bg-slate-900/70 border border-slate-400/40 rounded-lg px-3 py-1.5 text-[12px] text-slate-100 focus:outline-none focus:border-cyan-300/60 transition-all disabled:opacity-50"
          >
            <option value="">全部回合</option>
            {turns.map(t => (
              <option key={t.turn_id} value={t.turn_id}>{turnLabel(t.turn_id)} · {t.call_count} 次</option>
            ))}
          </select>

          <select
            value={selectedTool}
            onChange={e => setSelectedTool(e.target.value)}
            className="bg-slate-900/70 border border-slate-400/40 rounded-lg px-3 py-1.5 text-[12px] text-slate-100 focus:outline-none focus:border-cyan-300/60 transition-all"
          >
            <option value="">全部工具</option>
            {toolNames.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={() => loadLogs(true)}
            disabled={loadingLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-cyan-700/30 hover:bg-cyan-600/35 border border-cyan-400/40 rounded-lg text-cyan-100 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
            刷新
          </button>

          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`px-3 py-1.5 text-[12px] rounded-lg border transition-all ${
              autoRefresh
                ? 'bg-emerald-700/30 border-emerald-400/40 text-emerald-100'
                : 'bg-slate-800/60 border-slate-500/40 text-slate-200'
            }`}
          >
            实时刷新 {autoRefresh ? 'ON' : 'OFF'}
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 px-3 py-2 text-[12px] rounded-lg border border-red-400/40 bg-red-900/30 text-red-100">
            工具日志加载失败：{errorMsg}
          </div>
        )}

        {/* Log entries */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loadingLogs && logs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-100 text-sm animate-pulse">
              加载中…
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-200">
              <Inbox className="w-8 h-8 mb-2 opacity-70" />
              <p className="text-sm">暂无工具调用记录</p>
              <p className="text-xs mt-1 opacity-90">在 DeepAgent 模式发起一次对话后，记录将出现在此处</p>
            </div>
          ) : (
            <>
              {logs.map(entry => <LogCard key={entry.id} entry={entry} />)}
              {hasMore && (
                <button
                  onClick={() => loadLogs(false)}
                  disabled={loadingLogs}
                  className="w-full py-2 text-[12px] text-slate-100 hover:text-cyan-100 border border-dashed border-slate-400/40 rounded-xl transition-colors disabled:opacity-50"
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
