# 11 — Scalability (Post-Hackathon)

## Overview
This document outlines how the Cognitive Twin system scales from a hackathon prototype to a production-ready platform. Covers graph database, backend, AI agent, and frontend scaling.

## Current State (Hackathon)
```
Nodes:      ~20 (6 ports, 4 vessels, 8 shipments, 2 warehouses)
Rels:       ~30 relationships
Backend:    Single Render instance (free)
AI:         Gemini 2.5 Flash-Lite (free tier, 15 RPM)
Frontend:   Vercel (free)
Users:      1-5 (demo judges)
```

## Scaling Phases

### Phase 1: MVP (Post-Hackathon)
```
Nodes:      ~1,000 (real supply chain data)
Rels:       ~5,000
Backend:    Render paid tier (always-on, $7/mo)
AI:         Gemini Pro or GPT-4o-mini (paid, ~$0.01/query)
Frontend:   Vercel Pro ($20/mo)
Users:      10-50 (pilot customers)
Database:   Neo4j AuraDB Professional ($65/mo)
```

**Key Changes:**
- Move to always-on backend (no cold starts)
- Add Redis for caching (reduce AI API costs)
- Implement user authentication (Clerk or Auth.js)
- Add real supply chain data ingestion pipeline
- Implement WebSocket for real-time vessel tracking

### Phase 2: Growth
```
Nodes:      ~100,000+ (multi-tenant)
Rels:       ~500,000+
Backend:    Kubernetes (GKE/EKS) with horizontal pod autoscaling
AI:         Fine-tuned model + RAG for domain knowledge
Frontend:   Vercel Enterprise or self-hosted
Users:      500+ (multiple organizations)
Database:   Self-hosted Neo4j cluster (3+ nodes)
```

**Key Changes:**
- Multi-tenant architecture (isolated graph spaces per customer)
- Kubernetes for backend with autoscaling
- Fine-tuned LLM with supply chain domain knowledge
- RAG pipeline ingesting industry data, weather, news
- TimescaleDB for time-series data (historical vessel positions, delay trends)
- Redis Cluster for distributed caching

### Phase 3: Enterprise
```
Nodes:      ~10M+ (global supply chain network)
Backend:    Microservices architecture
AI:         Self-hosted fine-tuned model
Database:   Neo4j Fabric (distributed graph)
```

## Scaling the Graph Database

| Scale | Solution | Cost |
|-------|---------|------|
| Hackathon (~20 nodes) | Neo4j AuraDB Free | Free |
| MVP (~1K nodes) | Neo4j AuraDB Professional | ~$65/mo |
| Growth (~100K nodes) | Self-hosted Neo4j (Docker) | ~$100-500/mo |
| Enterprise (~10M+ nodes) | Neo4j Fabric (sharded) | Custom pricing |

### Performance Optimizations
1. **Indexes**: Create indexes on frequently queried properties
   ```cypher
   CREATE INDEX FOR (s:Shipment) ON (s.status)
   CREATE INDEX FOR (p:Port) ON (p.congestion_level)
   CREATE INDEX FOR (v:Vessel) ON (v.status)
   ```
2. **Query optimization**: Use `PROFILE` and `EXPLAIN` in Cypher
3. **Read replicas**: For read-heavy workloads, use Neo4j read replicas
4. **Caching layer**: Redis cache for frequently accessed graph queries

### NetworkX Fallback
For development/testing without Neo4j:
```python
import networkx as nx

G = nx.DiGraph()
# Same graph operations, in-memory
# Useful for unit testing and offline development
```

## Scaling the Backend

| Scale | Solution | Notes |
|-------|---------|-------|
| Hackathon | Single Render instance | Free, cold starts |
| MVP | Render paid (always-on) | $7/mo, no cold starts |
| Growth | Kubernetes + load balancer | Horizontal scaling |
| Enterprise | Microservices + service mesh | Independent scaling per service |

