# IssueFlow — Setup, Build & Run

Backend for the IssueFlow ticket-tracking platform. Stack: **NestJS 11 (TypeScript) + TypeORM + PostgreSQL**.

## Prerequisites
- Node.js 20+
- npm
- Docker (for the PostgreSQL instance)

## 1. Start the database
PostgreSQL runs via Docker Compose (`compose.yml`): user/password/db all `issueflow`, port `5432`.
```bash
docker compose up -d
```

> Note: the app connects to the database **`issueflow_mvp`** (configured in `src/app.module.ts`), not the default `issueflow`. If that database does not exist yet, create it once:
> ```bash
> docker compose exec db psql -U issueflow -d issueflow -c "CREATE DATABASE issueflow_mvp;"
> ```
> TypeORM runs with `synchronize: true`, so tables are created automatically on startup (development convenience — not for production).

## 2. Install dependencies
```bash
npm install
```

## 3. Build
```bash
npm run build
```

## 4. Run
```bash
npm run start:dev     # watch mode (development)
# or
npm run start:prod    # after build: node dist/main
```
The API listens on `http://localhost:3000`.

## 5. Run tests
```bash
npm test              # unit tests
npm run test:e2e      # end-to-end tests
```

## Authentication

All endpoints require a JWT **except** `POST /auth/login` and `POST /users`. `POST /users` is intentionally public so the first user can be created (bootstrap/registration) — every other route, including the rest of `/users`, requires a valid token.

> Security note: the JWT secret is **hardcoded for local development only** (`src/auth/auth.module.ts`). Move it to an environment variable before any real deployment.

**Flow:**
1. Create a user (public), including a password:
   ```bash
   curl -X POST http://localhost:3000/users \
     -H "Content-Type: application/json" \
     -d '{"username":"jdoe","email":"jdoe@example.com","fullName":"John Doe","role":"ADMIN","password":"secret123"}'
   ```
2. Log in to obtain a token:
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"jdoe","password":"secret123"}'
   # -> { "accessToken": "<jwt>", "tokenType": "Bearer", "expiresIn": 3600 }
   ```
3. Call protected endpoints with the token:
   ```bash
   curl http://localhost:3000/users -H "Authorization: Bearer <jwt>"
   curl http://localhost:3000/auth/me -H "Authorization: Bearer <jwt>"
   ```
4. Log out (revokes the token via an in-memory deny-list):
   ```bash
   curl -X POST http://localhost:3000/auth/logout -H "Authorization: Bearer <jwt>"
   ```

Passwords are hashed with Node's `crypto.scrypt`; `passwordHash` is never returned in any response.

## Concurrency (optimistic locking)

`PATCH /tickets/:ticketId` and `PATCH /tickets/:ticketId/comments/:commentId` use optimistic locking. The client must include `version` in the request body; on a successful update the server increments it. If the version you send is stale (someone else already updated the row), the server responds `409 Conflict` with `"… modified by another user (current version X, you sent Y). Refetch and retry."`.

The current `version` is included in every ticket and comment GET / POST / PATCH response so clients can read and resend it. Example flow:

```bash
# 1. read current version
curl http://localhost:3000/tickets/42 -H "Authorization: Bearer <jwt>"
# -> { ..., "version": 3 }

# 2. update with that version
curl -X PATCH http://localhost:3000/tickets/42 \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"version":3,"title":"new title"}'
# -> 200 OK, server-side version becomes 4
```

See `README.md` for the full API contract.
