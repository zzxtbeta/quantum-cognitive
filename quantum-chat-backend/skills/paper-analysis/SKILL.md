---
name: paper-analysis
description: 用于量子赛道技术路线、论文证据、TRL 判断、赛道地图、知识图谱与赛道细分研究。用户询问某技术方向发展阶段、核心突破、论文依据、赛道地图、知识图谱、技术树、方向细分或研究热点时使用。优先使用论文数据库和领域树结构化数据，再用 Web 补足工程化与产业化信息。
---

# 论文分析

先用结构化数据建立技术地图，再用论文和 Web 证据补强，不要只靠一堆零散论文拼结论。

## 核心流程

1. 技术阶段/TRL/突破类问题：
   - 先用 `semantic_search_papers(...)`
   - 再用 `search_web(...)` 补工程化、商业化与公司信号
2. 赛道地图/知识图谱/赛道细分类问题：
   - 先调用 `fetch_domain_tree()`
   - 以领域树作为结构化主骨架
   - 再结合 `semantic_search_papers(...)` 和 `search_web(...)` 做细化与补全
3. 数据不足时，要明确说明“结构化领域数据/论文样本不足”，不要拿明显偏题论文硬凑。

## 操作规则

- `semantic_search_papers()` 默认 `top_k=5`，不要无故放大到 10。
- 问赛道地图、技术树、知识图谱时，默认先查 `/domains`，不要自己臆造层级。
- `/domains` 返回的是三层领域树：
  - `domain`
  - `direction`
  - `technology`
- 不能只根据 `/domains` 回答。领域树是主结构，最新动态、公司布局、工程化信号仍要用 Web 补充。
- 如果论文结果和问题明显不相关，要降级处理，不能放进主结论表。
- 优先保留有 DOI / arXiv 的论文条目。

## 输出要求

- 技术问题至少给出：
  - 当前阶段判断
  - 关键证据
  - 主要瓶颈
  - 未来 1-3 年演进方向
- 赛道地图/知识图谱问题至少给出：
  - 一级方向概览
  - 二级/三级技术细分
  - 代表研究方向或公司
  - 数据覆盖不足与 Web 补充说明
- 论文引用优先使用：
  - `https://doi.org/{doi}`
  - `https://arxiv.org/abs/{arxiv_id}`
- 保存成果时使用 `save_research_artifact(category="paper-analysis", agent_name="paper-researcher")`。

按需查看 [references/api.md](./references/api.md) 获取接口细节。
