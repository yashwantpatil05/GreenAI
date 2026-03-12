from backend.app.services.comparison_service import _delta


def test_delta_positive():
    abs_delta, pct = _delta(10, 15)
    assert abs_delta == 5
    assert round(pct, 2) == 50.0


def test_delta_none():
    abs_delta, pct = _delta(None, 5)
    assert abs_delta is None
    assert pct is None
