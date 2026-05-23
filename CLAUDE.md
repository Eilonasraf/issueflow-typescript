# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

IssueFlow — a RESTful ticket-tracking backend for the TDP 2026 home assignment. Stack: **NestJS 11 (TypeScript) + TypeORM 0.3 + PostgreSQL**.

`README.md` is the API contract — its tables define exact endpoints and JSON shapes (camelCase: `fullName`, `ownerId`, `assigneeId`). Full requirements are in `../TDP_issueflow_requirements.pdf`.

## Commands

```bash
npm run build               # nest build — primary compile check
npm run start:dev           # watch mode on :3000
npm run lint                # eslint --fix
npm test                    # jest unit tests (*.spec.ts in src/)
npm run test:e2e            # e2e (test/jest-e2e.json)
npx jest path/to.spec.ts    # single test file
npx jest -t "name"          # tests matching a name
```

## Database

`docker compose up -d` starts Postgres on :5432 (user/pass/db all `issueflow`). Connection is hardcoded in `src/app.module.ts` (`TypeOrmModule.forRoot`), with `synchronize: true` — entities auto-create tables on boot.

**The app connects to DB `issueflow_mvp`, not `issueflow`.** The default `issueflow` DB holds a conflicting prior implementation (camelCase columns + seed data) that breaks `synchronize`. Don't switch the name back without first clearing that schema.

Inspect: `docker compose exec db psql -U issueflow -d issueflow_mvp -c "\d users"`

## Conventions

Domain-per-folder under `src/`: `<domain>.entity.ts`, `.module.ts`, `.controller.ts`, `.service.ts`, `dto/`. Shared enums/filters in `src/common/`. The `tickets` domain splits logic across multiple services (`ticket-state`, `ticket-assignment`, `ticket-escalation`, `ticket-dependencies`).

Entities: plural table name (`@Entity('users')`), snake_case columns (`@Column({ name: 'full_name' })`) with camelCase TS properties to match the README JSON, and FK columns paired with `@ManyToOne` + `@JoinColumn`.

## Current state

DB layer complete: entities `User`, `Project`, `Ticket`, `Comment`, `AuditLog`, `TicketDependency`, plus the enums in `src/common/enums/` (`UserRole`, `TicketStatus`, `TicketPriority`, `TicketType`, `AuditAction`, `AuditActor`, `AuditEntityType`), all registered in `app.module.ts`.

First HTTP slice done — **Users**: `UsersModule` (controller + service + `create-user`/`update-user` DTOs) wired into `AppModule`, implementing the README Users API (GET list/by-id, POST create, POST `update/:userId`, DELETE). A global `ValidationPipe` (`whitelist: true, transform: true`) is set in `main.ts`. Controllers use `@HttpCode(200)` on POST/DELETE and `ParseIntPipe` on id params; service throws `ConflictException` on duplicate username/email and `NotFoundException` for missing users (hard delete — soft delete is only for tickets/projects).

**Projects** slice done — `ProjectsModule` (controller + service + `create-project`/`update-project` DTOs) wired into `AppModule`, implementing the README Projects API (GET list/by-id, POST create, PATCH `:projectId`, DELETE `:projectId`). DELETE is **soft delete**: `Project` has `@DeleteDateColumn deletedAt` (marked `@Exclude`), `remove` uses `softRemove`, and the controller uses `ClassSerializerInterceptor` so `deletedAt` never appears in responses. `create` validates `ownerId` references an existing user (400 otherwise). Soft-deleted projects are hidden from GET but retained in the DB.

**Tickets** slice done (basic CRUD) — `TicketsModule` (controller + service + `create-ticket`/`update-ticket` DTOs) wired into `AppModule`, implementing the README Tickets API (`GET /tickets?projectId=`, GET by id, POST, PATCH, DELETE). The `Ticket` entity gained `dueDate` (nullable timestamptz), `isOverdue` (bool default false), and `deletedAt` (`@DeleteDateColumn` + `@Exclude`). DELETE is soft delete (`softRemove`); GET hides soft-deleted rows; `dueDate`/`isOverdue` are visible in responses, `deletedAt` is not. `create` validates `projectId` exists and `assigneeId` if provided. **No state-machine enforcement yet** — status updates accept any valid enum; the forward-only lifecycle (no edits when DONE, no DONE with unresolved blockers) is the next step.

**Ticket state machine** enforced (Step 6) — `TicketStateService` (`src/tickets/ticket-state.service.ts`), consulted by `TicketsService.update`: strict single-step forward transitions only (`TODO→IN_PROGRESS→IN_REVIEW→DONE`; forward jumps and backward moves → 400), no edits once a ticket is `DONE` (any update → 400), and `→DONE` blocked when any `TicketDependency.blockedBy` ticket isn't `DONE` (400). Dependency rows are read-only here — there's still no API to *create* them. Lifecycle applies to updates only; `POST /tickets` may still create a ticket in any status.

