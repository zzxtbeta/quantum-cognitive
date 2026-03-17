from __future__ import annotations

import re


_REPORT_METADATA_RE = re.compile(
    r"\*\*数据截止日期\*\*：(?P<cutoff>[^|\n]+?)\s*\|\s*"
    r"\*\*数据来源\*\*：(?P<sources>[^|\n]+?)\s*\|\s*"
    r"\*\*生成时间\*\*：(?P<generated>[^\n]+)"
)

_LEADING_BOILERPLATE_PATTERNS = (
    "我来帮你",
    "我将并行调用",
    "这是一个",
    "这需要从",
    "下面开始",
    "我会从",
)

_TRAILING_NOISE_PATTERNS = (
    "报告已保存至知识库",
    "调研完成，报告已保存",
    "调研完成，报告已保存至知识库",
)


def normalize_report_metadata(content: str, generation_date: str) -> str:
    """Normalize the report header so cutoff/generation dates stay consistent."""
    if not content.strip():
        return content

    match = _REPORT_METADATA_RE.search(content[:1600])
    if match:
        prefix = content[:match.start()].strip()
        if prefix.startswith(_LEADING_BOILERPLATE_PATTERNS) or _looks_like_process_preamble(prefix):
            content = content[match.start():]
            match = _REPORT_METADATA_RE.search(content[:1600])
            assert match is not None
        sources = match.group("sources").strip() or "未声明"
        normalized = (
            f"**数据截止日期**：{generation_date} | "
            f"**数据来源**：{sources} | "
            f"**生成时间**：{generation_date}"
        )
        return f"{content[:match.start()]}{normalized}{content[match.end():]}"

    stripped = content.lstrip()
    metadata_line = (
        f"**数据截止日期**：{generation_date} | "
        f"**数据来源**：未声明 | "
        f"**生成时间**：{generation_date}"
    )
    if stripped.startswith("---"):
        return f"{metadata_line}\n\n{stripped}"
    return f"{metadata_line}\n\n---\n\n{stripped}"


def sanitize_report_markdown(content: str, generation_date: str) -> str:
    """Deterministically normalize the final report markdown."""
    sanitized = normalize_report_metadata(content, generation_date)
    sanitized = _strip_leading_boilerplate(sanitized)
    sanitized = _drop_duplicate_metadata_blocks(sanitized)
    sanitized = _normalize_unusable_links(sanitized)
    sanitized = _normalize_inline_urls(sanitized)
    sanitized = _normalize_prohibited_ratings(sanitized)
    sanitized = _strip_trailing_noise(sanitized)
    sanitized = _collapse_extra_rules(sanitized)
    return sanitized.strip() + "\n"


def _strip_leading_boilerplate(content: str) -> str:
    lines = content.splitlines()
    if not lines:
        return content

    cleaned: list[str] = []
    seen_metadata = False
    skipping = False

    for line in lines:
        stripped = line.strip()
        if not seen_metadata:
            cleaned.append(line)
            if stripped.startswith("**数据截止日期**："):
                seen_metadata = True
            continue

        if not skipping:
            if not stripped or stripped == "---":
                cleaned.append(line)
                continue
            if stripped.startswith("#"):
                cleaned.append(line)
                continue
            if stripped.startswith(_LEADING_BOILERPLATE_PATTERNS):
                skipping = True
                continue
            cleaned.append(line)
            continue

        if stripped.startswith("#"):
            cleaned.append(line)
            skipping = False

    return "\n".join(cleaned)


def _drop_duplicate_metadata_blocks(content: str) -> str:
    matches = list(_REPORT_METADATA_RE.finditer(content))
    if len(matches) <= 1:
        return content

    pieces: list[str] = []
    last_index = 0
    for idx, match in enumerate(matches):
        if idx == 0:
            pieces.append(content[last_index:match.end()])
            last_index = match.end()
            continue

        block_start = match.start()
        leading = content[last_index:block_start]
        leading = re.sub(r"\n{2,}---\n{2,}$", "\n\n", leading)
        pieces.append(leading)
        last_index = match.end()

    pieces.append(content[last_index:])
    return "".join(pieces)


def _normalize_unusable_links(content: str) -> str:
    return content.replace("[链接不可用]", "待核实（缺少可点击来源）")


def _normalize_inline_urls(content: str) -> str:
    lines = []
    bullet_url_re = re.compile(r"^-\s*([^：:\n]+?)\s*[：:]\s*(https?://\S+)\s*$")

    for line in content.splitlines():
        match = bullet_url_re.match(line.strip())
        if not match:
            lines.append(line)
            continue
        label = match.group(1).strip()
        url = match.group(2).strip()
        lines.append(f"- [{label}]({url})")

    return "\n".join(lines)


def _strip_trailing_noise(content: str) -> str:
    lines = content.splitlines()
    while lines:
        stripped = lines[-1].strip()
        if not stripped:
            lines.pop()
            continue
        if stripped == "---" or any(pattern in stripped for pattern in _TRAILING_NOISE_PATTERNS):
            lines.pop()
            continue
        break
    return "\n".join(lines)


def _normalize_prohibited_ratings(content: str) -> str:
    return re.sub(r"[★☆]{3,}", "见原始数据", content)


def _collapse_extra_rules(content: str) -> str:
    content = re.sub(r"\n{3,}", "\n\n", content)
    content = re.sub(r"(?:\n---\n){2,}", "\n---\n", content)
    return content


def _looks_like_process_preamble(text: str) -> bool:
    markers = ("子Agent", "子 Agent", "并行调用", "全面调研", "信息查询问题")
    return any(marker in text for marker in markers)
