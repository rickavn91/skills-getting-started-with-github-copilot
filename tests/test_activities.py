import sys
from pathlib import Path
from urllib.parse import quote

# Ensure src is importable
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from fastapi.testclient import TestClient
import pytest

from app import app

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    # basic shape checks
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister_cycle():
    activity = "Chess Club"
    email = "testuser@example.com"
    quoted_activity = quote(activity, safe="")

    # ensure clean state: try to delete if existing (ignore errors)
    client.delete(f"/activities/{quoted_activity}/participants?email={email}")

    # sign up
    resp = client.post(f"/activities/{quoted_activity}/signup?email={email}")
    assert resp.status_code == 200
    body = resp.json()
    assert "Signed up" in body.get("message", "")

    # confirm participant appears
    resp = client.get("/activities")
    assert resp.status_code == 200
    participants = resp.json()[activity]["participants"]
    assert email in participants

    # unregister
    resp = client.delete(f"/activities/{quoted_activity}/participants?email={email}")
    assert resp.status_code == 200
    body = resp.json()
    assert "Unregistered" in body.get("message", "")

    # confirm removed
    resp = client.get("/activities")
    participants = resp.json()[activity]["participants"]
    assert email not in participants
