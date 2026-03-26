import uuid

import pytest

from tests.conftest import create_test_driver


async def _create_driver(client, seed_campaigns):
    data, _ = await create_test_driver(client, ref="test_fb_2026")
    return data["id"]


@pytest.mark.asyncio
async def test_create_vehicle_success(client, seed_campaigns):
    driver_id = await _create_driver(client, seed_campaigns)
    resp = await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "Toyota", "model": "Camry", "year": 2023,
        "insurance_policy_number": "POL-123", "insurance_expiry": "2027-06-15",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["make"] == "Toyota"
    assert data["model"] == "Camry"
    assert data["year"] == 2023
    assert data["driver_id"] == driver_id


@pytest.mark.asyncio
async def test_create_multiple_vehicles(client, seed_campaigns):
    driver_id = await _create_driver(client, seed_campaigns)
    resp1 = await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "Toyota", "model": "Camry", "year": 2023,
        "insurance_policy_number": "POL-1", "insurance_expiry": "2027-01-01",
    })
    resp2 = await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "Honda", "model": "Civic", "year": 2024,
        "insurance_policy_number": "POL-2", "insurance_expiry": "2027-06-01",
    })
    assert resp1.status_code == 201
    assert resp2.status_code == 201
    assert resp1.json()["id"] != resp2.json()["id"]


@pytest.mark.asyncio
async def test_vehicle_missing_make(client, seed_campaigns):
    driver_id = await _create_driver(client, seed_campaigns)
    resp = await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "model": "Camry", "year": 2023,
        "insurance_policy_number": "POL", "insurance_expiry": "2027-01-01",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_vehicle_empty_make(client, seed_campaigns):
    driver_id = await _create_driver(client, seed_campaigns)
    resp = await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "  ", "model": "Camry", "year": 2023,
        "insurance_policy_number": "POL", "insurance_expiry": "2027-01-01",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_vehicle_year_too_low(client, seed_campaigns):
    driver_id = await _create_driver(client, seed_campaigns)
    resp = await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "Ford", "model": "T", "year": 1899,
        "insurance_policy_number": "POL", "insurance_expiry": "2027-01-01",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_vehicle_year_too_high(client, seed_campaigns):
    driver_id = await _create_driver(client, seed_campaigns)
    resp = await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "Ford", "model": "F", "year": 2028,
        "insurance_policy_number": "POL", "insurance_expiry": "2027-01-01",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_vehicle_year_boundary_low(client, seed_campaigns):
    driver_id = await _create_driver(client, seed_campaigns)
    resp = await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "Ford", "model": "T", "year": 1900,
        "insurance_policy_number": "POL", "insurance_expiry": "2027-01-01",
    })
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_vehicle_year_boundary_high(client, seed_campaigns):
    driver_id = await _create_driver(client, seed_campaigns)
    resp = await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "Tesla", "model": "Y", "year": 2027,
        "insurance_policy_number": "POL", "insurance_expiry": "2027-01-01",
    })
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_vehicle_missing_policy(client, seed_campaigns):
    driver_id = await _create_driver(client, seed_campaigns)
    resp = await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "Toyota", "model": "Camry", "year": 2023,
        "insurance_expiry": "2027-01-01",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_vehicle_missing_expiry(client, seed_campaigns):
    driver_id = await _create_driver(client, seed_campaigns)
    resp = await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "Toyota", "model": "Camry", "year": 2023,
        "insurance_policy_number": "POL",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_vehicle_invalid_date(client, seed_campaigns):
    driver_id = await _create_driver(client, seed_campaigns)
    resp = await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "Toyota", "model": "Camry", "year": 2023,
        "insurance_policy_number": "POL", "insurance_expiry": "not-a-date",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_vehicle_nonexistent_driver(client):
    resp = await client.post("/api/drivers/00000000-0000-0000-0000-000000000000/vehicles", json={
        "make": "Toyota", "model": "Camry", "year": 2023,
        "insurance_policy_number": "POL", "insurance_expiry": "2027-01-01",
    })
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_vehicle_appears_in_driver_detail(client, seed_campaigns, auth_token):
    driver_id = await _create_driver(client, seed_campaigns)
    await client.post(f"/api/drivers/{driver_id}/vehicles", json={
        "make": "Tesla", "model": "Model 3", "year": 2025,
        "insurance_policy_number": "POL-T3", "insurance_expiry": "2027-12-31",
    })
    resp = await client.get(f"/api/drivers/{driver_id}", headers={"Authorization": f"Bearer {auth_token}"})
    assert resp.status_code == 200
    vehicles = resp.json()["vehicles"]
    assert len(vehicles) == 1
    assert vehicles[0]["make"] == "Tesla"
