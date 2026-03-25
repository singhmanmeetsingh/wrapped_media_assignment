from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.inbound.schemas.vehicle import VehicleCreate, VehicleResponse
from adapters.outbound.persistence.database import get_db
from adapters.outbound.persistence.repositories.driver_repo import SqlAlchemyDriverRepository
from adapters.outbound.persistence.repositories.vehicle_repo import SqlAlchemyVehicleRepository
from domain.services.driver_service import DriverNotFoundError
from domain.services.vehicle_service import VehicleService

router = APIRouter()


def _get_service(db: AsyncSession = Depends(get_db)) -> VehicleService:
    return VehicleService(
        vehicle_repo=SqlAlchemyVehicleRepository(db),
        driver_repo=SqlAlchemyDriverRepository(db),
    )


@router.post(
    "/drivers/{driver_id}/vehicles",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_vehicle(
    driver_id: UUID,
    data: VehicleCreate,
    service: VehicleService = Depends(_get_service),
):
    try:
        return await service.create_vehicle(
            driver_id=driver_id,
            make=data.make,
            model=data.model,
            year=data.year,
            insurance_policy_number=data.insurance_policy_number,
            insurance_expiry=data.insurance_expiry,
        )
    except DriverNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )
