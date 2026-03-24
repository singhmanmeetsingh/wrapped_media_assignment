from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class Campaign:
    id: UUID
    campaign_id: str
    name: str
    source: str
    created_at: datetime
