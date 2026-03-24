from dataclasses import dataclass
from datetime import date, datetime
from uuid import UUID


@dataclass
class Vehicle:
    id: UUID
    driver_id: UUID
    make: str
    model: str
    year: int
    insurance_policy_number: str
    insurance_expiry: date
    created_at: datetime
