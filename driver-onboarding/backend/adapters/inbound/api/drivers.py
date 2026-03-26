from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.inbound.schemas.driver import DriverCreate, DriverDetailResponse, DriverResponse
from adapters.outbound.persistence.database import get_db
from adapters.outbound.persistence.repositories.campaign_repo import SqlAlchemyCampaignRepository
from adapters.outbound.persistence.repositories.driver_repo import SqlAlchemyDriverRepository
from adapters.outbound.persistence.repositories.invitation_repo import SqlAlchemyInvitationRepository
from adapters.inbound.auth.dependencies import get_current_user
from domain.services.driver_service import DriverNotFoundError, DriverService, DuplicateEmailError

router = APIRouter()


def _get_service(db: AsyncSession = Depends(get_db)) -> DriverService:
    return DriverService(
        driver_repo=SqlAlchemyDriverRepository(db),
        campaign_repo=SqlAlchemyCampaignRepository(db),
        invitation_repo=SqlAlchemyInvitationRepository(db),
    )


@router.post("/drivers", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
async def create_driver(data: DriverCreate, service: DriverService = Depends(_get_service)):
    try:
        driver = await service.create_driver(
            full_name=data.full_name,
            email=data.email,
            phone=data.phone,
            license_number=data.license_number,
            license_state=data.license_state,
            ref=data.ref,
            invitation_token=data.invitation_token,
        )
        return driver
    except DuplicateEmailError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )


@router.get("/drivers/{driver_id}", response_model=DriverDetailResponse)
async def get_driver(
    driver_id: UUID,
    _user: dict = Depends(get_current_user),
    service: DriverService = Depends(_get_service),
):
    try:
        return await service.get_driver(driver_id)
    except DriverNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )
