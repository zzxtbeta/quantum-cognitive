# market-intel API reference

## Recommended tools

| Goal | Tool / API |
|---|---|
| 近期时间窗 | `recent_date_window` |
| 结构化新闻召回 | `semantic_search_news`, `query_news_db` |
| 外部来源补充 | `search_web`, `search_web_batch` |
| 中国新玩家补充 | `GET /companies/internal/promotions/latest` |

## 1. 近期时间窗

```python
recent_date_window(days_back=90)
```

适用于：
- 最近 / 近期 / 最新
- 近三个月融资
- 近阶段商业化进展

## 2. 结构化新闻库

```python
semantic_search_news(query="量子计算 融资 商业化", top_k=8)
query_news_db(source="量子位", start_date="2026-01-01", end_date="2026-03-17")
```

原则：
- 先用新闻库拿结构化结果
- 结果里已有 `source_url` 时，最终报告应保留

## 3. Web 搜索

```python
search_web(
    query="quantum computing startup funding",
    topic="finance",
    start_date="2025-12-17",
    end_date="2026-03-17",
    max_results=8,
)
```

```python
search_web_batch(
    queries=[
        "量子计算 融资 新公司",
        "quantum computing startup funding",
    ],
    topic="finance",
    start_date="2025-12-17",
    end_date="2026-03-17",
    max_results=5,
)
```

原则：
- 多角度问题优先 batch
- 有明确时间窗时优先 `start_date/end_date`
- 不要默认把“最近”放宽到全年

## 4. 中国新玩家 promotions feed

接口：

```http
GET /companies/internal/promotions/latest
```

示例返回结构：

```json
{
  "source_object_id": "...",
  "source_created_at": "...",
  "source_processed_at": "...",
  "total_companies": 2,
  "total_news_links": 3,
  "items": [
    {
      "company_id": 2281,
      "name": "杭州珑枢科技有限公司",
      "credit_code": "91330110MAK6XKT087",
      "legal_person_name": "池得閤",
      "promoted_at": "2026-03-17T14:26:53.789448",
      "news_count": 1,
      "news_items": [
        {
          "news_id": 4898,
          "title": "剑桥大学博士在杭州兴起量子风暴",
          "uri": "https://...",
          "website": "微信公众号湖畔自留田",
          "rtm": "2026-01-19"
        }
      ]
    }
  ]
}
```

如何使用：
- 把它当作“新玩家 / 早期信号补充源”
- 重点提取：
  - 公司名
  - 注册主体
  - 近期被报道次数
  - 最近一条新闻标题 / URL / 时间
- 最终写法建议：
  - 若新闻链接齐全，可列入 `新进入者 / 早期团队`
  - 若只有单条弱来源，可列入 `待核实弱信号`
