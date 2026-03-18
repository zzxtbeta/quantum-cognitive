# 论文分析 API 参考

仅在需要接口细节时查看。

## 认证

- Header: `X-API-Key: <QUANTUM_API_KEY>`
- Base URL: `<QUANTUM_API_BASE_URL>`
- 运行时 base 已统一补到 `/api`，所以路径直接写 `/papers/search`、`/domains`。

---

## 1. 论文语义检索

### `POST {base_url}/papers/search`

用途：按自然语言查询量子论文。

请求体示例：

```json
{
  "query": "quantum computing cloud platform architecture",
  "top_k": 5
}
```

字段：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `query` | string | 是 | 自然语言查询 |
| `top_k` | int | 否 | 默认 5，建议优先 5 |

返回关键字段：

| 字段 | 说明 |
|---|---|
| `title` | 论文标题 |
| `abstract` | 摘要 |
| `authors` | 作者及机构 |
| `year` | 年份 |
| `venue_name` | 期刊/会议 |
| `doi` | DOI，可为空 |
| `arxiv_id` | arXiv ID，可为空 |
| `score` | 语义相关度 |

链接规则：

- 有 `doi`：`https://doi.org/{doi}`
- 无 DOI 但有 `arxiv_id`：`https://arxiv.org/abs/{arxiv_id}`
- 两者都没有：只保留 venue/year，不构造虚假链接

---

## 2. 领域树 / 赛道地图

### `GET {base_url}/domains?min_paper_count=0`

用途：获取三层领域体系的层级化树结构。适合“赛道地图 / 知识图谱 / 赛道细分”问题。

默认调用方式：

```text
GET /domains?min_paper_count=0
```

当前工作流规则：

- 默认直接查整棵树，不额外传 `level`、`parent_id`
- 不要自行预设筛选条件
- 先用它建立方向骨架，再结合论文和 Web 补充

返回结构示例：

```json
[
  {
    "id": 1,
    "name": "量子领域",
    "level": "domain",
    "parent_id": null,
    "paper_count": 1200,
    "children": [
      {
        "id": 2,
        "name": "量子计算",
        "level": "direction",
        "parent_id": 1,
        "paper_count": 800,
        "children": [
          {
            "id": 3,
            "name": "离子阱量子计算",
            "level": "technology",
            "parent_id": 2,
            "paper_count": 150
          }
        ]
      }
    ]
  }
]
```

关键字段：

| 字段 | 说明 |
|---|---|
| `id` | 稳定主键 |
| `name` | 领域名称 |
| `level` | `domain` / `direction` / `technology` |
| `parent_id` | 父节点 |
| `paper_count` | 论文数量 |
| `children` | 子节点列表 |

---

## 推荐调用顺序

1. 技术突破 / TRL：
   - `semantic_search_papers(...)`
   - `search_web(...)`
2. 赛道地图 / 知识图谱 / 赛道细分：
   - `fetch_domain_tree()`
   - `semantic_search_papers(...)`
   - `search_web(...)`
