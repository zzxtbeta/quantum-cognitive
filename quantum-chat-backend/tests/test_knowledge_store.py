from core import knowledge_store


def test_list_knowledge_sanitizes_invalid_text(monkeypatch):
    class _FakeRow(dict):
        def __getitem__(self, item):
            return super().__getitem__(item)

    row = _FakeRow(
        id=1,
        thread_id="thread-1",
        turn_id="turn-1",
        agent_name="agent\ud800",
        category="paper-analysis",
        title="bad\ud800title",
        size_chars=12,
        created_at="2026-03-18T01:00:00Z",
        metadata='{"research_topic":"topic\\ud800"}',
    )

    class _FakeConn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, sql, params):
            class _Cursor:
                def fetchall(self_inner):
                    return [row]

            return _Cursor()

    monkeypatch.setattr(knowledge_store, "_conn", lambda: _FakeConn())

    items = knowledge_store.list_knowledge(limit=10)

    assert items[0]["agent_name"].startswith("agent")
    assert "\ud800" not in items[0]["agent_name"]
    assert "\ud800" not in items[0]["title"]
    assert "\ud800" not in items[0]["metadata"]["research_topic"]
