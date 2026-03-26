import uuid
from uuid import UUID

from config import settings
from domain.entities.invitation import Invitation
from domain.ports.email import EmailPort
from domain.ports.repositories import CampaignRepository, InvitationRepository


class CampaignNotFoundError(Exception):
    pass


class InvalidInvitationError(Exception):
    pass


class InvitationAlreadyUsedError(Exception):
    pass


class InvitationService:
    def __init__(
        self,
        invitation_repo: InvitationRepository,
        campaign_repo: CampaignRepository,
        email_adapter: EmailPort,
    ):
        self._invitation_repo = invitation_repo
        self._campaign_repo = campaign_repo
        self._email_adapter = email_adapter

    async def create_and_send(self, email: str, campaign_id_str: str) -> Invitation:
        campaign = await self._campaign_repo.find_by_campaign_id(campaign_id_str)
        if not campaign:
            raise CampaignNotFoundError(f"Campaign not found: {campaign_id_str}")

        token = uuid.uuid4()
        invitation = Invitation(
            id=UUID(int=0),
            token=token,
            email=email,
            campaign_id=campaign.id,
            used=False,
            created_at=None,
        )
        saved = await self._invitation_repo.save(invitation)

        signup_link = f"{settings.FRONTEND_URL}/signup?token={token}"
        await self._email_adapter.send_invitation(email, signup_link, campaign.name)

        return saved

    async def validate_token(self, token: UUID) -> dict:
        invitation = await self._invitation_repo.find_by_token(token)
        if not invitation:
            raise InvalidInvitationError()
        if invitation.used:
            raise InvitationAlreadyUsedError()

        campaign = await self._campaign_repo.find_by_campaign_id("")
        # We need to look up by UUID, let's get all and match
        all_campaigns = await self._campaign_repo.find_all()
        campaign_match = next((c for c in all_campaigns if c.id == invitation.campaign_id), None)

        return {
            "email": invitation.email,
            "campaign_id": str(invitation.campaign_id),
            "campaign_ref": campaign_match.campaign_id if campaign_match else None,
            "campaign_name": campaign_match.name if campaign_match else None,
        }

    async def mark_used(self, token: UUID) -> None:
        invitation = await self._invitation_repo.find_by_token(token)
        if not invitation:
            raise InvalidInvitationError()
        await self._invitation_repo.mark_used(token)
