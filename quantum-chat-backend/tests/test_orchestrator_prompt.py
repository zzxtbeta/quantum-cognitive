from dagent import orchestrator


def test_compose_prompt_sections_includes_key_rules():
    prompt = orchestrator._compose_prompt_sections()

    assert "investment-research SKILL" in prompt
    assert "save_research_artifact" in prompt
    assert "recent_date_window" in prompt
    assert 'search_web(topic="general")' in prompt
    assert "中国生态全景问题" in prompt


def test_orchestrator_prompt_matches_composed_sections():
    assert orchestrator.ORCHESTRATOR_SYSTEM_PROMPT == orchestrator._compose_prompt_sections()


def test_build_system_prompt_appends_generation_date(monkeypatch):
    class _FakeDate:
        @staticmethod
        def today():
            class _FakeToday:
                @staticmethod
                def strftime(fmt: str) -> str:
                    assert fmt == "%Y-%m-%d"
                    return "2026-03-17"

            return _FakeToday()

    monkeypatch.setattr(orchestrator, "date", _FakeDate)

    prompt = orchestrator._build_system_prompt()

    assert prompt.startswith(orchestrator.ORCHESTRATOR_SYSTEM_PROMPT)
    assert prompt.endswith("2026-03-17\n")


def test_get_skill_files_uses_single_cache(monkeypatch):
    loads = [
        {"/skills/investment-research/SKILL.md": {"content": "v1"}},
        {"/skills/investment-research/SKILL.md": {"content": "v2"}},
    ]

    monkeypatch.setattr(orchestrator, "_skill_files_cache", None)
    monkeypatch.setattr(orchestrator, "_load_skill_files", lambda: loads.pop(0))

    first = orchestrator.get_skill_files()
    second = orchestrator.get_skill_files()
    reloaded = orchestrator.reload_skill_files()

    assert first == {"/skills/investment-research/SKILL.md": {"content": "v1"}}
    assert second == first
    assert reloaded == {"/skills/investment-research/SKILL.md": {"content": "v2"}}


def test_get_skill_files_returns_copy(monkeypatch):
    monkeypatch.setattr(
        orchestrator,
        "_skill_files_cache",
        {"/skills/investment-research/SKILL.md": {"content": "stable"}},
    )

    snapshot = orchestrator.get_skill_files()
    snapshot["/skills/new.md"] = {"content": "mutated"}

    assert "/skills/new.md" not in orchestrator.get_skill_files()
