import types
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.audit_service import audit_log, AuditEvent
from uuid import uuid4


def test_request_id_header_present():
    client = TestClient(app)
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert "X-Request-ID" in resp.headers
    assert resp.json()["status"] == "ok"


def test_audit_log_best_effort():
    # session that raises to ensure audit_log never propagates
    class BadSession:
        def add(self, _):  # pragma: no cover - sanity
            raise RuntimeError("fail")

        def commit(self):
            pass

        def rollback(self):
            pass

    event = AuditEvent(organization_id=uuid4(), action="unit.test", actor_type="system")
    try:
        audit_log(event, BadSession())
    except Exception as exc:  # pragma: no cover
        raise AssertionError(f"audit_log should not raise, got {exc}")
