from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from adapters.outbound.persistence.models.driver import DriverModel
from domain.entities.driver import Driver
from domain.ports.repositories import DriverRepository


class SqlAlchemyDriverRepository(DriverRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    def _to_entity(self, model: DriverModel) -> Driver:
        return Driver(
            id=model.id,
            full_name=model.full_name,
            email=model.email,
            phone=model.phone,
            license_number=model.license_number,
            license_state=model.license_state,
            campaign_id=model.campaign_id,
            created_at=model.created_at,
            vehicles=[],
        )

    async def save(self, driver: Driver) -> Driver:
        model = DriverModel(
            full_name=driver.full_name,
            email=driver.email,
            phone=driver.phone,
            license_number=driver.license_number,
            license_state=driver.license_state,
            campaign_id=driver.campaign_id,
        )
        self._session.add(model)
        await self._session.commit()
        await self._session.refresh(model)
        return self._to_entity(model)

    async def find_by_id(self, driver_id: UUID) -> Optional[Driver]:
        result = await self._session.execute(
            select(DriverModel).where(DriverModel.id == driver_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def find_by_email(self, email: str) -> Optional[Driver]:
        result = await self._session.execute(
            select(DriverModel).where(DriverModel.email == email)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def find_by_id_with_vehicles(self, driver_id: UUID) -> Optional[Driver]:
        result = await self._session.execute(
            select(DriverModel)
            .where(DriverModel.id == driver_id)
            .options(selectinload(DriverModel.vehicles))
        )
        model = result.scalar_one_or_none()
        if not model:
            return None
        driver = self._to_entity(model)
        from domain.entities.vehicle import Vehicle

        driver.vehicles = [
            Vehicle(
                id=v.id,
                driver_id=v.driver_id,
                make=v.make,
                model=v.model,
                year=v.year,
                insurance_policy_number=v.insurance_policy_number,
                insurance_expiry=v.insurance_expiry,
                created_at=v.created_at,
            )
            for v in model.vehicles
        ]
        return driver