**Ticket dependencies API** (Step 7) — `TicketDependenciesController` (`tickets/:ticketId/dependencies`) + `TicketDependenciesService`, registered in `TicketsModule`. `POST` (`{blockedBy}`), `GET` (returns blocker tickets as `{id, title, status}`), `DELETE :blockerId`. Validates both tickets exist (path ticket 404, bad `blockedBy` 400), same project (400), no duplicate (409), and no self-dependency (400). The Step 6 blocker rule is now exercisable through the API (no manual SQL). No transitive cycle detection (only direct self-block).

**Comments API** (Step 8) — `CommentsController` (`tickets/:ticketId/comments`) + `CommentsService`, registered in `AppModule`. `GET` list, `POST` (`{authorId, content}`), `PATCH :commentId` (`{content}`), `DELETE :commentId`. Validates ticket exists (404), author exists (400), and comment belongs to the ticket for patch/delete (404). Hard delete (no soft delete for comments). The service maps to a `CommentView` returning `{id, ticketId, authorId, content, mentionedUsers}` (mentions now populated — see Step 12). `createdAt`/`updatedAt` stay on the entity but are excluded from responses.

**Auth / JWT** (Step 9) — `AuthModule` (`src/auth/`): `POST /auth/login` → `{accessToken, tokenType:"Bearer", expiresIn:3600}`, `POST /auth/logout` (in-memory `TokenDenylistService`), `GET /auth/me`. A global `JwtAuthGuard` (`APP_GUARD`) protects every route except those marked `@Public()` — currently `POST /auth/login`, `POST /users` (registration/bootstrap), and `GET /` (the smoke endpoint, so the skeleton e2e test passes). Passwords are hashed with Node `crypto.scrypt` in `PasswordService` (no bcrypt); `User.passwordHash` is nullable + `@Exclude`, so it never appears in responses (users controllers + `/auth/me` use `ClassSerializerInterceptor`). `password` is required on `POST /users`. JWT secret is **hardcoded (`dev-secret-change-me`) — local dev only**; move to env for real use. Only new dep: `@nestjs/jwt`. No role-based authorization yet (any valid token passes).

**Auth flow:** `POST /users` (with `password`) → `POST /auth/login` → send `Authorization: Bearer <token>` on all other endpoints. Existing pre-Step-9 users have null `passwordHash` and cannot log in.

**Audit logging** (Step 10) — `AuditLogsModule` (`src/audit-logs/`): `AuditLogsService.record(...)` + `GET /audit-logs` with optional `entityType`/`entityId`/`action`/`actor` filters (JWT-protected, no role gate). Every state-changing service method takes an explicit `actorId` (threaded from controllers via `@CurrentUser().sub`) and writes an audit row after the mutation succeeds — Users/Projects/Tickets/Comments CREATE/UPDATE/DELETE, and dependency add/remove as `UPDATE`/`TICKET` (entityId = ticketId). Public `POST /users` logs CREATE/USER with `performedBy: null`. `AuditLogsService` is a normal singleton; `SYSTEM`/`AUTO_ASSIGN` reserved for auto-assignment later.

**Soft-delete admin endpoints** (Step 11) — ADMIN-only: `GET /projects/deleted`, `POST /projects/:id/restore`, `GET /tickets/deleted?projectId=`, `POST /tickets/:id/restore`. Enforced by a reusable `@Roles(UserRole.ADMIN)` decorator + `RolesGuard` (`src/auth/`), applied per-route via `@UseGuards(RolesGuard)` (the global `JwtAuthGuard` runs first and sets `req.user`; non-ADMIN → 403). **Not** global and no role checks on normal CRUD. `findDeleted` uses `withDeleted: true` + `deletedAt: Not(IsNull())`; `restore` 404s on unknown/not-deleted ids, calls `repo.restore()` (clears `deleted_at`), and audits `RESTORE`. The `/deleted` routes are declared before the `/:id` routes so they aren't parsed as ids.

**@Mentions** (Step 12) — `MentionsModule` (`src/mentions/`) + `CommentMention` entity (`comment_mentions` table, unique `(comment_id, user_id)`, `ON DELETE CASCADE` from `comments`). `MentionsService` parses `@username` from `comment.content` with `/@([A-Za-z0-9_]+)/g`, matches users **case-insensitively**, ignores unknown handles, and re-syncs mentions on comment update (delete + reinsert). `mentionedUsers` is now populated on every comment response with `{id, username, fullName}` (no `passwordHash` leak — explicit mapping). New endpoint `GET /users/:userId/mentions?page=&pageSize=` (JWT-protected, defaults `page=1`/`pageSize=20`/max 100) returns `{ data, total, page }` with comments newest-first. `CommentsModule` imports `MentionsModule`; no circular deps.

