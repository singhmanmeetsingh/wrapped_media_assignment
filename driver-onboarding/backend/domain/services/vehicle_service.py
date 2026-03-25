from uuid import UUID

from domain.entities.vehicle import Vehicle
from domain.ports.repositories import DriverRepository, VehicleRepository
from domain.services.driver_service import DriverNotFoundError


class VehicleService:
    def __init__(self, vehicle_repo: VehicleRepository, driver_repo: DriverRepository):
        self._vehicle_repo = vehicle_repo
        self._driver_repo = driver_repo

    async def create_vehicle(
        self,
        driver_id: UUID,
        make: str,
        model: str,
        year: int,
        insurance_policy_number: str,
        insurance_expiry,
    ) -> Vehicle:
        driver = await self._driver_repo.find_by_id(driver_id)
        if not driver:
            raise DriverNotFoundError(driver_id)

        vehicle = Vehicle(
            id=UUID(int=0),  # placeholder — repo assigns real UUID
            driver_id=driver_id,
            make=make,
            model=model,
            year=year,
            insurance_policy_number=insurance_policy_number,
            insurance_expiry=insurance_expiry,
            created_at=None,
        )
        return await self._vehicle_repo.save(vehicle)
