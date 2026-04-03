import uuid
import json
from datetime import datetime, timezone
from app.services.graph_service import graph_service
from app.models.enums import ShipmentStatus, UserRole, TERMINAL_STATUSES
from app.services.notification_dispatch import dispatch_transition_notifications


TRANSITIONS = {
    ShipmentStatus.REQUEST_SUBMITTED: {
        "next": [ShipmentStatus.UNDER_REVIEW],
        "triggered_by": ["SYSTEM"],
        "required_form": None,
    },
    ShipmentStatus.UNDER_REVIEW: {
        "next": [ShipmentStatus.APPROVED, ShipmentStatus.REJECTED],
        "triggered_by": [UserRole.LOGISTICS_MANAGER, UserRole.ADMIN],
        "required_form": "APPROVAL_FORM",
    },
    ShipmentStatus.APPROVED: {
        "next": [ShipmentStatus.AWAITING_CUSTOMER_DETAILS],
        "triggered_by": [UserRole.CUSTOMER],
        "required_form": "CUSTOMER_DETAILS",
    },
    ShipmentStatus.AWAITING_CUSTOMER_DETAILS: {
        "next": [ShipmentStatus.DRIVER_ASSIGNED],
        "triggered_by": [UserRole.LOGISTICS_MANAGER, UserRole.ADMIN],
        "required_form": "DRIVER_ASSIGNMENT",
    },
    ShipmentStatus.DRIVER_ASSIGNED: {
        "next": [ShipmentStatus.PICKUP_EN_ROUTE],
        "triggered_by": [UserRole.DRIVER],
        "required_form": None,
    },
    ShipmentStatus.PICKUP_EN_ROUTE: {
        "next": [ShipmentStatus.GOODS_RELEASED],
        "triggered_by": [UserRole.CUSTOMER],
        "required_form": "RELEASE_FORM",
    },
    ShipmentStatus.GOODS_RELEASED: {
        "next": [ShipmentStatus.GOODS_COLLECTED],
        "triggered_by": [UserRole.DRIVER],
        "required_form": "HANDOVER_CONFIRMATION",
    },
    ShipmentStatus.GOODS_COLLECTED: {
        "next": [ShipmentStatus.IN_TRANSIT_TO_PORT],
        "triggered_by": [UserRole.DRIVER],
        "required_form": None,
    },
    ShipmentStatus.IN_TRANSIT_TO_PORT: {
        "next": [ShipmentStatus.PORT_ENTRY],
        "triggered_by": [UserRole.DRIVER, UserRole.PORT_OFFICER],
        "required_form": "PORT_ENTRY_DECLARATION",
    },
    ShipmentStatus.PORT_ENTRY: {
        "next": [ShipmentStatus.CUSTOMS_CLEARANCE],
        "triggered_by": [UserRole.PORT_OFFICER],
        "required_form": "CUSTOMS_DECLARATION",
    },
    ShipmentStatus.CUSTOMS_CLEARANCE: {
        "next": [ShipmentStatus.IN_YARD],
        "triggered_by": [UserRole.CUSTOMS_OFFICER],
        "required_form": "CUSTOMS_REVIEW",
    },
    ShipmentStatus.IN_YARD: {
        "next": [ShipmentStatus.LOADED_ON_VESSEL],
        "triggered_by": [UserRole.PORT_OFFICER, UserRole.YARD_MANAGER],
        "required_form": "BILL_OF_LADING",
    },
    ShipmentStatus.LOADED_ON_VESSEL: {
        "next": [ShipmentStatus.IN_TRANSIT_SEA],
        "triggered_by": [UserRole.PORT_OFFICER],
        "required_form": "DEPARTURE_CLEARANCE",
    },
    ShipmentStatus.IN_TRANSIT_SEA: {
        "next": [ShipmentStatus.ARRIVED_DEST_PORT],
        "triggered_by": [UserRole.PORT_OFFICER],
        "required_form": "ARRIVAL_CONFIRMATION",
    },
    ShipmentStatus.ARRIVED_DEST_PORT: {
        "next": [ShipmentStatus.LAST_MILE_ASSIGNED],
        "triggered_by": [UserRole.LOGISTICS_MANAGER, UserRole.ADMIN],
        "required_form": "LAST_MILE_ASSIGNMENT",
    },
    ShipmentStatus.LAST_MILE_ASSIGNED: {
        "next": [ShipmentStatus.DELIVERED],
        "triggered_by": [UserRole.DRIVER],
        "required_form": "PROOF_OF_DELIVERY",
    },
}


