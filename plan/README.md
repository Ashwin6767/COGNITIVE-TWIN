# Cognitive Twin — Plan Index

## Master Plan
- [00-MASTER-PLAN.md](./00-MASTER-PLAN.md) — Overview, user types, shipment lifecycle, document types

## Module Plans (Detailed)
| # | Module | File | Focus |
|---|--------|------|-------|
| 01 | Authentication & User Roles | [01-auth-users.md](./01-auth-users.md) | Login, JWT, 7 roles, RBAC, permission matrix |
| 02 | Graph Schema & Data Model | [02-graph-schema.md](./02-graph-schema.md) | Neo4j nodes, relationships, constraints, Pydantic models |
| 03 | Workflow Engine | [03-workflow-engine.md](./03-workflow-engine.md) | 15-stage state machine, transitions, side effects, event log |
| 04 | Forms & Documents | [04-forms-documents.md](./04-forms-documents.md) | 13 form schemas, dynamic form renderer, document service |
| 05 | Backend API Overhaul | [05-backend-api.md](./05-backend-api.md) | All endpoints by resource, pagination, role-based access |
| 06 | UI Overhaul | [06-ui-overhaul.md](./06-ui-overhaul.md) | Light theme, role dashboards, app router, component library |
| 07 | Real-Time Monitoring | [07-realtime-monitoring.md](./07-realtime-monitoring.md) | WebSocket channels, cascade detection, tracking maps |
| 08 | AI Agent Enhancement | [08-ai-agent.md](./08-ai-agent.md) | New tools, role-scoped responses, proactive alerts |
| 09 | Notifications & Alerts | [09-notifications.md](./09-notifications.md) | Notification rules, delivery, bell UI, toast |
| 10 | Seed Data, Testing & Deploy | [10-seed-testing-deploy.md](./10-seed-testing-deploy.md) | Realistic data, test suite, Docker, Render + Vercel |
