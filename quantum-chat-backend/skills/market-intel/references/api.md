# market-intel API reference

> 只保留工具选择和关键参数。SKILL.md 已定义何时使用；这里专门说明怎么调用。

## 工具优先级

| 场景 | 优先工具 |
|---|---|
| 通用主题、公司、融资、政策检索 | `semantic_search_news` |
| 用户明确指定来源 | `query_news_db` |
| 最近/最新实时验证 | `recent_date_window` + `search_web` / `search_web_batch` |
| 双语、多角度、逐公司补漏 | `search_web_batch` |

## 1. `semantic_search_news`

默认主检索工具。

```python
semantic_search_news(query="量子计算 融资 投资", top_k=8)
```

- 适合：主题检索、公司检索、融资全景、政策全景
- 返回：标题、来源、发布时间、`source_url`、摘要、相关度

## 2. `query_news_db`

仅当用户明确指定来源时使用。

```python
query_news_db(source="量子大观", start_date="2026-01-01", end_date="2026-03-17")
```

- 不要拿它替代语义检索

## 3. `recent_date_window`

为“最近 / 近期 / 最新”类问题生成精确窗口，避免手算日期和写死年份。

```python
recent_date_window(days_back=90)
```

返回示例：

```json
{
  "start_date": "2025-12-17",
  "end_date": "2026-03-17",
  "days_back": 90
}
```

## 4. `search_web`

单条 Tavily 实时搜索。

```python
search_web(
    query="quantum computing startup funding",
    topic="finance",
    start_date="2025-12-17",
    end_date="2026-03-17",
    max_results=8,
    search_depth="basic"
)
```

关键参数：

| 参数 | 说明 |
|---|---|
| `topic` | `news` / `finance` / `general` |
| `start_date`,`end_date` | 精确过滤，优先于 `days` |
| `time_range` | 快捷窗口，如 `month` / `year` |
| `days` | 仅在没给精确日期时作为补充窗口 |
| `search_depth` | `basic` 更快，`advanced` 更深 |
| `include_answer` | 默认应关闭，减少噪声和延迟 |

规则：

- 最近/最新融资：优先用 `start_date` + `end_date`
- 不要对“最近融资”直接写 `days=365`
- Web 结果里的 `url` 是唯一可信链接来源

## 5. `search_web_batch`

并发执行多条 Tavily 查询，适合中英双语和逐公司补漏。

```python
search_web_batch(
    queries=[
        "量子计算 融资 投资",
        "quantum computing funding investment"
    ],
    topic="finance",
    start_date="2025-12-17",
    end_date="2026-03-17",
    max_results=5
)
```

规则：

- 查询列表保持短而具体，建议 2-4 条，最多 6 条
- 需要多家公司补漏时，也优先走 batch
- batch 结果按 query 分组返回，便于后续去重与合并

## 截止日期口径

- `数据截止日期` = 本次检索/验证完成日期
- `事件时间` = 新闻或融资事件本身发生日期
- 这两个字段不能混用
