from sqlalchemy.ext.asyncio import AsyncSession

from adapters.outbound.persistence.models.vehicle import VehicleModel
from domain.entities.vehicle import Vehicle
from domain.ports.repositories import VehicleRepository


class SqlAlchemyVehicleRepository(VehicleRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, vehicle: Vehicle) -> Vehicle:
        model = VehicleModel(
            driver_id=vehicle.driver_id,
            make=vehicle.make,
            model=vehicle.model,
            year=vehicle.year,
            insurance_policy_number=vehicle.insurance_policy_number,
            insurance_expiry=vehicle.insurance_expiry,
        )
        self._session.add(model)
        await self._session.commit()
        await self._session.refresh(model)
        return Vehicle(
            id=model.id,
            driver_id=model.driver_id,
            make=model.make,
            model=model.model,
            year=model.year,
            insurance_policy_number=model.insurance_policy_number,
            insurance_expiry=model.insurance_expiry,
            created_at=model.created_at,
        )
