# 论文研究 — HTTP API 参考文档

> **可移植说明**：本文档描述 `paper-research` Skill 所依赖的 HTTP API 原始接口。
> 无论在哪个 Agent 框架中，只要能发起 HTTP 请求，即可直接调用。

---

## 认证

所有请求需携带 API Key：

```
Header: X-API-Key: <QUANTUM_API_KEY>
Base URL: <QUANTUM_API_BASE_URL>   # 例如 http://47.110.226.140:8080
```

环境变量：`QUANTUM_API_BASE_URL`、`QUANTUM_API_KEY`

---

## 接口 1：获取领域树

### `GET {base_url}/gold/domains`

**用途**：获取完整领域分类树，用于确认 `domain_ids` 参数值。

**请求参数**：无

**响应示例**：
```json
[
  { "id": 1,  "name": "量子计算" },
  { "id": 10, "name": "超导量子计算" },
  { "id": 11, "name": "离子阱量子计算" },
  { "id": 12, "name": "光量子计算" },
  { "id": 20, "name": "量子通信" },
  { "id": 30, "name": "量子传感" }
]
```

**使用建议**：分析前先调用一次，获取目标领域的 id，再传入 `/papers` 接口。

---

## 接口 2：检索论文

### `GET {base_url}/papers`

**用途**：关键词检索或全库扫描，支持多维度过滤和排序。

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | 否 | 关键词，对标题/摘要/技术路线进行模糊搜索 |
| `domain_ids` | string | 否 | 领域 ID，逗号分隔，OR 逻辑（如 `"10,11,12"`） |
| `time_range` | string | 否 | 时间范围：`1y`（1年）/`6m`（6个月）/`3m`/`1m`，省略时不限时间 |
| `author_name` | string | 否 | 作者姓名关键词，部分匹配（不区分大小写），可与其他参数组合使用 |
| `page` | int | 否 | 页码，默认 1 |
| `page_size` | int | 否 | 每页数量，**最大 200**，全库扫描建议 80-100 |
| `sort_by` | string | 否 | 排序字段：`publish_date`（默认）/ `title` |
| `sort_order` | string | 否 | 排序方向：`desc`（默认）/ `asc` |
| `include_stats` | string | 否 | `"true"` 时在响应中附加统计汇总 |

### 响应结构

```json
{
  "total": 456,
  "pages": 5,
  "papers": [
    {
      "title": "Quantum Error Correction with Surface Codes",
      "authors": [
        { "name": "张三", "institution": "中国科学技术大学" }
      ],
      "publish_date": "2024-11-15",
      "research_problem": {
        "summary": "解决量子计算中的退相干问题",
        "detail": "在超导量子比特上实现容错量子计算，要求逻辑错误率低于物理错误率..."
      },
      "tech_route": {
        "summary": "表面码 + 超导量子比特",
        "detail": "采用 rotated surface code 方案，利用最近邻耦合结构..."
      },
      "key_contributions": [
        {
          "summary": "实现 99.5% 保真度的双量子比特门",
          "detail": "通过参数化微波脉冲优化，在 50 μs 相干时间内完成..."
        }
      ],
      "domains": [
        { "id": 10, "name": "超导量子计算" }
      ],
      "metrics": [
        { "name": "fidelity",       "value": "99.5%" },
        { "name": "qubit_count",    "value": "17" },
        { "name": "coherence_time", "value": "50μs" }
      ]
    }
  ],
  "statistics": {
    "domain_distribution": { "超导量子计算": 120, "离子阱": 80 },
    "yearly_counts": { "2024": 95, "2023": 110 }
  }
}
```

### 字段说明

| 字段 | 说明 |
|------|------|
| `research_problem.summary` | 1-2句简洁描述，适合快速浏览 |
| `research_problem.detail` | 完整问题背景，适合深度分析 |
| `tech_route.summary` | 技术路线关键词（用于分类统计） |
| `tech_route.detail` | 完整技术方案描述 |
| `metrics` | 关键指标数组，依论文而异（保真度/比特数/相干时间等） |

### 典型调用示例

```bash
# 全库最新论文
GET {base_url}/papers?page_size=100&sort_by=publish_date&sort_order=desc

# 超导领域近1年新论文
GET {base_url}/papers?domain_ids=10&time_range=1y&sort_by=publish_date&page_size=50

# 关键词专题检索
GET {base_url}/papers?query=量子纠错&sort_by=publish_date&time_range=1y&page_size=50

# 按作者姓名搜索（支持部分匹配）
GET {base_url}/papers?author_name=潘建伟&sort_by=publish_date&page_size=30
GET {base_url}/papers?domain_ids=10,11&author_name=Li&time_range=1y&page_size=50

# 多领域合并检索
GET {base_url}/papers?domain_ids=10,11,12&query=保真度&page_size=80

# 带统计的全局概览
GET {base_url}/papers?include_stats=true&page_size=50
```

### 分页策略

第一次调用时检查响应中的 `total` 字段，再决定是否需要翻页。
建议：`page_size=100`，先读前两页涉及最新或最相关始覆盖主要内容。

---

## Python 工具对应关系

| Python 工具 | 调用方式 |
|------------|---------|
| `get_domain_tree()` | `GET {base_url}/gold/domains` |
| `search_papers(query, domain_ids, time_range, ...)` | `GET {base_url}/papers`（单次调用） |
| `batch_scan_papers(domain_ids, pages_to_scan, depth)` | 循环调用 `GET {base_url}/papers`（多页） |
| `analyze_quantum_theme(theme, domain_ids)` | 先调用 `batch_scan_papers`，再做汇总分析 |
| `save_research_artifact(...)` | 写入本地文件，不调用外部 HTTP API |
