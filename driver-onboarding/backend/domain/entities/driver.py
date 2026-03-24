from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class Driver:
    id: UUID
    full_name: str
    email: str
    phone: str
    license_number: str
    license_state: str
    created_at: datetime
    campaign_id: Optional[UUID] = None
    vehicles: list = field(default_factory=list)
