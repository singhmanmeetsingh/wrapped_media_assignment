from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import Date, and_, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.outbound.persistence.models.campaign import CampaignModel
from adapters.outbound.persistence.models.driver import DriverModel
from adapters.outbound.persistence.models.invitation import InvitationModel
from adapters.outbound.persistence.models.vehicle import VehicleModel
from domain.entities.campaign import Campaign
from domain.ports.repositories import CampaignRepository


class SqlAlchemyCampaignRepository(CampaignRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    def _to_entity(self, model: CampaignModel) -> Campaign:
        return Campaign(
            id=model.id,
            campaign_id=model.campaign_id,
            name=model.name,
            source=model.source,
            created_at=model.created_at,
        )

    async def find_by_campaign_id(self, campaign_id: str) -> Optional[Campaign]:
        result = await self._session.execute(
            select(CampaignModel).where(CampaignModel.campaign_id == campaign_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def find_all(self) -> list[Campaign]:
        result = await self._session.execute(select(CampaignModel))
        return [self._to_entity(m) for m in result.scalars().all()]

    def _date_filters(
        self, start_date: Optional[datetime], end_date: Optional[datetime]
    ) -> list:
        filters = []
        if start_date:
            filters.append(DriverModel.created_at >= start_date)
        if end_date:
            filters.append(DriverModel.created_at < end_date + timedelta(days=1))
        return filters

    async def get_total_signups(
        self, campaign_uuid: UUID, start_date: Optional[datetime], end_date: Optional[datetime]
    ) -> int:
        filters = [DriverModel.campaign_id == campaign_uuid]
        filters.extend(self._date_filters(start_date, end_date))
        result = await self._session.execute(
            select(func.count(DriverModel.id)).where(and_(*filters))
        )
        return result.scalar() or 0

    async def get_completed_signups(
        self, campaign_uuid: UUID, start_date: Optional[datetime], end_date: Optional[datetime]
    ) -> int:
        filters = [DriverModel.campaign_id == campaign_uuid]
        filters.extend(self._date_filters(start_date, end_date))
        result = await self._session.execute(
            select(func.count(func.distinct(DriverModel.id)))
            .join(VehicleModel, VehicleModel.driver_id == DriverModel.id)
            .where(
                and_(
                    *filters,
                    VehicleModel.insurance_expiry >= func.current_date(),
                )
            )
        )
        return result.scalar() or 0

    async def get_signups_over_time(
        self, campaign_uuid: UUID, start_date: Optional[datetime], end_date: Optional[datetime]
    ) -> list[dict]:
        filters = [DriverModel.campaign_id == campaign_uuid]
        filters.extend(self._date_filters(start_date, end_date))
        date_col = cast(DriverModel.created_at, Date).label("date")
        result = await self._session.execute(
            select(date_col, func.count(DriverModel.id).label("count"))
            .where(and_(*filters))
            .group_by(date_col)
            .order_by(date_col)
        )
        return [{"date": str(row.date), "count": row.count} for row in result.all()]

    async def get_total_invitations(self, campaign_uuid: UUID) -> int:
        result = await self._session.execute(
            select(func.count(InvitationModel.id)).where(
                InvitationModel.campaign_id == campaign_uuid,
            )
        )
        return result.scalar() or 0

    async def get_declined_invitations(self, campaign_uuid: UUID) -> int:
        result = await self._session.execute(
            select(func.count(InvitationModel.id)).where(
                and_(
                    InvitationModel.campaign_id == campaign_uuid,
                    InvitationModel.declined == True,
                )
            )
        )
        return result.scalar() or 0
