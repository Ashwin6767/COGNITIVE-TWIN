# Module 01 — Authentication & User Roles

## Goal
Build a login system with 7 user types. Every API route and frontend page checks the user's role before showing content or allowing actions.

---

## User Roles

```python
ROLES = [
    "CUSTOMER",          # Ships goods, fills request/release forms
    "LOGISTICS_MANAGER", # Approves requests, assigns resources, full oversight
    "DRIVER",            # Pickup and last-mile delivery
    "PORT_OFFICER",      # Port entry/exit, loading, BOL
    "CUSTOMS_OFFICER",   # Customs declarations, clearances
    "YARD_MANAGER",      # Yard container tracking, placement
    "ADMIN",             # System admin, user management
]
```

---

## Backend Implementation

### 1. User Model (Neo4j Node)

```
(:User {
    id: string (UUID),
    email: string (unique),
    password_hash: string,
    name: string,
    role: string,              // One of ROLES above
    company_id: string | null, // Links to Company node
    assigned_port_id: string | null, // For PORT_OFFICER and YARD_MANAGER — which port they work at
    phone: string | null,
    license_number: string | null,   // For DRIVER role only
    license_type: string | null,     // For DRIVER role only — "CDL_A", "CDL_B"
    is_active: boolean,
    created_at: datetime,
    last_login: datetime | null
})
```

**Relationships:**
- `(:User)-[:BELONGS_TO]->(:Company)`
- `(:User)-[:SUBMITTED]->(:Document)`
- `(:User)-[:WORKS_AT]->(:Port)` (for PORT_OFFICER and YARD_MANAGER)
- `(:User {role: "DRIVER"})-[:ASSIGNED_PICKUP]->(:Shipment)`
- `(:User {role: "DRIVER"})-[:DRIVES]->(:Truck)`

### 2. Auth Endpoints (FastAPI)

Create `backend/app/routers/auth.py`:

```
POST /api/auth/register     — Create new user (Admin only, or self-register as Customer)
POST /api/auth/login        — Email + password → JWT access token (30 min, no refresh token)
GET  /api/auth/me           — Current user profile from JWT
PUT  /api/auth/me           — Update own profile
```

> **Note:** No refresh tokens for simplicity. Access tokens last 30 minutes; client re-authenticates on expiry. Add refresh tokens in production later.

### 3. JWT Token Structure

```python
# Access token payload (short-lived: 30 minutes)
{
    "sub": "user-uuid",
    "role": "LOGISTICS_MANAGER",
    "company_id": "company-uuid",
    "exp": 1234567890
}
```

### 4. Password Hashing

```python
# Use bcrypt via passlib
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"])
```

### 5. Auth Dependencies (FastAPI)

Create `backend/app/auth/dependencies.py`:

```python
# Dependency: get_current_user
# - Extracts JWT from Authorization header
# - Decodes and validates token
# - Returns User dict with id, role, company_id

# Dependency: require_role(*roles)
# - Wraps get_current_user
# - Raises 403 if user.role not in allowed roles
# - Usage: Depends(require_role("LOGISTICS_MANAGER", "ADMIN"))
```

### 6. Role Permission Matrix

| Action | CUSTOMER | LOGISTICS_MGR | DRIVER | PORT_OFFICER | CUSTOMS | YARD_MGR | ADMIN |
|--------|----------|---------------|--------|-------------|---------|----------|-------|
| Submit shipment request | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve shipment | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Assign driver | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Fill release form | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Update pickup status | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Fill port entry form | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Submit customs declaration | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Manage yard | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Issue BOL | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| View all shipments | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View own shipments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| AI agent chat | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Frontend Implementation

### 1. Auth Pages

Create in `frontend/app/(auth)/`:

```
/login          — Email + password login form
/register       — Self-registration (Customer role only)
```

### 2. Auth Context

Create `frontend/lib/auth-context.js`:

```javascript
// AuthProvider wraps the app
// Provides: user, login(), logout(), isLoading
// Stores JWT in httpOnly cookie or localStorage
// Checks /api/auth/me on mount to restore session
```

### 3. Route Protection

Create `frontend/components/auth/ProtectedRoute.jsx`:

```javascript
// Wraps pages that require authentication
// Redirects to /login if not authenticated
// Optionally checks role: <ProtectedRoute roles={["LOGISTICS_MANAGER", "ADMIN"]}>
```

### 4. Role-Based Navigation

The sidebar/header shows different links per role:

```
CUSTOMER:         My Shipments | New Request | Track | Chat
LOGISTICS_MANAGER: Dashboard | All Shipments | Assignments | Approvals | Chat
DRIVER:           My Assignments | Active Pickup | Chat
PORT_OFFICER:     Port Dashboard | Vessels | Containers | BOL | Chat
CUSTOMS_OFFICER:  Pending Reviews | Cleared | Chat
YARD_MANAGER:     Yard Map | Containers | Loading Queue | Chat
ADMIN:            All of the above + User Management + System Settings
```

---

## New Dependencies

### Backend
```
passlib[bcrypt]==1.7.*    # Password hashing
python-jose[cryptography]==3.3.*  # JWT encode/decode
```

### Frontend
```
js-cookie                 # Token storage (if using cookies)
```

---

## Files to Create

```
backend/app/auth/
├── __init__.py
├── dependencies.py       # get_current_user, require_role
├── jwt_handler.py        # create_token, decode_token, refresh logic
└── password.py           # hash_password, verify_password

backend/app/models/user.py    # User, UserCreate, UserLogin, UserResponse
backend/app/routers/auth.py   # /api/auth/* endpoints
backend/app/services/user_service.py  # CRUD for User nodes in Neo4j

frontend/app/(auth)/
├── login/page.js
└── register/page.js

frontend/lib/auth-context.js
frontend/components/auth/ProtectedRoute.jsx
```

---

## Testing

```
test_auth_register         — Create user, verify in Neo4j
test_auth_login            — Login with valid creds → JWT returned
test_auth_login_invalid    — Wrong password → 401
test_auth_me               — Valid JWT → user profile
test_auth_me_expired       — Expired JWT → 401
test_role_permission       — CUSTOMER cannot approve shipments → 403
test_role_admin_bypass     — ADMIN can do anything → 200
```
