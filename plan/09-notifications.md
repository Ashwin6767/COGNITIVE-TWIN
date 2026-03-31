# Module 09 — Notifications & Alerts

## Goal
Smart notification system that routes alerts to the right users based on their role. A customs hold doesn't bother the driver. A delivery confirmation reaches the customer immediately.

---

## Notification Model

> **Note:** Neo4j is fine for notifications at hackathon scale. In production, move notification
> storage to PostgreSQL or Redis for better read performance. Keep the Notification→Shipment/User
> graph relationships for analytics, but serve read queries from the relational store.

```cypher
(:Notification {
    id: string,
    type: string,         // "STATUS_CHANGE", "ACTION_REQUIRED", "ALERT", "INFO"
    title: string,
    message: string,
    severity: string,     // "LOW", "MEDIUM", "HIGH", "CRITICAL"
    recipient_id: string, // User ID
    shipment_id: string | null,
    is_read: boolean,
    created_at: datetime,
    read_at: datetime | null
})

(:Notification)-[:FOR_USER]->(:User)
(:Notification)-[:ABOUT]->(:Shipment)
```

---

## Notification Rules

| Event | Who Gets Notified | Severity | Type |
|-------|-------------------|----------|------|
| Shipment request submitted | Logistics Manager | MEDIUM | ACTION_REQUIRED |
| Shipment approved | Customer | LOW | INFO |
| Driver assigned | Driver, Customer | MEDIUM | INFO |
| Driver arrived for pickup | Customer | LOW | INFO |
| Goods released (release form signed) | Logistics Manager | LOW | INFO |
| Arrived at port | Port Officer | MEDIUM | ACTION_REQUIRED |
| Customs declaration submitted | Customs Officer | MEDIUM | ACTION_REQUIRED |
| Customs cleared | Logistics Manager, Customer | LOW | INFO |
| Customs held | Logistics Manager | HIGH | ALERT |
| Container placed in yard | Yard Manager | LOW | INFO |
| Loaded on vessel | Customer, Logistics Manager | LOW | INFO |
| Vessel departed | Customer | LOW | INFO |
| Vessel arrived at destination | Customer, Logistics Manager, Port Officer | MEDIUM | INFO |
| Last mile driver assigned | Driver, Customer | MEDIUM | INFO |
| Delivered (POD signed) | Customer, Logistics Manager | LOW | INFO |
| Shipment stuck too long | Logistics Manager | HIGH | ALERT |
| Port congestion alert | Logistics Manager, Port Officer | HIGH | ALERT |
| Cascade impact detected | All affected stakeholders | CRITICAL | ALERT |

---

## Backend Implementation

### File: `backend/app/services/notification_service.py`

```python
class NotificationService:
    """Creates and delivers notifications."""

    async def create(self, recipient_id, title, message, severity, type, shipment_id=None) -> dict:
        """Create Notification node in graph and push via WebSocket."""

    async def notify_role_group(self, role, title, message, severity, type, shipment_id=None, port_id=None):
        """Notify users with a specific role, optionally scoped to a port.
        If port_id is provided, only notifies users with that assigned_port_id."""

    async def notify_shipment_stakeholders(self, shipment_id, title, message, severity, type):
        """Notify all users linked to a shipment (customer, assigned driver, port officer)."""

    async def mark_read(self, notification_id, user_id):
        """Mark a notification as read."""

    async def get_unread(self, user_id) -> list:
        """Get unread notifications for a user, newest first."""

    async def get_unread_count(self, user_id) -> int:
        """Count unread notifications."""

    async def get_all(self, user_id, page=1, limit=20) -> dict:
        """Get paginated notifications for a user."""
```

### File: `backend/app/routers/notifications.py`

```
GET  /api/notifications              — User's notifications (paginated)
GET  /api/notifications/unread-count — { "count": 5 }
PUT  /api/notifications/{id}/read    — Mark as read
PUT  /api/notifications/read-all     — Mark all as read
```

---

## Frontend Implementation

### File: `frontend/components/notifications/NotificationBell.jsx`

```jsx
// In TopBar: bell icon with unread count badge
// Click opens dropdown with recent notifications
// Each notification: icon (by severity), title, time ago, click to navigate
// "Mark all as read" button
// "View all" link to /notifications page
```

### File: `frontend/components/notifications/NotificationList.jsx`

```jsx
// Full page list of all notifications
// Filter by: type, severity, read/unread
// Click notification → navigate to relevant shipment/form
// Real-time: new notifications appear at top without refresh
```

### Real-Time Delivery

Notifications are pushed via WebSocket:
- On `notification` event → increment bell count, show toast
- Toast: brief popup in bottom-right, auto-dismiss after 5s
- CRITICAL severity: toast stays until dismissed

---

## Integration with Workflow Engine

In `workflow_engine.py`, after each transition:

```python
# After transitioning to APPROVED
await notification_service.create(
    recipient_id=shipment.customer_id,
    title="Shipment Approved",
    message=f"Your shipment {shipment.id} has been approved. A driver will be assigned shortly.",
    severity="LOW",
    type="INFO",
    shipment_id=shipment.id,
)
```

This is handled by the side effects system in Module 03.

---

## Files to Create

```
backend/app/services/notification_service.py
backend/app/routers/notifications.py
backend/app/models/notification.py

frontend/components/notifications/NotificationBell.jsx
frontend/components/notifications/NotificationList.jsx
frontend/components/notifications/NotificationToast.jsx
frontend/app/(app)/notifications/page.js
```

---

## Testing

```
test_create_notification           — Creates Notification node in graph
test_push_via_websocket            — Connected client receives notification
test_unread_count                  — Returns correct count
test_mark_read                     — Updates is_read and read_at
test_role_group_notification       — All users with role X receive it
test_stakeholder_notification      — All users linked to shipment receive it
test_notification_severity         — CRITICAL notifications flagged correctly
```
