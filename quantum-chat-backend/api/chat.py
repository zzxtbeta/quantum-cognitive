"""
Chat 业务端点。

POST /chat/stream  — SSE 流式输出（主接口）
POST /chat         — 同步完整输出（调试/简单集成用）
GET  /chat/history/{thread_id}  — 获取历史消息
DELETE /chat/thread/{thread_id} — 清空会话记忆
"""
import asyncio
import json
import logging
from typing import Optional, AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent import get_agent, ensure_fresh_agent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


# ─── 请求 / 响应模型 ────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default"
    system_prompt: Optional[str] = None  # 支持运行时覆盖 system prompt


class HistoryMessage(BaseModel):
    role: str
    content: str


class HistoryResponse(BaseModel):
    thread_id: str
    messages: list[HistoryMessage]


# ─── SSE 生成器 ────────────────────────────────────────────────────────────────

async def _sse_token_stream(
    message: str,
    thread_id: str,
) -> AsyncGenerator[str, None]:
    """
    将 LangGraph astream(stream_mode="messages") 转换为 SSE data 行。

    stream_mode="messages" 是 LangGraph 官方推荐的流式方式，每个 chunk 为
    (BaseMessage, metadata)。只输出 AI 消息中的文字内容，工具调用不输出。

    事件格式：
      data: {"type": "token",  "content": "..."}
      data: {"type": "done"}
      data: {"type": "error",  "content": "..."}
    """
    from langchain_core.messages import AIMessageChunk

    agent = get_agent()
    config = {"configurable": {"thread_id": thread_id}}
    input_payload = {"messages": [{"role": "user", "content": message}]}

    try:
        async for chunk, metadata in agent.astream(
            input_payload,
            config=config,
            stream_mode="messages",
        ):
            # 只输出 AI 内容 token，跳过工具中间过程
            if (
                isinstance(chunk, AIMessageChunk)
                and chunk.content
                and not chunk.additional_kwargs.get("tool_calls")
            ):
                payload = json.dumps(
                    {"type": "token", "content": chunk.content},
                    ensure_ascii=False,
                )
                yield f"data: {payload}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    except asyncio.CancelledError:
        logger.info("SSE 流被客户端中断 thread_id=%s", thread_id)
    except Exception as exc:
        logger.exception("SSE 流异常 thread_id=%s: %s", thread_id, exc)
        payload = json.dumps({"type": "error", "content": str(exc)}, ensure_ascii=False)
        yield f"data: {payload}\n\n"


# ─── 端点 ───────────────────────────────────────────────────────────────────────

@router.post("/stream")
async def chat_stream(req: ChatRequest):
    """SSE 流式对话（前端主要接口）。"""
    await ensure_fresh_agent()  # 如果 skills 已更新则热重载
    return StreamingResponse(
        _sse_token_stream(req.message, req.thread_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # 关闭 nginx 缓冲
        },
    )


@router.post("")
async def chat_sync(req: ChatRequest):
    """同步完整对话，返回最终 AI 消息（调试 / 集成测试用）。"""
    await ensure_fresh_agent()  # 如果 skills 已更新则热重载
    agent = get_agent()
    config = {"configurable": {"thread_id": req.thread_id}}
    input_payload = {"messages": [{"role": "user", "content": req.message}]}

    result = await agent.ainvoke(input_payload, config=config)
    last_msg = result["messages"][-1]
    return {"role": "assistant", "content": last_msg.content, "thread_id": req.thread_id}


@router.get("/history/{thread_id}", response_model=HistoryResponse)
async def chat_history(thread_id: str):
    """获取指定线程的完整历史消息。"""
    agent = get_agent()
    config = {"configurable": {"thread_id": thread_id}}

    try:
        state = await agent.aget_state(config)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Thread not found: {exc}")

    messages: list[HistoryMessage] = []
    for msg in state.values.get("messages", []):
        role = getattr(msg, "type", None) or msg.__class__.__name__.replace("Message", "").lower()
        # LangChain message types: HumanMessage → "human", AIMessage → "ai"
        role_map = {"human": "user", "ai": "assistant", "system": "system"}
        messages.append(HistoryMessage(
            role=role_map.get(role, role),
            content=msg.content if hasattr(msg, "content") else str(msg),
        ))

    return HistoryResponse(thread_id=thread_id, messages=messages)


@router.delete("/thread/{thread_id}")
async def clear_thread(thread_id: str):
    """清空指定线程的所有记忆（从 SQLite checkpointer 中重置）。"""
    agent = get_agent()
    config = {"configurable": {"thread_id": thread_id}}

    try:
        # 通过写入空状态来重置线程
        await agent.aupdate_state(config, {"messages": []})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {"status": "cleared", "thread_id": thread_id}
