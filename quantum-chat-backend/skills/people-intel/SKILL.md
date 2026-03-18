---
name: people-intel
description: 用于量子赛道机构、团队、关键人物、人才流动与机构覆盖判断的研究技能。用户询问中国/全球有哪些机构在做某方向、谁在带队、某机构是否在私有库中已覆盖、某人是否可在私有库深查、或需要区分私有库结论与 Web 补充时使用。
---

# 人才情报

先判断私有库是否覆盖，再决定是否继续走库内深查或切到 Web。

## 核心流程

1. 机构驱动的问题，先调用 `search_institutions()`。
2. 把 `search_institutions()` 视为“库内覆盖探测”，不要把它当成精确筛选器。
3. 命中机构后，再用 `search_researchers(institution=[...])` 深查团队和人物。
4. 直接问某个人时，优先 `search_researchers(name=...)`。
5. 私有库未命中或信息明显过薄时，再调用 `search_web(...)` 补充。
6. 最终输出里明确区分“私有库已覆盖”与“Web 补充”。

## 操作规则

- 不要从固定机构名单出发。
- 机构集合必须由用户问题、前序检索结果和私有库覆盖情况共同决定。
- 目前 `search_institutions()` 默认只做无参覆盖探测：
  - 使用 `page=1&page_size=20`
  - 不主动传 `keyword`、`country`、`institution_type`
- `search_researchers(name=...)` 用于精确人物查询。
- `search_researchers(institution=[...aliases...])` 只在你已经知道机构覆盖时使用。
- 如果私有库中没有该机构，要直接写明“私有库未命中，以下来自 Web”，不要暗示已经查过内部数据。

## 输出要求

- 需要时拆成以下部分：
  - `[私有库已覆盖]`
  - `[Web 补充]`
  - `[待核实]`
- 优先输出证据密度高的机构/团队表格，而不是泛泛叙述。
- 机构、团队、人物、流动事件分开写，避免混成一段长文。
- 保存成果时使用 `save_research_artifact(category="people-intel", agent_name="people-intel")`。

按需查看 [references/api.md](./references/api.md) 获取接口细节。
