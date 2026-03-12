"""
深度研究端点 — 量子赛道认知引擎 DeepAgent 模式

POST /deep/stream   — SSE 流式输出，主接口
POST /deep          — 同步完整输出
DELETE /deep/thread/{thread_id} — 清空会话
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from typing import AsyncGenerator, Any, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from langchain_core.callbacks import AsyncCallbackHandler
from pydantic import BaseModel

from dagent import get_deep_agent, get_skill_files

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/deep", tags=["deep-research"])

# ─── skill 文件缓存（启动后只加载一次，热重载由 /deep/reload-skills 接口触发）──────
_cached_skill_files: dict | None = None


def _get_cached_skill_files() -> dict:
    global _cached_skill_files
    if _cached_skill_files is None:
        _cached_skill_files = get_skill_files()
        logger.info("Skill 文件已缓存，共 %d 个文件", len(_cached_skill_files))
    return _cached_skill_files


class DeepRequest(BaseModel):
    message: str
    thread_id: str = ""   # 空则自动生成（新会话）


class DeepResponse(BaseModel):
    thread_id: str
    content: str


# ─── 子Agent 友好名称映射 ──────────────────────────────────────────────────────
_SUBAGENT_LABELS: dict[str, str] = {
    "paper-researcher": "📄 论文分析师",
    "people-intel": "👤 人才情报官",
    "news-market": "📰 市场情报师",
}

# ─── 工具友好名称映射（简化显示） ────────────────────────────────────────────────
_TOOL_LABELS: dict[str, str] = {
    "batch_scan_papers": "扫描论文库",
    "semantic_search_papers": "语义检索论文",
    "query_news_db": "查询新闻数据库",
    "semantic_search_news": "语义检索新闻",
    "search_web": "搜索互联网",
    "search_researchers": "检索研究人员",
    "search_quantum_news": "搜索量子新闻",
    "search_quantum_funding": "搜索融资信息",
    "search_quantum_policy": "搜索政策动向",
    "search_quantum_companies": "搜索公司动态",
    "search_people": "检索人才信息",
    "people_search": "检索人才信息",
    "save_research_artifact": "保存研究成果",
    "task": "启动子Agent",
    "write_file": "写入文件",
    "read_file": "读取文件",
    "edit_file": "编辑文件",
    "ls": "列目录",
    "glob": "查找文件",
    "grep": "搜索内容",
    "write_todos": "更新任务列表",
}

# ─── 工具输入/输出标准化 ──────────────────────────────────────────────────────────

def _normalize_input(input_str: str) -> str:
    """将工具输入规范化为 JSON 字符串，便于前端显示。支持 JSON 字符串和 Python repr 两种格式。"""
    s = str(input_str).strip()
    try:
        json.loads(s)
        return s  # 已是有效 JSON
    except (ValueError, TypeError):
        pass
    # Python dict/list repr（单引号），用 ast.literal_eval 转换
    try:
        import ast
        parsed = ast.literal_eval(s)
        return json.dumps(parsed, ensure_ascii=False)
    except Exception:
        pass
    return s


def _normalize_output(output: Any) -> str:
    """将工具输出规范化为字符串。LangChain ToolMessage 自动提取 content 字段。"""
    if isinstance(output, str):
        return output
    # LangChain ToolMessage / BaseMessage 等对象有 .content 属性
    content = getattr(output, "content", None)
    if content is not None:
        return str(content)
    try:
        return json.dumps(output, ensure_ascii=False, default=str)
    except Exception:
        return str(output)


# ─── 进度回调处理器 ─────────────────────────────────────────────────────────────

class _ProgressHandler(AsyncCallbackHandler):
    """将工具调用事件转发到 asyncio.Queue，供 SSE 流消费。同时持久化到 tool_log DB。"""

    def __init__(self, queue: asyncio.Queue, thread_id: str, turn_id: str) -> None:
        super().__init__()
        self._queue = queue
        self._thread_id = thread_id
        self._turn_id = turn_id
        self._pending: dict[str, float] = {}       # tool run_id → monotonic start time
        self._llm_starts: dict[str, float] = {}    # llm run_id → monotonic start time

    async def on_tool_start(
        self,
        serialized: dict[str, Any],
        input_str: str,
        *,
        run_id: Any = None,
        parent_run_id: Any = None,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> None:
        tool_name = serialized.get("name", "unknown")
        # run_id=None 时生成唯一兜底 ID，防止多次调用互相覆盖
        import uuid as _uuid
        run_id_str = str(run_id) if run_id else f"fallback-{_uuid.uuid4()}"
        self._pending[run_id_str] = time.monotonic()

        label = _TOOL_LABELS.get(tool_name, tool_name)

        # 持久化到 DB（含内部文件操作，用于完整审计）
        try:
            from core.tool_log import log_start
            log_start(run_id_str, self._thread_id, self._turn_id, tool_name, label, _normalize_input(str(input_str)))
        except Exception:
            pass

        # 识别子Agent 启动
        if tool_name == "task":
            try:
                inp = json.loads(input_str) if isinstance(input_str, str) else input_str
                subagent = inp.get("subagent_type", "subagent")
                desc = (inp.get("description") or "")[:100]
                subagent_label = _SUBAGENT_LABELS.get(subagent, f"{subagent}")
                await self._queue.put({
                    "type": "agent_start",
                    "agent": subagent,
                    "content": f"{subagent_label} 启动中…{desc[:60]}{'…' if len(desc) > 60 else ''}",
                })
                return
            except Exception:
                pass

        # 其他工具调用（SSE 层过滤内部文件操作）
        _FILE_OPS = {"write_file", "read_file", "edit_file", "ls", "glob", "grep", "write_todos"}
        if tool_name in _FILE_OPS:
            return

        await self._queue.put({
            "type": "step",
            "tool": tool_name,
            "content": f"🔧 {label}",
        })

    async def on_tool_end(
        self,
        output: Any,
        *,
        run_id: Any = None,
        parent_run_id: Any = None,
        **kwargs: Any,
    ) -> None:
        run_id_str = str(run_id) if run_id else "unknown"
        start = self._pending.pop(run_id_str, None)
        duration_ms = int((time.monotonic() - start) * 1000) if start is not None else 0
        try:
            from core.tool_log import log_end
            log_end(run_id_str, _normalize_output(output), duration_ms)
        except Exception:
            pass
        await self._queue.put({"type": "step_done"})

    async def on_tool_error(
        self,
        error: BaseException,
        *,
        run_id: Any = None,
        parent_run_id: Any = None,
        **kwargs: Any,
    ) -> None:
        """工具执行报错时补充 output_str，防止日志条目永久空白。"""
        run_id_str = str(run_id) if run_id else "unknown"
        start = self._pending.pop(run_id_str, None)
        duration_ms = int((time.monotonic() - start) * 1000) if start is not None else 0
        try:
            from core.tool_log import log_end
            log_end(run_id_str, f"[ERROR] {type(error).__name__}: {error}", duration_ms)
        except Exception:
            pass
        await self._queue.put({"type": "step_done"})

    async def on_llm_start(
        self,
        serialized: dict[str, Any],
        prompts: list[str],
        *,
        run_id: Any = None,
        **kwargs: Any,
    ) -> None:
        self._llm_starts[str(run_id) if run_id else "unknown"] = time.monotonic()

    async def on_llm_end(
        self,
        response: Any,  # LLMResult
        *,
        run_id: Any = None,
        **kwargs: Any,
    ) -> None:
        run_id_str = str(run_id) if run_id else "unknown"
        start = self._llm_starts.pop(run_id_str, None)
        duration_ms = int((time.monotonic() - start) * 1000) if start is not None else 0

        tokens_prompt = tokens_completion = 0
        model_name = ""
        try:
            lo = getattr(response, "llm_output", None) or {}
            usage = lo.get("token_usage") or lo.get("usage") or {}
            tokens_prompt = int(usage.get("prompt_tokens") or usage.get("input_tokens") or 0)
            tokens_completion = int(usage.get("completion_tokens") or usage.get("output_tokens") or 0)
            model_name = str(lo.get("model_name", "") or lo.get("model", ""))
            # Fallback: check generation's usage_metadata (LangChain ≥ 0.2)
            if not tokens_prompt and getattr(response, "generations", None):
                gen0 = response.generations[0]
                if gen0:
                    msg = getattr(gen0[0], "message", None)
                    um = getattr(msg, "usage_metadata", None) or {}
                    tokens_prompt = int(um.get("input_tokens") or 0)
                    tokens_completion = int(um.get("output_tokens") or 0)
        except Exception:
            pass

        if tokens_prompt or tokens_completion:
            try:
                from core.tool_log import log_llm_call
                log_llm_call(run_id_str, self._thread_id, self._turn_id,
                             model_name, tokens_prompt, tokens_completion, duration_ms)
            except Exception:
                pass


# ─── SSE 生成器 ────────────────────────────────────────────────────────────────

async def _sse_stream(message: str, thread_id: str, turn_id: str) -> AsyncGenerator[str, None]:
    """
    将 DeepAgent astream + 进度回调转换为 SSE 事件流。

    事件类型：
      {"type": "token",        "content": "...", "agent": "quantum-orchestrator"}
      {"type": "subagent_token","content": "...", "agent": "paper-researcher"}
      {"type": "agent_start",  "agent": "paper-researcher", "content": "..."}
      {"type": "step",         "tool": "query_news_db", "content": "🔧 查询新闻数据库"}
      {"type": "step_done"}
      {"type": "done",         "thread_id": "..."}
      {"type": "error",        "content": "..."}
    """
    from langchain_core.messages import AIMessageChunk

    agent = get_deep_agent()
    skill_files = _get_cached_skill_files()

    # asyncio.Queue 作为多路事件汇聚点
    event_queue: asyncio.Queue[dict | object] = asyncio.Queue()
    _SENTINEL = object()

    progress_handler = _ProgressHandler(event_queue, thread_id, turn_id)
    config = {
        "configurable": {"thread_id": thread_id},
        "callbacks": [progress_handler],
    }
    input_payload: dict = {
        "messages": [{"role": "user", "content": message}],
    }
    if skill_files:
        input_payload["files"] = skill_files

    async def _run_agent() -> None:
        # 保留生成器引用，以便在取消时显式 aclose()
        astream_gen = agent.astream(
            input_payload,
            config=config,
            stream_mode="messages",
        )
        try:
            async for chunk, metadata in astream_gen:
                if not isinstance(chunk, AIMessageChunk):
                    continue

                # ── Token 统计：必须在 content 过滤前捕获 ──────────────────────
                # 流式模式下 on_llm_end 可能不触发；最终 chunk 携带 usage_metadata
                # 但 content 为空，若先 continue 则永远漏掉统计
                um = getattr(chunk, "usage_metadata", None)
                if um and (um.get("input_tokens") or um.get("output_tokens")):
                    agent_name_tok = metadata.get("lc_agent_name", "quantum-orchestrator")
                    try:
                        import uuid as _uuid_mod
                        from core.tool_log import log_llm_call as _log_llm
                        _log_llm(
                            f"stream-{_uuid_mod.uuid4().hex[:8]}",
                            thread_id, turn_id,
                            agent_name_tok,
                            int(um.get("input_tokens", 0)),
                            int(um.get("output_tokens", 0)),
                            0,
                        )
                    except Exception:
                        pass

                if not chunk.content:
                    continue
                if chunk.additional_kwargs.get("tool_calls"):
                    continue

                agent_name = metadata.get("lc_agent_name", "quantum-orchestrator")
                ev_type = "subagent_token" if agent_name != "quantum-orchestrator" else "token"
                await event_queue.put({
                    "type": ev_type,
                    "agent": agent_name,
                    "content": chunk.content,
                })
        except asyncio.CancelledError:
            logger.info("DeepAgent 流被取消 thread_id=%s", thread_id)
            # Python async for 遇到异常时不自动调 aclose()，需要显式关闭
            # 这样 deepagents 内部用 create_task() 启动的子 agent 才能收到取消信号
            try:
                await astream_gen.aclose()
                logger.info("DeepAgent 生成器已关闭 thread_id=%s", thread_id)
            except Exception:
                pass
        except Exception as e:
            logger.exception("DeepAgent 流异常 thread_id=%s: %s", thread_id, e)
            await event_queue.put({"type": "error", "content": str(e)})
        finally:
            await event_queue.put(_SENTINEL)

    agent_task = asyncio.create_task(_run_agent())

    try:
        while True:
            event = await event_queue.get()
            if event is _SENTINEL:
                yield _sse_event({"type": "done", "thread_id": thread_id, "turn_id": turn_id})
                break
            yield _sse_event(event)  # type: ignore[arg-type]
    except asyncio.CancelledError:
        logger.info("SSE 客户端断开 thread_id=%s", thread_id)
    finally:
        if not agent_task.done():
            agent_task.cancel()
            try:
                await agent_task
            except asyncio.CancelledError:
                pass


def _sse_event(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


# ─── 路由 ─────────────────────────────────────────────────────────────────────

@router.post("/stream")
async def deep_stream(req: DeepRequest):
    """SSE 流式深度研究（DeepAgent 模式主接口）"""
    thread_id = req.thread_id or str(uuid.uuid4())
    turn_id = f"turn-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
    logger.info("[deep/stream] thread=%s turn=%s | msg=%s", thread_id, turn_id, req.message[:80])
    return StreamingResponse(
        _sse_stream(req.message, thread_id, turn_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("")
async def deep_sync(req: DeepRequest):
    """同步深度研究（调试用）"""
    thread_id = req.thread_id or str(uuid.uuid4())
    agent = get_deep_agent()
    skill_files = _get_cached_skill_files()

    config = {"configurable": {"thread_id": thread_id}}
    input_payload: dict = {"messages": [{"role": "user", "content": req.message}]}
    if skill_files:
        input_payload["files"] = skill_files

    result = await agent.ainvoke(input_payload, config=config)
    last_msg = result["messages"][-1]
    return DeepResponse(thread_id=thread_id, content=last_msg.content)


@router.post("/reload-skills")
async def reload_skills():
    """强制重新加载所有 Skill 文件（更新 SKILL.md 后调用）"""
    global _cached_skill_files
    _cached_skill_files = get_skill_files()
    return {"status": "reloaded", "count": len(_cached_skill_files)}


@router.get("/history/{thread_id}")
async def deep_history(thread_id: str):
    """获取指定 DeepAgent 线程的历史消息（主 orchestrator 轮次，不含子Agent 中间过程）。"""
    agent = get_deep_agent()
    config = {"configurable": {"thread_id": thread_id}}
    try:
        state = await agent.aget_state(config)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Thread not found: {exc}")

    messages = []
    for msg in state.values.get("messages", []):
        role = getattr(msg, "type", None) or msg.__class__.__name__.replace("Message", "").lower()
        role_map = {"human": "user", "ai": "assistant"}
        content = msg.content if hasattr(msg, "content") else ""
        # 过滤掉工具调用消息和空内容
        if content and isinstance(content, str) and not msg.__class__.__name__.startswith("Tool"):
            messages.append({"role": role_map.get(role, role), "content": content})
    return {"thread_id": thread_id, "messages": messages}


@router.delete("/thread/{thread_id}")
async def clear_deep_thread(thread_id: str):
    """清空 DeepAgent 会话记忆，同时删除对应工具调用日志"""
    agent = get_deep_agent()
    config = {"configurable": {"thread_id": thread_id}}
    try:
        await agent.aupdate_state(config, {"messages": []})
    except Exception:
        pass
    from core.tool_log import delete_thread_logs
    deleted = delete_thread_logs(thread_id)
    return {"thread_id": thread_id, "cleared": True, "tool_logs_deleted": deleted}


# ─── 工具调用日志 API ────────────────────────────────────────────────────────────

@router.get("/tool-logs/sessions")
async def get_tool_log_sessions(limit: int = Query(30, ge=1, le=200)):
    """列出最近有工具调用的会话，含调用次数与最后活动时间。"""
    from core.tool_log import get_sessions
    return {"sessions": get_sessions(limit=limit)}


@router.get("/tool-logs/tools")
async def get_tool_log_tool_names():
    """返回所有出现过的工具名称（用于前端 filter）。"""
    from core.tool_log import get_tool_names
    return {"tools": get_tool_names()}


@router.get("/tool-logs")
async def get_tool_logs(
    thread_id: Optional[str] = None,
    turn_id: Optional[str] = None,
    tool: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    after_id: Optional[int] = Query(None, ge=0),
):
    """查询工具调用记录，支持按 thread_id / tool 过滤，按时间正序。
    after_id: 如指定，只返回 id > after_id 的新条目（用于前端增量刷新）。
    """
    from core.tool_log import query_logs
    return {
        "logs": query_logs(thread_id=thread_id, turn_id=turn_id, tool=tool,
                           limit=limit, offset=offset, after_id=after_id)
    }


@router.get("/tool-logs/turns")
async def get_tool_log_turns(thread_id: str, limit: int = Query(50, ge=1, le=200)):
    """获取某个 thread 下的回合列表。"""
    from core.tool_log import get_turns
    return {"turns": get_turns(thread_id=thread_id, limit=limit)}


@router.delete("/tool-logs/session/{thread_id}")
async def delete_tool_log_session(thread_id: str):
    """删除指定 thread 的所有工具调用日志。"""
    from core.tool_log import delete_thread_logs
    deleted = delete_thread_logs(thread_id)
    return {"thread_id": thread_id, "deleted": deleted}


# ─── Knowledge Layer API ─────────────────────────────────────────────────────

@router.get("/knowledge")
async def list_knowledge_items(
    category: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """列出知识条目（不含正文，节省带宽）。"""
    from core.knowledge_store import list_knowledge
    items = list_knowledge(category=category, limit=limit, offset=offset)
    return {"items": items}


@router.get("/knowledge/categories")
async def get_knowledge_categories():
    """按类别汇总条目数。"""
    from core.knowledge_store import get_categories
    return {"categories": get_categories()}


@router.get("/knowledge/{item_id}")
async def get_knowledge_item(item_id: int):
    """获取单条知识详情（含正文）。"""
    from core.knowledge_store import get_knowledge
    item = get_knowledge(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    return item


@router.get("/knowledge/{item_id}/download")
async def download_knowledge_item(item_id: int):
    """下载知识条目为 Markdown 文件。"""
    from core.knowledge_store import get_knowledge
    item = get_knowledge(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    filename = f"{item['category']}-{item['title']}.md"
    # 安全处理文件名
    safe_filename = "".join(c if c.isalnum() or c in "-_. " else "_" for c in filename)
    from starlette.responses import Response
    return Response(
        content=item["content"],
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
    )


@router.delete("/knowledge/{item_id}")
async def delete_knowledge_item(item_id: int):
    """删除单条知识。"""
    from core.knowledge_store import delete_knowledge
    ok = delete_knowledge(item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    return {"deleted": True, "id": item_id}
