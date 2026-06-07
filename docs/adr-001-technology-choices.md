# ADR-001: Technology Choices

**Status:** Accepted · **Date:** 2026-06-06

---

## 1. Node-RED for Prototyping

**Context:** Architects typically hand over static diagrams (Draw.io, Lucidchart) that leave room for interpretation. Developers waste time filling in gaps. We need a way to validate the API contract before implementation begins.

**Decision:** Use Node-RED to build an executable prototype of `transaction-api-service`.

**Why not alternatives:**

| Tool | Problem |
|------|---------|
| Draw.io / Excalidraw | Static — developer still has to guess behavior |
| OpenAPI (Swagger) | Good for spec, but you can't _run_ it |
| Temporal | Too heavy for early-stage prototyping; better suited for production workflows |
| Hand-written mock server | Same benefit as Node-RED but takes longer to build and harder to change |

**Consequences:**
- + Non-technical stakeholders can see the flow visually
- + Changes are instant — edit flow, hit deploy, re-test
- + Same Hurl tests pass against prototype and real implementation
- − Node-RED is not production-grade (single-threaded, no built-in auth for the editor)
- − Visual flows become messy beyond ~50 nodes (mitigated by grouping and sub-flows)

---

## 2. Apache Kafka for Event Streaming

**Context:** A legacy banking system dumps raw financial transactions into a stream. The system must consume, process, and expose this data — without tight coupling between services.

**Decision:** Use Kafka (KRaft mode, no Zookeeper) as the message backbone.

**Alternatives considered:** RabbitMQ, NATS, Pulsar.

**Why Kafka:**
- Kafka's log-based model fits "raw event stream that multiple consumers can replay"
- KRaft eliminates Zookeeper dependency, simplifying the setup
- Strong industry adoption in banking (Danske Bank uses Kafka internally)

**Consequences:**
- + At-least-once delivery guarantees
- + Consumers can replay from any point in time
- − Higher operational complexity than RabbitMQ for simple messaging
- − Topic partitioning adds mental overhead for developers new to Kafka

---

## 3. PostgreSQL for All Databases

**Context:** Three services need persistent storage: JWT service (users), transaction processor (events + accounts), user service (admin users).

**Decision:** Use PostgreSQL 12 for all three, with separate databases per service.

**Alternatives considered:** Separate DB engines per service (MongoDB for events, PostgreSQL for auth), MySQL.

**Why PostgreSQL:**
- JSON capabilities (`json_build_object`, `json_agg`) are used extensively in the prototype queries — no need for a separate document store
- Single engine reduces cognitive load for the team
- Postgres 12 is mature, well-documented, and meets all requirements

**Consequences:**
- + Shared expertise across the team
- + Prototype SQL queries can be lifted almost verbatim into the real service
- − No polyglot-persistence story (if that's a goal, we can introduce other engines later)

---

## 4. JWT (Access + Refresh Token) for Authentication

**Context:** The transaction API must only serve authenticated requests. The JWT service is a separate microservice — the prototype delegates auth verification to it.

**Decision:** Issue short-lived access tokens (15 min) + HTTP-only refresh tokens (7 days).

**Why not alternatives:**

| Approach | Problem |
|----------|---------|
| Session-based (cookie + Redis) | Adds state, harder to scale, doesn't demonstrate service-to-service auth |
| API keys | Not suitable for user-level auth |
| OAuth2 full flow | Overkill for the prototype; can be added later |

**Consequences:**
- + Stateless verification — the transaction API just calls `GET /api/auth/me` to validate
- + Refresh token in HTTP-only cookie prevents XSS token theft
- − Token revocation requires a blocklist (not implemented in prototype)

---

## 5. Hurl for Regression Testing

**Context:** The prototype serves as a contract for developers implementing the real service. We need a way to verify the implementation matches the prototype _and_ catch regressions when either changes.

**Decision:** Use Hurl — a declarative CLI that runs HTTP requests and asserts responses.

**Alternatives considered:** Supertest + Vitest, Newman (Postman CLI), Karate.

**Why Hurl:**
- `.hurl` files are plain text + JSON assertions — readable by architects and developers
- Single `hurl --test` command replaces an entire test runner setup
- Supports chained requests with variable capture (login → use token)
- No language dependency — works against any HTTP API

**Consequences:**
- + Tests double as executable documentation
- + Same files run against Node-RED (port 1880) and Node.js (port 4000) via `--variable base_url=`
- − Less flexible than a full programming language for complex test logic (mitigated by Hurl's JSONPath + captures)

---

## 6. k6 for Performance Testing

**Context:** The prototype defines expected behavior; we also need to know expected _performance_ characteristics before the real service is built.

**Decision:** Use k6 for load, stress, and soak testing.

**Why k6:**
- JavaScript-based (familiar to Node.js developers)
- Built-in metrics (latency percentiles, error rate, throughput)
- CI-native (exits non-zero on threshold breaches)
- Free, single binary

**Consequences:**
- + Establishes baseline performance numbers from the prototype
- + Thresholds become acceptance criteria for the real implementation
- − k6 login-per-iteration adds overhead; use `--vus` + shared array for production tests

---

## 7. TypeScript + Express for Service Implementation

**Context:** The services (JWT, transaction API, user service) need to be implemented in a language the team knows, with good typing and a lightweight HTTP framework.

**Decision:** Node.js + TypeScript + Express 5.

**Alternatives considered:** Go (faster but different language), Fastify (faster but less familiar), Python FastAPI.

**Why TypeScript + Express:**
- Team already knows JavaScript/Node.js
- Express 5 is stable and well-understood
- TypeScript catches interface mismatches between services

**Consequences:**
- + Fast development velocity
- + Hurl tests work against any HTTP server — language choice for the real service is independent
- − Express is not the fastest Node.js framework; upgrade to Fastify if latency becomes critical

---

## Traceability

| Decision | Relates to |
|----------|-----------|
| Node-RED | `task.md`, `node-red-flows.json` |
| Kafka | `docker-compose.yml`, `data-stream-service/`, `transaction-processor-service/` |
| PostgreSQL | All SQL queries in `node-red-flows.json` |
| JWT | `jwt-service/`, `generate-jwt.http` |
| Hurl | `tests/regression/` |
| k6 | `tests/performance/` |
| TypeScript + Express | `jwt-service/`, `transaction-api-service/`, `user-service/` |
