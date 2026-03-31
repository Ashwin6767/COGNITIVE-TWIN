# Module 06 — UI Overhaul

## Goal
Replace the dark monitoring dashboard with a clean, light, white-space-heavy interface. Each user role gets their own dashboard. Prioritize usability and simplicity.

---

## Design System

### Color Palette (Light Theme)

```css
@theme {
    /* Backgrounds */
    --color-bg-primary: #FFFFFF;
    --color-bg-secondary: #F8FAFC;
    --color-bg-card: #FFFFFF;
    --color-bg-sidebar: #F1F5F9;
    --color-bg-hover: #F1F5F9;
    --color-bg-active: #E2E8F0;

    /* Text */
    --color-text-primary: #0F172A;
    --color-text-secondary: #64748B;
    --color-text-muted: #94A3B8;

    /* Borders */
    --color-border: #E2E8F0;
    --color-border-light: #F1F5F9;

    /* Status colors */
    --color-success: #16A34A;
    --color-warning: #D97706;
    --color-danger: #DC2626;
    --color-info: #2563EB;

    /* Shipment status colors */
    --color-status-pending: #F59E0B;
    --color-status-active: #2563EB;
    --color-status-transit: #7C3AED;
    --color-status-completed: #16A34A;
    --color-status-issue: #DC2626;

    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.05);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.05);
}
```

### Typography
- **Font:** Inter (system fallback: -apple-system, sans-serif)
- **Headings:** font-semibold, text-text-primary
- **Body:** font-normal, text-text-secondary
- **Small/Labels:** text-sm, text-text-muted
- **Generous line-height:** leading-relaxed for body text

### Spacing Rules
- **Card padding:** p-6 (24px)
- **Section gaps:** space-y-6 (24px)
- **Card gaps:** gap-6 (24px)
- **Page margins:** px-8 py-6 (32px horizontal, 24px vertical)
- **Between label and input:** space-y-1.5

### Component Style
- **Cards:** bg-white, border border-border, rounded-xl, shadow-sm
- **Buttons primary:** bg-blue-600 text-white rounded-lg px-4 py-2.5
- **Buttons secondary:** bg-white border border-border text-text-primary rounded-lg
- **Inputs:** bg-white border border-border rounded-lg px-3 py-2.5, focus:ring-2 focus:ring-blue-500
- **Tables:** Simple with border-b dividers, no zebra stripes, hover:bg-bg-hover
- **Badges/Pills:** rounded-full px-3 py-1 text-xs font-medium

---

## App Layout

### File: `frontend/app/layout.js`

```
┌─────────────────────────────────────────────────────────┐
│  TopBar: Logo | Search | Notifications | User Menu      │
├────────┬────────────────────────────────────────────────┤
│        │                                                │
│  Side  │           Main Content Area                    │
│  bar   │                                                │
│        │           (changes per page/role)              │
│  nav   │                                                │
│  links │                                                │
│        │                                                │
│  based │                                                │
│  on    │                                                │
│  role  │                                                │
│        │                                                │
├────────┴────────────────────────────────────────────────┤
│  (no footer — clean bottom edge)                        │
└─────────────────────────────────────────────────────────┘
```

- Sidebar: 240px wide, collapsible to 64px (icons only)
- Main content: flex-1, scrollable
- TopBar: 64px height, sticky

---

## Pages Per Role

> **MVP priority:** Build Customer, Logistics Manager, and Driver dashboards first (full featured).
> Port Officer, Customs, Yard Manager, and Admin get a simplified generic view showing pending actions + relevant shipment list.
> All data-fetching components MUST use React Query's `isLoading`/`isError` states with Skeleton and ErrorCard components.

### Customer Dashboard (`/dashboard/customer`)
```
┌────────────────────────────────────────────┐
│  Welcome, [Name]                           │
├────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Active   │ │ In       │ │ Delivered│   │
│  │ Requests │ │ Transit  │ │ This Mo. │   │
│  │    3     │ │    5     │ │    12    │   │
│  └──────────┘ └──────────┘ └──────────┘   │
│                                            │
│  My Shipments                              │
│  ┌────────────────────────────────────┐    │
│  │ SHP-001 | Electronics | Shanghai→ │    │
│  │ LA | IN_TRANSIT_SEA | ETA: Apr 5  │    │
│  ├────────────────────────────────────┤    │
│  │ SHP-002 | Toys | Shenzhen→ NY    │    │
│  │ PICKUP_EN_ROUTE | Driver: John    │    │
│  └────────────────────────────────────┘    │
│                                            │
│  ┌──────────────┐                          │
│  │ + New Request │                          │
│  └──────────────┘                          │
│                                            │
│  Tracking Map                              │
│  ┌────────────────────────────────────┐    │
│  │        (Leaflet map with           │    │
│  │         active shipment pins)      │    │
│  └────────────────────────────────────┘    │
└────────────────────────────────────────────┘
```

