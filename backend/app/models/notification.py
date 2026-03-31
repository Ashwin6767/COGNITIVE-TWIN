from pydantic import BaseModel
from typing import Optional
from app.models.enums import NotificationType, Severity


class NotificationResponse(BaseModel):
    id: str
    type: NotificationType
    title: str
    message: str
    severity: Severity
    recipient_id: str
    shipment_id: Optional[str] = None
    is_read: bool = False
    created_at: Optional[str] = None
    read_at: Optional[str] = None
