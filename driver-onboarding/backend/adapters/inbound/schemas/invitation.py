from uuid import UUID

from pydantic import BaseModel, EmailStr


class InvitationCreate(BaseModel):
    email: EmailStr
    campaign_id: str


class InvitationResponse(BaseModel):
    id: UUID
    token: UUID
    email: str
    campaign_id: UUID
    used: bool

    model_config = {"from_attributes": True}


class InvitationValidateResponse(BaseModel):
    email: str
    campaign_id: str
    campaign_ref: str | None
    campaign_name: str | None
