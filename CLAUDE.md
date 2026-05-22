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

No auth yet. `comments/` and `audit-logs/` still have only entities. ADMIN-only soft-delete management endpoints (`/projects|tickets/deleted`, `/restore`) not built (need auth). Next: ticket state machine.

## Deliverables (still missing)

`run.md` (setup/run/test steps) and tests.
