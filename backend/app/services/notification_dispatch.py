"""
Notification dispatch rules — maps each workflow transition to the set of
recipients who should be notified.  The triggering user is always excluded.
"""
from app.models.enums import ShipmentStatus, UserRole
from app.services.graph_service import graph_service
from app.services.notification_service import notification_service


# ── Dispatch rules keyed by *target* status ──────────────────────────────
# recipient types:
#   "customer"              → user who created the shipment
#   "assigned_drivers"      → pickup / delivery drivers
#   "role:<ROLE>"           → all active users of that role
#   "role:<ROLE>:origin"    → role scoped to shipment's origin port
#   "role:<ROLE>:dest"      → role scoped to shipment's destination port

NOTIFICATION_RULES: dict[ShipmentStatus, dict] = {
    ShipmentStatus.UNDER_REVIEW: {
        "recipients": ["role:LOGISTICS_MANAGER", "role:ADMIN"],
        "title": "New Shipment Request",
        "message": "Shipment {sid} has been submitted and needs review.",
        "severity": "MEDIUM",
        "type": "ACTION_REQUIRED",
    },
    ShipmentStatus.APPROVED: {
        "recipients": ["customer"],
        "title": "Shipment Approved",
        "message": "Your shipment {sid} has been approved.",
        "severity": "LOW",
        "type": "STATUS_CHANGE",
    },
    ShipmentStatus.REJECTED: {
        "recipients": ["customer"],
        "title": "Shipment Rejected",
        "message": "Your shipment {sid} has been rejected.",
        "severity": "HIGH",
        "type": "ALERT",
    },
    ShipmentStatus.DRIVER_ASSIGNED: {
        "recipients": ["customer", "assigned_drivers"],
        "title": "Driver Assigned",
        "message": "A driver has been assigned to shipment {sid} for pickup.",
        "severity": "MEDIUM",
        "type": "STATUS_CHANGE",
    },
    ShipmentStatus.PICKUP_EN_ROUTE: {
        "recipients": ["customer", "role:LOGISTICS_MANAGER"],
        "title": "Driver En Route for Pickup",
        "message": "The driver is en route to pick up shipment {sid}.",
        "severity": "LOW",
        "type": "STATUS_CHANGE",
    },
    ShipmentStatus.GOODS_RELEASED: {
        "recipients": ["assigned_drivers", "role:LOGISTICS_MANAGER"],
        "title": "Goods Released",
        "message": "Goods for shipment {sid} have been released by the customer.",
        "severity": "MEDIUM",
        "type": "STATUS_CHANGE",
    },
    ShipmentStatus.IN_TRANSIT_TO_PORT: {
        "recipients": ["customer", "role:PORT_OFFICER:origin"],
        "title": "In Transit to Port",
        "message": "Shipment {sid} is in transit to the origin port.",
        "severity": "LOW",
        "type": "STATUS_CHANGE",
    },
    ShipmentStatus.PORT_ENTRY: {
        "recipients": ["customer", "role:CUSTOMS_OFFICER", "role:LOGISTICS_MANAGER"],
        "title": "Port Entry",
        "message": "Shipment {sid} has arrived at the port.",
        "severity": "MEDIUM",
        "type": "ACTION_REQUIRED",
    },
    ShipmentStatus.CUSTOMS_CLEARANCE: {
        "recipients": ["customer", "role:LOGISTICS_MANAGER", "role:YARD_MANAGER:origin"],
        "title": "Customs Cleared",
        "message": "Shipment {sid} has cleared customs.",
        "severity": "MEDIUM",
        "type": "STATUS_CHANGE",
    },
    ShipmentStatus.IN_YARD: {
        "recipients": ["customer", "role:LOGISTICS_MANAGER", "role:PORT_OFFICER:origin"],
        "title": "In Yard",
        "message": "Shipment {sid} is now stored in the yard.",
        "severity": "LOW",
        "type": "STATUS_CHANGE",
    },
    ShipmentStatus.LOADED_ON_VESSEL: {
        "recipients": ["customer", "role:LOGISTICS_MANAGER"],
        "title": "Loaded on Vessel",
        "message": "Shipment {sid} has been loaded onto the vessel.",
        "severity": "LOW",
        "type": "STATUS_CHANGE",
    },
    ShipmentStatus.IN_TRANSIT_SEA: {
        "recipients": ["customer"],
        "title": "In Transit — Sea",
        "message": "Shipment {sid} is now in transit at sea.",
        "severity": "LOW",
        "type": "STATUS_CHANGE",
    },
    ShipmentStatus.ARRIVED_DEST_PORT: {
        "recipients": ["customer", "role:PORT_OFFICER:dest", "role:LOGISTICS_MANAGER"],
        "title": "Arrived at Destination Port",
        "message": "Shipment {sid} has arrived at the destination port.",
        "severity": "MEDIUM",
        "type": "STATUS_CHANGE",
    },
    ShipmentStatus.LAST_MILE_ASSIGNED: {
        "recipients": ["customer", "assigned_drivers"],
        "title": "Delivery Driver Assigned",
        "message": "A delivery driver has been assigned for shipment {sid}.",
        "severity": "MEDIUM",
        "type": "STATUS_CHANGE",
    },
    ShipmentStatus.DELIVERED: {
        "recipients": ["customer", "role:LOGISTICS_MANAGER", "role:ADMIN"],
        "title": "Shipment Delivered",
        "message": "Shipment {sid} has been successfully delivered.",
        "severity": "LOW",
        "type": "STATUS_CHANGE",
    },
    ShipmentStatus.CANCELLED: {
        "recipients": ["stakeholders"],
        "title": "Shipment Cancelled",
        "message": "Shipment {sid} has been cancelled.",
        "severity": "HIGH",
        "type": "ALERT",
    },
}


