import asyncio

from sqlalchemy import select

from adapters.outbound.persistence.database import async_session
from adapters.outbound.persistence.models.campaign import CampaignModel

CAMPAIGNS = [
    {"campaign_id": "fb_spring_2026", "name": "Spring Driver Push", "source": "facebook"},
    {"campaign_id": "goog_march_2026", "name": "Google March Campaign", "source": "google"},
    {"campaign_id": "ref_bonus_2026", "name": "Referral Bonus Program", "source": "referral"},
    {"campaign_id": "tt_viral_2026", "name": "TikTok Viral Campaign", "source": "tiktok"},
    {"campaign_id": "email_win_2026", "name": "Email Win-Back Campaign", "source": "email"},
]


async def seed():
    async with async_session() as session:
        for campaign_data in CAMPAIGNS:
            result = await session.execute(
                select(CampaignModel).where(
                    CampaignModel.campaign_id == campaign_data["campaign_id"]
                )
            )
            existing = result.scalar_one_or_none()
            if existing is None:
                session.add(CampaignModel(**campaign_data))
                print(f"  Seeded campaign: {campaign_data['campaign_id']}")
            else:
                print(f"  Campaign already exists: {campaign_data['campaign_id']}")
        await session.commit()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
