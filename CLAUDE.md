# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

IssueFlow — a RESTful ticket-tracking backend for the TDP 2026 home assignment. Stack: **NestJS 11 (TypeScript) + TypeORM 0.3 + PostgreSQL**.

`README.md` is the API contract — its tables define exact endpoints and JSON shapes (camelCase: `fullName`, `ownerId`, `assigneeId`). Full requirements are in `../TDP_issueflow_requirements.pdf`.

## Architecture & how it was built

**Layering — Controller → Service → Repository (CSR):**
- `*.controller.ts` — HTTP routing, request/response shape, and route-level guards (`JwtAuthGuard`, `RolesGuard`); DTOs are validated by the global `ValidationPipe`.
- `*.service.ts` — business logic, domain validation, audit side effects, and repository calls.
- TypeORM repositories — DB access (no raw SQL); domain services use `@InjectRepository(Entity)` to reach them.

This is the standard NestJS pattern; every domain folder (`users/`, `projects/`, `tickets/`, etc.) is structured the same way. The `tickets` domain splits the service layer further (`ticket-state`, `ticket-assignment`, `ticket-escalation`, `ticket-dependencies`, `ticket-csv`) to keep each rule set focused.

**Working model used during this project:**
1. **Design first** — architecture diagram in Figma MCP before any code.
2. **Plan per slice** — each step has a written plan reviewed and approved before implementation.
3. **Slice-by-slice implementation** — small vertical slices, curl-verified, committed per step.
4. **Audit trail** — every step's goal/prompt/outcome/reasoning is captured in `prompts.md` (Claude Opus 4.7 attributed throughout, OpenAI Codex as secondary reviewer).

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

Feature-complete backend:
- Users, Projects, Tickets, Comments
- Auth/JWT (login / logout / me) + `@Roles` role guard
- Audit logging (CRUD + RESTORE + AUTO_ASSIGN)
- Soft delete + ADMIN-only `/deleted` and `/restore` endpoints (projects + tickets)
- Ticket dependencies + state machine (forward-only, DONE locked, blocker gate)
- Mentions (`@username` parsed case-insensitively, populated on every comment response)
- Auto-assignment + workload
- Auto-escalation (manual trigger via ADMIN `POST /tickets/escalate` — no cron wired)
- CSV import/export (import reuses `TicketsService.create()` per row)
- Attachments (local disk, 10 MB / mime allow-list)
- Backend tests with Jest + Supertest

Non-obvious gotchas:
- **Public routes:** `GET /`, `POST /auth/login`, `POST /users` (registration/bootstrap). Everything else is JWT-protected.
- **Documented assumption:** auto-assign and the workload endpoint use *all* `DEVELOPER` users globally (no `project_members` table).
- **JWT secret** is hardcoded in `src/auth/auth.module.ts` — local dev only; move to env for any real deployment.

See `README.md` for the API contract, `run.md` for setup/run/test instructions, and `prompts.md` for the AI usage log and per-step decisions.

## Deliverables

Completed:
- `run.md` — setup, database, build, run, and test instructions.
- `prompts.md` — main AI prompts, model/tool attribution, and implementation decisions.
- Backend tests — Jest unit tests and Supertest e2e tests.
- `CLAUDE.md` — repository-level instruction/context file.

No known required deliverables are intentionally left incomplete.
