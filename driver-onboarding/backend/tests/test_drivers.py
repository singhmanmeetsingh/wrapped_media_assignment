import uuid

import pytest

from tests.conftest import create_test_driver


@pytest.mark.asyncio
async def test_create_driver_success(client, seed_campaigns):
    data, status = await create_test_driver(client, ref="test_fb_2026")
    assert status == 201
    assert data["full_name"] == "Test Driver"
    assert data["campaign_id"] is not None
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_driver_no_ref(client, seed_campaigns):
    data, status = await create_test_driver(client)
    assert status == 201
    assert data["campaign_id"] is None


@pytest.mark.asyncio
async def test_create_driver_unknown_ref(client, seed_campaigns):
    data, status = await create_test_driver(client, ref="nonexistent_campaign")
    assert status == 201
    assert data["campaign_id"] is None


@pytest.mark.asyncio
async def test_create_driver_duplicate_email(client, seed_campaigns):
    email = f"dup-{uuid.uuid4().hex[:8]}@test.com"
    await create_test_driver(client, email=email)
    _, status = await create_test_driver(client, email=email)
    assert status == 409


@pytest.mark.asyncio
async def test_create_driver_missing_name(client, seed_campaigns):
    resp = await client.post("/api/drivers", json={
        "email": "x@test.com", "phone": "5551234567",
        "license_number": "DL", "license_state": "ON",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_driver_empty_name(client, seed_campaigns):
    resp = await client.post("/api/drivers", json={
        "full_name": "   ", "email": "x@test.com", "phone": "5551234567",
        "license_number": "DL", "license_state": "ON",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_driver_invalid_email(client, seed_campaigns):
    resp = await client.post("/api/drivers", json={
        "full_name": "Test", "email": "bad", "phone": "5551234567",
        "license_number": "DL", "license_state": "ON",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_driver_short_phone(client, seed_campaigns):
    resp = await client.post("/api/drivers", json={
        "full_name": "Test", "email": f"{uuid.uuid4().hex[:8]}@test.com",
        "phone": "123", "license_number": "DL", "license_state": "ON",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_driver_missing_license_number(client, seed_campaigns):
    resp = await client.post("/api/drivers", json={
        "full_name": "Test", "email": f"{uuid.uuid4().hex[:8]}@test.com",
        "phone": "5551234567", "license_state": "ON",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_driver_empty_license_state(client, seed_campaigns):
    resp = await client.post("/api/drivers", json={
        "full_name": "Test", "email": f"{uuid.uuid4().hex[:8]}@test.com",
        "phone": "5551234567", "license_number": "DL", "license_state": "  ",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_driver_name_too_long(client, seed_campaigns):
    resp = await client.post("/api/drivers", json={
        "full_name": "A" * 300, "email": f"{uuid.uuid4().hex[:8]}@test.com",
        "phone": "5551234567", "license_number": "DL", "license_state": "ON",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_driver_trims_whitespace(client, seed_campaigns):
    data, status = await create_test_driver(client, full_name="  John Doe  ")
    assert status == 201
    assert data["full_name"] == "John Doe"


@pytest.mark.asyncio
async def test_get_driver_success(client, seed_campaigns, auth_token):
    data, _ = await create_test_driver(client)
    driver_id = data["id"]
    resp = await client.get(f"/api/drivers/{driver_id}", headers={"Authorization": f"Bearer {auth_token}"})
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Test Driver"
    assert "vehicles" in resp.json()


@pytest.mark.asyncio
async def test_get_driver_not_found(client, auth_token):
    resp = await client.get(
        "/api/drivers/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_driver_invalid_uuid(client, auth_token):
    resp = await client.get("/api/drivers/not-a-uuid", headers={"Authorization": f"Bearer {auth_token}"})
    assert resp.status_code == 422