### Logistics Manager Dashboard (`/dashboard/manager`)
```
┌────────────────────────────────────────────┐
│  Overview                                  │
├────────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │Pend│ │Appr│ │In  │ │At  │ │Deli│      │
│  │ 8  │ │ 12 │ │Trns│ │Port│ │ 45 │      │
│  │    │ │    │ │ 23 │ │ 15 │ │    │      │
│  └────┘ └────┘ └────┘ └────┘ └────┘      │
│                                            │
│  ┌─── Needs Attention ────────────────┐    │
│  │ ⚠ 3 shipments pending approval    │    │
│  │ ⚠ 2 customs holds                 │    │
│  │ ⚠ 1 port congestion alert         │    │
│  └────────────────────────────────────┘    │
│                                            │
│  All Shipments (filterable table)          │
│  ┌────────────────────────────────────┐    │
│  │ ID | Customer | Route | Status    │    │
│  │ ... sortable, filterable, search  │    │
│  └────────────────────────────────────┘    │
│                                            │
│  AI Agent Chat (expandable panel)          │
└────────────────────────────────────────────┘
```

### Driver Dashboard (`/dashboard/driver`)
```
┌────────────────────────────────────────────┐
│  My Assignments                            │
├────────────────────────────────────────────┤
│  Current Assignment                        │
│  ┌────────────────────────────────────┐    │
│  │ SHP-003 — Pickup from ABC Mfg     │    │
│  │ 123 Industrial Rd, Shenzhen       │    │
│  │ Status: EN ROUTE TO PICKUP        │    │
│  │                                    │    │
│  │ [Navigate] [Mark Arrived] [Call]   │    │
│  └────────────────────────────────────┘    │
│                                            │
│  Map (route to pickup/delivery)            │
│  ┌────────────────────────────────────┐    │
│  │       (Leaflet with route)        │    │
│  └────────────────────────────────────┘    │
│                                            │
│  Upcoming                                  │
│  ┌────────────────────────────────────┐    │
│  │ SHP-007 — Delivery to XYZ Corp   │    │
│  │ Tomorrow 2:00 PM                  │    │
│  └────────────────────────────────────┘    │
└────────────────────────────────────────────┘
```

### Port Officer Dashboard (`/dashboard/port`)
```
┌────────────────────────────────────────────┐
│  Port of Shanghai — Dashboard              │
├────────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐             │
│  │Dock│ │Yard│ │Pend│ │Dept│             │
│  │ 3  │ │78% │ │ 5  │ │ 2  │             │
│  │vssl│ │full│ │entr│ │tday│             │
│  └────┘ └────┘ └────┘ └────┘             │
│                                            │
│  Vessels at Port                           │
│  ┌────────────────────────────────────┐    │
│  │ Pacific Star | 70% loaded | Bay 3 │    │
│  │ Atlantic Runner | Arriving 2h     │    │
│  └────────────────────────────────────┘    │
│                                            │
│  Pending Actions                           │
│  ┌────────────────────────────────────┐    │
│  │ ▸ Port Entry: CSLU1234567         │    │
│  │ ▸ BOL pending: SHP-003           │    │
│  └────────────────────────────────────┘    │
└────────────────────────────────────────────┘
```

### Customs Officer Dashboard (`/dashboard/customs`)
```
┌────────────────────────────────────────────┐
│  Customs Review Queue                      │
├────────────────────────────────────────────┤
│  Pending (3)                               │
│  ┌────────────────────────────────────┐    │
│  │ SHP-003 | Electronics | HS 8471   │    │
│  │ Value: $125,000 | [Review]        │    │
│  ├────────────────────────────────────┤    │
│  │ SHP-005 | Perishable | HS 0802    │    │
│  │ Value: $45,000 | [Review]         │    │
│  └────────────────────────────────────┘    │
│                                            │
│  Recently Cleared (today)                  │
│  ┌────────────────────────────────────┐    │
│  │ SHP-001 | Cleared 2h ago          │    │
│  └────────────────────────────────────┘    │
└────────────────────────────────────────────┘
```

