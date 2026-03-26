import uuid

import pytest

from tests.conftest import create_test_driver


@pytest.mark.asyncio
async def test_create_invitation_success(client, seed_campaigns, auth_token):
    resp = await client.post("/api/invitations", json={
        "email": "invite@test.com", "campaign_id": "test_fb_2026",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "invite@test.com"
    assert data["used"] is False
    assert "token" in data
    assert "id" in data


@pytest.mark.asyncio
async def test_create_invitation_requires_auth(client, seed_campaigns):
    resp = await client.post("/api/invitations", json={
        "email": "invite@test.com", "campaign_id": "test_fb_2026",
    })
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_invitation_bad_campaign(client, seed_campaigns, auth_token):
    resp = await client.post("/api/invitations", json={
        "email": "invite@test.com", "campaign_id": "nonexistent",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_validate_invitation_success(client, seed_campaigns, auth_token):
    create_resp = await client.post("/api/invitations", json={
        "email": "validate@test.com", "campaign_id": "test_fb_2026",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    token = create_resp.json()["token"]

    resp = await client.get(f"/api/invitations/{token}/validate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "validate@test.com"
    assert data["campaign_ref"] == "test_fb_2026"
    assert data["campaign_name"] == "Test Facebook Campaign"


@pytest.mark.asyncio
async def test_validate_invitation_no_auth_required(client, seed_campaigns, auth_token):
    create_resp = await client.post("/api/invitations", json={
        "email": "noauth@test.com", "campaign_id": "test_fb_2026",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    token = create_resp.json()["token"]

    # No auth header — should still work (public endpoint)
    resp = await client.get(f"/api/invitations/{token}/validate")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_validate_invitation_invalid_token(client):
    resp = await client.get("/api/invitations/00000000-0000-0000-0000-000000000000/validate")
    assert resp.status_code == 404
    assert "Invalid" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_invitation_used_after_driver_signup(client, seed_campaigns, auth_token):
    # Create invitation
    create_resp = await client.post("/api/invitations", json={
        "email": "used@test.com", "campaign_id": "test_fb_2026",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    token = create_resp.json()["token"]

    # Driver signs up with token
    await create_test_driver(client, email="used@test.com", ref="test_fb_2026", invitation_token=token)

    # Validate again — should be used
    resp = await client.get(f"/api/invitations/{token}/validate")
    assert resp.status_code == 410
    assert "already been used" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_driver_signup_with_invitation_links_campaign(client, seed_campaigns, auth_token):
    create_resp = await client.post("/api/invitations", json={
        "email": "linked@test.com", "campaign_id": "test_fb_2026",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    token = create_resp.json()["token"]

    data, status = await create_test_driver(
        client, email="linked@test.com", ref="test_fb_2026", invitation_token=token,
    )
    assert status == 201
    assert data["campaign_id"] is not None


# --- Decline Tests ---

@pytest.mark.asyncio
async def test_decline_invitation_success(client, seed_campaigns, auth_token):
    create_resp = await client.post("/api/invitations", json={
        "email": "decline@test.com", "campaign_id": "test_fb_2026",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    token = create_resp.json()["token"]

    resp = await client.post(f"/api/invitations/{token}/decline")
    assert resp.status_code == 200
    assert resp.json()["detail"] == "Invitation declined"


@pytest.mark.asyncio
async def test_decline_no_auth_required(client, seed_campaigns, auth_token):
    create_resp = await client.post("/api/invitations", json={
        "email": "decnoauth@test.com", "campaign_id": "test_fb_2026",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    token = create_resp.json()["token"]

    # No auth header — public endpoint
    resp = await client.post(f"/api/invitations/{token}/decline")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_decline_then_validate_returns_410(client, seed_campaigns, auth_token):
    create_resp = await client.post("/api/invitations", json={
        "email": "dec-val@test.com", "campaign_id": "test_fb_2026",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    token = create_resp.json()["token"]

    await client.post(f"/api/invitations/{token}/decline")
    resp = await client.get(f"/api/invitations/{token}/validate")
    assert resp.status_code == 410
    assert "declined" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_decline_already_declined(client, seed_campaigns, auth_token):
    create_resp = await client.post("/api/invitations", json={
        "email": "dec-twice@test.com", "campaign_id": "test_fb_2026",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    token = create_resp.json()["token"]

    await client.post(f"/api/invitations/{token}/decline")
    resp = await client.post(f"/api/invitations/{token}/decline")
    assert resp.status_code == 410
    assert "already been declined" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_decline_already_used(client, seed_campaigns, auth_token):
    create_resp = await client.post("/api/invitations", json={
        "email": "dec-used@test.com", "campaign_id": "test_fb_2026",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    token = create_resp.json()["token"]

    # Use it by signing up
    await create_test_driver(client, email="dec-used@test.com", ref="test_fb_2026", invitation_token=token)

    # Try to decline — should fail
    resp = await client.post(f"/api/invitations/{token}/decline")
    assert resp.status_code == 410
    assert "already been used" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_decline_invalid_token(client):
    resp = await client.post("/api/invitations/00000000-0000-0000-0000-000000000000/decline")
    assert resp.status_code == 404


# --- Conversion Rate with Declined ---

@pytest.mark.asyncio
async def test_conversion_rate_accounts_for_declined(client, seed_campaigns, auth_token):
    # Create 2 invitations for same campaign
    inv1 = await client.post("/api/invitations", json={
        "email": "conv1@test.com", "campaign_id": "test_goog_2026",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    inv2 = await client.post("/api/invitations", json={
        "email": "conv2@test.com", "campaign_id": "test_goog_2026",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    token1 = inv1.json()["token"]
    token2 = inv2.json()["token"]

    # Driver 1 signs up and completes (vehicle with future insurance)
    data, _ = await create_test_driver(
        client, email="conv1@test.com", ref="test_goog_2026", invitation_token=token1,
    )
    await client.post(f"/api/drivers/{data['id']}/vehicles", json={
        "make": "Toyota", "model": "Camry", "year": 2023,
        "insurance_policy_number": "POL", "insurance_expiry": "2099-01-01",
    })

    # Driver 2 declines
    await client.post(f"/api/invitations/{token2}/decline")

    # Check stats
    resp = await client.get("/api/campaigns", headers={"Authorization": f"Bearer {auth_token}"})
    goog = next(c for c in resp.json()["campaigns"] if c["campaign_id"] == "test_goog_2026")

    assert goog["total_signups"] == 1
    assert goog["completed_signups"] == 1
    assert goog["declined_invitations"] == 1
    # Conversion = 1 completed / 2 invitations = 0.5
    assert goog["conversion_rate"] == 0.5


@pytest.mark.asyncio
async def test_declined_invitations_counted_per_campaign(client, seed_campaigns, auth_token):
    # Decline for fb campaign
    inv = await client.post("/api/invitations", json={
        "email": "percamp@test.com", "campaign_id": "test_fb_2026",
    }, headers={"Authorization": f"Bearer {auth_token}"})
    await client.post(f"/api/invitations/{inv.json()['token']}/decline")

    resp = await client.get("/api/campaigns", headers={"Authorization": f"Bearer {auth_token}"})
    fb = next(c for c in resp.json()["campaigns"] if c["campaign_id"] == "test_fb_2026")
    goog = next(c for c in resp.json()["campaigns"] if c["campaign_id"] == "test_goog_2026")

    assert fb["declined_invitations"] >= 1
    # Google campaign should not be affected
    assert goog["declined_invitations"] == 0
