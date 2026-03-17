from dagent.subagents.news_agent import NEWS_MARKET_SYSTEM_PROMPT


def test_news_market_prompt_requires_row_level_urls():
    assert "不要写“news-market 子Agent没有具体URL”" in NEWS_MARKET_SYSTEM_PROMPT
    assert "没链接的事实不能进“已验证主表”" in NEWS_MARKET_SYSTEM_PROMPT
