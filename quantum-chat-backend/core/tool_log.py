"""工具调用日志持久化（独立 SQLite，与 LangGraph checkpointer 分离）。

表结构：tool_calls
  id          — 自增主键
  run_id      — LangChain callback run_id（UUID 字符串，唯一标识一次调用）
  thread_id   — 会话 ID（来自请求）
  tool        — 工具函数名称
  label       — 用户友好标签
  input_str   — 工具入参（截断至 4000 字符）
  output_str  — 工具输出（截断至 8000 字符）
  duration_ms — 执行耗时（毫秒）
  ts          — 调用开始时间（UTC ISO 8601）
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


def _ensure_tables() -> None:
    with _conn() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS tool_calls (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id      TEXT UNIQUE,
                thread_id   TEXT NOT NULL,
                tool        TEXT NOT NULL,
                label       TEXT,
                input_str   TEXT,
                output_str  TEXT,
                duration_ms INTEGER,
                ts          TEXT NOT NULL
            )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_tc_thread ON tool_calls(thread_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_tc_ts ON tool_calls(ts)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_tc_tool ON tool_calls(tool)")


_ensure_tables()


def log_start(run_id: str, thread_id: str, tool: str, label: str, input_str: str) -> None:
    """记录工具调用开始（output/duration 由 log_end 补充）。"""
    ts = datetime.now(timezone.utc).isoformat()
    with _conn() as c:
        c.execute(
            "INSERT OR IGNORE INTO tool_calls "
            "(run_id, thread_id, tool, label, input_str, ts) VALUES (?,?,?,?,?,?)",
            (run_id, thread_id, tool, label, input_str[:4000], ts),
        )


def log_end(run_id: str, output_str: str, duration_ms: int) -> None:
    """根据 run_id 补充输出和耗时。"""
    with _conn() as c:
        c.execute(
            "UPDATE tool_calls SET output_str=?, duration_ms=? WHERE run_id=?",
            (output_str[:8000], duration_ms, run_id),
        )


def query_logs(
    thread_id: Optional[str] = None,
    tool: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """查询工具调用记录，按时间倒序。"""
    wheres: list[str] = []
    params: list = []
    if thread_id:
        wheres.append("thread_id = ?")
        params.append(thread_id)
    if tool:
        wheres.append("tool = ?")
        params.append(tool)
    sql = "SELECT * FROM tool_calls"
    if wheres:
        sql += " WHERE " + " AND ".join(wheres)
    sql += " ORDER BY ts DESC LIMIT ? OFFSET ?"
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


def get_tool_names() -> list[str]:
    """返回所有出现过的工具名称（用于前端 filter）。"""
    with _conn() as c:
        rows = c.execute(
            "SELECT DISTINCT tool FROM tool_calls ORDER BY tool"
        ).fetchall()
    return [r["tool"] for r in rows]
