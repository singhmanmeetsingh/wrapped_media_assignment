from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.outbound.persistence.models.invitation import InvitationModel
from domain.entities.invitation import Invitation
from domain.ports.repositories import InvitationRepository


class SqlAlchemyInvitationRepository(InvitationRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    def _to_entity(self, model: InvitationModel) -> Invitation:
        return Invitation(
            id=model.id,
            token=model.token,
            email=model.email,
            campaign_id=model.campaign_id,
            used=model.used,
            created_at=model.created_at,
            used_at=model.used_at,
            declined=model.declined,
            declined_at=model.declined_at,
        )

    async def save(self, invitation: Invitation) -> Invitation:
        model = InvitationModel(
            token=invitation.token,
            email=invitation.email,
            campaign_id=invitation.campaign_id,
            used=invitation.used,
        )
        self._session.add(model)
        await self._session.commit()
        await self._session.refresh(model)
        return self._to_entity(model)

    async def find_by_token(self, token: UUID) -> Optional[Invitation]:
        result = await self._session.execute(
            select(InvitationModel).where(InvitationModel.token == token)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def mark_used(self, token: UUID) -> None:
        await self._session.execute(
            update(InvitationModel)
            .where(InvitationModel.token == token)
            .values(used=True, used_at=datetime.now(timezone.utc))
        )
        await self._session.commit()

    async def mark_declined(self, token: UUID) -> None:
        await self._session.execute(
            update(InvitationModel)
            .where(InvitationModel.token == token)
            .values(declined=True, declined_at=datetime.now(timezone.utc))
        )
        await self._session.commit()
