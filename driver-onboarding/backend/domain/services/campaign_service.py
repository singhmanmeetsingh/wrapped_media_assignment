from datetime import datetime
from typing import Optional

from domain.ports.repositories import CampaignRepository


class CampaignService:
    def __init__(self, campaign_repo: CampaignRepository):
        self._campaign_repo = campaign_repo

    async def get_all_campaigns(self) -> list[dict]:
        campaigns = await self._campaign_repo.find_all()
        return [
            {"campaign_id": c.campaign_id, "name": c.name, "source": c.source}
            for c in campaigns
        ]

    async def get_campaign_stats(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> list[dict]:
        campaigns = await self._campaign_repo.find_all()
        results = []

        for campaign in campaigns:
            total = await self._campaign_repo.get_total_signups(
                campaign.id, start_date, end_date
            )
            completed = await self._campaign_repo.get_completed_signups(
                campaign.id, start_date, end_date
            )
            signups_over_time = await self._campaign_repo.get_signups_over_time(
                campaign.id, start_date, end_date
            )
            total_invitations = await self._campaign_repo.get_total_invitations(campaign.id)
            declined = await self._campaign_repo.get_declined_invitations(campaign.id)

            # Conversion rate: completed signups / total invitations sent
            # Falls back to completed/signups if no invitations tracked
            if total_invitations > 0:
                conversion_rate = completed / total_invitations
            elif total > 0:
                conversion_rate = completed / total
            else:
                conversion_rate = 0.0

            results.append(
                {
                    "id": campaign.id,
                    "campaign_id": campaign.campaign_id,
                    "name": campaign.name,
                    "source": campaign.source,
                    "total_signups": total,
                    "completed_signups": completed,
                    "conversion_rate": round(conversion_rate, 4),
                    "declined_invitations": declined,
                    "signups_over_time": signups_over_time,
                }
            )

        return results
