"""
Skills 管理端点 — 统一 skills/ 目录，遵循 agentskills.io 规范

GET /skills        — 列出所有已注册 Skills（含 scope/agent 信息）
GET /skills/{name} — 获取单个 Skill 完整内容
"""
from pathlib import Path
from typing import Optional

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/skills", tags=["skills"])

# 统一 skills 目录（项目根下的 skills/）
_SKILLS_DIR = Path(__file__).parent.parent / "skills"


class SkillItem(BaseModel):
    name: str
    description: str
    scope: str              # "chat-agent" | "deep-research"
    agent: str              # 具体 agent 标识
    version: str
    allowed_tools: list[str]
    body_preview: str       # SKILL.md 正文前 300 字
    full_path: str          # 方便前端展示


class SkillsResponse(BaseModel):
    skills: list[SkillItem]
    total: int
    scopes: dict[str, int]  # {"chat-agent": 2, "deep-research": 4}


def _parse_skill_file(skill_dir: Path) -> Optional[SkillItem]:
    skill_file = skill_dir / "SKILL.md"
    if not skill_file.exists():
        return None

    content = skill_file.read_text(encoding="utf-8")

    # ── 解析 YAML frontmatter ─────────────────────────────
    parts = content.split("---", 2)
    if len(parts) < 3:
        return None
    try:
        fm: dict = yaml.safe_load(parts[1]) or {}
    except Exception:
        return None

    meta: dict = fm.get("metadata") or {}
    raw_tools = fm.get("allowed-tools", "")
    # 支持空格分隔（规范）和逗号分隔（兼容旧格式）
    tools = [t.strip() for t in raw_tools.replace(",", " ").split() if t.strip()]

    # ── 提取正文摘要 ───────────────────────────────────────
    body = parts[2].strip()
    body_preview = body[:300] + ("…" if len(body) > 300 else "")

    return SkillItem(
        name=fm.get("name", skill_dir.name),
        description=fm.get("description", ""),
        scope=meta.get("scope", "unknown"),
        agent=meta.get("agent", ""),
        version=str(meta.get("version", "1.0")),
        allowed_tools=tools,
        body_preview=body_preview,
        full_path=str(skill_file.relative_to(_SKILLS_DIR.parent)),
    )


@router.get("", response_model=SkillsResponse)
async def list_skills():
    """列出所有已注册的 Skills。"""
    if not _SKILLS_DIR.exists():
        return SkillsResponse(skills=[], total=0, scopes={})

    items: list[SkillItem] = []
    for d in sorted(_SKILLS_DIR.iterdir()):
        if d.is_dir():
            item = _parse_skill_file(d)
            if item:
                items.append(item)

    scopes: dict[str, int] = {}
    for it in items:
        scopes[it.scope] = scopes.get(it.scope, 0) + 1

    return SkillsResponse(skills=items, total=len(items), scopes=scopes)


@router.get("/{name}", response_model=SkillItem)
async def get_skill(name: str):
    """获取单个 Skill 完整信息。"""
    skill_dir = _SKILLS_DIR / name
    if not skill_dir.exists():
        raise HTTPException(status_code=404, detail=f"Skill '{name}' 不存在")
    item = _parse_skill_file(skill_dir)
    if not item:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' 文件格式错误")
    return item
