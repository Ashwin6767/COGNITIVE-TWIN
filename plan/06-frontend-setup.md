# 06 — Frontend Setup (Next.js 15)

## Overview
Next.js 15 with App Router, Tailwind CSS v4, and React 19. Single-page dashboard layout with map, chat, simulation, and alerts panels.

## Step 1: Scaffold Next.js Project

```bash
npx create-next-app@latest frontend
```

Select options:
- TypeScript: No (JavaScript for hackathon speed)
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No (use app/ directly)
- App Router: Yes
- Import alias: @/* (default)

## Step 2: Install Dependencies

```bash
cd frontend
npm install react-leaflet leaflet react-force-graph-2d recharts lucide-react @tanstack/react-query
```

## Step 3: Project Structure

```
frontend/
├── app/
│   ├── layout.jsx               # Root layout with providers
│   ├── page.jsx                 # Main dashboard
│   ├── globals.css              # Tailwind v4 imports + custom theme
│   └── api/                     # Optional: API route proxy
├── components/
│   ├── layout/
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   └── Dashboard.jsx
│   ├── map/
│   │   ├── SupplyChainMap.jsx   # 'use client' - Leaflet (dynamic import!)
│   │   ├── VesselMarker.jsx
│   │   ├── PortMarker.jsx
│   │   └── RoutePolyline.jsx
│   ├── graph/
│   │   └── GraphVisualization.jsx
│   ├── chat/
│   │   ├── ChatPanel.jsx
│   │   ├── ChatMessage.jsx
│   │   └── SuggestionChips.jsx
│   ├── simulation/
│   │   ├── SimulationPanel.jsx
│   │   ├── ImpactVisualization.jsx
│   │   └── ScenarioCompare.jsx
│   ├── alerts/
│   │   ├── AlertsPanel.jsx
│   │   └── AlertCard.jsx
│   ├── recommendations/
│   │   ├── RecommendationPanel.jsx
│   │   └── ActionCard.jsx
│   └── ui/
│       ├── Skeleton.jsx         # Loading skeleton
│       └── ErrorCard.jsx        # Error boundary
├── hooks/
│   ├── useWebSocket.js
│   ├── useGraph.js
│   └── useSimulation.js
├── lib/
│   ├── api.js                   # API client
│   └── utils.js
├── public/
│   └── leaflet/
│       ├── marker-icon.png      # Copy from node_modules/leaflet/dist/images/
│       └── marker-shadow.png
├── package.json
├── next.config.js
└── .env.local.example
```

## Step 4: Tailwind CSS v4 Configuration

> ⚠️ **Issue #6**: Tailwind v4 does NOT use `tailwind.config.js`. It uses CSS-based configuration.

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Supply chain color system */
  --color-danger: #EF4444;
  --color-warning: #F59E0B;
  --color-success: #22C55E;
  --color-info: #3B82F6;
  --color-rerouted: #8B5CF6;
  
  /* Dark theme for dashboard */
  --color-bg-primary: #0F172A;
  --color-bg-secondary: #1E293B;
  --color-bg-card: #334155;
  --color-text-primary: #F8FAFC;
  --color-text-secondary: #94A3B8;
  --color-border: #475569;
}
```

Note: If Tailwind v4 CSS-based config causes issues, fallback to v3:
```bash
npm install tailwindcss@3 autoprefixer postcss
```
Then use traditional `tailwind.config.js`.

## Step 5: Root Layout with Providers

> ⚠️ **Issue #16**: Must wrap app in QueryClientProvider for React Query to work.

```jsx
// app/layout.jsx
import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Cognitive Twin — Supply Chain Intelligence',
  description: 'Decision-intelligence system for supply chain management',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-bg-primary text-text-primary min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

```jsx
// app/providers.jsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        retryDelay: 2000,
        staleTime: 30_000,  // 30 seconds
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

## Step 6: API Client

```jsx
// lib/api.js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error)
    throw error
  }
}

