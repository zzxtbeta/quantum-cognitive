import asyncio

import pytest

from api.deep_research import (
    _ReportMetadataNormalizer,
    _SSEEventEmitter,
    _normalize_report_metadata,
)


@pytest.mark.asyncio
async def test_sse_event_emitter_merges_contiguous_tokens():
    queue: asyncio.Queue[dict] = asyncio.Queue()
    emitter = _SSEEventEmitter(queue, token_flush_threshold=999)

    await emitter.emit({"type": "token", "agent": "quantum-orchestrator", "content": "你"})
    await emitter.emit({"type": "token", "agent": "quantum-orchestrator", "content": "好"})
    await emitter.flush_tokens()

    event = await queue.get()
    assert event["type"] == "token"
    assert event["content"] == "你好"


@pytest.mark.asyncio
async def test_sse_event_emitter_flushes_before_step_event():
    queue: asyncio.Queue[dict] = asyncio.Queue()
    emitter = _SSEEventEmitter(queue, token_flush_threshold=999)

    await emitter.emit({"type": "token", "agent": "quantum-orchestrator", "content": "报告"})
    await emitter.emit({"type": "step", "tool": "search_web", "content": "搜索网页"})

    first = await queue.get()
    second = await queue.get()

    assert first["type"] == "token"
    assert first["content"] == "报告"
    assert second["type"] == "step"


@pytest.mark.asyncio
async def test_sse_event_emitter_separates_different_agents():
    queue: asyncio.Queue[dict] = asyncio.Queue()
    emitter = _SSEEventEmitter(queue, token_flush_threshold=999)

    await emitter.emit({"type": "subagent_token", "agent": "paper-researcher", "content": "A"})
    await emitter.emit({"type": "subagent_token", "agent": "news-market", "content": "B"})
    await emitter.flush_tokens()

    first = await queue.get()
    second = await queue.get()

    assert first["agent"] == "paper-researcher"
    assert first["content"] == "A"
    assert second["agent"] == "news-market"
    assert second["content"] == "B"


def test_normalize_report_metadata_replaces_wrong_cutoff_date():
    content = (
        "**数据截止日期**：2025-03-17 | **数据来源**：news-market | **生成时间**：2026-03-17\n\n"
        "---\n\n"
        "## 标题\n"
    )

    normalized = _normalize_report_metadata(content, "2026-03-17")

    assert "**数据截止日期**：2026-03-17" in normalized
    assert "**数据来源**：news-market" in normalized
    assert normalized.count("**生成时间**：2026-03-17") == 1


def test_normalize_report_metadata_inserts_header_if_missing():
    normalized = _normalize_report_metadata("## 标题\n内容", "2026-03-17")

    assert normalized.startswith("**数据截止日期**：2026-03-17")
    assert "## 标题" in normalized


def test_report_metadata_normalizer_buffers_prefix_until_ready():
    normalizer = _ReportMetadataNormalizer("2026-03-17")

    first = normalizer.feed("**数据截止日期**：2025-03-17 | **数据来源**：news-market | ")
    second = normalizer.feed("**生成时间**：2026-03-17\n\n---\n\n## 标题")

    assert first == []
    assert len(second) == 1
    assert second[0].startswith("**数据截止日期**：2026-03-17")
