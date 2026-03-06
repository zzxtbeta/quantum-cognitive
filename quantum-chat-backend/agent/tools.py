"""量子认知助手工具。
与 deepagents 集成：直接将 Python 函数注册即可，它们将被自动包装为 LangChain Tool。
扩展：在此文件添加新函数，然后把它加入 TOOLS 列表。
"""
import os
import re
import textwrap
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    from langchain_tavily import TavilySearch as _TavilySearch
    _TAVILY_CLS = _TavilySearch
except ImportError:
    from langchain_community.tools.tavily_search import TavilySearchResults as _TavilySearch  # type: ignore
    _TAVILY_CLS = _TavilySearch

# skills 目录：quantum-chat-backend/skills/（顶级目录，与 agent/ 同级）
_SKILLS_DIR = Path(__file__).parent.parent / "skills"


def _make_tavily_tool():
    """构造 Tavily 搜索工具，支持从 core.config 读取 API key。"""
    from core.config import settings
    api_key = settings.tavily_api_key or os.environ.get("TAVILY_API_KEY", "")
    if api_key:
        os.environ.setdefault("TAVILY_API_KEY", api_key)
    return _TAVILY_CLS(
        max_results=5,
        include_answer=True,
        include_raw_content=False,
        description=(
            "使用 Tavily 在互联网上搜索最新信息。适用于：查找最新量子科技论文、"
            "融资事件、政策动态、公司进展等实时信息。"
            "输入搜索关键词，返回相关网页摘要列表。"
        ),
    )


def search_quantum_knowledge(
    query: str,
    category: Optional[str] = None,
) -> str:
    """
    搜索量子科技知识库，返回相关论文、事件、机构信息。

    Args:
        query: 搜索关键词，例如 '超导量子纠错' 或 '本源量子融资'
        category: 可选分类过滤，支持 'paper'（论文）、'funding'（融资）、
                  'tech'（技术发布）、'policy'（政策），为空则全类型搜索
    """
    # TODO: 接入实际知识库 API（e.g. GET /papers?q=... 或 /signals?q=...)
    return (
        f"[知识库搜索] query={query!r}"
        + (f", category={category!r}" if category else "")
        + " — 暂无本地知识库，请直接基于已有上下文回答"
    )


def get_researcher_profile(name: str) -> str:
    """
    查询量子领域研究者的基本信息，包含机构、研究方向、代表性论文列表。

    Args:
        name: 研究者姓名（中文或英文均可）
    """
    # TODO: 接入后端 GET /researchers?q=name
    return f"[人才库查询] name={name!r} — 暂未接入，请基于上下文推断"


def save_skill(
    name: str,
    description: str,
    instructions: str,
    when_to_use: str,
    allowed_tools: Optional[str] = None,
) -> str:
    """
    将当前总结出的分析方法或工作流封装为可复用的 Skill，持久化到本地 skills 目录。
    下次对话启动时该 Skill 将自动注入到 agent 的 system prompt 中。

    Args:
        name: Skill 唯一标识，格式：小写字母、数字、连字符，最长 64 字符
              例如 'quantum-error-correction-analysis' 或 'funding-signal-eval'
        description: 一句话描述该 Skill 的作用和适用场景（≤120 字）
        instructions: 详细步骤说明（Markdown 格式，支持 ## 小节、列表、代码块）
        when_to_use: 列举 3-5 条使用场景，每条用 "- " 开头
        allowed_tools: 可选，该 Skill 建议使用的工具名，空格分隔
                       例如 'search_quantum_knowledge get_researcher_profile'
    """
    # 1. 校验 name 格式（Agent Skills spec 规范）
    if not name:
        return "ERROR: name 不能为空"
    if len(name) > 64:
        return f"ERROR: name 超出 64 字符限制（当前 {len(name)} 字符）"
    if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$', name) and not re.match(r'^[a-z0-9]$', name):
        return "ERROR: name 格式不合法，只允许小写字母、数字和连字符，且不能以连字符开头/结尾"
    if '--' in name:
        return "ERROR: name 不能包含连续连字符 '--'"

    # 2. 构建 SKILL.md 内容
    frontmatter_lines = [
        "---",
        f"name: {name}",
        f"description: {description}",
        "license: internal",
        f"compatibility: 量子认知助手 deepagent（生成于 {datetime.now().strftime('%Y-%m-%d')}）",
    ]
    if allowed_tools:
        frontmatter_lines.append(f"allowed_tools: {allowed_tools}")
    frontmatter_lines.append("---")

    skill_content = "\n".join(frontmatter_lines) + "\n\n"
    skill_content += f"# {name}\n\n"
    skill_content += "## When to Use\n"
    skill_content += textwrap.dedent(when_to_use).strip() + "\n\n"
    skill_content += "## Instructions\n"
    skill_content += textwrap.dedent(instructions).strip() + "\n"

    # 3. 写入文件
    skill_dir = _SKILLS_DIR / name
    skill_file = skill_dir / "SKILL.md"

    try:
        skill_dir.mkdir(parents=True, exist_ok=True)
        skill_file.write_text(skill_content, encoding="utf-8")
    except OSError as e:
        return f"ERROR: 写入 Skill 文件失败 — {e}"

    # 通知 graph 下次请求前热重载 skills
    try:
        from agent.graph import mark_skills_dirty
        mark_skills_dirty()
    except Exception:
        pass  # graph 尚未初始化时忽略

    return (
        f"✅ Skill '{name}' 已保存至 {skill_file}\n"
        f"📝 描述：{description}\n"
        f"⚡ 下次新建对话时，该 Skill 将出现在技能索引中。\n"
        f"🔍 在当前或未来对话中，可调用 get_skill('{name}') 获取完整指南。"
    )


