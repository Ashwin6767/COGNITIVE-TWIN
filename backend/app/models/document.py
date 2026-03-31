from pydantic import BaseModel
from typing import Optional
from app.models.enums import DocumentType, DocumentStatus


class DocumentCreate(BaseModel):
    type: DocumentType
    shipment_id: str
    data: dict


class DocumentReview(BaseModel):
    status: DocumentStatus
    notes: Optional[str] = None


class DocumentResponse(BaseModel):
    id: str
    type: DocumentType
    status: DocumentStatus
    data: Optional[dict] = None
    file_url: Optional[str] = None
    submitted_by: Optional[str] = None
    submitted_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    notes: Optional[str] = None
    shipment_id: Optional[str] = None
