# 人才情报 — HTTP API 参考文档

> **可移植说明**：本文档描述 `people-intel` Skill 所依赖的 HTTP API 原始接口。
> 无论在哪个 Agent 框架中，只要能发起 HTTP 请求，即可直接调用。

---

## 认证

```
Header: X-API-Key: <QUANTUM_API_KEY>
Base URL: <QUANTUM_API_BASE_URL>   # 例如 http://47.110.226.140:8080
```

环境变量：`QUANTUM_API_BASE_URL`、`QUANTUM_API_KEY`

---

## 接口：研究人员检索

### `GET {base_url}/people/search`

**用途**：检索量子领域研究人员，支持按姓名、机构、研究方向、职位等多维度过滤。

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | 否 | 页码，默认 1 |
| `page_size` | int | 否 | 每页数量，最大 100，默认 20 |
| `name` | string | 否 | 模糊姓名匹配（支持中英文） |
| `institution` | string | 否 | **可多次传入实现 OR 逻辑**（见下方示例） |
| `research_area` | string | 否 | 研究方向关键词，模糊匹配 |
| `position` | string | 否 | 职位：`教授` / `研究员` / `副教授` / `博士后` 等 |
| `data_source` | string | 否 | 数据来源筛选：默认使用 `seed_data`（学术库，字段最完整） |

### `institution` 多值 OR 逻辑

`institution` 参数支持在同一请求中传多个值，结果为 **OR 合并**：

```
# URL 格式（多次重复参数名）
GET {base_url}/people/search?institution=中国科学技术大学&institution=清华大学&institution=浙江大学

# Python requests 写法
params = [
    ("institution", "中国科学技术大学"),
    ("institution", "清华大学"),
    ("institution", "浙江大学"),
    ("research_area", "量子纠错"),
    ("page_size", 40),
]
```

> ⚠️ **重要**：单次调用可覆盖多个机构，不需要为每个机构单独发请求。

### 响应结构

```json
{
  "total": 492,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": "abc123",
      "name": "潘建伟",
      "institution": "中国科学技术大学",
      "position": "教授",
      "research_areas": ["量子通信", "量子纠缠", "量子密钥分发"],
      "h_index": 82,
      "citation_count": 48000,
      "paper_count": 350,
      "bio_summary": "中国量子通信领域领军人物，主持多项国家重大专项..."
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 研究人员姓名 |
| `institution` | string | 所属机构 |
| `position` | string | 职位名称 |
| `research_areas` | array | 研究方向标签列表 |
| `h_index` | int | H 指数（可能为 null） |
| `citation_count` | int | 总引用次数（可能为 null） |
| `paper_count` | int | 论文数量（可能为 null） |
| `bio_summary` | string | 简介摘要（AI 生成，可能为 null） |

### 典型调用示例

```bash
# 按研究方向批量检索（主题扫描，推荐首选）
GET {base_url}/people/search?research_area=量子纠错&page_size=40&data_source=seed_data

# 多机构合并检索（一次覆盖主要高校）
GET {base_url}/people/search
  ?institution=中国科学技术大学
  &institution=清华大学
  &institution=浙江大学
  &institution=北京量子信息科学研究院
  &data_source=seed_data
  &page_size=40

# 姓名精确查找（获取某人详细信息）
GET {base_url}/people/search?name=潘建伟&page_size=1&data_source=seed_data

# 按机构过滤职位
GET {base_url}/people/search?institution=中国科学技术大学&position=教授&page_size=30&data_source=seed_data
```

### 调用预算建议

| 任务类型 | 推荐调用次数 |
|---------|------------|
| 主题全局扫描 | 1-2 次（多机构 OR 合并） |
| 某人详细信息 | 1 次（`name=<姓名>` 精确查找） |
| 完整人才图谱 | ≤ 5 次总调用 |

> 不要对每个人名逐一调用 `name=<姓名>`，先用主题 / 机构检索获取列表，再对核心人物调用详情。

---

## Python 工具对应关系

| Python 工具 | 调用方式 |
|------------|---------|
| `search_researchers(research_direction, institution, limit)` | `GET {base_url}/people/search`（`institution` 多值 OR） |
| `get_researcher_detail(name)` | `GET {base_url}/people/search?name=<name>&page_size=1` |
| `get_institution_researchers(institution, limit)` | `GET {base_url}/people/search?institution=<institution>` |
| `save_research_artifact(...)` | 写入本地文件，不调用外部 HTTP API |