def list_skills() -> str:
    """
    列出当前所有已保存的 Skills，以及每个 Skill 的简要描述。
    """
    if not _SKILLS_DIR.exists():
        return "当前还没有任何 Skills。使用 save_skill 工具创建第一个 Skill。"

    skills = []
    for skill_dir in sorted(_SKILLS_DIR.iterdir()):
        if not skill_dir.is_dir():
            continue
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            continue
        # 读取 description 字段
        content = skill_file.read_text(encoding="utf-8")
        desc_match = re.search(r'^description:\s*(.+)$', content, re.MULTILINE)
        desc = desc_match.group(1).strip() if desc_match else "（无描述）"
        skills.append(f"- **{skill_dir.name}**: {desc}")

    if not skills:
        return "skills/ 目录为空，尚无已保存的 Skill。"

    return "已保存的 Skills：\n" + "\n".join(skills)


def get_skill(name: str) -> str:
    """
    获取指定 Skill 的完整操作指南（When to Use + Instructions）。

    当你在技能索引中发现某个 Skill 与当前任务相关时，调用此工具获取完整指令。
    只在确实需要该 Skill 的详细步骤时调用，避免不必要的工具调用。

    Args:
        name: Skill 名称，与技能索引（系统提示末尾列表）中的名称完全一致，
              例如 'quantum-error-correction-analysis'
    """
    if not _SKILLS_DIR.exists():
        return f"ERROR: skills/ 目录不存在，尚未创建任何 Skill。"

    skill_file = _SKILLS_DIR / name / "SKILL.md"
    if not skill_file.exists():
        # 提示可用的 skill 名称
        available = [d.name for d in sorted(_SKILLS_DIR.iterdir()) if d.is_dir() and (d / "SKILL.md").exists()]
        if available:
            return f"ERROR: Skill '{name}' 不存在。可用技能：{', '.join(available)}"
        return f"ERROR: Skill '{name}' 不存在，且当前还没有任何已保存的 Skill。"

    content = skill_file.read_text(encoding="utf-8")
    # 去除 YAML frontmatter，只返回正文
    body = re.sub(r'^---.*?---\s*', '', content, count=1, flags=re.DOTALL).strip()
    return f"# Skill: {name}\n\n{body}"


def get_skill_file(skill_name: str, file_path: str) -> str:
    """
    读取 Skill 目录内的引用文件（渐进式加载，Level 3）。

    当 SKILL.md 正文中引用了 references/api.md 等附属文件时，调用此工具获取其内容。
    路径相对于该 Skill 目录根，例如 'references/api.md'。

    Args:
        skill_name: Skill 名称（目录名），例如 'paper-research'
        file_path:  相对路径，例如 'references/api.md'
    """
    if not _SKILLS_DIR.exists():
        return f"ERROR: skills/ 目录不存在。"

    # 安全校验：限制在 skills 目录内，防止路径穿越
    target = (_SKILLS_DIR / skill_name / file_path).resolve()
    allowed_root = (_SKILLS_DIR / skill_name).resolve()
    if not str(target).startswith(str(allowed_root)):
        return "ERROR: 非法路径。"

    if not target.exists():
        available = [
            str(f.relative_to(_SKILLS_DIR / skill_name))
            for f in (_SKILLS_DIR / skill_name).rglob("*.md")
            if f.name != "SKILL.md"
        ] if (_SKILLS_DIR / skill_name).exists() else []
        hint = f"可用文件：{', '.join(available)}" if available else "该 Skill 目录下无其他文件。"
        return f"ERROR: '{file_path}' 不存在于 Skill '{skill_name}' 中。{hint}"

    return target.read_text(encoding="utf-8")


# 注册到 deepagents 的工具列表
TOOLS = [
    save_skill,
    list_skills,
    get_skill,
    get_skill_file,
    _make_tavily_tool(),   # Tavily 网络搜索（实时信息）
]