export const api = {
  // Graph
  getPorts: () => fetchAPI('/api/graph/ports'),
  getVessels: () => fetchAPI('/api/graph/vessels'),
  getShipments: () => fetchAPI('/api/graph/shipments'),
  getPortImpact: (portId) => fetchAPI(`/api/graph/port/${portId}/impact`),
  getOverview: () => fetchAPI('/api/graph/overview'),
  
  // Simulation
  simulateDelay: (portId, delayHours) => fetchAPI('/api/simulate/delay', {
    method: 'POST',
    body: JSON.stringify({ port_id: portId, delay_hours: delayHours }),
  }),
  simulateReroute: (shipmentId) => fetchAPI('/api/simulate/reroute', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: shipmentId }),
  }),
  compareScenarios: (a, b) => fetchAPI('/api/simulate/compare', {
    method: 'POST',
    body: JSON.stringify({ scenario_a: a, scenario_b: b }),
  }),
  
  // Agent
  chat: (message) => fetchAPI('/api/agent/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
  
  // System
  seed: () => fetchAPI('/api/seed', { method: 'POST' }),
  reset: () => fetchAPI('/api/reset', { method: 'POST' }),
  health: () => fetchAPI('/api/health'),
}
```

## Step 7: Environment Variables

```env
# .env.local.example
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

Production:
```env
NEXT_PUBLIC_API_URL=https://cognitive-twin.onrender.com
NEXT_PUBLIC_WS_URL=wss://cognitive-twin.onrender.com
```

## Step 8: Client vs Server Component Strategy

**Components that MUST be 'use client':**
- All map components (Leaflet uses `window`)
- ChatPanel (uses WebSocket/state)
- SimulationPanel (form inputs/state)
- GraphVisualization (D3/force-graph)
- Any component using useState, useEffect, onClick

**Server components (default):**
- layout.jsx shell (except Providers)
- Static UI sections
- Data fetching wrappers

## Step 9: Loading & Error States

> ⚠️ **Issue #11**: Must handle loading states (Render cold start = 60+ seconds).

```jsx
// components/ui/Skeleton.jsx
'use client'

export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-bg-card rounded ${className}`} />
  )
}

export function MapSkeleton() {
  return (
    <div className="w-full h-96 bg-bg-secondary rounded-lg flex items-center justify-center">
      <p className="text-text-secondary">Loading map...</p>
    </div>
  )
}
```

```jsx
// components/ui/ErrorCard.jsx
'use client'

export function ErrorCard({ message, onRetry }) {
  return (
    <div className="bg-red-900/20 border border-danger rounded-lg p-4">
      <p className="text-danger font-medium">⚠️ {message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-sm text-info hover:underline">
          Try again
        </button>
      )}
    </div>
  )
}
```

## Step 10: Color System

| Status | Color | CSS Variable | Usage |
|--------|-------|-------------|-------|
| Critical / HIGH | Red | `--color-danger` | High congestion, critical alerts |
| Warning / MEDIUM | Amber | `--color-warning` | Medium congestion, delays |
| Good / LOW | Green | `--color-success` | Normal operations |
| Info / Neutral | Blue | `--color-info` | Informational, links |
| Rerouted | Purple | `--color-rerouted` | Rerouted shipments |

## Checklist
- [ ] Next.js 15 project scaffolded
- [ ] All npm dependencies installed
- [ ] Tailwind v4 configured with custom theme colors
- [ ] Root layout with QueryClientProvider
- [ ] API client (lib/api.js) with all endpoints
- [ ] .env.local with API URLs
- [ ] Skeleton and ErrorCard components
- [ ] Leaflet marker icons copied to public/leaflet/
- [ ] `npm run dev` starts without errors
- [ ] Page loads at http://localhost:3000

## Common Pitfalls
1. ⚠️ Tailwind v4 doesn't use tailwind.config.js — use CSS @theme (Issue #6)
2. ⚠️ Must wrap app in QueryClientProvider (Issue #16)
3. ⚠️ Leaflet CSS must be imported (Issue #7)
4. ⚠️ Leaflet components must use `next/dynamic` with `ssr: false` (Issue #15)
5. ⚠️ Don't forget `'use client'` directive for interactive components
6. ⚠️ Copy Leaflet marker icons to public/ (they don't load from node_modules in Next.js)
