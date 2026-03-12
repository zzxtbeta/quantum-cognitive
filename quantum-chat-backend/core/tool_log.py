"""工具调用日志持久化（独立 SQLite，与 LangGraph checkpointer 分离）。

表结构：tool_calls
    id              — 自增主键
    run_id          — LangChain callback run_id（UUID 字符串，唯一标识一次调用）
    thread_id       — 会话 ID（来自请求）
    turn_id         — 对话回合 ID（同一 thread 下每轮问题唯一）
    tool            — 工具函数名称（"__llm__" 表示 LLM 调用记录）
    label           — 用户友好标签
    input_str       — 工具入参（截断至 50KB）
    output_str      — 工具输出（截断至 512KB，支持长报告）
    duration_ms     — 执行耗时（毫秒）
    ts              — 调用开始时间（UTC ISO 8601）
    tokens_prompt   — LLM 调用 prompt token 数（仅 __llm__ 行有值）
    tokens_completion — LLM 调用 completion token 数
"""
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

_DB_PATH = Path(__file__).parent.parent / "logs" / "tool_calls.db"
_DB_PATH.parent.mkdir(exist_ok=True)


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def _has_column(c: sqlite3.Connection, table: str, column: str) -> bool:
    rows = c.execute(f"PRAGMA table_info({table})").fetchall()
    return any(r[1] == column for r in rows)


def _ensure_tables() -> None:
    with _conn() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS tool_calls (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id            TEXT UNIQUE,
                thread_id         TEXT NOT NULL,
                turn_id           TEXT NOT NULL DEFAULT 'legacy',
                tool              TEXT NOT NULL,
                label             TEXT,
                input_str         TEXT,
                output_str        TEXT,
                duration_ms       INTEGER,
                ts                TEXT NOT NULL,
                tokens_prompt     INTEGER,
                tokens_completion INTEGER
            )
        """)
        # 对历史表做兼容迁移
        for col in ("turn_id", "tokens_prompt", "tokens_completion"):
            if not _has_column(c, "tool_calls", col):
                default = " NOT NULL DEFAULT 'legacy'" if col == "turn_id" else ""
                c.execute(f"ALTER TABLE tool_calls ADD COLUMN {col} {'TEXT' if col == 'turn_id' else 'INTEGER'}{default}")

        c.execute("CREATE INDEX IF NOT EXISTS idx_tc_thread ON tool_calls(thread_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_tc_ts ON tool_calls(ts)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_tc_tool ON tool_calls(tool)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_tc_turn ON tool_calls(turn_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_tc_id ON tool_calls(id)")


_ensure_tables()


def log_start(run_id: str, thread_id: str, turn_id: str, tool: str, label: str, input_str: str) -> None:
    """记录工具调用开始（output/duration 由 log_end 补充）。"""
    ts = datetime.now(timezone.utc).isoformat()
    with _conn() as c:
        c.execute(
            "INSERT OR IGNORE INTO tool_calls "
            "(run_id, thread_id, turn_id, tool, label, input_str, ts) VALUES (?,?,?,?,?,?,?)",
            (run_id, thread_id, turn_id, tool, label, input_str[:50000], ts),
        )


def log_end(run_id: str, output_str: str, duration_ms: int) -> None:
    """根据 run_id 补充输出和耗时。"""
    with _conn() as c:
        c.execute(
            "UPDATE tool_calls SET output_str=?, duration_ms=? WHERE run_id=?",
            (output_str[:524288], duration_ms, run_id),
        )


def log_llm_call(
    run_id: str, thread_id: str, turn_id: str,
    model: str, tokens_prompt: int, tokens_completion: int, duration_ms: int
) -> None:
    """记录一次 LLM 调用的 token 用量（tool='__llm__' 特殊行）。"""
    ts = datetime.now(timezone.utc).isoformat()
    label = f"LLM · {model}" if model else "LLM"
    with _conn() as c:
        c.execute(
            "INSERT OR IGNORE INTO tool_calls "
            "(run_id, thread_id, turn_id, tool, label, tokens_prompt, tokens_completion, duration_ms, ts) "
            "VALUES (?,?,?,?,?,?,?,?,?)",
            (f"llm-{run_id}", thread_id, turn_id, "__llm__", label,
             tokens_prompt, tokens_completion, duration_ms, ts),
        )


def query_logs(
    thread_id: Optional[str] = None,
    turn_id: Optional[str] = None,
    tool: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    after_id: Optional[int] = None,
) -> list[dict]:
    """查询工具调用记录，按时间正序。after_id 用于增量拉取（只返回 id > after_id 的条目）。"""
    wheres: list[str] = []
    params: list = []
    if after_id is not None:
        wheres.append("id > ?")
        params.append(after_id)
    if thread_id:
        wheres.append("thread_id = ?")
        params.append(thread_id)
    if turn_id:
        wheres.append("turn_id = ?")
        params.append(turn_id)
    if tool:
        wheres.append("tool = ?")
        params.append(tool)
    sql = "SELECT * FROM tool_calls"
    if wheres:
        sql += " WHERE " + " AND ".join(wheres)
    sql += " ORDER BY ts ASC LIMIT ? OFFSET ?"
    params += [limit, offset]
    with _conn() as c:
        return [dict(r) for r in c.execute(sql, params).fetchall()]


def get_sessions(limit: int = 30) -> list[dict]:
    """返回最近有工具调用的会话列表，含调用次数和最后活动时间。"""
    with _conn() as c:
        rows = c.execute(
            """
            SELECT thread_id,
                   MAX(ts)    AS last_activity,
                   COUNT(*)   AS call_count
            FROM tool_calls
            GROUP BY thread_id
            ORDER BY last_activity DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_turns(thread_id: str, limit: int = 50) -> list[dict]:
    """返回某个 thread 的回合列表（每轮对话一个 turn_id）。"""
    with _conn() as c:
        rows = c.execute(
            """
            SELECT turn_id,
                   MIN(ts)  AS started_at,
                   MAX(ts)  AS last_activity,
                   COUNT(*) AS call_count
            FROM tool_calls
            WHERE thread_id = ?
            GROUP BY turn_id
            ORDER BY last_activity DESC
            LIMIT ?
            """,
            (thread_id, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def get_tool_names() -> list[str]:
    """返回所有出现过的工具名称（用于前端 filter）。"""
    with _conn() as c:
        rows = c.execute(
            "SELECT DISTINCT tool FROM tool_calls ORDER BY tool"
        ).fetchall()
    return [r["tool"] for r in rows]


def delete_thread_logs(thread_id: str) -> int:
    """删除指定 thread 的所有工具调用日志，返回删除行数。"""
    with _conn() as c:
        cur = c.execute("DELETE FROM tool_calls WHERE thread_id = ?", (thread_id,))
        return cur.rowcount
