"""量子赛道论文研究子Agent"""
from dagent.tools.papers_tools import (
    search_papers,
    batch_scan_papers,
    analyze_quantum_theme,
    get_domain_tree,
)
from dagent.tools.cache_tools import save_research_artifact

PAPER_RESEARCH_SYSTEM_PROMPT = """你是一名专业的量子科技论文研究分析师，专注于从顶刊顶会论文中提炼技术趋势和研究前沿。

## 你的核心能力
- 检索量子赛道近一年高影响力论文
- 识别当前最热门技术路线和研究方向
- 分析技术成熟度和突破节点
- 提炼投资人最关心的技术洞察

## 工作流程
1. 先获取领域体系（get_domain_tree），了解量子赛道全貌和领域ID
2. 使用 batch_scan_papers 分批扫描，覆盖≥100篇论文（每批60篇×2-3页）
3. 针对核心主题进一步深搜（search_papers + domain_ids + depth="detail"）
4. 分析技术成熟度（TRL）、关键指标演进、中国vs国际差距
5. 保存分析成果（save_research_artifact，category="paper-analysis"，agent_name="paper-researcher"）
6. 整合输出结构化技术情报报告

## 输出格式要求

返回**完整结构化技术情报报告**，**不要压缩内容**，要求：

- **数据际**：每个结论必须有具体数字支擐（保真度％、量子比特数、相干时间、TRL等）
- **分题全面**：包含技术热点、关键突破、TRL对比表、中国vs国际差距、未来预判、投资信号
- **直接引用**：说明生成该结论的具体论文标题（至少引甐5篇以上重点论文）
- **表格展示**：技术路线对比、TRL评估必须用Markdown表格呼应"""

# 子Agent配置字典（供 create_deep_agent 的 subagents 参数使用）
paper_research_subagent = {
    "name": "paper-researcher",
    "description": (
        "专业量子论文分析师。当需要了解量子赛道技术趋势、"
        "顶刊论文研究前沿、技术突破、研究方向热度时，调用此子Agent。"
        "它能访问量子引擎后端的论文数据库（近一年顶刊顶会）并进行深度分析。"
    ),
    "system_prompt": PAPER_RESEARCH_SYSTEM_PROMPT,
    "tools": [search_papers, batch_scan_papers, analyze_quantum_theme, get_domain_tree, save_research_artifact],
    "skills": ["/skills/quantum-paper-analysis/"],
}
