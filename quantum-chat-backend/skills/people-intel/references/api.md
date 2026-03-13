# 人才情报 — HTTP API 参考文档

> **可移植说明**：本文档描述 `people-intel` Skill 所依赖的 HTTP API 原始接口。
> 无论在哪个 Agent 框架中，只要能发起 HTTP 请求，即可直接调用。

---

## 认证

```
Header: X-API-Key: <QUANTUM_API_KEY>
Base URL: <QUANTUM_API_BASE_URL>   # 例如 https://www.gravaity.ai/datalake/api
```

> 路径规范：`base_url` 已包含 `/api`，接口统一写为 `/people/search`，不要再额外拼接 `/api`。

环境变量：`QUANTUM_API_BASE_URL`、`QUANTUM_API_KEY`

---

## 唯一接口：研究人员检索

### `GET {base_url}/people/search`

**用途**：检索量子领域研究人员，支持按机构或姓名查询。

### 请求参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `institution` | array\<string\> | 条件必填 | — | 机构名称关键词，支持多个（OR 逻辑），模糊匹配 |
| `name` | string | 条件必填 | — | 研究人员姓名，精确单人查询使用 |
| `page` | int | 否 | 1 | 页码 |
| `page_size` | int | 否 | 20 | 每页数量，最大 100 |

> ⚠️ **重要约束**：`institution` 和 `name` **至少传一个**。  
> 原始 HTTP API **不做强制校验**——两者均不传时，API 不报错，而是静默返回全量 490+ 条记录（其他机构的数据全部混入）。  
> Python 工具层（`search_researchers`）已在调用前加入参数校验，会在无参数时提前返回错误，**禁止在未确定查询目标的情况下调用此工具**。

### 两种使用模式

**模式 A：按机构检索（批量）**

```
GET {base_url}/people/search?institution=中国科学技术大学&institution=中科大&institution=USTC&page_size=50
```

- 同时传入多个 institution 关键词，后端按 OR 逻辑匹配，只要任一匹配即返回
- **必须同时传入全称、缩写、英文名**（数据库记录可能使用任一形式）
- 适合对某机构做全面人才普查
- 需要对比多个机构时，**并行发多次请求**（每机构一次），不要将多个机构混入同一次请求

**模式 B：按姓名检索（精确单人）**

```
GET {base_url}/people/search?name=潘建伟&page_size=5
```

- 输入研究人员姓名，返回该人的详细信息
- 适合对特定人物进行深度画像
- 查询多人时，**并行发多次请求**（每人一次），不要在 `name` 中拼接多个姓名

### 响应结构

```json
{
  "total": 48,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": 383,
      "name": "王浩华",
      "position": "博士生导师",
      "department": "物理学院",
      "email": "hhwang@zju.edu.cn",
      "research_areas": ["超导量子计算", "量子模拟"],
      "introduction": "现在职位：2010至今，浙江大学物理学院博士生导师。研究方向为超导量子计算和量子模拟实验研究，发表论文包括Nature、Science、PRL等90余篇，引用过万次...",
      "current_institution": {
        "id": 1,
        "name_cn": "浙江大学",
        "standardized_name": "浙江大学",
        "country": "中国"
      }
    }
  ]
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `total` | int | 符合条件的总记录数 |
| `items[*].name` | string | 研究人员姓名 |
| `items[*].position` | string | 职位名称（如"教授"、"博士生导师"、"研究员"） |
| `items[*].department` | string | 所在院系/部门（可能为 null） |
| `items[*].email` | string | 邮箱（可能为 null） |
| `items[*].research_areas` | array | 研究方向标签列表 |
| `items[*].introduction` | string | 完整个人简介（含教育经历、代表论文、荣誉；引用数/论文数等数值需从此字段文本中提取） |
| `items[*].current_institution` | object | 所在机构：`{id, name_cn, standardized_name, country}` |

> **注意**：`h_index`、`paper_count`、`citation_count` 无独立数值字段，如有记录会体现在 `introduction` 文本中（如"引用过万次"、"发表论文90余篇"）。分析时从 `introduction` 提取描述性信息，**不得虚构具体数值**。

---

## Python 工具对应关系

| Python 工具 | 调用方式 |
|------------|---------|
| `search_researchers(institution, name, page, page_size)` | `GET {base_url}/people/search` |
| `save_research_artifact(...)` | 子维度调用时仅记录日志；最终报告由 investment-research 编排者以 `category="investment-report"` 调用时写磁盘 |