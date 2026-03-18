import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Clock, Filter, RefreshCw, Trash2 } from 'lucide-react';
import {
  deleteToolLogSession,
  fetchToolLogs,
  fetchToolLogSessions,
  fetchToolNames,
  fetchToolTurns,
  ToolLogEntry,
  ToolLogSession,
  ToolLogTurn,
} from '../api/toolLogs';

const ACTIVE_THREAD_KEY = 'gravity:active-thread';
const PAGE_LIMIT = 50;

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return ts;
  }
}

function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 10)}…${id.slice(-4)}` : id;
}

function normalizeTurnId(turnId?: string | null): string {
  return turnId && turnId.trim() ? turnId : 'legacy';
}

function turnLabel(turnId?: string | null): string {
  if (!turnId || turnId === 'legacy') return '历史调用';
  return `回合 ${shortId(turnId.replace(/^turn-/, ''))}`;
}

function toolColor(tool: string): string {
  if (tool.includes('paper') || tool.includes('domain')) {
    return 'text-fuchsia-800 bg-fuchsia-100 border-fuchsia-300';
  }
  if (tool.includes('news') || tool.includes('market') || tool.includes('web')) {
    return 'text-amber-800 bg-amber-100 border-amber-300';
  }
  if (tool.includes('people') || tool.includes('institution')) {
    return 'text-cyan-800 bg-cyan-100 border-cyan-300';
  }
  if (tool.includes('task') || tool.includes('agent')) {
    return 'text-emerald-800 bg-emerald-100 border-emerald-300';
  }
  return 'text-blue-800 bg-blue-100 border-blue-300';
}

function parseMaybeJson(raw: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return trimmed.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  }
}

function LogCard({ entry }: { entry: ToolLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isLlm = entry.tool === '__llm__';
  const tokenTotal = (entry.tokens_prompt ?? 0) + (entry.tokens_completion ?? 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white/85 shadow-sm">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[12px] ${
            isLlm ? 'text-violet-800 bg-violet-100 border-violet-300' : toolColor(entry.tool)
          }`}
        >
          {entry.label ?? entry.tool}
        </span>
        <span className="flex-1" />
        {isLlm && tokenTotal > 0 && (
          <span className="mr-2 shrink-0 font-mono text-[11px] text-violet-700">
            {tokenTotal.toLocaleString()} tokens
          </span>
        )}
        {entry.duration_ms != null && (
          <span className="flex shrink-0 items-center gap-1 text-[12px] text-slate-600">
            <Clock className="h-3 w-3" />
            {entry.duration_ms < 1000 ? `${entry.duration_ms}ms` : `${(entry.duration_ms / 1000).toFixed(1)}s`}
          </span>
        )}
        <span className="shrink-0 text-[12px] text-slate-600">{formatTimestamp(entry.ts)}</span>
        {expanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
          {!isLlm && entry.input_str && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">输入</p>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[12px] text-slate-800">
                {parseMaybeJson(entry.input_str)}
              </pre>
            </div>
          )}
          {!isLlm && entry.output_str && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">输出</p>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[12px] text-slate-800">
                {parseMaybeJson(entry.output_str)}
              </pre>
            </div>
          )}
          {isLlm && (
            <div className="flex flex-wrap gap-4 font-mono text-[12px] text-slate-700">
              <span>Prompt: {(entry.tokens_prompt ?? 0).toLocaleString()}</span>
              <span>Completion: {(entry.tokens_completion ?? 0).toLocaleString()}</span>
              <span>Total: {tokenTotal.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ToolLogs() {
  const [sessions, setSessions] = useState<ToolLogSession[]>([]);
  const [turns, setTurns] = useState<ToolLogTurn[]>([]);
  const [toolNames, setToolNames] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedTurn, setSelectedTurn] = useState('');
  const [selectedTool, setSelectedTool] = useState('');
  const [logs, setLogs] = useState<ToolLogEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const lastIdRef = useRef(0);

  const syncActiveThreadSelection = useCallback((availableSessions: ToolLogSession[]) => {
    try {
      const activeThreadId = localStorage.getItem(ACTIVE_THREAD_KEY);
      if (!activeThreadId) return;
      const exists = availableSessions.some((session) => session.thread_id === activeThreadId);
      if (exists) {
        setSelectedSession((current) => (current === activeThreadId ? current : activeThreadId));
      }
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    setErrorMsg(null);
    try {
      const [sessionData, toolData] = await Promise.all([fetchToolLogSessions(), fetchToolNames()]);
      setSessions(sessionData);
      setToolNames(toolData);
      syncActiveThreadSelection(sessionData);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '加载工具日志会话失败');
    } finally {
      setLoadingSessions(false);
    }
  }, [syncActiveThreadSelection]);

  const loadTurns = useCallback(async () => {
    if (!selectedSession) {
      setTurns([]);
      setSelectedTurn('');
      return;
    }
    try {
      const data = await fetchToolTurns(selectedSession);
      setTurns(data);
    } catch (error) {
      setTurns([]);
      setErrorMsg(error instanceof Error ? error.message : '加载回合列表失败');
    }
  }, [selectedSession]);

  const loadLogs = useCallback(
    async (reset: boolean) => {
      setLoadingLogs(true);
      setErrorMsg(null);
      const requestOffset = reset ? 0 : offset;
      try {
        const data = await fetchToolLogs({
          thread_id: selectedSession ?? undefined,
          turn_id: selectedTurn || undefined,
          tool: selectedTool || undefined,
          limit: PAGE_LIMIT,
          offset: requestOffset,
        });
        setLogs((prev) => (reset ? data : [...prev, ...data]));
        setOffset(requestOffset + data.length);
        setHasMore(data.length === PAGE_LIMIT);
        lastIdRef.current = data.length > 0 ? Math.max(...data.map((entry) => entry.id)) : 0;
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : '加载工具日志失败');
      } finally {
        setLoadingLogs(false);
      }
    },
    [offset, selectedSession, selectedTool, selectedTurn],
  );

  const appendNewLogs = useCallback(async () => {
    if (lastIdRef.current === 0) return;
    try {
      const entries = await fetchToolLogs({
        thread_id: selectedSession ?? undefined,
        turn_id: selectedTurn || undefined,
        tool: selectedTool || undefined,
        limit: PAGE_LIMIT,
        after_id: lastIdRef.current,
      });
      if (entries.length === 0) return;
      setLogs((prev) => [...entries, ...prev]);
      lastIdRef.current = Math.max(...entries.map((entry) => entry.id));
    } catch {
      // Ignore lightweight refresh failures.
    }
  }, [selectedSession, selectedTool, selectedTurn]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    setSelectedTurn('');
    void loadTurns();
  }, [loadTurns]);

  useEffect(() => {
    setOffset(0);
    void loadLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession, selectedTurn, selectedTool]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const sessionData = await fetchToolLogSessions();
          setSessions(sessionData);
          syncActiveThreadSelection(sessionData);
        } catch {
          // Ignore polling errors.
        }
        if (selectedSession) {
          void loadTurns();
        }
        void appendNewLogs();
      })();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [appendNewLogs, autoRefresh, loadTurns, selectedSession, syncActiveThreadSelection]);

  const visibleLogs = useMemo(() => {
    if (!selectedTurn) return logs;
    return logs.filter((entry) => normalizeTurnId(entry.turn_id) === selectedTurn);
  }, [logs, selectedTurn]);

  const groupedLogs = useMemo(() => {
    const groups: Array<{ turnId: string; entries: ToolLogEntry[]; startedAt?: string; endedAt?: string }> = [];
    const groupIndex = new Map<string, number>();
    for (const entry of visibleLogs) {
      const turnId = normalizeTurnId(entry.turn_id);
      const existingIndex = groupIndex.get(turnId);
      if (existingIndex == null) {
        groupIndex.set(turnId, groups.length);
        groups.push({ turnId, entries: [entry], startedAt: entry.ts, endedAt: entry.ts });
      } else {
        const group = groups[existingIndex];
        group.entries.push(entry);
        group.startedAt = group.startedAt && group.startedAt < entry.ts ? group.startedAt : entry.ts;
        group.endedAt = group.endedAt && group.endedAt > entry.ts ? group.endedAt : entry.ts;
      }
    }
    return groups;
  }, [visibleLogs]);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-5">
      <div className="flex w-64 shrink-0 flex-col gap-2">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">会话</h2>
          <button
            onClick={() => void loadSessions()}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title="刷新会话"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={() => setSelectedSession(null)}
          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-[12px] transition-all ${
            selectedSession === null
              ? 'border-blue-300 bg-blue-100 text-blue-800'
              : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span>全部会话</span>
          <span className="font-mono text-[11px]">{sessions.reduce((sum, session) => sum + session.call_count, 0)}</span>
        </button>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {loadingSessions && <div className="px-2 py-6 text-center text-sm text-slate-500">正在加载会话…</div>}
          {!loadingSessions &&
            sessions.map((session) => (
              <div
                key={session.thread_id}
                className={`group flex items-center gap-1 rounded-lg border transition-all ${
                  selectedSession === session.thread_id
                    ? 'border-blue-300 bg-blue-100 text-blue-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <button
                  onClick={() => setSelectedSession(session.thread_id)}
                  className="min-w-0 flex-1 px-3 py-2 text-left"
                >
                  <div className="truncate font-mono text-[12px]">{shortId(session.thread_id)}</div>
                  <div className="mt-0.5 flex gap-2 text-[11px] opacity-85">
                    <span>{session.call_count} 条</span>
                    <span>{formatTimestamp(session.last_activity)}</span>
                  </div>
                </button>
                <button
                  onClick={async () => {
                    try {
                      await deleteToolLogSession(session.thread_id);
                      setSessions((prev) => prev.filter((item) => item.thread_id !== session.thread_id));
                      if (selectedSession === session.thread_id) {
                        setSelectedSession(null);
                        setLogs([]);
                      }
                    } catch {
                      // Ignore delete failures.
                    }
                  }}
                  className="mr-1.5 rounded-md p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                  title="删除此会话日志"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4">
          <h1 className="mb-1 font-display text-4xl tracking-widest text-shimmer">TOOL LOGS</h1>
          <p className="text-sm text-slate-700">
            工具调用记录
            {selectedSession && <span className="ml-2 font-mono text-xs text-cyan-700"># {shortId(selectedSession)}</span>}
            {selectedTurn && <span className="ml-2 font-mono text-xs text-fuchsia-700">· {turnLabel(selectedTurn)}</span>}
            {logs.length > 0 && <span className="ml-2 font-semibold text-blue-700">{visibleLogs.length} 条</span>}
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-300 bg-white/80 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Filter className="h-4 w-4" />
          </div>
          <select
            value={selectedTurn}
            onChange={(event) => setSelectedTurn(event.target.value)}
            disabled={!selectedSession}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] text-slate-800 transition-all focus:border-blue-500 focus:outline-none disabled:opacity-50"
          >
            <option value="">全部回合</option>
            {turns.map((turn) => (
              <option key={turn.turn_id} value={turn.turn_id}>
                {turnLabel(turn.turn_id)} · {turn.call_count} 条
              </option>
            ))}
          </select>

          <select
            value={selectedTool}
            onChange={(event) => setSelectedTool(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] text-slate-800 transition-all focus:border-blue-500 focus:outline-none"
          >
            <option value="">全部工具</option>
            {toolNames.map((toolName) => (
              <option key={toolName} value={toolName}>
                {toolName}
              </option>
            ))}
          </select>

          <button
            onClick={() => void loadLogs(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-100 px-3 py-1.5 text-[12px] text-blue-800 transition-all hover:bg-blue-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </button>

          <button
            onClick={() => setAutoRefresh((value) => !value)}
            className={`rounded-lg border px-3 py-1.5 text-[12px] transition-all ${
              autoRefresh
                ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                : 'border-slate-300 bg-slate-100 text-slate-700'
            }`}
          >
            实时刷新 {autoRefresh ? 'ON' : 'OFF'}
          </button>
        </div>

        {errorMsg && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loadingLogs && logs.length === 0 ? (
            <div className="rounded-xl border border-slate-300 bg-white/80 px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
              正在加载工具日志…
            </div>
          ) : groupedLogs.length === 0 ? (
            <div className="rounded-xl border border-slate-300 bg-white/80 px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
              当前筛选条件下没有找到日志。
            </div>
          ) : (
            <div className="space-y-5">
              {groupedLogs.map((group) => (
                <section key={group.turnId} className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white/85 px-4 py-3 shadow-sm">
                    <span className="rounded-md border border-fuchsia-300 bg-fuchsia-100 px-2 py-0.5 font-mono text-[12px] text-fuchsia-800">
                      {turnLabel(group.turnId)}
                    </span>
                    <span className="text-[12px] text-slate-600">{group.entries.length} 条</span>
                    <span className="text-[12px] text-slate-500">
                      {group.startedAt ? formatTimestamp(group.startedAt) : '--'} ~ {group.endedAt ? formatTimestamp(group.endedAt) : '--'}
                    </span>
                  </div>
                  {group.entries.map((entry) => (
                    <LogCard key={entry.id} entry={entry} />
                  ))}
                </section>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => void loadLogs(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
              >
                加载更多
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
