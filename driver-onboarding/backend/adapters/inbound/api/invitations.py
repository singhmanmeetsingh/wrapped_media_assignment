from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.inbound.auth.dependencies import get_current_user
from adapters.inbound.schemas.invitation import (
    InvitationCreate,
    InvitationResponse,
    InvitationValidateResponse,
)
from adapters.outbound.email.smtp_adapter import SmtpEmailAdapter
from adapters.outbound.persistence.database import get_db
from adapters.outbound.persistence.repositories.campaign_repo import SqlAlchemyCampaignRepository
from adapters.outbound.persistence.repositories.invitation_repo import SqlAlchemyInvitationRepository
from domain.services.invitation_service import (
    CampaignNotFoundError,
    InvitationAlreadyUsedError,
    InvitationService,
    InvalidInvitationError,
)

router = APIRouter()


def _get_service(db: AsyncSession = Depends(get_db)) -> InvitationService:
    return InvitationService(
        invitation_repo=SqlAlchemyInvitationRepository(db),
        campaign_repo=SqlAlchemyCampaignRepository(db),
        email_adapter=SmtpEmailAdapter(),
    )


@router.post("/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    data: InvitationCreate,
    _user: dict = Depends(get_current_user),
    service: InvitationService = Depends(_get_service),
):
    """Admin-only: send a driver invitation email."""
    try:
        invitation = await service.create_and_send(
            email=data.email,
            campaign_id_str=data.campaign_id,
        )
        return invitation
    except CampaignNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )


@router.get("/invitations/{token}/validate", response_model=InvitationValidateResponse)
async def validate_invitation(
    token: UUID,
    service: InvitationService = Depends(_get_service),
):
    """Public: driver validates their invitation token before signing up."""
    try:
        return await service.validate_token(token)
    except InvalidInvitationError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invitation link",
        )
    except InvitationAlreadyUsedError:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This invitation has already been used",
        )