**Auto-assignment + workload** (Step 13) — `TicketAssignmentService` (`src/tickets/ticket-assignment.service.ts`) + `WorkloadController` (`projects/:projectId/workload`). When `POST /tickets` omits `assigneeId`, the service picks the least-loaded DEVELOPER (open ticket = non-DONE, non-soft-deleted, in the same project); tie-break by `user.id ASC` (≡ registration order). No-developer case leaves the ticket unassigned (no error, no AUTO_ASSIGN row). Auto-assigned creations write an **additional** audit row `AUTO_ASSIGN` / `TICKET` with `actor: SYSTEM, performedBy: null` (in addition to the normal `CREATE/TICKET` row). The workload endpoint is JWT-protected, validates the project exists (404), and returns every DEVELOPER (incl. 0-count) sorted by `openTicketCount` ASC then `userId` ASC. **Manual `assigneeId` (POST or PATCH) is now restricted to users with role DEVELOPER** — assigning an ADMIN returns 400. Not triggered on update; PATCH `assigneeId` remains a manual override.

**Assumption (documented):** there's no `project_members` table, so the candidate pool for both auto-assign and the workload endpoint is **all users with `role = DEVELOPER`** globally, not project-scoped membership.

**Auto-escalation** (Step 14) — `TicketEscalationService` (`src/tickets/ticket-escalation.service.ts`) + ADMIN-only `POST /tickets/escalate` (`escalation.controller.ts`). One cycle: find tickets with `dueDate < now`, not DONE, not soft-deleted; for each, bump priority one level (LOW→MEDIUM→HIGH→CRITICAL) — if already CRITICAL and `is_overdue=false`, set `is_overdue=true`; once CRITICAL+`is_overdue=true` it's an **idempotent skip**. Each modification audits as `UPDATE`/`TICKET`/`SYSTEM`/`performedBy: null` (no new `ESCALATE` enum value). `PATCH /tickets/:id` with a priority change now resets `is_overdue=false` per requirements §3.7. **No `@nestjs/schedule` / cron is wired** — `runEscalation()` is pure and callable, so production can wrap it in any external scheduler without coupling tests to time. `EscalationController` is registered before `TicketsController` to keep `/tickets/escalate` literal-matched (no `:ticketId` ambiguity).

**CSV export / import** (Step 15) — `CsvController` (`GET /tickets/export?projectId=`, `POST /tickets/import` multipart with `file` + `projectId` form field) + `TicketCsvService`. Export emits the README columns exactly (`id, title, description, status, priority, type, assigneeId`) and round-trips commas/quotes via `csv-stringify`. Import parses with `csv-parse`, validates each row with `plainToInstance` + class-validator (same `CreateTicketDto` rules as `POST /tickets`), then **reuses `TicketsService.create()`** so every row inherits projectId/assigneeId-DEVELOPER validation, **auto-assignment** when `assigneeId` is blank, and per-row CREATE/TICKET (+ optional AUTO_ASSIGN/SYSTEM) audit rows — large imports therefore produce many audit rows. Per-row failures are captured in `{created, failed, errors:[{row, message}]}`; other rows continue. The form's `projectId` overrides any CSV `projectId` cell, is validated via `ImportTicketsDto` (missing/non-numeric → 400), and a non-existent project also → 400. `CsvController` is registered before `TicketsController` so `/tickets/export` literal-matches (no `:ticketId` collision). Import accepts an optional `dueDate` column; export does not include `dueDate` or `isOverdue` (README contract).

**Attachments** (Step 16) — `AttachmentsModule` (`src/attachments/`) + `Attachment` entity (`attachments` table; `ON DELETE CASCADE` from `tickets`). `POST /tickets/:ticketId/attachments` (multipart `file`) → `{id, ticketId, filename, contentType}` (`storagePath` is internal, never returned). `DELETE /tickets/:ticketId/attachments/:attachmentId` removes the DB row, then unlinks the on-disk file best-effort. Validation: **10 MB cap** via multer `limits.fileSize` (over → 413); allowed mime types `image/png, image/jpeg, application/pdf, text/plain` via `fileFilter` (anything else → 400). On-disk filenames are `randomUUID() + ext`; original filename preserved in DB. Files land in `<repo>/uploads/` (auto-created, **gitignored**). Audit rows on upload + delete: `UPDATE/TICKET/entityId=ticketId/actor=USER` (no new `ATTACHMENT` enum value). JWT-protected, no role gate.

**Tests** (Step 17) — backend-only with the existing Jest + Supertest stack (no new deps). **Unit specs** (`src/**/*.spec.ts`) for the core business services: `PasswordService` (scrypt round-trip + null/malformed rejection), `TicketStateService` (forward-only transitions, DONE lock, open-blocker detection), `TicketAssignmentService` (no-developer null, least-loaded pick, id-ASC tie-break, workload sort), `TicketEscalationService` (single-step bump, CRITICAL→isOverdue flip, idempotency, full LOW→CRITICAL ladder). **E2E** (`test/auth-flow.e2e-spec.ts`) covers: protected routes 401 without token; the create-user → login → create-project → create-ticket happy path with shape checks (no `passwordHash`/`deletedAt`); DEVELOPER token → 403 on the ADMIN-only `/projects/deleted`. Run with `npm test` (unit) and `npm run test:e2e` (the e2e suite needs Postgres up via `docker compose`).

## Deliverables (still missing)

`run.md` (setup/run/test steps) and tests.
