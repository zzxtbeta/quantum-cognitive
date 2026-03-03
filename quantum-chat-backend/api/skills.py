"""
Skills 管理端点。

GET /skills        — 列出所有已保存的 Skills
GET /skills/{name} — 获取单个 Skill 详情
"""
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/skills", tags=["skills"])

_SKILLS_DIR = Path(__file__).parent.parent / "agent" / "skills"


class SkillItem(BaseModel):
    name: str
    description: str
    when_to_use: str
    instructions_preview: str  # 前 200 字
    created_at: str


class SkillsResponse(BaseModel):
    skills: list[SkillItem]
    total: int


def _parse_skill(skill_dir: Path) -> SkillItem | None:
    skill_file = skill_dir / "SKILL.md"
    if not skill_file.exists():
        return None
    content = skill_file.read_text(encoding="utf-8")

    def _field(key: str) -> str:
        m = re.search(rf'^{key}:\s*(.+)$', content, re.MULTILINE)
        return m.group(1).strip() if m else ""

    # 去掉 frontmatter
    body = re.sub(r'^---.*?---\s*', '', content, count=1, flags=re.DOTALL).strip()

    # 提取 when_to_use 段落
    wtu_match = re.search(r'## When to Use\s*\n(.*?)(?=\n##|\Z)', body, re.DOTALL)
    when_to_use = wtu_match.group(1).strip() if wtu_match else ""

    # 提取 instructions 段落前 200 字
    instr_match = re.search(r'## Instructions\s*\n(.*?)(?=\n##|\Z)', body, re.DOTALL)
    instructions = instr_match.group(1).strip() if instr_match else body
    instructions_preview = instructions[:200] + ("…" if len(instructions) > 200 else "")

    # created_at from compatibility field
    compat = _field("compatibility")
    date_m = re.search(r'\d{4}-\d{2}-\d{2}', compat)
    created_at = date_m.group(0) if date_m else ""

    return SkillItem(
        name=skill_dir.name,
        description=_field("description"),
        when_to_use=when_to_use,
        instructions_preview=instructions_preview,
        created_at=created_at,
    )


@router.get("", response_model=SkillsResponse)
async def list_skills():
    """列出所有已保存的 Skills。"""
    if not _SKILLS_DIR.exists():
        return SkillsResponse(skills=[], total=0)

    items: list[SkillItem] = []
    for d in sorted(_SKILLS_DIR.iterdir()):
        if d.is_dir():
            item = _parse_skill(d)
            if item:
                items.append(item)

    return SkillsResponse(skills=items, total=len(items))


@router.get("/{name}", response_model=SkillItem)
async def get_skill(name: str):
    """获取单个 Skill 的完整内容。"""
    skill_dir = _SKILLS_DIR / name
    if not skill_dir.exists():
        raise HTTPException(status_code=404, detail=f"Skill '{name}' 不存在")
    item = _parse_skill(skill_dir)
    if not item:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' 文件损坏")
    return item
