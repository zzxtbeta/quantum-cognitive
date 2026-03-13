# 市场情报 — HTTP API 参考文档

> **可移植说明**：本文档描述 `market-intel` Skill 所依赖的数据接口。
> 包含内部新闻数据库 API（需认证）和实时网络搜索（Tavily SDK）。

---

## 接口优先级

| 优先级 | 工具 | 适用场景 |
|--------|------|---------|
| **首选** | `semantic_search_news` | 大多数查询；关键词/概念/主题搜索 |
| **来源专项** | `query_news_db` | 仅当用户明确指定公众号来源（如"量子大观"） |
| **实时补充** | `search_web` | 交叉验证 DB 数据 / 最近30天新事件 / 获取真实 URL |

---

## 认证

```
Header: X-API-Key: <QUANTUM_API_KEY>
Base URL: <QUANTUM_API_BASE_URL>
```

> 路径规范：`base_url` 已包含 `/api`（例如 `https://www.gravaity.ai/datalake/api`），
> 因此接口统一写为 `/news`、`/news/search`，不要再额外拼接 `/api` 前缀。

Tavily（search_web 使用）：在 `.env` 中配置 `TAVILY_API_KEY`

---

## 接口 1：新闻语义搜索（**主要检索接口**）

### `POST {base_url}/news/search`

**用途**：基于语义向量检索，适用于所有关键词/概念性查询场景。这是大多数情况下的首选。

### 请求 Body

```json
{
  "query": "本源量子融资",
  "top_k": 8
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `query` | string | 语义查询文本，自然语言描述，越具体越好 |
| `top_k` | int | 返回条数，建议 5-15 |

### 响应结构

```json
{
  "data": [
    {
      "gold_news_id": "news_042",
      "title": "量子计算首次应用于金融风控场景",
      "source": "科技日报",
      "published_at": "2025-02-10",
      "source_url": "https://example.com/news/042",
      "summary": "某银行与量子科技公司合作，将量子优化算法应用于...",
      "tech_direction": "量子优化",
      "event_type": "产业化进展",
      "score": 0.912
    }
  ]
}
```

| 字段 | 说明 |
|------|------|
| `score` | 语义相关度，0-1，>0.75 为高度相关 |
| `source_url` | 新闻原文链接（可能为空） |
| `summary` | AI 生成摘要，是关键信息来源，优先读取 |

---

## 接口 2：新闻来源过滤检索（仅来源专项使用）

### `GET {base_url}/news`

**用途**：按指定来源公众号过滤新闻。

⚠️ **限制**：仅在用户明确指定来源时使用（如"查量子大观的新闻"）。通用查询请用接口 1。

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `source` | string | **是** | 来源名称模糊匹配，如 `量子大观`、`华夏时报` |
| `start_date` | string | 否 | 开始日期，格式 `yyyy-mm-dd` |
| `end_date` | string | 否 | 结束日期，格式 `yyyy-mm-dd` |
| `page` | int | 否 | 页码，默认 1 |
| `page_size` | int | 否 | 每页数量，建议 20-50 |

### 响应结构

```json
{
  "total": 142,
  "data": [
    {
      "id": "news_001",
      "title": "本源量子完成B轮融资，估值超百亿元",
      "source": "量子大观",
      "published_at": "2025-01-15T10:30:00",
      "source_url": "https://example.com/news/001",
      "summary": "本源量子宣布完成B轮融资，融资金额达15亿元人民币...",
      "event_type": "融资事件"
    }
  ]
}
```

### 典型调用示例

```bash
# 查某公众号近期报道（来源专项场景）
GET {base_url}/news?source=量子大观&page_size=30

# 某来源指定时间段
GET {base_url}/news?source=华夏时报&start_date=2025-01-01&end_date=2025-03-31
```

---

## 接口 3：实时网络搜索（search_web）

**用途**：交叉验证 DB 数据真实性、获取最新30天事件、补充 DB 收录延迟的内容。

### Python 工具调用

```python
search_web(
    query="本源量子2025融资轮次",
    topic="finance",   # "news" | "finance" | "general"
    days=180,          # 搜索最近 N 天
    max_results=8
)
```

| 参数 | 默认 | 说明 |
|------|------|------|
| `query` | — | 查询词，越具体越好 |
| `topic` | `"news"` | `news`=一般新闻, `finance`=融资/投资, `general`=政策/公司信息 |
| `days` | 30 | 搜索时间窗口（天） |
| `max_results` | 8 | 最多返回条数 |

### 返回字段

```json
{
  "answer": "综合摘要...",
  "results": [
    {
      "title": "...",
      "url": "...",
      "published_date": "2025-02-20",
      "content": "...",
      "score": 0.95
    }
  ]
}
```

> ⚠️ `url` 字段是真实来源链接，直接用于引用，不得修改或替换。

---

## Python 工具对应关系

| Python 工具 | 调用方式 |
|------------|---------|
| `query_news_db(source, start_date, end_date, page, page_size)` | `GET {base_url}/news` |
| `semantic_search_news(query, top_k)` | `POST {base_url}/news/search` |
| `search_web(query, topic, days, max_results)` | Tavily `client.search(topic=...)` |
| `save_research_artifact(...)` | 子维度（paper-analysis/people-intel/market-intel）调用时仅记录日志，不写磁盘；最终报告由 investment-research 编排者以 category=`investment-report` 调用时才写磁盘 |
