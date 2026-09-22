from typing import Optional
from pydantic import BaseModel

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh: str
    auth: str
    user_id: Optional[int] = None
    user_agent: Optional[str] = None

class PushSubscriptionUnsubscribe(BaseModel):
    endpoint: str

class TestReminderRequest(BaseModel):
    endpoint: Optional[str] = None
    user_id: Optional[int] = None
    exam_id: Optional[int] = None
    title: Optional[str] = None
    body: Optional[str] = None
    url: Optional[str] = None

class VapidPublicKeyResponse(BaseModel):
    public_key: str
