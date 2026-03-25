from uuid import UUID

from passlib.context import CryptContext

from domain.entities.user import User
from domain.ports.repositories import UserRepository

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class InvalidCredentialsError(Exception):
    pass


class EmailAlreadyRegisteredError(Exception):
    def __init__(self, email: str):
        self.email = email
        super().__init__(f"Email already registered: {email}")


class AuthService:
    def __init__(self, user_repo: UserRepository):
        self._user_repo = user_repo

    async def register(self, email: str, password: str) -> User:
        existing = await self._user_repo.find_by_email(email)
        if existing:
            raise EmailAlreadyRegisteredError(email)

        user = User(
            id=UUID(int=0),
            email=email,
            hashed_password=pwd_context.hash(password),
            created_at=None,
        )
        return await self._user_repo.save(user)

    async def authenticate(self, email: str, password: str) -> User:
        user = await self._user_repo.find_by_email(email)
        if not user or not pwd_context.verify(password, user.hashed_password):
            raise InvalidCredentialsError()
        return user
