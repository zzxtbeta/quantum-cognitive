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
    """验证 TOOLS 列表非空且每个元素是有效工具（Python 函数或 LangChain BaseTool）。"""
    from agent.tools import TOOLS
    assert len(TOOLS) > 0
    for tool in TOOLS:
        # 普通 Python 函数（callable），或 LangChain BaseTool（有 invoke 方法）
        assert callable(tool) or hasattr(tool, "invoke"), f"Tool {tool} is not a valid tool"


def test_system_prompt_not_empty():
    """验证系统提示词存在且包含关键内容。"""
    from agent.system_prompt import SYSTEM_PROMPT
    assert SYSTEM_PROMPT
    assert "量子" in SYSTEM_PROMPT


def test_get_agent_returns_compiled_graph():
    """验证 create_deep_agent 返回合法的 CompiledStateGraph（有 ainvoke / astream_events）。"""
    from agent.graph import SYSTEM_PROMPT, TOOLS
    from deepagents import create_deep_agent
    from langgraph.checkpoint.memory import MemorySaver
    from langchain_core.language_models import BaseChatModel
    from langchain_core.outputs import ChatResult, ChatGeneration

    # deepagents 在内部做 isinstance(model, BaseChatModel) 校验，
    # 必须使用真正继承 BaseChatModel 的测试桩而非 MagicMock。
    class _FakeLLM(BaseChatModel):
        @property
        def _llm_type(self) -> str:
            return "fake"

        def _generate(self, messages, stop=None, run_manager=None, **kwargs):
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content="mock"))])

        def bind_tools(self, tools, **kwargs):
            return self

    agent = create_deep_agent(
        model=_FakeLLM(),
        tools=TOOLS,
        system_prompt=SYSTEM_PROMPT,
        checkpointer=MemorySaver(),
    )

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
