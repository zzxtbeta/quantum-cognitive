---
name: quantum-paper-analysis
version: 1.0.0
description: 分析量子技术论文、顶刊研究前沿、技术成熟度（TRL）、关键突破识别。当用户问到量子论文进展、某技术路线的最新成果、TRL评估、论文数据库时使用。
license: MIT
metadata:
  scope: deep-research
  openclaw:
    requires:
      env:
        - QUANTUM_API_KEY
        - QUANTUM_API_BASE_URL
    primaryEnv: QUANTUM_API_KEY
    emoji: "📄"
---

# paper-research — 量子论文深度分析技能

## 使命
从量子论文数据库中提炼**投资级技术洞察**，而非表面摘要。
目标：让投资经理读完报告后能准确判断——哪个技术路线最有前景、谁在做、有多成熟。

---

## 核心领域ID索引（关键！调用 domain_ids 参数时使用）

先调用 `get_domain_tree()` 获取最新完整列表，以下为常见领域：

| 领域 | 关键词 | 说明 |
|------|--------|------|
| 超导量子计算 | qubit, transmon, superconducting | 工程化最成熟，国内最多论文 |
| 离子阱量子计算 | ion trap, trapped ion | 保真度最高，scalability挑战 |
| 光量子 | photonic, photon, boson sampling | 室温运行，通信/计算双路径 |
| 量子纠错 | error correction, surface code, logical qubit | 容错计算的核心 |
| 量子通信/QKD | quantum key distribution, QKD | 中国国际领先方向 |
| 量子传感 | quantum sensing, magnetometer, gravimeter | 最近商业化 |
| 中性原子 | neutral atom, Rydberg | 2023-2024年爆发式增长 |
| 硅量子点 | silicon spin qubit, quantum dot | 半导体工艺兼容的长期路线 |

---

## 分析工作流策略

### 第一步：领域定位
先获取领域分类树（`/gold/domains`），确认目标赛道的 `domain_ids`，建立领域 ID 到名称的映射。

> 📖 接口参数详见 `references/api.md`。

### 第二步：批量扫描（核心，不要只看20篇）

**覆盖策略由用户问题决定：**

- **用户关注特定赛道**（"超导量子最新进展"）→ 按 `domain_ids` 分领域深扫，每个方向至少 60 篇，按发布日期降序
- **用户做全面研判**（"全面扫描量子赛道"）→ 全库分页扫描，覆盖近两年，按发布日期排序
- **用户关注特定主题**（"量子纠错最新进展"）→ 关键词检索，重点读取 `research_problem` 和 `key_contributions` 字段
- **用户问特定科学家**（"潘建伟最新论文"）→ 按 `author_name` 检索，无需全库扫描

### 第三步：专题深挖

针对第二步发现的高价值方向，用更精确的关键词或作者名做针对性检索，深度读取 `tech_route`、`key_contributions`、`metrics` 字段。

### 第四步：保存并输出

完成分析后保存为 `paper-analysis` 类别的 artifact，文件名含主题和日期。

---

## 深度提取策略

### research_problem 字段解读
- `summary`：一句话描述（适合快速分类）
- `detail`：完整问题背景（用 `depth="detail"` 获取）
- 重点关注：提到"商业化"、"工程化"、"规模化"的论文——这些是TRL较高的信号

### 论文字段速查
| 字段 | 说明 | 用途 |
|------|------|------|
| `venue_name` | 发表期刊/会议全称（如 "Physical Review Letters"、"Nature"） | 判断权威性；引用时作为来源 |
| `doi` | DOI 标识符 | 原文链接：`https://doi.org/{doi}` |
| `arxiv_id` | arXiv 预印本 ID | 预印本链接：`https://arxiv.org/abs/{arxiv_id}` |
| `authors` | 作者数组，含 `name` 和 `affiliation` | 机构分析、人才追踪 |
| `domains` | 领域对象数组 `[{id, name, level}]` | 直接读 `d.name`，**无需**再查 `/gold/domains` |
| `research_problem` | 研究问题 `{summary, detail}` | 快速分类和深度分析 |
| `tech_route` | 技术路线 `{summary, detail}` | 路线判断和竞争分析 |
| `key_contributions` | 关键贡献数组 | 突破点和数值指标 |
| `metrics` | 定量指标（qubit_count, fidelity 等） | 硬信号，TRL判断依据 |

### tech_route 字段解读
- 关键词识别：超导 vs 离子阱 vs 中性原子 = 不同投资逻辑
- 注意材料体系：铌、铝 vs BEC vs 光子波导 → 供应链依赖不同
- "混合"路线（如超导+光子互连）是2024-2025年新兴方向

### key_contributions 字段解读
- 有具体数字的贡献是硬信号（"99.5% 保真度"、"1000量子比特"）
- 对比历史最佳（"首次突破..."、"刷新记录..."）
- metrics 字段：寻找 qubit_count / fidelity / coherence_time / error_rate

---

## 技术成熟度（TRL）判断规则

| TRL | 论文信号 | 投资含义 |
|-----|----------|---------|
| 1-3 | "理论提出"、"首次演示"、单量子比特实验 | 天使/种子，10年周期 |
| 4-5 | "小规模验证"、"10量子比特以上"、保真度>99% | Pre-A/A轮 |
| 6-7 | "系统集成"、"量子优势实验"、纠错演示 | A/B轮窗口 |
| 8-9 | "商业部署"、"客户验证"、重复性保证 | 成长期 |

---

📖 **需要完整 HTTP API 参数时，调用 `get_skill_file('quantum-paper-analysis', 'references/api.md')` 获取。**

---

## 输出模板（严格按此格式）

```markdown
## 量子赛道技术情报报告

### 数据覆盖
- 扫描论文：X 篇（共X篇，覆盖率约X%）
- 扫描领域：[列出domain_ids]
- 分析深度：detail级别

### 技术路线竞争格局
| 技术路线 | 论文数量 | 代表机构 | 领先成果 | TRL评估 | 趋势 |
|---------|---------|---------|---------|---------|------|
| 超导 | X | 中科大/IBM/Google | X量子比特+XX%保真度 | 6-7 | ↑ |
| 离子阱 | X | IonQ/Oxford | XX分钟相干时间 | 6 | → |
| ... | | | | | |

### 2024-2025关键技术突破
1. **[成果名称]**
   - 突破点：具体数值指标
   - 后续影响：对技术路线的意义
   - 来源：作者等, *期刊名*, 年份 — [DOI链接或arXiv链接]

### 研究主题热度分析
[按出现频次排序的研究主题，含比例]

### 中国vs国际对比
- 中国优势领域：[基于作者机构统计]
- 差距领域：[基于论文质量/数量]

### 投资关注信号
- 🔥 最热赛道：[基于论文增长速度]
- 💡 技术拐点：[即将商业化的关键指标]
- ⚠️ 风险点：[技术路线竞争/可能被替代]

### 引用论文
> 报告中提到的每篇论文均需在此列出，格式：
> `[N] 作者等, "论文标题", *期刊/会议名*, 年份. DOI: https://doi.org/{doi} 或 arXiv: https://arxiv.org/abs/{arxiv_id}`
>
> 若论文无 DOI 也无 arxiv_id，则仅列 venue_name + 年份。
```
