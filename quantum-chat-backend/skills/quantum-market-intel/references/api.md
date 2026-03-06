# 市场情报 — HTTP API 参考文档

> **可移植说明**：本文档描述 `news-market` Skill 所依赖的数据接口。
> 包含内部新闻数据库 API（需认证）和 Tavily 实时搜索 API（需单独 key）。

---

## 接口优先级

| 优先级 | 接口 | 适用场景 |
|--------|------|---------|
| **首选** | 内部新闻 DB（关键词检索） | 已知关键词、时间范围查询 |
| **次选** | 内部新闻 DB（语义搜索） | 模糊概念、意义相似查询 |
| **降级** | Tavily 实时搜索 | DB 无结果 / 需要最新24小时信息 |

---

## 认证

### 内部新闻 DB
```
Header: X-API-Key: <QUANTUM_API_KEY>
Base URL: <QUANTUM_API_BASE_URL>
```

### Tavily（降级使用）
```python
from tavily import TavilyClient
client = TavilyClient(api_key=TAVILY_API_KEY)
```

---

## 接口 1：新闻关键词检索

### `GET {base_url}/api/news`

**用途**：按关键词、时间范围、来源等过滤检索内部新闻数据库。

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | 否 | 关键词过滤（标题/摘要匹配） |
| `start_date` | string | 否 | 开始日期，格式 `yyyy-mm-dd` |
| `end_date` | string | 否 | 结束日期，格式 `yyyy-mm-dd` |
| `source` | string | 否 | 来源名称筛选，如 `量子大观`、`新华社` |
| `sort_by` | string | 否 | 排序：`published_at`（默认）/ `importance_score` |
| `page` | int | 否 | 页码，默认 1 |
| `page_size` | int | 否 | 每页数量，**最大 100** |

### 响应结构

```json
{
  "total": 9243,
  "data": [
    {
      "id": "news_001",
      "title": "本源量子完成B轮融资，估值超百亿元",
      "source": "量子大观",
      "published_at": "2025-01-15T10:30:00",
      "source_url": "https://example.com/news/001",
      "summary": "本源量子宣布完成B轮融资，融资金额达15亿元人民币...",
      "tags": ["融资", "量子计算"],
      "mentioned_entities": ["本源量子", "中科院", "安徽省政府"]
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `tags` | array\|null | 新闻标签，如 `["融资", "量子计算"]` |
| `mentioned_entities` | array | 新闻中提及的公司/机构/人物 |

### 典型调用示例

```bash
# 近3个月融资相关新闻
GET {base_url}/api/news?keyword=融资&start_date=2024-10-01&page_size=50

# 特定公司动态
GET {base_url}/api/news?keyword=本源量子&sort_by=published_at&page_size=30

# 政策相关新闻
GET {base_url}/api/news?keyword=量子+政策&start_date=2024-01-01&page_size=50

# 最新市场动态（最近1个月）
GET {base_url}/api/news?start_date=<30天前>&sort_by=importance_score&page_size=40
```

---

## 接口 2：新闻语义搜索

### `POST {base_url}/api/news/search`

**用途**：基于语义向量检索，适用于概念相似但关键词不精确的场景。

### 请求 Body

```json
{
  "query": "量子计算商业化进展",
  "top_k": 8
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `query` | string | 语义查询文本（自然语言描述即可） |
| `top_k` | int | 返回条数，建议 5-10 |

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
      "tags": ["量子优化", "金融"],
      "score": 0.912
    }
  ]
}
```

| 字段 | 说明 |
|------|------|
| `score` | 语义相关度，0-1，>0.75 为高度相关，>0.85 为非常相关 |

### 何时使用语义搜索

- 关键词检索（接口1）返回 < 5 条结果时
- 查询概念模糊，如"量子对国家安全的影响"
- 需要发现关键词无法覆盖的相关内容

---

## 接口 3：Tavily 实时搜索（降级方案）

**用途**：当内部 DB 无法满足需求时，调用 Tavily 搜索互联网实时内容。

### 使用条件（满足一条即可降级）
1. 内部 DB 搜索结果 < 3 条
2. 用户明确要求最新24小时信息
3. 需要非量子垂直媒体的主流媒体视角

### Python 调用示例

```python
from tavily import TavilyClient

client = TavilyClient(api_key=TAVILY_API_KEY)

# 新闻搜索
result = client.search(
    query="量子计算融资 2025",
    search_depth="basic",
    topic="news",
    days=30,
    max_results=5
)

# 结构化问題解析
result = client.search(
    query="中国量子通信政策 2025",
    search_depth="advanced",
    max_results=3
)
```

### Tavily 响应关键字段

```json
{
  "results": [
    {
      "title": "...",
      "url": "...",
      "content": "...",    
      "score": 0.95,
      "published_date": "2025-02-20"
    }
  ]
}
```

---

## Python 工具对应关系

| Python 工具 | 调用方式 |
|------------|---------|
| `query_news_db(keyword, start_date, end_date, ...)` | `GET {base_url}/api/news` |
| `semantic_search_news(query, top_k)` | `POST {base_url}/api/news/search` |
| `search_quantum_news(query)` | Tavily `client.search(topic="news")` |
| `search_quantum_funding(query)` | Tavily 搜索，针对融资关键词优化 |
| `search_quantum_policy(query)` | Tavily 搜索，针对政策关键词优化 |
| `search_quantum_companies(query)` | Tavily 搜索，针对公司动态优化 |
| `save_research_artifact(...)` | 写入本地文件，不调用外部 HTTP API |
