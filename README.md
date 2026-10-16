Event-Sourced Banking Ledger

A distributed banking ledger built with TypeScript and Node.js, implementing Event Sourcing, CQRS, and the Transactional Outbox pattern to guarantee data consistency.

Tech Stack

Backend: TypeScript, Node.js (Express)

Database: PostgreSQL (Event Store & Read Models)

Message Broker: Apache Kafka

Cache: Redis

Architecture Highlights

Event Sourcing & CQRS: State changes are stored as immutable events. Read/write operations are strictly separated for performance.

Transactional Outbox: Guarantees at-least-once message delivery to Kafka without distributed two-phase commits.

Optimistic Concurrency: Prevents conflicting writes using stream versioning.

Idempotency & DLQ: Safe network retries and automated handling of poison messages.

Getting Started

Start the Infrastructure (PostgreSQL, Kafka, Redis)

docker-compose up -d


Install Dependencies

npm install


Run the Application

npx tsx src/index.ts


API Endpoints

Create Account: POST /api/accounts

Deposit Funds: POST /api/accounts/:id/deposit (Requires Idempotency-Key header)

Withdraw Funds: POST /api/accounts/:id/withdraw (Requires Idempotency-Key header)

Check Balance: GET /api/accounts/:id (Cached via Redis)