### Yard Manager Dashboard (`/dashboard/yard`)
```
┌────────────────────────────────────────────┐
│  Yard — Port of Shanghai                   │
├────────────────────────────────────────────┤
│  Yard Grid (visual container layout)       │
│  ┌────────────────────────────────────┐    │
│  │  A1[■] A2[■] A3[□] A4[□] A5[■]  │    │
│  │  B1[□] B2[■] B3[■] B4[□] B5[□]  │    │
│  │  C1[■] C2[□] C3[□] C4[■] C5[■]  │    │
│  │  ■ = occupied  □ = available       │    │
│  └────────────────────────────────────┘    │
│                                            │
│  Loading Queue (next departures)           │
│  ┌────────────────────────────────────┐    │
│  │ CSLU1234567 → Pacific Star 6AM    │    │
│  │ MSKU7654321 → Pacific Star 6AM    │    │
│  └────────────────────────────────────┘    │
└────────────────────────────────────────────┘
```

---

## App Router Structure

```
frontend/app/
├── (auth)/
│   ├── login/page.js
│   └── register/page.js
├── (app)/                         # Authenticated layout with sidebar
│   ├── layout.js                  # Sidebar + TopBar layout
│   ├── dashboard/
│   │   ├── page.js                # Role-based redirect
│   │   ├── customer/page.js
│   │   ├── manager/page.js
│   │   ├── driver/page.js
│   │   ├── port/page.js
│   │   ├── customs/page.js
│   │   ├── yard/page.js
│   │   └── admin/page.js
│   ├── shipments/
│   │   ├── page.js                # Shipment list
│   │   ├── [id]/page.js           # Shipment detail + timeline
│   │   └── new/page.js            # New shipment request form
│   ├── tracking/
│   │   └── [id]/page.js           # Live tracking map
│   ├── documents/
│   │   ├── [shipmentId]/page.js   # Documents for a shipment
│   │   └── fill/[type]/page.js    # Fill a specific form
│   ├── notifications/page.js
│   ├── settings/page.js
│   └── admin/
│       ├── users/page.js
│       └── system/page.js
├── globals.css
├── layout.js                      # Root layout
└── providers.jsx
```

---

## Shared Components

```
frontend/components/
├── layout/
│   ├── Sidebar.jsx          # Role-based navigation sidebar
│   ├── TopBar.jsx           # Search, notifications bell, user menu
│   └── AppShell.jsx         # Sidebar + TopBar + Main content wrapper
├── ui/
│   ├── Card.jsx             # White card with shadow
│   ├── Button.jsx           # Primary, secondary, danger variants
│   ├── Input.jsx            # Styled text input
│   ├── Select.jsx           # Styled select dropdown
│   ├── Badge.jsx            # Status badge (colored pill)
│   ├── Table.jsx            # Sortable, filterable data table
│   ├── Modal.jsx            # Dialog overlay
│   ├── Skeleton.jsx         # Loading skeleton (update for light theme)
│   ├── EmptyState.jsx       # "No data" illustration
│   └── StatCard.jsx         # Stat number with label and icon
├── shipments/
│   ├── ShipmentCard.jsx     # Compact shipment summary card
│   ├── ShipmentTable.jsx    # Full shipment list table
│   ├── ShipmentTimeline.jsx # Vertical timeline of events
│   └── StatusBadge.jsx      # Colored badge for shipment status
├── map/
│   ├── TrackingMap.jsx      # Leaflet map for shipment tracking
│   └── YardGrid.jsx         # Visual grid for yard container layout
├── chat/
│   ├── ChatPanel.jsx        # AI agent chat (update styling)
│   └── ChatMessage.jsx
├── forms/
│   ├── DynamicForm.jsx      # Schema-driven form (Module 04)
│   ├── SignaturePad.jsx
│   ├── FileUpload.jsx
│   └── FormField.jsx
└── notifications/
    ├── NotificationBell.jsx  # TopBar bell icon with count
    └── NotificationList.jsx  # Dropdown or page list
```

---

## New Dependencies

```json
{
    "@headlessui/react": "^2.0.0",   // Accessible UI primitives (modals, menus)
    "clsx": "^2.0.0",                // Conditional classnames
    "date-fns": "^4.0.0"             // Date formatting
}
```

Remove: `react-force-graph-2d` (not needed in new UI)

---

## Testing

```
test_sidebar_shows_role_links      — CUSTOMER sees only their nav items
test_protected_route_redirects     — Unauthenticated user → /login
test_dashboard_loads_per_role      — Each role sees their dashboard
test_shipment_table_filters        — Status, priority, search filters work
test_form_renders_from_schema      — DynamicForm renders correct fields
test_responsive_layout             — Sidebar collapses on small screens
```
