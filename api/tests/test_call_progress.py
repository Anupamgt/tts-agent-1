"""The demo walkthrough reads what the agent did on a call, only with that call's token."""
from tests.conftest import clean_cookies
from tests.test_runtime import activate, tool

PUBLIC = {"X-Forwarded-For": "203.0.113.21"}


def test_progress_lists_tools_for_the_callers_own_call(client):
    call_id, body, headers = activate(client, "unknown")
    assert tool(client, call_id, "get_clinic_info", topic="hours")["ok"]
    with clean_cookies(client):
        rows = client.get(f"/api/calls/{call_id}/progress", headers={**headers, **PUBLIC})
        assert rows.status_code == 200, rows.text
        events = rows.json()
        info = [e for e in events if e["tool"] == "get_clinic_info"]
        assert info and info[0]["ok"] and info[0]["say"]
        assert set(info[0]) == {"id", "tool", "ok", "say"}  # no arguments, no record data
        later = client.get(f"/api/calls/{call_id}/progress?after={events[-1]['id']}", headers={**headers, **PUBLIC})
        assert later.status_code == 200 and later.json() == []


def test_progress_needs_that_calls_token(client):
    call_id, _, _ = activate(client, "unknown")
    other_id, _, other_headers = activate(client, "unknown")
    with clean_cookies(client):
        assert client.get(f"/api/calls/{call_id}/progress", headers=PUBLIC).status_code == 401
        assert client.get(f"/api/calls/{call_id}/progress", headers={**other_headers, **PUBLIC}).status_code == 401
        assert client.get(f"/api/calls/{other_id}/progress", headers={**other_headers, **PUBLIC}).status_code == 200
