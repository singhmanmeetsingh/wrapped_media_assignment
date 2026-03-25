from abc import ABC, abstractmethod
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from domain.entities.campaign import Campaign
from domain.entities.driver import Driver
from domain.entities.user import User
from domain.entities.vehicle import Vehicle


class DriverRepository(ABC):
    @abstractmethod
    async def save(self, driver: Driver) -> Driver: ...

    @abstractmethod
    async def find_by_id(self, driver_id: UUID) -> Optional[Driver]: ...

    @abstractmethod
    async def find_by_email(self, email: str) -> Optional[Driver]: ...

    @abstractmethod
    async def find_by_id_with_vehicles(self, driver_id: UUID) -> Optional[Driver]: ...


class VehicleRepository(ABC):
    @abstractmethod
    async def save(self, vehicle: Vehicle) -> Vehicle: ...


class CampaignRepository(ABC):
    @abstractmethod
    async def find_by_campaign_id(self, campaign_id: str) -> Optional[Campaign]: ...

    @abstractmethod
    async def find_all(self) -> list[Campaign]: ...

    @abstractmethod
    async def get_total_signups(
        self, campaign_uuid: UUID, start_date: Optional[datetime], end_date: Optional[datetime]
    ) -> int: ...

    @abstractmethod
    async def get_completed_signups(
        self, campaign_uuid: UUID, start_date: Optional[datetime], end_date: Optional[datetime]
    ) -> int: ...

    @abstractmethod
    async def get_signups_over_time(
        self, campaign_uuid: UUID, start_date: Optional[datetime], end_date: Optional[datetime]
    ) -> list[dict]: ...


class UserRepository(ABC):
    @abstractmethod
    async def save(self, user: User) -> User: ...

    @abstractmethod
    async def find_by_email(self, email: str) -> Optional[User]: ...
