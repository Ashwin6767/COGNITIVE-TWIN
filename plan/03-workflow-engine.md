# Module 03 — Workflow Engine

## Goal
Build a state machine that controls shipment lifecycle. Every status change is validated, logged as an Event node in the graph, and triggers side effects (notifications, form unlocks, AI checks).

---

## Shipment Status Enum

```python
class ShipmentStatus(str, Enum):
    REQUEST_SUBMITTED = "REQUEST_SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"               # Terminal — request denied
    DRIVER_ASSIGNED = "DRIVER_ASSIGNED"
    PICKUP_EN_ROUTE = "PICKUP_EN_ROUTE"
    GOODS_RELEASED = "GOODS_RELEASED"
    IN_TRANSIT_TO_PORT = "IN_TRANSIT_TO_PORT"
    PORT_ENTRY = "PORT_ENTRY"
    CUSTOMS_CLEARANCE = "CUSTOMS_CLEARANCE"
    IN_YARD = "IN_YARD"
    LOADED_ON_VESSEL = "LOADED_ON_VESSEL"
    IN_TRANSIT_SEA = "IN_TRANSIT_SEA"
    ARRIVED_DEST_PORT = "ARRIVED_DEST_PORT"
    LAST_MILE_ASSIGNED = "LAST_MILE_ASSIGNED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"             # Terminal — can be reached from any non-terminal status
```

---

## Transition Rules

Each row defines: which status can go to which next status, who can trigger it, and what happens.

```python
TRANSITIONS = {
    # Auto-transition: REQUEST_SUBMITTED → UNDER_REVIEW happens on creation
    "REQUEST_SUBMITTED": {
        "next": ["UNDER_REVIEW"],
        "triggered_by": ["SYSTEM"],  # Auto-transitions on ShipmentRequest creation
        "action": "Auto-begin review",
        "side_effects": ["notify_logistics_team"],
    },
    "UNDER_REVIEW": {
        "next": ["APPROVED", "REJECTED"],
        "triggered_by": ["LOGISTICS_MANAGER", "ADMIN"],
        "action": "Approve or reject the shipment request",
        "required_form": "APPROVAL_FORM",
        "side_effects": ["notify_customer", "create_shipment_node"],
    },
    "APPROVED": {
        "next": ["DRIVER_ASSIGNED"],
        "triggered_by": ["LOGISTICS_MANAGER", "ADMIN"],
        "action": "Assign a driver for pickup",
        "required_form": "DRIVER_ASSIGNMENT",
        "side_effects": ["notify_driver", "notify_customer"],
    },
    "DRIVER_ASSIGNED": {
        "next": ["PICKUP_EN_ROUTE"],
        "triggered_by": ["DRIVER"],
        "action": "Driver confirms and starts heading to pickup",
        "side_effects": ["start_driver_tracking", "notify_customer_driver_info"],
    },
    "PICKUP_EN_ROUTE": {
        "next": ["GOODS_RELEASED"],
        "triggered_by": ["CUSTOMER"],
        "action": "Customer signs release form, hands goods to driver",
        "required_form": "RELEASE_FORM",
        "side_effects": ["notify_logistics_team"],
    },
    "GOODS_RELEASED": {
        "next": ["IN_TRANSIT_TO_PORT"],
        "triggered_by": ["DRIVER"],
        "action": "Driver departs toward port with goods",
        "side_effects": ["start_transit_tracking"],
    },
    "IN_TRANSIT_TO_PORT": {
        "next": ["PORT_ENTRY"],
        "triggered_by": ["DRIVER", "PORT_OFFICER"],
        "action": "Arrive at port, begin entry process",
        "required_form": "PORT_ENTRY_DECLARATION",
        "side_effects": ["notify_port_officer", "notify_customs"],
    },
    "PORT_ENTRY": {
        "next": ["CUSTOMS_CLEARANCE"],
        "triggered_by": ["PORT_OFFICER"],  # Fix #4: PORT_OFFICER triggers, not CUSTOMS_OFFICER
        "action": "Port entry complete, submit customs declaration for review",
        "required_form": "CUSTOMS_DECLARATION",
        "side_effects": ["notify_customs_officer"],
    },
    "CUSTOMS_CLEARANCE": {
        "next": ["IN_YARD"],
        "triggered_by": ["CUSTOMS_OFFICER"],
        "action": "Customs officer reviews and clears, container moves to yard",
        "required_form": "CUSTOMS_REVIEW",  # Fix #3: Separate review form
        "side_effects": ["notify_yard_manager", "assign_yard_slot"],
    },
    "IN_YARD": {
        "next": ["LOADED_ON_VESSEL"],
        "triggered_by": ["PORT_OFFICER", "YARD_MANAGER"],
        "action": "Container loaded onto vessel, BOL issued",
        "required_form": "BILL_OF_LADING",
        "side_effects": ["notify_logistics_team", "create_bol"],
    },
    "LOADED_ON_VESSEL": {
        "next": ["IN_TRANSIT_SEA"],
        "triggered_by": ["PORT_OFFICER"],
        "action": "Vessel departs, sea transit begins",
        "required_form": "DEPARTURE_CLEARANCE",
        "side_effects": ["start_vessel_tracking", "notify_dest_port"],
    },
    "IN_TRANSIT_SEA": {
        "next": ["ARRIVED_DEST_PORT"],
        "triggered_by": ["PORT_OFFICER"],
        "action": "Vessel arrives at destination port",
        "required_form": "ARRIVAL_CONFIRMATION",
        "side_effects": ["notify_logistics_team", "notify_customer"],
    },
    "ARRIVED_DEST_PORT": {
        "next": ["LAST_MILE_ASSIGNED"],
        "triggered_by": ["LOGISTICS_MANAGER", "ADMIN"],
        "action": "Assign last-mile driver for delivery",
        "required_form": "LAST_MILE_ASSIGNMENT",
        "side_effects": ["notify_driver", "notify_customer"],
    },
    "LAST_MILE_ASSIGNED": {
        "next": ["DELIVERED"],
        "triggered_by": ["DRIVER"],  # Fix #12: Only DRIVER triggers delivery
        "action": "Delivery completed, proof of delivery signed",
        "required_form": "PROOF_OF_DELIVERY",
        "side_effects": ["notify_all_stakeholders", "close_shipment"],
    },
    # REJECTED and CANCELLED are terminal states — no outgoing transitions
    # CANCELLED can be reached from any non-terminal status by LOGISTICS_MANAGER/ADMIN:
    # WorkflowEngine.cancel_shipment(shipment_id, reason, user) handles this separately.
}
```

