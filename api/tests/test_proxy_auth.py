"""A tunnel or proxy delivers internet traffic from 127.0.0.1. Such requests
must not pass the loopback gate, and the public demo is opt-in and capped."""

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app import auth, routes


def make(headers=None, host="127.0.0.1"):
    raw = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    return Request({"type": "http", "method": "GET", "path": "/", "headers": raw, "client": (host, 5000), "query_string": b""})


def test_plain_loopback_is_local():
    assert auth.is_loopback(make())


@pytest.mark.parametrize("header", ["cf-connecting-ip", "x-forwarded-for", "x-real-ip", "forwarded", "cf-ray", "x-vercel-id"])
def test_proxied_request_is_not_local(header):
    assert not auth.is_loopback(make({header: "203.0.113.9"}))


def test_remote_socket_is_not_local():
    assert not auth.is_loopback(make(host="203.0.113.9"))


def test_client_ip_prefers_first_forwarded_hop():
    assert auth.client_ip(make({"x-forwarded-for": "198.51.100.7, 76.76.21.21", "cf-connecting-ip": "76.76.21.21"})) == "198.51.100.7"
    assert auth.client_ip(make({"cf-connecting-ip": "198.51.100.8"})) == "198.51.100.8"


def test_desk_endpoints_refuse_tunnel_traffic():
    with pytest.raises(HTTPException) as err:
        routes._loopback_or_404(make({"cf-connecting-ip": "203.0.113.9"}))
    assert err.value.status_code == 404


def test_demo_closed_unless_public_demo(monkeypatch):
    monkeypatch.setattr(routes, "PUBLIC_DEMO", False)
    with pytest.raises(HTTPException) as err:
        routes._demo_or_404(make({"cf-connecting-ip": "203.0.113.9"}), starts_call=True)
    assert err.value.status_code == 404


def test_demo_caps_calls_per_ip_and_overall(monkeypatch):
    monkeypatch.setattr(routes, "PUBLIC_DEMO", True)
    monkeypatch.setattr(routes, "PUBLIC_DEMO_CALLS_PER_IP_HOUR", 2)
    monkeypatch.setattr(routes, "PUBLIC_DEMO_CALLS_PER_HOUR", 3)
    monkeypatch.setattr(routes, "_demo_calls", [])
    a = make({"x-forwarded-for": "198.51.100.1"})
    routes._demo_or_404(a, starts_call=True)
    routes._demo_or_404(a, starts_call=True)
    with pytest.raises(HTTPException) as err:
        routes._demo_or_404(a, starts_call=True)
    assert err.value.status_code == 429
    routes._demo_or_404(make({"x-forwarded-for": "198.51.100.2"}), starts_call=True)
    with pytest.raises(HTTPException):
        routes._demo_or_404(make({"x-forwarded-for": "198.51.100.3"}), starts_call=True)
    routes._demo_or_404(make(), starts_call=True)  # local use is never capped
