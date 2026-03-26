import uuid

import pytest

from tests.conftest import create_test_driver


@pytest.mark.asyncio
async def test_campaign_refs_public(client, seed_campaigns):
    resp = await client.get("/api/campaigns/refs")
    assert resp.status_code == 200
    campaigns = resp.json()["campaigns"]
    assert len(campaigns) == 2
    refs = [c["campaign_id"] for c in campaigns]
    assert "test_fb_2026" in refs
    assert "test_goog_2026" in refs


@pytest.mark.asyncio
async def test_campaign_stats_returns_all(client, seed_campaigns, auth_token):
    resp = await client.get("/api/campaigns", headers={"Authorization": f"Bearer {auth_token}"})
    assert resp.status_code == 200
    campaigns = resp.json()["campaigns"]
    assert len(campaigns) == 2
    for c in campaigns:
        assert "total_signups" in c
        assert "completed_signups" in c
        assert "conversion_rate" in c
        assert "declined_invitations" in c
        assert "signups_over_time" in c


@pytest.mark.asyncio
async def test_campaign_zero_signups(client, seed_campaigns, auth_token):
    resp = await client.get("/api/campaigns", headers={"Authorization": f"Bearer {auth_token}"})
    for c in resp.json()["campaigns"]:
        assert c["total_signups"] == 0
        assert c["conversion_rate"] == 0.0


@pytest.mark.asyncio
async def test_campaign_total_signups(client, seed_campaigns, auth_token):
    await create_test_driver(client, ref="test_fb_2026")
    await create_test_driver(client, ref="test_fb_2026")
    resp = await client.get("/api/campaigns", headers={"Authorization": f"Bearer {auth_token}"})
    fb = next(c for c in resp.json()["campaigns"] if c["campaign_id"] == "test_fb_2026")
    assert fb["total_signups"] == 2


@pytest.mark.asyncio
async def test_campaign_completed_signups(client, seed_campaigns, auth_token):
    data, _ = await create_test_driver(client, ref="test_fb_2026")
    driver_id = data["id"]
    # Add vehicle with future insurance
    await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "Toyota", "model": "Camry", "year": 2023,
        "insurance_policy_number": "POL", "insurance_expiry": "2099-01-01",
    })
    resp = await client.get("/api/campaigns", headers={"Authorization": f"Bearer {auth_token}"})
    fb = next(c for c in resp.json()["campaigns"] if c["campaign_id"] == "test_fb_2026")
    assert fb["total_signups"] == 1
    assert fb["completed_signups"] == 1


@pytest.mark.asyncio
async def test_campaign_expired_insurance_not_completed(client, seed_campaigns, auth_token):
    data, _ = await create_test_driver(client, ref="test_goog_2026")
    driver_id = data["id"]
    # Vehicle with PAST insurance
    await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "Honda", "model": "Civic", "year": 2020,
        "insurance_policy_number": "POL", "insurance_expiry": "2020-01-01",
    })
    resp = await client.get("/api/campaigns", headers={"Authorization": f"Bearer {auth_token}"})
    goog = next(c for c in resp.json()["campaigns"] if c["campaign_id"] == "test_goog_2026")
    assert goog["total_signups"] == 1
    assert goog["completed_signups"] == 0


@pytest.mark.asyncio
async def test_campaign_date_filter_invalid(client, seed_campaigns, auth_token):
    resp = await client.get(
        "/api/campaigns?start_date=not-a-date",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_campaign_date_filter_start_after_end(client, seed_campaigns, auth_token):
    resp = await client.get(
        "/api/campaigns?start_date=2026-12-01&end_date=2026-01-01",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_campaign_signups_over_time(client, seed_campaigns, auth_token):
    await create_test_driver(client, ref="test_fb_2026")
    resp = await client.get("/api/campaigns", headers={"Authorization": f"Bearer {auth_token}"})
    fb = next(c for c in resp.json()["campaigns"] if c["campaign_id"] == "test_fb_2026")
    assert len(fb["signups_over_time"]) >= 1
    assert fb["signups_over_time"][0]["count"] >= 1
