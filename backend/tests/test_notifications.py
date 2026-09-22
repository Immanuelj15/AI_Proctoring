import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_vapid_public_key():
    response = client.get("/api/v1/notifications/vapid-public-key")
    assert response.status_code == 200
    data = response.json()
    assert "public_key" in data
    assert len(data["public_key"]) > 20

def test_subscribe_and_unsubscribe():
    endpoint = "https://fcm.googleapis.com/fcm/send/test-sub-123456"
    sub_payload = {
        "endpoint": endpoint,
        "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A4If_ZqMmLzYzoBXo",
        "auth": "tBHItJI5svbpez7KI4CCXg",
        "user_id": 1,
        "user_agent": "Mozilla/5.0 Test Suite"
    }

    # Subscribe
    res_sub = client.post("/api/v1/notifications/subscribe", json=sub_payload)
    assert res_sub.status_code == 201
    assert res_sub.json()["status"] in ("created", "updated")

    # Test reminder dispatch to this endpoint
    res_test = client.post("/api/v1/notifications/test-reminder", json={"endpoint": endpoint})
    assert res_test.status_code == 200

    # Unsubscribe
    res_unsub = client.post("/api/v1/notifications/unsubscribe", json={"endpoint": endpoint})
    assert res_unsub.status_code == 200
    assert res_unsub.json()["status"] == "unsubscribed"