### Future Microservices Architecture
```
┌─────────┐   ┌──────────┐   ┌──────────────────┐
│  CDN    │──▶│ API GW   │──▶│ Microservices    │
│ (CF/VCL)│   │ (Kong)   │   │ ┌──────────────┐ │
└─────────┘   └──────────┘   │ │ Graph Service │ │
                              │ │ Sim Engine    │ │
                              │ │ Agent Service │ │
                              │ │ Alert Service │ │
                              │ │ Data Ingestion│ │
                              │ └──────────────┘ │
                              └────────┬─────────┘
                              ┌────────▼─────────┐
                              │ Neo4j Cluster    │
                              │ Redis Cache      │
                              │ TimescaleDB      │
                              │ Message Queue    │
                              └──────────────────┘
```

### API Rate Limiting
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/chat")
@limiter.limit("10/minute")
async def chat(request: ChatRequest):
    ...
```

## Scaling the AI Agent

| Scale | Solution | Cost |
|-------|---------|------|
| Hackathon | Gemini 2.5 Flash-Lite (free) | Free |
| MVP | Gemini Pro / GPT-4o-mini (paid) | ~$0.01/query |
| Growth | Fine-tuned model + RAG | ~$0.005/query |
| Enterprise | Self-hosted model (vLLM) | Infrastructure cost |

### RAG Pipeline (Growth Phase)
```
Real-time data sources:
├── AIS vessel tracking data
├── Port congestion APIs
├── Weather data (NOAA)
├── Trade news feeds
├── Historical delay patterns
│
▼ Ingestion Pipeline (Apache Kafka)
│
▼ Embedding Generation (text-embedding-004)
│
▼ Vector Store (Pinecone / pgvector)
│
▼ RAG-enhanced Agent Queries
```

### Fine-Tuning (Enterprise Phase)
- Fine-tune on supply chain decision data
- Train on historical disruption → decision → outcome data
- Evaluate with domain-specific benchmarks

## Scaling the Frontend

| Scale | Solution | Notes |
|-------|---------|-------|
| Hackathon | Vercel Free | Auto-scaling |
| MVP | Vercel Pro | Analytics, team features |
| Growth | Vercel Enterprise or self-hosted (Docker + Nginx) | Custom domains, SSO |

### Real-Time Data
- **Hackathon**: Polling (fetch every 30s)
- **MVP**: Server-Sent Events (SSE)
- **Growth**: WebSocket with Redis Pub/Sub
- **Enterprise**: Dedicated real-time service (Socket.io cluster)

## Feature Roadmap

### Short-term (Post-Hackathon)
- [ ] User authentication and accounts
- [ ] Real vessel tracking data (AIS)
- [ ] Historical delay analytics
- [ ] Email/SMS alerts for disruptions
- [ ] Multi-language support

### Medium-term (6 months)
- [ ] Multi-tenant support
- [ ] Custom supply chain graph per customer
- [ ] Integration with ERP systems (SAP, Oracle)
- [ ] Automated decision execution (not just recommendation)
- [ ] Mobile app (React Native)

### Long-term (12+ months)
- [ ] Predictive disruptions (ML-based)
- [ ] Carbon footprint optimization
- [ ] Multi-modal transport (air, rail, road)
- [ ] Industry marketplace (shared intelligence)
- [ ] Regulatory compliance tracking

## Business Impact Metrics

| Metric | Hackathon Demo | MVP Target | Growth Target |
|--------|---------------|------------|---------------|
| Decision time | Minutes → Seconds | 10x faster | 100x faster |
| Cost savings per disruption | $12K (demo) | $50K-100K | $1M+ |
| Shipments monitored | 8 | 1,000 | 100,000+ |
| Users | 1-5 | 50 | 5,000+ |
| Uptime | Demo only | 99% | 99.9% |

## Checklist
- [ ] Scaling strategy documented for each component
- [ ] MVP migration path clear
- [ ] Cost estimates for each phase
- [ ] Feature roadmap prioritized
- [ ] Technical debt items identified
