"""
test_api_chat.py — Chat API 端点集成测试

使用 Mock 替换 get_agent() 返回值，避免真实 LLM 调用，
重点验证路由、请求解析、SSE 格式正确性。
"""
import json
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient, ASGITransport
from langchain_core.messages import AIMessage, HumanMessage


# ─── Mock agent ────────────────────────────────────────────────────────────────

def _make_mock_agent(reply: str = "这是模拟回复"):
    """构造一个模拟 deepagent CompiledStateGraph。"""
    agent = MagicMock()

    # ainvoke: 返回带 messages 的状态字典
    agent.ainvoke = AsyncMock(
        return_value={"messages": [HumanMessage(content="test"), AIMessage(content=reply)]}
    )

    # astream_events: 产生 on_chat_model_stream 事件
    async def _fake_stream_events(input_payload, config, version):
        chunk = MagicMock()
        chunk.content = reply
        yield {"event": "on_chat_model_stream", "data": {"chunk": chunk}}

    agent.astream_events = _fake_stream_events

    # aget_state: 返回带 messages 的历史状态
    state = MagicMock()
    state.values = {
        "messages": [
            HumanMessage(content="你好"),
            AIMessage(content=reply),
        ]
    }
    agent.aget_state = AsyncMock(return_value=state)

    # aupdate_state: 清空操作
    agent.aupdate_state = AsyncMock(return_value=None)

    return agent


# ─── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_chat_sync_returns_ai_message():
    """POST /chat 应返回 assistant 角色的回复。"""
    mock_agent = _make_mock_agent("量子纠缠是两个粒子状态相关联的现象。")

    with patch("api.chat.get_agent", return_value=mock_agent):
        async with AsyncClient(
            transport=ASGITransport(app=__import__("main").app),
            base_url="http://test",
        ) as client:
            response = await client.post(
                "/chat",
                json={"message": "什么是量子纠缠？", "thread_id": "test-thread"},
            )

    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "assistant"
    assert "量子纠缠" in data["content"]
    assert data["thread_id"] == "test-thread"


@pytest.mark.asyncio
async def test_chat_stream_sse_format():
    """POST /chat/stream 响应应包含合法 SSE data 行，最后为 done 事件。"""
    mock_agent = _make_mock_agent("流式回复内容")

    with patch("api.chat.get_agent", return_value=mock_agent):
        async with AsyncClient(
            transport=ASGITransport(app=__import__("main").app),
            base_url="http://test",
        ) as client:
            response = await client.post(
                "/chat/stream",
                json={"message": "量子计算的优势？", "thread_id": "stream-thread"},
            )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")

    body = response.text
    lines = [l for l in body.split("\n") if l.startswith("data:")]
    assert len(lines) >= 2, "SSE 应至少有 token 行和 done 行"

    # 最后一行应是 done
    last = json.loads(lines[-1].replace("data: ", ""))
    assert last["type"] == "done"

    # token 行格式校验
    token_lines = [l for l in lines if "token" in l]
    assert len(token_lines) >= 1
    for tl in token_lines:
        parsed = json.loads(tl.replace("data: ", ""))
        assert parsed["type"] == "token"
        assert "content" in parsed


@pytest.mark.asyncio
async def test_chat_history_returns_messages():
    """GET /chat/history/{thread_id} 应返回包含角色和内容的消息列表。"""
    mock_agent = _make_mock_agent()

    with patch("api.chat.get_agent", return_value=mock_agent):
        async with AsyncClient(
            transport=ASGITransport(app=__import__("main").app),
            base_url="http://test",
        ) as client:
            response = await client.get("/chat/history/my-thread")

    assert response.status_code == 200
    data = response.json()
    assert data["thread_id"] == "my-thread"
    assert isinstance(data["messages"], list)
    assert len(data["messages"]) > 0
    for msg in data["messages"]:
        assert "role" in msg
        assert "content" in msg


@pytest.mark.asyncio
async def test_clear_thread_returns_cleared_status():
    """DELETE /chat/thread/{thread_id} 应返回 cleared 状态。"""
    mock_agent = _make_mock_agent()

    with patch("api.chat.get_agent", return_value=mock_agent):
        async with AsyncClient(
            transport=ASGITransport(app=__import__("main").app),
            base_url="http://test",
        ) as client:
            response = await client.delete("/chat/thread/my-thread")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "cleared"
    assert data["thread_id"] == "my-thread"
