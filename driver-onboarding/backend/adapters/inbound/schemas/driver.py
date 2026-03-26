import re
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

from adapters.inbound.schemas.vehicle import VehicleResponse


class DriverCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    license_number: str
    license_state: str
    ref: Optional[str] = None
    invitation_token: Optional[UUID] = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Full name is required")
        if len(v) > 255:
            raise ValueError("Full name must be 255 characters or fewer")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        digits = re.sub(r"\D", "", v)
        if len(digits) < 7:
            raise ValueError("Phone number must have at least 7 digits")
        if len(digits) > 15:
            raise ValueError("Phone number must have 15 digits or fewer")
        return v

    @field_validator("license_number")
    @classmethod
    def validate_license_number(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("License number is required")
        return v

    @field_validator("license_state")
    @classmethod
    def validate_license_state(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("License state is required")
        return v


class DriverResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: str
    license_number: str
    license_state: str
    campaign_id: Optional[UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DriverDetailResponse(DriverResponse):
    vehicles: list[VehicleResponse] = []
