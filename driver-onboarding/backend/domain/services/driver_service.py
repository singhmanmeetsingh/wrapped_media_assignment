import logging
from typing import Optional
from uuid import UUID

from domain.entities.driver import Driver
from domain.ports.repositories import CampaignRepository, DriverRepository

logger = logging.getLogger(__name__)


class DuplicateEmailError(Exception):
    def __init__(self, email: str):
        self.email = email
        super().__init__(f"Email already registered: {email}")


class DriverNotFoundError(Exception):
    def __init__(self, driver_id: UUID):
        self.driver_id = driver_id
        super().__init__(f"Driver not found: {driver_id}")


class DriverService:
    def __init__(self, driver_repo: DriverRepository, campaign_repo: CampaignRepository):
        self._driver_repo = driver_repo
        self._campaign_repo = campaign_repo

    async def create_driver(
        self,
        full_name: str,
        email: str,
        phone: str,
        license_number: str,
        license_state: str,
        ref: Optional[str] = None,
    ) -> Driver:
        existing = await self._driver_repo.find_by_email(email)
        if existing:
            raise DuplicateEmailError(email)

        campaign_uuid = None
        if ref:
            campaign = await self._campaign_repo.find_by_campaign_id(ref)
            if campaign:
                campaign_uuid = campaign.id
            else:
                logger.warning(f"Unknown campaign ref: {ref}")

        driver = Driver(
            id=UUID(int=0),  # placeholder — repo assigns real UUID
            full_name=full_name,
            email=email,
            phone=phone,
            license_number=license_number,
            license_state=license_state,
            campaign_id=campaign_uuid,
            created_at=None,
        )
        return await self._driver_repo.save(driver)

    async def get_driver(self, driver_id: UUID) -> Driver:
        driver = await self._driver_repo.find_by_id_with_vehicles(driver_id)
        if not driver:
            raise DriverNotFoundError(driver_id)
        return driver
