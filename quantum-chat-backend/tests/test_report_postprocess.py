from core.report_postprocess import sanitize_report_markdown


def test_sanitize_report_markdown_removes_duplicate_metadata_and_preamble():
    raw = (
        "这是一个技术+市场混合的信息查询问题，我将并行调用三个子Agent进行全面调研。"
        "**数据截止日期**：2026-03-17 | **数据来源**：未声明 | **生成时间**：2026-03-17\n\n"
        "---\n\n"
        "我将并行调用三个子 Agent 获取信息。\n\n"
        "## 标题\n\n"
        "**数据截止日期**：2025-03-17 | **数据来源**：paper-researcher + news-market | **生成时间**：2026-03-17\n\n"
        "---\n\n"
        "正文\n"
    )

    sanitized = sanitize_report_markdown(raw, "2026-03-17")

    assert sanitized.count("**数据截止日期**") == 1
    assert "我将并行调用三个子 Agent" not in sanitized
    assert "这是一个技术+市场混合的信息查询问题" not in sanitized
    assert "## 标题" in sanitized
    assert "**数据来源**：未声明" in sanitized


def test_sanitize_report_markdown_normalizes_unusable_links_and_trailing_noise():
    raw = (
        "**数据截止日期**：2026-03-17 | **数据来源**：news-market | **生成时间**：2026-03-17\n\n"
        "---\n\n"
        "| 公司 | 来源 |\n"
        "|---|---|\n"
        "| A | [链接不可用] |\n\n"
        "- 本源量子：https://www.originqc.com.cn\n\n"
        "---调研完成，报告已保存至知识库（Knowledge ID: 12）。\n"
    )

    sanitized = sanitize_report_markdown(raw, "2026-03-17")

    assert "待核实（缺少可点击来源）" in sanitized
    assert "- [本源量子](https://www.originqc.com.cn)" in sanitized
    assert "报告已保存至知识库" not in sanitized


def test_sanitize_report_markdown_rewrites_star_ratings():
    raw = (
        "**数据截止日期**：2026-03-17 | **数据来源**：people-intel | **生成时间**：2026-03-17\n\n"
        "---\n\n"
        "| 机构 | 综合评级 |\n"
        "|---|---|\n"
        "| 本源量子 | ★★★★★ |\n"
    )

    sanitized = sanitize_report_markdown(raw, "2026-03-17")

    assert "★★★★★" not in sanitized
    assert "见原始数据" in sanitized