async def _get_shipment_context(shipment_id: str) -> dict:
    """Fetch customer, drivers, origin/dest port IDs for a shipment."""
    result = await graph_service.run_single("""
        MATCH (s:Shipment {id: $sid})
        OPTIONAL MATCH (cust:User)-[:REQUESTED]->(s)
        OPTIONAL MATCH (dp:User)-[:ASSIGNED_PICKUP]->(s)
        OPTIONAL MATCH (dd:User)-[:ASSIGNED_DELIVERY]->(s)
        OPTIONAL MATCH (s)-[:ORIGIN_PORT]->(op:Port)
        OPTIONAL MATCH (s)-[:DEST_PORT]->(dport:Port)
        RETURN cust.id            AS customer_id,
               collect(DISTINCT dp.id)  + collect(DISTINCT dd.id) AS driver_ids,
               op.id              AS origin_port_id,
               dport.id           AS dest_port_id
    """, {"sid": shipment_id})

    if not result:
        return {"customer_id": None, "driver_ids": [], "origin_port_id": None, "dest_port_id": None}

    driver_ids = [d for d in (result.get("driver_ids") or []) if d is not None]
    return {
        "customer_id": result.get("customer_id"),
        "driver_ids": driver_ids,
        "origin_port_id": result.get("origin_port_id"),
        "dest_port_id": result.get("dest_port_id"),
    }


async def dispatch_transition_notifications(
    shipment_id: str,
    to_status: ShipmentStatus,
    triggered_by_user_id: str,
):
    """Send notifications for a workflow transition to all relevant recipients."""
    rule = NOTIFICATION_RULES.get(to_status)
    if not rule:
        return

    ctx = await _get_shipment_context(shipment_id)
    title = rule["title"]
    message = rule["message"].format(sid=shipment_id)
    severity = rule["severity"]
    notif_type = rule["type"]

    notified: set[str] = set()

    async def _notify_user(uid: str):
        if uid and uid != triggered_by_user_id and uid not in notified:
            notified.add(uid)
            await notification_service.create(uid, title, message, severity, notif_type, shipment_id)

    for recipient in rule["recipients"]:
        if recipient == "customer":
            await _notify_user(ctx["customer_id"])

        elif recipient == "assigned_drivers":
            for did in ctx["driver_ids"]:
                await _notify_user(did)

        elif recipient == "stakeholders":
            # Notify all linked users (customer + drivers)
            await _notify_user(ctx["customer_id"])
            for did in ctx["driver_ids"]:
                await _notify_user(did)
            # Also notify managers/admin
            await _notify_role("LOGISTICS_MANAGER", None, notified, triggered_by_user_id,
                               title, message, severity, notif_type, shipment_id)
            await _notify_role("ADMIN", None, notified, triggered_by_user_id,
                               title, message, severity, notif_type, shipment_id)

        elif recipient.startswith("role:"):
            parts = recipient.split(":")
            role = parts[1]
            port_id = None
            if len(parts) == 3:
                port_key = parts[2]  # "origin" or "dest"
                port_id = ctx.get(f"{port_key}_port_id")
            await _notify_role(role, port_id, notified, triggered_by_user_id,
                               title, message, severity, notif_type, shipment_id)


async def _notify_role(
    role: str, port_id: str | None, notified: set, exclude_uid: str,
    title: str, message: str, severity: str, notif_type: str, shipment_id: str,
):
    """Notify all active users of a role, optionally scoped to a port."""
    where = "WHERE u.role = $role AND u.is_active = true"
    params: dict = {"role": role}
    if port_id:
        where += " AND u.assigned_port_id = $port_id"
        params["port_id"] = port_id

    users = await graph_service.run(f"MATCH (u:User) {where} RETURN u.id AS uid", params)
    for u in users:
        uid = u["uid"]
        if uid and uid != exclude_uid and uid not in notified:
            notified.add(uid)
            await notification_service.create(uid, title, message, severity, notif_type, shipment_id)
