# Cognitive Twin — Frontend Dashboard

Next.js 15 dashboard for real-time supply chain intelligence, simulation, and AI-driven decision support.

## Quick Start

```bash
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Component Architecture

| Folder | Components | Description |
|---|---|---|
| `components/alerts/` | AlertsPanel, AlertCard | Port congestion alerts sorted by severity |
| `components/chat/` | ChatPanel, ChatMessage, SuggestionChips | AI chat interface with history and quick prompts |
| `components/layout/` | Header | Top navigation bar with live-status indicator |
| `components/map/` | SupplyChainMap | Leaflet map with port and vessel markers |
| `components/simulation/` | SimulationPanel, ImpactVisualization | Delay simulation controls and results |
| `components/recommendations/` | RecommendationPanel | AI-generated action recommendations |
| `components/ui/` | Skeleton, ErrorCard | Shared loading and error UI primitives |

Each folder includes an `index.js` barrel export for clean imports.

Shared constants (alert styles, port lists, map defaults) live in `lib/constants.js`.

## Styling

- **Tailwind CSS v4** with a dark theme and custom CSS variables (`bg-bg-primary`, `text-text-secondary`, etc.)
- All components use utility classes — no external CSS modules

## API Integration

- **React Query** (`@tanstack/react-query`) for server-state management with automatic refetch
- API client in `lib/api.js` wraps all backend endpoints
