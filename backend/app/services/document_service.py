import uuid
import json
from datetime import datetime, timezone
from app.services.graph_service import graph_service
from app.models.enums import DocumentType, DocumentStatus


class DocumentService:
    async def create_document(self, doc_type: str, shipment_id: str, data: dict, user_id: str) -> dict:
        doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now(timezone.utc).isoformat()

        await graph_service.run("""
            MATCH (s:Shipment {id: $sid}), (u:User {id: $uid})
            CREATE (d:Document {
                id: $did, type: $dtype, status: 'SUBMITTED',
                data: $data, submitted_by: $uid, submitted_at: $now,
                reviewed_by: null, reviewed_at: null, notes: null, file_url: null
            })
            CREATE (d)-[:FOR_SHIPMENT]->(s)
            CREATE (u)-[:SUBMITTED]->(d)
            CREATE (s)-[:HAS_DOCUMENT]->(d)
        """, {
            "sid": shipment_id, "uid": user_id, "did": doc_id,
            "dtype": doc_type, "data": json.dumps(data), "now": now,
        })
        return {"id": doc_id, "type": doc_type, "status": "SUBMITTED"}

    async def get_documents_for_shipment(self, shipment_id: str) -> list[dict]:
        results = await graph_service.run("""
            MATCH (s:Shipment {id: $sid})-[:HAS_DOCUMENT]->(d:Document)
            OPTIONAL MATCH (u:User)-[:SUBMITTED]->(d)
            RETURN d {.id, .type, .status, .data, .submitted_at, .submitted_by, .notes},
                   u.name AS submitted_by_name
            ORDER BY d.submitted_at ASC
        """, {"sid": shipment_id})
        docs = []
        for r in results:
            doc = r["d"]
            doc["submitted_by_name"] = r["submitted_by_name"]
            if doc.get("data"):
                try:
                    doc["data"] = json.loads(doc["data"])
                except (json.JSONDecodeError, TypeError):
                    pass
            docs.append(doc)
        return docs

    async def get_document(self, doc_id: str) -> dict | None:
        result = await graph_service.run_single("""
            MATCH (d:Document {id: $did})
            OPTIONAL MATCH (d)-[:FOR_SHIPMENT]->(s:Shipment)
            RETURN d {.id, .type, .status, .data, .submitted_at, .submitted_by,
                       .reviewed_by, .reviewed_at, .notes, .file_url},
                   s.id AS shipment_id
        """, {"did": doc_id})
        if not result:
            return None
        doc = result["d"]
        doc["shipment_id"] = result["shipment_id"]
        if doc.get("data"):
            try:
                doc["data"] = json.loads(doc["data"])
            except (json.JSONDecodeError, TypeError):
                pass
        return doc

    async def review_document(self, doc_id: str, reviewer_id: str, status: str, notes: str | None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        await graph_service.run("""
            MATCH (d:Document {id: $did})
            SET d.status = $status, d.reviewed_by = $rid, d.reviewed_at = $now, d.notes = $notes
            WITH d
            MATCH (u:User {id: $rid})
            MERGE (u)-[:REVIEWED]->(d)
        """, {"did": doc_id, "rid": reviewer_id, "status": status, "now": now, "notes": notes})
        return {"id": doc_id, "status": status}


document_service = DocumentService()
