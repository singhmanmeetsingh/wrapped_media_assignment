from abc import ABC, abstractmethod


class EmailPort(ABC):
    @abstractmethod
    async def send_invitation(self, to_email: str, signup_link: str, campaign_name: str) -> None: ...
