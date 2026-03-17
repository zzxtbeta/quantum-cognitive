import json

from dagent.tools import cache_tools


def test_save_research_artifact_uses_category_defaults_and_request_context(monkeypatch):
    captured = {}

    def fake_save_knowledge(**kwargs):
        captured.update(kwargs)
        return {
            "id": 7,
            "agent_name": kwargs["agent_name"],
            "category": kwargs["category"],
            "title": kwargs["title"],
        }

    monkeypatch.setattr("core.knowledge_store.save_knowledge", fake_save_knowledge)

    tokens = cache_tools.set_knowledge_request_context("thread-1", "turn-1")
    try:
        payload = cache_tools.save_research_artifact(
            filename="",
            content="技术情报",
            category="paper-analysis",
            agent_name="unknown",
        )
    finally:
        cache_tools.reset_knowledge_request_context(tokens)

    parsed = json.loads(payload)

    assert parsed["agent"] == "paper-researcher"
    assert captured["agent_name"] == "paper-researcher"
    assert captured["thread_id"] == "thread-1"
    assert captured["turn_id"] == "turn-1"
    assert captured["title"] == "论文分析报告"


def test_persist_final_report_if_missing_saves_only_once(monkeypatch):
    saved = []

    monkeypatch.setattr("core.knowledge_store.find_knowledge_item", lambda **kwargs: None)

    def fake_save_knowledge(**kwargs):
        saved.append(kwargs)
        return {"id": 11, **kwargs}

    monkeypatch.setattr("core.knowledge_store.save_knowledge", fake_save_knowledge)

    content = (
        "**数据截止日期**：2026-03-17 | **数据来源**：paper-researcher + news-market | **生成时间**：2026-03-17\n\n"
        "---\n\n"
        "## 标题\n\n"
        "## 一\n\n"
        "长内容" * 500
    )

    record = cache_tools.persist_final_report_if_missing(
        message="量子云平台分析",
        content=content,
        thread_id="thread-2",
        turn_id="turn-2",
    )

    assert record["id"] == 11
    assert len(saved) == 1
    assert saved[0]["agent_name"] == "quantum-orchestrator"
    assert saved[0]["category"] == "investment-report"
    assert saved[0]["thread_id"] == "thread-2"
    assert saved[0]["turn_id"] == "turn-2"


def test_persist_final_report_if_missing_respects_existing_record(monkeypatch):
    monkeypatch.setattr(
        "core.knowledge_store.find_knowledge_item",
        lambda **kwargs: {"id": 5, "category": "investment-report"},
    )
    monkeypatch.setattr(
        "core.knowledge_store.save_knowledge",
        lambda **kwargs: (_ for _ in ()).throw(AssertionError("should not save")),
    )

    content = (
        "**数据截止日期**：2026-03-17 | **数据来源**：paper-researcher + news-market | **生成时间**：2026-03-17\n\n"
        "---\n\n"
        "## 标题\n\n"
        "## 一\n\n"
        "长内容" * 500
    )

    record = cache_tools.persist_final_report_if_missing(
        message="量子云平台分析",
        content=content,
        thread_id="thread-3",
        turn_id="turn-3",
    )

    assert record["id"] == 5
