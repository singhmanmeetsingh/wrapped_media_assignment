import asyncio
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from adapters.outbound.persistence.database import Base, get_db
from adapters.outbound.persistence.models import *  # noqa: ensure all models loaded
from adapters.outbound.persistence.models.invitation import InvitationModel
from config import settings
from main import app

TEST_DB_URL = settings.DATABASE_URL.replace("/driver_onboarding", "/driver_onboarding_test")

engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_campaigns(db_session: AsyncSession):
    from adapters.outbound.persistence.models.campaign import CampaignModel

    campaigns = [
        CampaignModel(
            id=uuid.uuid4(),
            campaign_id="test_fb_2026",
            name="Test Facebook Campaign",
            source="facebook",
        ),
        CampaignModel(
            id=uuid.uuid4(),
            campaign_id="test_goog_2026",
            name="Test Google Campaign",
            source="google",
        ),
    ]
    for c in campaigns:
        db_session.add(c)
    await db_session.commit()
    return campaigns


@pytest_asyncio.fixture
async def auth_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/register", json={
        "email": f"admin-{uuid.uuid4().hex[:8]}@test.com",
        "password": "TestPass123",
    })
    return resp.json()["access_token"]


async def create_test_driver(client: AsyncClient, **overrides) -> dict:
    defaults = {
        "full_name": "Test Driver",
        "email": f"driver-{uuid.uuid4().hex[:8]}@test.com",
        "phone": "5551234567",
        "license_number": "DL-TEST-001",
        "license_state": "Ontario",
    }
    defaults.update(overrides)
    resp = await client.post("/api/drivers", json=defaults)
    return resp.json(), resp.status_code
