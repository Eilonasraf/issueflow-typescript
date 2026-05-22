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

**Comments API** (Step 8) — `CommentsController` (`tickets/:ticketId/comments`) + `CommentsService`, registered in `AppModule`. `GET` list, `POST` (`{authorId, content}`), `PATCH :commentId` (`{content}`), `DELETE :commentId`. Validates ticket exists (404), author exists (400), and comment belongs to the ticket for patch/delete (404). Hard delete (no soft delete for comments). The service maps to a `CommentView` returning `{id, ticketId, authorId, content, mentionedUsers}` — `mentionedUsers` is stubbed `[]` with a TODO; real `@username` parsing/persistence is the future mentions slice. `createdAt`/`updatedAt` stay on the entity but are excluded from responses.

**Auth / JWT** (Step 9) — `AuthModule` (`src/auth/`): `POST /auth/login` → `{accessToken, tokenType:"Bearer", expiresIn:3600}`, `POST /auth/logout` (in-memory `TokenDenylistService`), `GET /auth/me`. A global `JwtAuthGuard` (`APP_GUARD`) protects every route except those marked `@Public()` — currently `POST /auth/login` and `POST /users` (registration/bootstrap). Passwords are hashed with Node `crypto.scrypt` in `PasswordService` (no bcrypt); `User.passwordHash` is nullable + `@Exclude`, so it never appears in responses (users controllers + `/auth/me` use `ClassSerializerInterceptor`). `password` is required on `POST /users`. JWT secret is **hardcoded (`dev-secret-change-me`) — local dev only**; move to env for real use. Only new dep: `@nestjs/jwt`. No role-based authorization yet (any valid token passes).

**Auth flow:** `POST /users` (with `password`) → `POST /auth/login` → send `Authorization: Bearer <token>` on all other endpoints. Existing pre-Step-9 users have null `passwordHash` and cannot log in.

**Audit logging** (Step 10) — `AuditLogsModule` (`src/audit-logs/`): `AuditLogsService.record(...)` + `GET /audit-logs` with optional `entityType`/`entityId`/`action`/`actor` filters (JWT-protected, no role gate). Every state-changing service method takes an explicit `actorId` (threaded from controllers via `@CurrentUser().sub`) and writes an audit row after the mutation succeeds — Users/Projects/Tickets/Comments CREATE/UPDATE/DELETE, and dependency add/remove as `UPDATE`/`TICKET` (entityId = ticketId). Public `POST /users` logs CREATE/USER with `performedBy: null`. `AuditLogsService` is a normal singleton; `SYSTEM`/`AUTO_ASSIGN` reserved for auto-assignment later.

**Soft-delete admin endpoints** (Step 11) — ADMIN-only: `GET /projects/deleted`, `POST /projects/:id/restore`, `GET /tickets/deleted?projectId=`, `POST /tickets/:id/restore`. Enforced by a reusable `@Roles(UserRole.ADMIN)` decorator + `RolesGuard` (`src/auth/`), applied per-route via `@UseGuards(RolesGuard)` (the global `JwtAuthGuard` runs first and sets `req.user`; non-ADMIN → 403). **Not** global and no role checks on normal CRUD. `findDeleted` uses `withDeleted: true` + `deletedAt: Not(IsNull())`; `restore` 404s on unknown/not-deleted ids, calls `repo.restore()` (clears `deleted_at`), and audits `RESTORE`. The `/deleted` routes are declared before the `/:id` routes so they aren't parsed as ids.

Mentions, auto-assignment/workload, attachments, CSV, and the escalation scheduler are not built.

## Deliverables (still missing)

`run.md` (setup/run/test steps) and tests.
