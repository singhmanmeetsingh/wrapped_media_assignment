import uuid

import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    email = f"reg-{uuid.uuid4().hex[:8]}@test.com"
    resp = await client.post("/api/auth/register", json={"email": email, "password": "Pass1234"})
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    email = f"dup-{uuid.uuid4().hex[:8]}@test.com"
    await client.post("/api/auth/register", json={"email": email, "password": "Pass1234"})
    resp = await client.post("/api/auth/register", json={"email": email, "password": "Pass1234"})
    assert resp.status_code == 409
    assert "already registered" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_invalid_email(client):
    resp = await client.post("/api/auth/register", json={"email": "notvalid", "password": "Pass1234"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client):
    email = f"login-{uuid.uuid4().hex[:8]}@test.com"
    await client.post("/api/auth/register", json={"email": email, "password": "Pass1234"})
    resp = await client.post("/api/auth/login", json={"email": email, "password": "Pass1234"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_bad_password(client):
    email = f"badpw-{uuid.uuid4().hex[:8]}@test.com"
    await client.post("/api/auth/register", json={"email": email, "password": "Pass1234"})
    resp = await client.post("/api/auth/login", json={"email": email, "password": "wrong"})
    assert resp.status_code == 401
    assert "Invalid" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    resp = await client.post("/api/auth/login", json={"email": "ghost@test.com", "password": "nope"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_jwt_protects_campaigns(client):
    resp = await client.get("/api/campaigns")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_jwt_fake_token_rejected(client):
    resp = await client.get("/api/campaigns", headers={"Authorization": "Bearer fake.jwt.token"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_jwt_valid_token_works(client, auth_token, seed_campaigns):
    resp = await client.get("/api/campaigns", headers={"Authorization": f"Bearer {auth_token}"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_jwt_protects_get_driver(client):
    resp = await client.get("/api/drivers/00000000-0000-0000-0000-000000000001")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_jwt_protects_create_invitation(client):
    resp = await client.post("/api/invitations", json={"email": "x@x.com", "campaign_id": "test"})
    assert resp.status_code == 403
