# Ledger

This repository contains a production-grade, event-sourced banking ledger built with TypeScript and Node.js.

## Architecture Overview

The system is designed to handle distributed state, data integrity, and high-performance requirements using the following patterns:

* **Event Sourcing:** All state changes are stored as an immutable sequence of events in a PostgreSQL Event Store.
* **CQRS (Command Query Responsibility Segregation):** Read and write operations are strictly separated. Commands append events to the store, while queries fetch data from a highly optimized relational projection.
* **Transactional Outbox:** Guarantees at-least-once message delivery to Kafka without requiring distributed two-phase commits.
* **Idempotency:** API endpoints require an `Idempotency-Key` header to safely handle network retries and prevent duplicate transactions (e.g., double-charging).
* **Dead Letter Queue (DLQ):** Poison messages and unparseable payloads are automatically routed to a dedicated Kafka topic to prevent consumer blocking and infinite retry loops.
* **Write-Through Cache:** Read models are cached in Redis for ultra-low latency HTTP responses, updated silently in the background by the Kafka consumer.

## Tech Stack

* **Backend:** TypeScript, Node.js (Express)
* **Primary Database:** PostgreSQL (Event Store & Read Models)
* **Message Broker:** Apache Kafka
* **Cache:** Redis
* **Infrastructure:** Docker & Docker Compose
* **Testing:** Vitest

## Prerequisites

* Docker and Docker Compose active on your host machine.
* Node.js installed locally.

## Getting Started

1. **Start the Infrastructure**
Spin up PostgreSQL, Kafka, and Redis in detached mode:
```bash
docker-compose up -d

```


2. **Install Dependencies**
```bash
npm install

```


3. **Start the Application**
The application will automatically initialize the database schemas, connect the Kafka Consumer, and start the Outbox Worker.
```bash
npx tsx src/index.ts

```



## API Reference

**Create a New Account**

```bash
curl -X POST http://localhost:3000/api/accounts \
-H "Content-Type: application/json" \
-d '{"accountId": "account-1", "currency": "USD"}'

```

**Deposit Funds (Idempotent)**
Requires a unique UUID for the `Idempotency-Key` header to prevent network retries from triggering double deposits.

```bash
curl -X POST http://localhost:3000/api/accounts/account-1/deposit \
-H "Content-Type: application/json" \
-H "Idempotency-Key: unique-request-uuid-1234" \
-d '{"amount": 1000}'

```

**Check Account Balance**
Fetches the `account_summary` read model. Hits the Redis cache first, falling back to PostgreSQL on a cache miss.

```bash
curl http://localhost:3000/api/accounts/account-1

```

## Testing

The core domain logic (`AccountAggregate`) is completely decoupled from the database and message broker infrastructure. This allows for instant, database-free unit testing using the Given-When-Then pattern.

Execute the test suite:

```bash
npx vitest run

```