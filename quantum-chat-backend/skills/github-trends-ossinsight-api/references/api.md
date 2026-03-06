# GitHub趋势分析 — HTTP API 参考文档

> **可移植说明**：本文档描述 `github-trends-ossinsight-api` Skill 所依赖的 OSS Insight 公开 API。
> 无需认证，任何环境均可直接调用。

---

## OSS Insight API

**Base URL**: `https://api.ossinsight.io/v1`
**认证**: 无需 API Key（公开接口）
**文档**: https://ossinsight.io/docs/api

---

## 接口：GitHub 趋势仓库

### `GET https://api.ossinsight.io/v1/trends/repos/`

**用途**：获取 GitHub 上近期增长最快的仓库列表，用于发现量子计算开源生态动态。

### 请求参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `language` | string | 编程语言过滤，如 `Python`、`Rust`、`Julia` |
| `period` | string | 时间周期：`daily` / `weekly` / `monthly` |

### 响应结构

```json
{
  "data": [
    {
      "repo_id": 123456,
      "repo_name": "Qiskit/qiskit",
      "description": "An open-source SDK for working with quantum computers",
      "stars": 4200,
      "forks": 890,
      "star_increment": 320,
      "language": "Python",
      "topics": ["quantum-computing", "qiskit", "ibm"],
      "contributor_count": 280,
      "last_pushed": "2025-02-28"
    }
  ]
}
```

### 字段说明

| 字段 | 说明 |
|------|------|
| `star_increment` | 统计周期内新增 Star 数，**关键趋势指标** |
| `topics` | GitHub Topics 标签，用于判断是否属于量子领域 |
| `contributor_count` | 贡献者数量，反映社区活跃度 |

### 典型调用示例

```bash
# 获取本周 Python 趋势仓库
GET https://api.ossinsight.io/v1/trends/repos/?language=Python&period=weekly

# 获取本月全语言趋势
GET https://api.ossinsight.io/v1/trends/repos/?period=monthly

# 每日趋势（最新动态）
GET https://api.ossinsight.io/v1/trends/repos/?period=daily
```

### 量子相关仓库过滤

API 不支持按 topic 过滤，需在结果中筛选量子相关仓库：

```python
quantum_keywords = [
    "quantum", "qiskit", "cirq", "pennylane", "qml",
    "qpu", "qubit", "quantum-computing", "quantum-circuit"
]

quantum_repos = [
    repo for repo in response["data"]
    if any(kw in (repo.get("repo_name", "") + 
                  repo.get("description", "") + 
                  " ".join(repo.get("topics", []))).lower()
           for kw in quantum_keywords)
]
```

---

## Python 工具对应关系

| Python 工具 | 调用方式 |
|------------|---------|
| `get_github_trends(language, period)` | `GET https://api.ossinsight.io/v1/trends/repos/` |
