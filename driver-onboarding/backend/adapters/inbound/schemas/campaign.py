from uuid import UUID

from pydantic import BaseModel


class DailySignupCount(BaseModel):
    date: str
    count: int


class CampaignStats(BaseModel):
    id: UUID
    campaign_id: str
    name: str
    source: str
    total_signups: int
    completed_signups: int
    conversion_rate: float
    signups_over_time: list[DailySignupCount]


class CampaignListResponse(BaseModel):
    campaigns: list[CampaignStats]
