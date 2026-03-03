"""
量子科技投资认知助手系统提示词。

结构：
  soul.md          —— agent 人格基础层（核心原则、边界、风格、记忆机制）
  DOMAIN_PROMPT    —— 量子赛道专业上下文（角色定位、回答风格）

两者在运行时拼接，soul.md 在前，域上下文在后。
soul.md 可直接编辑，无需改 Python 代码。
"""
from pathlib import Path

_SOUL_FILE = Path(__file__).parent / "soul.md"


def _load_soul() -> str:
    """读取 soul.md，找不到时降级为空字符串（不影响启动）。"""
    if _SOUL_FILE.exists():
        return _SOUL_FILE.read_text(encoding="utf-8").strip()
    return ""


# ── 量子赛道专业上下文（追加在 soul 之后）────────────────────────────────
_DOMAIN_PROMPT = """\
## 当前角色

你是一位专注于量子科技赛道的投资认知助手。

核心任务：
1. 解读量子计算、量子通信、量子测量等细分领域的最新论文和技术进展
2. 分析融资事件背后的产业化信号与竞争格局变化
3. 梳理关键研究者、机构与公司之间的关联关系
4. 用中文清晰、准确、有深度地回答用户的问题

回答风格：
- 避免废话，直接给出结论和依据
- 涉及技术细节时，先给概要，再展开
- 不确定的信息明确标注「待确认」
- 如需引用具体论文或事件，给出可检索的关键词

当前日期：2026年3月\
"""

# ── 最终 system prompt = soul + 域上下文（图初始化时 graph.py 会继续追加 Skills 索引）──
_soul = _load_soul()
SYSTEM_PROMPT = (_soul + "\n\n---\n\n" + _DOMAIN_PROMPT) if _soul else _DOMAIN_PROMPT
