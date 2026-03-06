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
import uuid
from typing import AsyncGenerator, Any, Optional

from fastapi import APIRouter, HTTPException
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
    "query_news_db": "查询新闻数据库",
    "semantic_search_news": "语义检索新闻",
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

# ─── 进度回调处理器 ─────────────────────────────────────────────────────────────

class _ProgressHandler(AsyncCallbackHandler):
    """将工具调用事件转发到 asyncio.Queue，供 SSE 流消费。"""

    def __init__(self, queue: asyncio.Queue) -> None:
        super().__init__()
        self._queue = queue

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

        # 识别子Agent 启动
        if tool_name == "task":
            try:
                inp = json.loads(input_str) if isinstance(input_str, str) else input_str
                subagent = inp.get("subagent_type", "subagent")
                desc = (inp.get("description") or "")[:100]
                label = _SUBAGENT_LABELS.get(subagent, f"{subagent}")
                await self._queue.put({
                    "type": "agent_start",
                    "agent": subagent,
                    "content": f"{label} 启动中…{desc[:60]}{'…' if len(desc) > 60 else ''}",
                })
                return
            except Exception:
                pass

        # 其他工具调用（排除文件系统噪声）
        _FILE_OPS = {"write_file", "read_file", "edit_file", "ls", "glob", "grep", "write_todos"}
        if tool_name in _FILE_OPS:
            return  # 不暴露内部文件操作

        label = _TOOL_LABELS.get(tool_name, tool_name)
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
        await self._queue.put({"type": "step_done"})


# ─── SSE 生成器 ────────────────────────────────────────────────────────────────

async def _sse_stream(message: str, thread_id: str) -> AsyncGenerator[str, None]:
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

    progress_handler = _ProgressHandler(event_queue)
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
        try:
            async for chunk, metadata in agent.astream(
                input_payload,
                config=config,
                stream_mode="messages",
            ):
                if not isinstance(chunk, AIMessageChunk):
                    continue
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
                yield _sse_event({"type": "done", "thread_id": thread_id})
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
    logger.info("[deep/stream] thread=%s | msg=%s", thread_id, req.message[:80])
    return StreamingResponse(
        _sse_stream(req.message, thread_id),
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
    """清空 DeepAgent 会话记忆"""
    agent = get_deep_agent()
    config = {"configurable": {"thread_id": thread_id}}
    try:
        await agent.aupdate_state(config, {"messages": []})
    except Exception:
        pass
    return {"thread_id": thread_id, "cleared": True}
