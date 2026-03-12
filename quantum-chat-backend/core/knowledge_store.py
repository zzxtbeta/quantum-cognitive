"""Knowledge Layer — 研究成果结构化存储（SQLite）。

替代原先的 research-artifacts/ 文件系统，所有成果写入数据库，
支持查询、下载、知识积累。

表结构：knowledge_items
    id          — 自增主键
    thread_id   — 关联的对话 thread（可为空，如手动导入）
    turn_id     — 关联的对话回合（可为空）
    agent_name  — 产出 Agent 名称
    category    — 分类：paper-analysis / people-intel / market-intel / investment-report / general
    title       — 用户可读标题
    content     — Markdown 正文
    size_chars  — 字符数
    created_at  — 创建时间（UTC ISO 8601）
    metadata    — JSON 扩展字段（如：query、topic 等）
"""
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

_DB_PATH = Path(__file__).parent.parent / "logs" / "knowledge.db"
_DB_PATH.parent.mkdir(exist_ok=True)


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def _ensure_tables() -> None:
    with _conn() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_items (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_id   TEXT,
                turn_id     TEXT,
                agent_name  TEXT NOT NULL,
                category    TEXT NOT NULL,
                title       TEXT NOT NULL,
                content     TEXT NOT NULL,
                size_chars  INTEGER NOT NULL,
                created_at  TEXT NOT NULL,
                metadata    TEXT DEFAULT '{}'
            )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_ki_category ON knowledge_items(category)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_ki_created ON knowledge_items(created_at)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_ki_thread ON knowledge_items(thread_id)")


_ensure_tables()


def save_knowledge(
    agent_name: str,
    category: str,
    title: str,
    content: str,
    thread_id: Optional[str] = None,
    turn_id: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> dict:
    """写入一条知识条目，返回完整记录（含 id）。"""
    now = datetime.now(timezone.utc).isoformat()
    meta_json = json.dumps(metadata or {}, ensure_ascii=False)
    with _conn() as c:
        cur = c.execute(
            """INSERT INTO knowledge_items
               (thread_id, turn_id, agent_name, category, title, content, size_chars, created_at, metadata)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (thread_id, turn_id, agent_name, category, title, content, len(content), now, meta_json),
        )
        row_id = cur.lastrowid
    return {
        "id": row_id,
        "thread_id": thread_id,
        "turn_id": turn_id,
        "agent_name": agent_name,
        "category": category,
        "title": title,
        "size_chars": len(content),
        "created_at": now,
        "metadata": metadata or {},
    }


def list_knowledge(
    category: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """列出知识条目（不含 content 正文，节省带宽）。"""
    wheres: list[str] = []
    params: list = []
    if category:
        wheres.append("category = ?")
        params.append(category)
    sql = """SELECT id, thread_id, turn_id, agent_name, category, title,
                    size_chars, created_at, metadata
             FROM knowledge_items"""
    if wheres:
        sql += " WHERE " + " AND ".join(wheres)
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params += [limit, offset]
    with _conn() as c:
        rows = c.execute(sql, params).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        try:
            d["metadata"] = json.loads(d.get("metadata") or "{}")
        except Exception:
            d["metadata"] = {}
        result.append(d)
    return result


def get_knowledge(item_id: int) -> Optional[dict]:
    """获取单条知识（含 content 正文）。"""
    with _conn() as c:
        row = c.execute("SELECT * FROM knowledge_items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    try:
        d["metadata"] = json.loads(d.get("metadata") or "{}")
    except Exception:
        d["metadata"] = {}
    return d


def delete_knowledge(item_id: int) -> bool:
    """删除单条知识，返回是否成功。"""
    with _conn() as c:
        cur = c.execute("DELETE FROM knowledge_items WHERE id = ?", (item_id,))
        return cur.rowcount > 0


def get_categories() -> list[dict]:
    """按 category 汇总条目数。"""
    with _conn() as c:
        rows = c.execute(
            """SELECT category, COUNT(*) as count, MAX(created_at) as latest
               FROM knowledge_items GROUP BY category ORDER BY latest DESC"""
        ).fetchall()
    return [dict(r) for r in rows]
