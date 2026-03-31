from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import get_current_user
from app.models.document import DocumentCreate, DocumentReview, DocumentResponse
from app.forms.schemas import get_form_schema, validate_form_data
from app.services.document_service import document_service

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.get("/schema/{form_type}")
async def get_schema(form_type: str):
    schema = get_form_schema(form_type)
    if not schema:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Form type '{form_type}' not found")
    return schema


@router.post("/submit", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def submit_document(
    body: DocumentCreate,
    current_user: dict = Depends(get_current_user),
):
    errors = validate_form_data(body.type.value, body.data)
    if errors:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=errors)

    try:
        result = await document_service.create_document(
            doc_type=body.type.value,
            shipment_id=body.shipment_id,
            data=body.data,
            user_id=current_user["id"],
        )
        return DocumentResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/shipment/{shipment_id}")
async def get_shipment_documents(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        return await document_service.get_documents_for_shipment(shipment_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
):
    doc = await document_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentResponse(**doc)


@router.put("/{document_id}/review", response_model=DocumentResponse)
async def review_document(
    document_id: str,
    body: DocumentReview,
    current_user: dict = Depends(get_current_user),
):
    doc = await document_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    try:
        result = await document_service.review_document(
            doc_id=document_id,
            reviewer_id=current_user["id"],
            status=body.status.value,
            notes=body.notes,
        )
        return DocumentResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
