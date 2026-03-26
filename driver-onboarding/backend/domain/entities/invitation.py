from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class Invitation:
    id: UUID
    token: UUID
    email: str
    campaign_id: UUID
    used: bool
    created_at: datetime
    used_at: Optional[datetime] = None
