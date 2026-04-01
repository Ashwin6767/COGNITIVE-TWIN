import uuid
from datetime import datetime, timezone
from app.services.graph_service import graph_service
from app.services.event_service import manager as ws_manager


class NotificationService:
    async def create(
        self, recipient_id: str, title: str, message: str,
        severity: str, notif_type: str, shipment_id: str | None = None
    ) -> dict:
        nid = f"NTF-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now(timezone.utc).isoformat()

        await graph_service.run("""
            MATCH (u:User {id: $uid})
            CREATE (n:Notification {
                id: $nid, type: $type, title: $title, message: $message,
                severity: $severity, recipient_id: $uid,
                shipment_id: $shipment_id, is_read: false,
                created_at: $now, read_at: null
            })
            CREATE (n)-[:FOR_USER]->(u)
        """, {
            "uid": recipient_id, "nid": nid, "type": notif_type,
            "title": title, "message": message, "severity": severity,
            "shipment_id": shipment_id, "now": now,
        })

        if shipment_id:
            await graph_service.run("""
                MATCH (n:Notification {id: $nid}), (s:Shipment {id: $sid})
                CREATE (n)-[:ABOUT]->(s)
            """, {"nid": nid, "sid": shipment_id})

        # Real-time delivery via WebSocket
        payload = {
            "event": "new_notification",
            "data": {
                "id": nid, "type": notif_type, "title": title,
                "message": message, "severity": severity,
                "shipment_id": shipment_id, "is_read": False,
                "created_at": now,
            },
        }
        await ws_manager.broadcast_to_user(recipient_id, payload)

        return {"id": nid, "title": title, "severity": severity}

    async def notify_role_group(
        self, role: str, title: str, message: str,
        severity: str, notif_type: str, shipment_id: str | None = None,
        port_id: str | None = None, exclude_user_id: str | None = None
    ):
        where = "WHERE u.role = $role AND u.is_active = true"
        params = {"role": role}
        if port_id:
            where += " AND u.assigned_port_id = $port_id"
            params["port_id"] = port_id

        users = await graph_service.run(f"MATCH (u:User) {where} RETURN u.id AS uid", params)
        for u in users:
            if exclude_user_id and u["uid"] == exclude_user_id:
                continue
            await self.create(u["uid"], title, message, severity, notif_type, shipment_id)

    async def notify_shipment_stakeholders(
        self, shipment_id: str, title: str, message: str, severity: str, notif_type: str,
        exclude_user_id: str | None = None
    ):
        users = await graph_service.run("""
            MATCH (s:Shipment {id: $sid})
            OPTIONAL MATCH (customer:User)-[:REQUESTED]->(s)
            OPTIONAL MATCH (driver:User)-[:ASSIGNED_PICKUP]->(s)
            OPTIONAL MATCH (driver2:User)-[:ASSIGNED_DELIVERY]->(s)
            WITH collect(DISTINCT customer.id) + collect(DISTINCT driver.id) + collect(DISTINCT driver2.id) AS ids
            UNWIND ids AS uid
            WITH DISTINCT uid WHERE uid IS NOT NULL
            RETURN uid
        """, {"sid": shipment_id})
        for u in users:
            if exclude_user_id and u["uid"] == exclude_user_id:
                continue
            await self.create(u["uid"], title, message, severity, notif_type, shipment_id)

    async def get_unread(self, user_id: str) -> list[dict]:
        results = await graph_service.run("""
            MATCH (n:Notification {recipient_id: $uid, is_read: false})
            RETURN n {.id, .type, .title, .message, .severity, .shipment_id, .created_at}
            ORDER BY n.created_at DESC LIMIT 50
        """, {"uid": user_id})
        return [r["n"] for r in results]

    async def get_unread_count(self, user_id: str) -> int:
        result = await graph_service.run_single(
            "MATCH (n:Notification {recipient_id: $uid, is_read: false}) RETURN count(n) AS c",
            {"uid": user_id},
        )
        return result["c"] if result else 0

    async def get_all(self, user_id: str, page: int = 1, limit: int = 20) -> dict:
        skip = (page - 1) * limit
        count_result = await graph_service.run_single(
            "MATCH (n:Notification {recipient_id: $uid}) RETURN count(n) AS total",
            {"uid": user_id},
        )
        total = count_result["total"] if count_result else 0

        results = await graph_service.run("""
            MATCH (n:Notification {recipient_id: $uid})
            RETURN n {.id, .type, .title, .message, .severity, .shipment_id, .is_read, .created_at, .read_at}
            ORDER BY n.created_at DESC SKIP $skip LIMIT $limit
        """, {"uid": user_id, "skip": skip, "limit": limit})

        return {
            "items": [r["n"] for r in results],
            "total": total, "page": page, "limit": limit,
            "pages": max(1, (total + limit - 1) // limit),
        }

    async def mark_read(self, notification_id: str, user_id: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        result = await graph_service.run("""
            MATCH (n:Notification {id: $nid, recipient_id: $uid})
            SET n.is_read = true, n.read_at = $now
            RETURN n.id AS id
        """, {"nid": notification_id, "uid": user_id, "now": now})
        return len(result) > 0

    async def mark_all_read(self, user_id: str) -> int:
        now = datetime.now(timezone.utc).isoformat()
        result = await graph_service.run("""
            MATCH (n:Notification {recipient_id: $uid, is_read: false})
            SET n.is_read = true, n.read_at = $now
            RETURN count(n) AS c
        """, {"uid": user_id, "now": now})
        return result[0]["c"] if result else 0


notification_service = NotificationService()