class WorkflowEngine:
    async def create_shipment_request(self, request_data: dict, user: dict) -> dict:
        """Create a new shipment and auto-set to UNDER_REVIEW."""
        ship_id = f"SHP-{datetime.now(timezone.utc).strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
        now = datetime.now(timezone.utc).isoformat()

        await graph_service.run("""
            CREATE (s:Shipment {
                id: $id, status: 'UNDER_REVIEW',
                cargo_description: $cargo_description, cargo_type: $cargo_type,
                weight_kg: $weight_kg, quantity: $quantity,
                declared_value_usd: $declared_value_usd,
                container_type: $container_type, priority: $priority,
                notes: $notes,
                created_at: $now, updated_at: $now
            })
        """, {
            "id": ship_id,
            "cargo_description": request_data.get("cargo_description", ""),
            "cargo_type": request_data.get("cargo_type", "GENERAL"),
            "weight_kg": request_data.get("weight_kg", 0),
            "quantity": request_data.get("quantity", 1),
            "declared_value_usd": request_data.get("declared_value_usd", 0),
            "container_type": request_data.get("container_type"),
            "priority": request_data.get("priority", "MEDIUM"),
            "notes": request_data.get("notes"),
            "now": now,
        })

        # Link to customer
        await graph_service.run("""
            MATCH (u:User {id: $uid}), (s:Shipment {id: $sid})
            CREATE (u)-[:REQUESTED]->(s)
        """, {"uid": user["id"], "sid": ship_id})

        # Link to origin port
        if request_data.get("origin_port_id"):
            await graph_service.run("""
                MATCH (s:Shipment {id: $sid}), (p:Port {id: $pid})
                CREATE (s)-[:ORIGIN_PORT]->(p)
            """, {"sid": ship_id, "pid": request_data["origin_port_id"]})

        # Link to destination port
        if request_data.get("dest_port_id"):
            await graph_service.run("""
                MATCH (s:Shipment {id: $sid}), (p:Port {id: $pid})
                CREATE (s)-[:DEST_PORT]->(p)
            """, {"sid": ship_id, "pid": request_data["dest_port_id"]})

        # Link to company if user has one
        if user.get("company_id"):
            await graph_service.run("""
                MATCH (s:Shipment {id: $sid}), (c:Company {id: $cid})
                CREATE (s)-[:BELONGS_TO]->(c)
            """, {"sid": ship_id, "cid": user["company_id"]})

        # Create initial timeline event
        evt_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        await graph_service.run("""
            CREATE (e:Event {
                id: $eid,
                type: 'STATUS_CHANGE',
                from_status: 'REQUEST_SUBMITTED',
                to_status: 'UNDER_REVIEW',
                triggered_by: $user_name,
                shipment_id: $sid,
                timestamp: $now,
                details: 'Shipment request auto-submitted for review'
            })
            WITH e
            MATCH (s:Shipment {id: $sid})
            CREATE (s)-[:HAS_EVENT]->(e)
        """, {"eid": evt_id, "sid": ship_id, "user_name": user.get("name", "System"), "now": now})

        await self._dispatch_notifications(ship_id, ShipmentStatus.UNDER_REVIEW, user)

        return {"id": ship_id, "status": "UNDER_REVIEW"}

    async def _dispatch_notifications(self, shipment_id: str, to_status: ShipmentStatus, user: dict):
        """Fire-and-forget notification dispatch (errors are silently ignored)."""
        try:
            await dispatch_transition_notifications(shipment_id, to_status, user["id"])
        except Exception:
            pass  # notifications should never block the workflow

    async def transition(
        self, shipment_id: str, to_status: ShipmentStatus, user: dict,
        form_data: dict | None = None, notes: str | None = None,
    ) -> dict:
        # Get current shipment
        ship = await graph_service.run_single(
            "MATCH (s:Shipment {id: $id}) RETURN s.status AS status", {"id": shipment_id}
        )
        if not ship:
            raise ValueError(f"Shipment {shipment_id} not found")

        current = ShipmentStatus(ship["status"])
        if current in TERMINAL_STATUSES:
            raise ValueError(f"Shipment is in terminal status {current.value}")

        rule = TRANSITIONS.get(current)
        if not rule:
            raise ValueError(f"No transitions defined for {current.value}")

        if to_status not in rule["next"]:
            raise ValueError(f"Cannot transition from {current.value} to {to_status.value}")

        # Check role (ADMIN bypasses)
        user_role = user["role"]
        if user_role != UserRole.ADMIN and user_role not in [r.value if hasattr(r, 'value') else r for r in rule["triggered_by"]]:
            raise PermissionError(f"Role {user_role} cannot trigger this transition")

        # Check required form
        if rule["required_form"] and not form_data:
            raise ValueError(f"Form {rule['required_form']} is required for this transition")

        # Create event
        event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now(timezone.utc).isoformat()

        details = json.dumps(form_data) if form_data else "{}"
        if notes:
            details = notes

        await graph_service.run("""
            MATCH (s:Shipment {id: $sid})
            SET s.status = $to_status, s.updated_at = $now
            CREATE (e:Event {
                id: $eid, type: 'STATUS_CHANGE',
                from_status: $from_status, to_status: $to_status_str,
                triggered_by: $uid, shipment_id: $sid,
                timestamp: $now, details: $details
            })
            CREATE (s)-[:HAS_EVENT]->(e)
        """, {
            "sid": shipment_id, "to_status": to_status.value, "now": now,
            "eid": event_id, "from_status": current.value,
            "to_status_str": to_status.value, "uid": user["id"],
            "details": details,
        })

        # If form_data provided, create Document node
        if form_data and rule["required_form"]:
            doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
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
                "sid": shipment_id, "uid": user["id"], "did": doc_id,
                "dtype": rule["required_form"], "data": json.dumps(form_data), "now": now,
            })

        # Store pickup location on Shipment when customer provides details
        if to_status == ShipmentStatus.AWAITING_CUSTOMER_DETAILS and form_data:
            await graph_service.run("""
                MATCH (s:Shipment {id: $sid})
                SET s.pickup_address = $addr,
                    s.pickup_lat = $lat,
                    s.pickup_lng = $lng,
                    s.cargo_weight_kg = $weight,
                    s.trucks_required = $trucks
            """, {
                "sid": shipment_id,
                "addr": form_data.get("pickup_address", ""),
                "lat": float(form_data.get("pickup_lat", 0)),
                "lng": float(form_data.get("pickup_lng", 0)),
                "weight": float(form_data.get("cargo_weight_kg", 0)),
                "trucks": int(form_data.get("trucks_required", 1)),
            })

        # Create driver-shipment relationship when driver is assigned
        if to_status == ShipmentStatus.DRIVER_ASSIGNED and form_data and form_data.get("driver_id"):
            await graph_service.run("""
                MATCH (u:User {id: $driver_id}), (s:Shipment {id: $sid})
                MERGE (u)-[:ASSIGNED_PICKUP]->(s)
            """, {"driver_id": form_data["driver_id"], "sid": shipment_id})

        await self._dispatch_notifications(shipment_id, to_status, user)

        return {
            "shipment_id": shipment_id, "from_status": current.value,
            "to_status": to_status.value, "event_id": event_id,
            "message": f"Transitioned from {current.value} to {to_status.value}",
        }

    async def cancel_shipment(self, shipment_id: str, reason: str, user: dict) -> dict:
        if user["role"] not in [UserRole.LOGISTICS_MANAGER, UserRole.ADMIN]:
            raise PermissionError("Only Logistics Manager or Admin can cancel shipments")
        if not reason:
            raise ValueError("Cancellation reason is required")

        ship = await graph_service.run_single(
            "MATCH (s:Shipment {id: $id}) RETURN s.status AS status", {"id": shipment_id}
        )
        if not ship:
            raise ValueError(f"Shipment {shipment_id} not found")
        current = ShipmentStatus(ship["status"])
        if current in TERMINAL_STATUSES:
            raise ValueError(f"Cannot cancel: shipment is already {current.value}")

        event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now(timezone.utc).isoformat()

        await graph_service.run("""
            MATCH (s:Shipment {id: $sid})
            SET s.status = 'CANCELLED', s.updated_at = $now
            CREATE (e:Event {
                id: $eid, type: 'STATUS_CHANGE',
                from_status: $from_status, to_status: 'CANCELLED',
                triggered_by: $uid, shipment_id: $sid,
                timestamp: $now, details: $details
            })
            CREATE (s)-[:HAS_EVENT]->(e)
        """, {
            "sid": shipment_id, "from_status": current.value,
            "eid": event_id, "uid": user["id"], "now": now,
            "details": json.dumps({"reason": reason}),
        })

        await self._dispatch_notifications(shipment_id, ShipmentStatus.CANCELLED, user)

        return {"shipment_id": shipment_id, "status": "CANCELLED", "event_id": event_id}

    async def get_available_transitions(self, shipment_id: str, user_role: str) -> list[dict]:
        ship = await graph_service.run_single(
            "MATCH (s:Shipment {id: $id}) RETURN s.status AS status", {"id": shipment_id}
        )
        if not ship:
            return []
        current = ShipmentStatus(ship["status"])
        rule = TRANSITIONS.get(current)
        if not rule:
            return []

        available = []
        for next_status in rule["next"]:
            role_values = [r.value if hasattr(r, 'value') else r for r in rule["triggered_by"]]
            if user_role in role_values or user_role == UserRole.ADMIN:
                available.append({
                    "to_status": next_status.value,
                    "required_form": rule["required_form"],
                })
        return available

    async def get_timeline(self, shipment_id: str) -> list[dict]:
        results = await graph_service.run("""
            MATCH (s:Shipment {id: $id})-[:HAS_EVENT]->(e:Event)
            RETURN e {.id, .type, .from_status, .to_status, .triggered_by, .timestamp, .details}
            ORDER BY e.timestamp ASC
        """, {"id": shipment_id})
        return [r["e"] for r in results]


workflow_engine = WorkflowEngine()
