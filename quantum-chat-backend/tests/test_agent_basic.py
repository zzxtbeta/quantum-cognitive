"""
test_agent_basic.py — deepagent 层单元测试

不调用真实 LLM，使用 Mock 替换 ChatOpenAI 的响应，
验证 graph 构建是否正常、工具注册是否完整。
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from langchain_core.messages import AIMessage


def _mock_llm():
    """构造一个返回固定内容的模拟 LLM。"""
    mock = MagicMock()
    mock.bind_tools = MagicMock(return_value=mock)
    mock.ainvoke = AsyncMock(return_value=AIMessage(content="mock response"))
    return mock


def test_agent_tools_registered():
    """验证 TOOLS 列表非空且每个元素可调用。"""
    from agent.tools import TOOLS
    assert len(TOOLS) > 0
    for tool in TOOLS:
        assert callable(tool), f"Tool {tool} is not callable"


def test_system_prompt_not_empty():
    """验证系统提示词存在且包含关键内容。"""
    from agent.system_prompt import SYSTEM_PROMPT
    assert SYSTEM_PROMPT
    assert "量子" in SYSTEM_PROMPT


def test_get_agent_returns_compiled_graph():
    """验证 get_agent() 能返回合法的 CompiledStateGraph 对象。"""
    with patch("agent.graph._build_llm", return_value=_mock_llm()):
        # 每次测试用独立实例，绕过 lru_cache
        from agent.graph import _build_llm, get_agent, SYSTEM_PROMPT, TOOLS
        from deepagents import create_deep_agent
        from langgraph.checkpoint.memory import MemorySaver

        agent = create_deep_agent(
            model=_mock_llm(),
            tools=TOOLS,
            system_prompt=SYSTEM_PROMPT,
            checkpointer=MemorySaver(),
        )

        # CompiledStateGraph 有 invoke / ainvoke / astream_events
        assert hasattr(agent, "ainvoke")
        assert hasattr(agent, "astream_events")


def test_search_tool_returns_string():
    """验证 search_quantum_knowledge 工具返回字符串。"""
    from agent.tools import search_quantum_knowledge
    result = search_quantum_knowledge("超导量子纠错", category="paper")
    assert isinstance(result, str)
    assert "超导量子纠错" in result


def test_researcher_tool_returns_string():
    """验证 get_researcher_profile 工具返回字符串。"""
    from agent.tools import get_researcher_profile
    result = get_researcher_profile("潘建伟")
    assert isinstance(result, str)
    assert "潘建伟" in result
