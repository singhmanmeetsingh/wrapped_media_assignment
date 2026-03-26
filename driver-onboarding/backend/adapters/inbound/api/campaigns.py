from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.inbound.schemas.campaign import CampaignListResponse
from adapters.outbound.persistence.database import get_db
from adapters.outbound.persistence.repositories.campaign_repo import SqlAlchemyCampaignRepository
from adapters.inbound.auth.dependencies import get_current_user
from domain.services.campaign_service import CampaignService

router = APIRouter()


def _get_service(db: AsyncSession = Depends(get_db)) -> CampaignService:
    return CampaignService(campaign_repo=SqlAlchemyCampaignRepository(db))


@router.get("/campaigns/refs")
async def get_campaign_refs(service: CampaignService = Depends(_get_service)):
    """Public endpoint — returns campaign refs for signup page."""
    campaigns = await service.get_all_campaigns()
    return {"campaigns": [{"campaign_id": c["campaign_id"], "name": c["name"]} for c in campaigns]}


@router.get("/campaigns", response_model=CampaignListResponse)
async def get_campaigns(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    _user: dict = Depends(get_current_user),
    service: CampaignService = Depends(_get_service),
):
    parsed_start = None
    parsed_end = None

    try:
        if start_date:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid date format. Use YYYY-MM-DD",
        )

    if parsed_start and parsed_end and parsed_start > parsed_end:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be before end_date",
        )

    campaigns = await service.get_campaign_stats(parsed_start, parsed_end)
    return CampaignListResponse(campaigns=campaigns)
