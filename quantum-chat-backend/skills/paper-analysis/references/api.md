# 论文研究 — HTTP API 参考文档

> **可移植说明**：本文档描述 `paper-analysis` Skill 所依赖的 HTTP API 原始接口。
> 无论在哪个 Agent 框架中，只要能发起 HTTP 请求，即可直接调用。

---

## 认证

```
Header: X-API-Key: <QUANTUM_API_KEY>
Base URL: <QUANTUM_API_BASE_URL>   # 例如 https://www.gravaity.ai/datalake/api
```

环境变量：`QUANTUM_API_BASE_URL`、`QUANTUM_API_KEY`

---

## 唯一接口：论文语义检索

### `POST {base_url}/papers/search`

**用途**：基于句向量相似度检索量子赛道顶刊顶会论文，支持中英文跨语言查询。直接用自然语言描述研究概念即可，无需预先确认领域 ID。

### 请求 Body

```json
{"query": "超导量子比特纠错", "top_k": 10}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | 是 | 自然语言查询，中英文均可，越具体越好 |
| `top_k` | int | 否 | 返回数量，默认 10，建议 5~15 |

**多角度查询策略**：单次 `top_k=10` 覆盖有限，复杂主题建议用不同角度发起 3-5 次查询：
- 中文专业术语（如"超导量子比特纠错"）
- 英文对应表达（如"superconducting qubit error correction"）
- 相关概念侧翼（如"surface code fault-tolerant threshold"）

每次查询独立返回 10 条，合并去重后得到更全面的覆盖。

### 响应结构

```json
{
  "data": [
    {
      "id": 338,
      "paper_id": 377,
      "title": "Quantum Error Correction with Surface Codes",
      "abstract": "We demonstrate fault-tolerant quantum computation...",
      "authors": [
        {"name": "张三", "affiliation": "中国科学技术大学"}
      ],
      "year": 2025,
      "doi": "10.1103/h6b3-y4vt",
      "venue_name": "Physical Review Letters",
      "arxiv_id": "2406.19448v2",
      "domain_ids": [5, 12],
      "score": 0.502
    }
  ]
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `score` | float | 语义相似度（0-1），>0.5 高度相关，<0.3 可能不相关 |
| `title` | string | 论文标题 |
| `abstract` | string | 摘要全文 |
| `authors` | array | `[{"name": "...", "affiliation": "..."}]` |
| `year` | int | 发表年份（整数，如 `2025`）；**无精确日期字段** |
| `venue_name` | string | 期刊/会议名称 |
| `doi` | string | DOI（可能为空） |
| `arxiv_id` | string | arXiv ID（可能为空） |
| `domain_ids` | array | 领域标签 ID 列表（整数） |

**链接构造规则**：
- `doi` 非空 → `https://doi.org/{doi}`（优先）
- `doi` 为空但 `arxiv_id` 非空 → `https://arxiv.org/abs/{arxiv_id}`
- 两者均为空 → 仅列 `venue_name` + `year`，**不构造任何链接**

### curl 示例

```bash
curl -X POST "{base_url}/papers/search" \
  -H "X-API-Key: $QUANTUM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "超导量子比特纠错", "top_k": 10}'
```

---

## Python 工具对应关系

| Python 工具 | 调用方式 |
|------------|---------|
| `semantic_search_papers(query, top_k)` | `POST {base_url}/papers/search` |
| `save_research_artifact(...)` | 子维度调用时仅记录日志；最终报告由 investment-research 编排者以 `category="investment-report"` 调用时写磁盘 |