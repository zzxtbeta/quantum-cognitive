# 人才情报 API 参考

仅在需要接口细节时查看。

## 认证

- Header: `X-API-Key: <QUANTUM_API_KEY>`
- Base URL: `<QUANTUM_API_BASE_URL>`
- 运行时 base 已统一补到 `/api`，所以路径直接写 `/institutions/search`、`/people/search`。

---

## 1. 机构摘要查询

### `GET {base_url}/institutions/search`

用途：作为机构研究的“库内覆盖探测入口”。

适用场景：

- 用户问某方向有哪些机构、团队、公司或组织
- 需要先判断私有库是否已覆盖某机构
- 需要决定后续是否继续调用 `search_researchers(...)`

默认调用方式：

```text
GET /institutions/search?page=1&page_size=20
```

当前工作流规则：

- 把它当成轻量覆盖探测，不当成精确筛选器。
- 正常研究流程里不要主动传 `keyword`、`institution_type`、`country`。
- 先看库里有哪些机构，再决定后续动作。

当前 agent 实际使用参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `page` | int | 否 | 默认 `1` |
| `page_size` | int | 否 | 默认 `20` |

主要返回字段：

| 字段 | 说明 |
|---|---|
| `institution_id` | 稳定主键 |
| `display_name` | 展示名 |
| `standardized_name` | 标准化名称 |
| `institution_type` / `institution_type_label` | 机构类型 |
| `country` / `region` | 地理信息 |
| `member_count` | 私有库已覆盖成员数 |
| `paper_count` | 私有库已覆盖论文数 |

决策规则：

- 命中机构：用其名称作为别名继续 `search_researchers(institution=[...])`
- 未命中机构：不要继续做无效私有库调用，直接切到 `search_web(...)`

---

## 2. 人员查询

### `GET {base_url}/people/search`

用途：查询已覆盖机构中的研究人员，或精确查询某个人。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `institution` | array<string> | 条件必填 | 机构别名列表，做模糊 OR 匹配 |
| `name` | string | 条件必填 | 精确人物查询 |
| `page` | int | 否 | 默认 `1` |
| `page_size` | int | 否 | 默认 `20`，最大 `100` |

重要约束：

- `institution` 和 `name` 至少提供一个
- 不要空参调用

主要返回字段：

| 字段 | 说明 |
|---|---|
| `name` / `name_en` | 研究人员姓名 |
| `position` | 职位 |
| `department` | 部门或单位 |
| `email` | 邮箱，可为空 |
| `research_areas` | 研究方向标签 |
| `introduction` | 长简介，需谨慎摘取 |
| `current_institution` | 当前机构对象 |

---

## 推荐决策树

1. 机构驱动任务：
   - `search_institutions()`
   - 命中后 `search_researchers(institution=[...])`
   - 未命中则 `search_web(...)`
2. 人物驱动任务：
   - `search_researchers(name=...)`
   - 未命中再 `search_web(...)`
3. 混合市场 + 人才任务：
   - 先识别私有库已覆盖机构
   - 最终输出里分开“私有库证据”和“Web 补充”
