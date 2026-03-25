from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.inbound.auth.jwt import create_access_token
from adapters.inbound.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from adapters.outbound.persistence.database import get_db
from adapters.outbound.persistence.repositories.user_repo import SqlAlchemyUserRepository
from domain.services.auth_service import (
    AuthService,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
)

router = APIRouter()


def _get_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(user_repo=SqlAlchemyUserRepository(db))


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, service: AuthService = Depends(_get_service)):
    try:
        user = await service.register(email=data.email, password=data.password)
        token = create_access_token(user.id, user.email)
        return TokenResponse(access_token=token)
    except EmailAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )


@router.post("/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest, service: AuthService = Depends(_get_service)):
    try:
        user = await service.authenticate(email=data.email, password=data.password)
        token = create_access_token(user.id, user.email)
        return TokenResponse(access_token=token)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
