---
name: people-intel
description: Research institutions, teams, principal investigators, key hires, and talent flows for quantum-related deep research. Use when the task involves institution coverage, who is leading a lab or company, where talent moved, whether the private people database already covers an institution, or when deciding whether to rely on the private database versus Web search.
---

# People Intel

Use this skill to decide whether an institution or person can be researched from the private database, then deepen only where coverage exists.

## Core workflow

1. For institution-led questions, call `search_institutions(...)` first.
2. If the institution exists in the private database, continue with `search_researchers(...)`.
3. If the institution is missing or the private result is too thin, switch to `search_web(...)`.
4. Keep private-db findings and Web-only findings explicitly separated in the report.

## Operating rules

- Do not start from a fixed institution list.
- Let the user query and prior retrieval decide which institutions to inspect.
- Use `search_researchers(name=...)` for exact people lookup.
- Use `search_researchers(institution=[...aliases...])` only after you know which institution names are covered.
- If the private DB does not contain the institution, say so plainly instead of implying private coverage.

## Output rules

- Split findings into `[私有库已覆盖]`, `[Web 补充]`, and `[待核实]` when relevant.
- Prefer short, evidence-dense institution/team tables over generic prose.
- Save completed people-intel artifacts with `category="people-intel"` and `agent_name="people-intel"`.

Read [references/api.md](./references/api.md) when you need endpoint details, parameter rules, or response field semantics.
