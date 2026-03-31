# Module 07 — Real-Time Monitoring & Tracking

## Goal
Every change in the graph is broadcast to connected clients in real-time. Users see shipment positions update live on maps. When one node changes (e.g., port congestion increases), all affected downstream nodes are identified and stakeholders are alerted.

---

## Architecture

```
[Graph Change] → [Event Emitter] → [WebSocket Server] → [Connected Clients]
                                          ↓
                                [Channel Router]
                                  ↓         ↓          ↓
                          [user:U001] [port:P001] [shipment:SHP-001]
```

Each client subscribes to channels relevant to their role:
- **Customer**: `shipment:{their_shipment_ids}`
- **Driver**: `driver:{their_id}`, `shipment:{assigned_shipments}`
- **Port Officer**: `port:{their_port_id}`, `vessel:*`
- **Yard Manager**: `yard:{their_yard_id}`, `container:*`
- **Logistics Manager**: `alert:high`, `alert:critical` (shipment list via polling with React Query 30s refetch)

---

## Backend: Event System

### File: `backend/app/services/event_service.py`

```python
class EventService:
    """Emits events when graph state changes."""

    async def emit(self, event_type: str, payload: dict, channels: list[str]):
        """
        Broadcast an event to specific channels.

        event_type: "status_change", "location_update", "alert", "form_submitted"
        payload: event data dict
        channels: list of channel names to broadcast to

        Steps:
        1. For significant events (status_change, form_submitted, cascade_alert):
           create Event node in graph (audit trail)
        2. For ephemeral events (location_update): WebSocket broadcast only,
           NO graph persistence (avoids flooding Neo4j with GPS data)
        3. Push to WebSocket ConnectionManager for each channel
        """

    async def emit_status_change(self, shipment_id, from_status, to_status, user_id):
        """Emit when a shipment changes status."""

    async def emit_location_update(self, entity_type, entity_id, lat, lng):
        """Emit when a vessel/driver/container position updates."""

    async def emit_cascade_alert(self, trigger_node, affected_nodes):
        """Emit when a change in one node affects downstream nodes."""
```

### File: `backend/app/routers/websocket.py` (Update)

```python
class ConnectionManager:
    """Manage WebSocket connections with channel subscriptions."""

    def __init__(self):
        self.connections: dict[str, set[WebSocket]] = {}  # channel → set of websockets
        self.user_channels: dict[str, set[str]] = {}      # user_id → set of channels

    async def connect(self, websocket: WebSocket, user_id: str, channels: list[str]):
        """Accept connection and subscribe to channels."""

    async def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove connection from all channels."""

    async def broadcast_to_channel(self, channel: str, event: dict):
        """Send event to all connections subscribed to this channel."""

    async def broadcast_to_user(self, user_id: str, event: dict):
        """Send event directly to a specific user's connections."""
```

---

## Frontend: Real-Time Hooks

### File: `frontend/hooks/useWebSocket.js` (Rewrite)

```javascript
export function useWebSocket(channels) {
    // Connect to WS with JWT auth via query parameter:
    //   ws://backend/api/ws/stream?token=<jwt>
    // Server validates token on connection, extracts user_id and role
    // Subscribe to specified channels
    // Return: { isConnected, lastEvent, subscribe, unsubscribe }
    // Auto-reconnect with exponential backoff
}
```

### File: `frontend/hooks/useShipmentTracking.js`

```javascript
export function useShipmentTracking(shipmentId) {
    // Subscribe to shipment:{shipmentId} channel
    // Return: { currentStatus, location, eta, timeline, lastUpdate }
    // Updates React Query cache on real-time events
}
```

### File: `frontend/hooks/usePortMonitor.js`

```javascript
export function usePortMonitor(portId) {
    // Subscribe to port:{portId} channel
    // Return: { vessels, containers, yardUtilization, alerts }
}
```

---

## Cascade Detection

### File: `backend/app/services/cascade_service.py`

```python
class CascadeService:
    """Detects downstream impact when a node changes state."""

    async def detect_cascade(self, changed_node_type: str, changed_node_id: str, change: dict) -> list[dict]:
        """
        Given a change to a node, find all downstream nodes that might be affected.

        Uses graph traversal (Cypher):
        - Port congestion up → find all vessels en route → find all shipments on those vessels
        - Vessel delayed → find all containers on board → find all destination ports/yards
        - Customs hold → find shipment → find customer → find downstream delivery

        Returns list of:
        {
            "affected_type": "Shipment",
            "affected_id": "SHP-001",
            "impact": "ETA delay of ~4 hours",
            "stakeholders": ["user-uuid-1", "user-uuid-2"],
            "severity": "HIGH"
        }
        """

    async def get_impact_graph(self, shipment_id: str) -> dict:
        """
        Return the full dependency graph for a shipment:
        all nodes and relationships it touches.

        Used by the tracking page to show the full chain visualization.
        """
```

---

## Map Components

### File: `frontend/components/map/TrackingMap.jsx`

```jsx
// Full-page or embedded map showing:
// - Port markers (colored by congestion: green/yellow/red)
// - Vessel markers (with route lines, moving positions)
// - Driver markers (for pickup/delivery tracking)
// - Shipment route: dotted line from origin → current → destination
// - Click markers for detail popup
// - Real-time position updates via WebSocket
// Style: Light map tiles (CartoDB Positron or OpenStreetMap)
```

### File: `frontend/components/map/YardGrid.jsx`

```jsx
// Visual grid showing container positions in a yard
// Each cell: colored by status (empty=white, occupied=blue, loading=yellow)
// Click cell for container detail
// Real-time updates when containers are moved
```

---

## Event Types

| Event Type | Trigger | Channels | Payload |
|------------|---------|----------|---------|
| `status_change` | Workflow transition | `shipment:{id}`, `user:{stakeholders}` | `{shipment_id, from, to, timestamp}` |
| `location_update` | Driver/vessel GPS | `shipment:{id}`, `driver:{id}` | `{entity_type, entity_id, lat, lng}` |
| `form_submitted` | Document creation | `shipment:{id}`, `user:{reviewer}` | `{document_type, shipment_id}` |
| `cascade_alert` | Cascade detection | `alert:*`, `user:{affected}` | `{trigger, affected_nodes, severity}` |
| `port_update` | Port status change | `port:{id}` | `{port_id, field, old_value, new_value}` |
| `yard_update` | Container moved | `yard:{id}` | `{container_id, position, action}` |

---

## Files to Create

```
backend/app/services/event_service.py
backend/app/services/cascade_service.py

frontend/hooks/useShipmentTracking.js
frontend/hooks/usePortMonitor.js
frontend/components/map/TrackingMap.jsx   # Rewrite of SupplyChainMap
frontend/components/map/YardGrid.jsx
```

---

## Testing

```
test_websocket_subscribe        — Client subscribes to channel, receives events
test_broadcast_to_channel       — Event sent to correct subscribers only
test_cascade_port_congestion    — Port congestion → affected shipments detected
test_cascade_vessel_delay       — Vessel delay → downstream impact calculated
test_location_update_broadcast  — GPS update → map clients receive new position
test_reconnect_on_disconnect    — Client reconnects and resubscribes
```
