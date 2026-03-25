from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


class VehicleCreate(BaseModel):
    make: str
    model: str
    year: int
    insurance_policy_number: str
    insurance_expiry: date

    @field_validator("make")
    @classmethod
    def validate_make(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Make is required")
        if len(v) > 100:
            raise ValueError("Make must be 100 characters or fewer")
        return v

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Model is required")
        if len(v) > 100:
            raise ValueError("Model must be 100 characters or fewer")
        return v

    @field_validator("year")
    @classmethod
    def validate_year(cls, v: int) -> int:
        if v < 1900 or v > 2027:
            raise ValueError("Year must be between 1900 and 2027")
        return v

    @field_validator("insurance_policy_number")
    @classmethod
    def validate_insurance_policy_number(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Insurance policy number is required")
        if len(v) > 100:
            raise ValueError("Insurance policy number must be 100 characters or fewer")
        return v


class VehicleResponse(BaseModel):
    id: UUID
    driver_id: UUID
    make: str
    model: str
    year: int
    insurance_policy_number: str
    insurance_expiry: date
    created_at: datetime

    model_config = {"from_attributes": True}