---

## Implementation

### File: `backend/app/services/workflow_engine.py`

```python
class WorkflowEngine:
    """Controls shipment lifecycle transitions."""

    async def transition(
        self,
        shipment_id: str,
        to_status: str,
        triggered_by_user: dict,  # From JWT
        form_data: dict | None = None,
    ) -> dict:
        """
        Move a shipment to the next status.

        Steps:
        1. Load current shipment from Neo4j
        2. Validate: is to_status a valid next state?
        3. Validate: does the user's role have permission?
        4. Validate: is the required form submitted?
        5. Create Event node in graph
        6. Update Shipment.status
        7. Execute side effects (notifications, AI check, etc.)
        8. Return updated shipment + event
        """

    async def get_available_transitions(
        self,
        shipment_id: str,
        user_role: str,
    ) -> list[dict]:
        """
        Return which transitions the current user can trigger
        for this shipment, given its current status and their role.
        """

    async def get_shipment_timeline(
        self,
        shipment_id: str,
    ) -> list[dict]:
        """
        Return all Event nodes for a shipment, ordered by timestamp.
        This is the full audit trail.
        """

    async def cancel_shipment(
        self,
        shipment_id: str,
        reason: str,
        cancelled_by_user: dict,
    ) -> dict:
        """
        Cancel a shipment from any non-terminal status.
        Only LOGISTICS_MANAGER and ADMIN can cancel.
        Creates CANCELLED Event node with reason.
        """
```

### File: `backend/app/routers/workflow.py`

```
POST /api/workflow/{shipment_id}/transition
    Body: { "to_status": "APPROVED", "form_data": {...} }
    Auth: JWT required, role checked against TRANSITIONS

GET /api/workflow/{shipment_id}/transitions
    Returns: available next states for current user

GET /api/workflow/{shipment_id}/timeline
    Returns: ordered list of all events for this shipment
```

---

## Event Node Structure

Every transition creates an Event:

```cypher
CREATE (e:Event {
    id: randomUUID(),
    type: "STATUS_CHANGE",
    from_status: $from_status,
    to_status: $to_status,
    triggered_by: $user_id,
    shipment_id: $shipment_id,
    timestamp: datetime(),
    details: $json_details    // includes form_data summary
})
CREATE (s)-[:HAS_EVENT]->(e)
CREATE (u)-[:TRIGGERED]->(e)
```

---

## Side Effects System

```python
SIDE_EFFECT_HANDLERS = {
    "notify_customer": NotificationService.notify_user_by_role,
    "notify_driver": NotificationService.notify_assigned_driver,
    "notify_logistics_team": NotificationService.notify_role_group,
    "notify_port_officer": NotificationService.notify_port_staff,
    "notify_customs": NotificationService.notify_customs_team,
    "notify_customs_officer": NotificationService.notify_customs_team,
    "notify_yard_manager": NotificationService.notify_yard_staff,
    "create_shipment_node": WorkflowEngine.create_shipment_from_request,
    "assign_yard_slot": YardService.auto_assign_slot,         # Defined in Module 05 (yard router)
    "create_bol": DocumentService.generate_bol,               # Defined in Module 04 (document_service.py)
    "start_driver_tracking": EventService.start_tracking,     # Defined in Module 07 (event_service.py)
    "start_transit_tracking": EventService.start_tracking,    # Defined in Module 07
    "start_vessel_tracking": EventService.start_vessel_tracking,  # Defined in Module 07
    "close_shipment": WorkflowEngine.mark_complete,
    "notify_all_stakeholders": NotificationService.notify_shipment_stakeholders,
    "notify_customer_driver_info": NotificationService.notify_user_by_role,
    "notify_dest_port": NotificationService.notify_port_staff,
}
```

---

## Files to Create

```
backend/app/services/workflow_engine.py   # Core state machine
backend/app/routers/workflow.py           # API endpoints
backend/app/models/event.py               # Event model
backend/app/models/workflow.py            # TransitionRequest, TransitionResponse
```

---

## Testing

```
test_valid_transition           — UNDER_REVIEW → APPROVED by LOGISTICS_MANAGER → 200
test_invalid_transition         — REQUEST_SUBMITTED → DELIVERED (skip) → 400
test_wrong_role_transition      — CUSTOMER tries to approve → 403
test_missing_form               — Transition requiring form, no form_data → 400
test_event_created              — After transition, Event node exists in graph
test_timeline_ordered           — Timeline returns events in timestamp order
test_available_transitions      — Returns only valid next states for user's role
test_terminal_state             — DELIVERED has no further transitions
test_rejected_terminal          — REJECTED is terminal, no outgoing transitions
test_cancel_shipment            — Any status → CANCELLED by LOGISTICS_MANAGER
test_cancel_requires_reason     — Cancel without reason → 400
```
