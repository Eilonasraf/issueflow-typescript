# AI Usage Log

This file contains the main and relevant AI prompts, commands, and tool interactions used during the IssueFlow home assignment. It is not a full transcript of every interaction.

## Model and Tools Used

- Primary implementation agent: Claude Code with Claude Opus 4.7
- Claude Code setup command: `/init`, used to generate repository-level guidance in `CLAUDE.md`
- Design tool: Figma MCP, used to create an architecture/design diagram
- Secondary reviewer: OpenAI Codex, used to review design and implementation decisions
- Human responsibility: I reviewed, tested, and validated the generated code locally before continuing between implementation slices.

## Project Initialization with Claude Code

**Tool:** Claude Code  
**Model:** Claude Opus 4.7  
**Command Used:** `/init`

**Goal:** Initialize the agent with repository-level context before implementation.

**Prompt / Action:**
> I used Claude Code’s `/init` command after opening the IssueFlow NestJS skeleton.  
> The goal was to let Claude inspect the repository and generate a project-level instruction file that captures the stack, commands, database setup, API contract, coding conventions, current implementation state, and missing deliverables.

**Generated Artifact:**
Claude generated `CLAUDE.md`, which summarized:
- The project as IssueFlow, a RESTful ticket-tracking backend for the TDP 2026 home assignment.
- The stack: NestJS 11, TypeScript, TypeORM 0.3, and PostgreSQL.
- `README.md` as the API contract.
- Main commands for build, start, lint, unit tests, and e2e tests.
- Database setup using Docker Compose.
- The current development database note: `issueflow_mvp`.
- Repository conventions: domain-per-folder structure, plural table names, snake_case database columns, and camelCase API fields.
- Current implementation state and missing deliverables.

**Outcome:**
- Created persistent project context for Claude Code.
- Helped future agent interactions stay aligned with the assignment contract.
- Reduced the risk of adding unrelated code or expanding the scope too early.

## Architecture Design with Figma MCP

**Tool:** Claude Code with Figma MCP  
**Model:** Claude Opus 4.7

**Goal:** Create an initial architecture/design diagram before implementation, to clarify the planned backend structure and the main system layers.

**Prompt / Action:**
> I used the Figma MCP tool during the planning stage to create a visual architecture diagram for the IssueFlow backend.  
> The goal was to represent the main backend layers: API controllers, application services, domain logic, TypeORM persistence, and PostgreSQL.  
> I wanted the diagram to highlight the modular NestJS structure, ticket lifecycle validation, audit logging, ticket dependencies, auto-assignment, and future extended features.

**Outcome:**
- Created an initial visual design diagram for the planned backend architecture.
- Clarified the separation between controllers, services, domain logic, persistence, and database layers.
- Used the diagram as a planning artifact before continuing with implementation in small verified slices.

## Building the Initial Database Foundation

**Tool:** Claude Code  
**Model:** Claude Opus 4.7

**Goal:** Stand up the persistence layer first — prove the NestJS app boots, PostgreSQL connects, and TypeORM creates the core tables — before writing any API code.

**Prompt:**
> Start with the database foundation only. Configure the TypeORM PostgreSQL
> connection, add the core enums, and add the User, Project, and Ticket entities.
> Use plural table names, snake_case database columns, and camelCase TypeScript
> properties, with explicit foreign keys. Then build and run the app and confirm
> the tables are created. Do not add services, controllers, DTOs, auth, or
> business logic yet.

**Outcome:**
- Added enums: UserRole, TicketStatus, TicketPriority, TicketType.
- Added `User`, `Project`, and `Ticket` entities with explicit FK relationships.
- Wired `TypeOrmModule.forRoot` in `app.module.ts` with `synchronize: true`.
- During local verification, the existing `issueflow` database contained an older
  conflicting schema and seed data, so the app was temporarily pointed at a clean
  `issueflow_mvp` database. This avoided destructive cleanup while keeping the old
  data untouched.
- Verified: project builds, app boots and connects, smoke endpoint responds, and
  PostgreSQL contains `users`, `projects`, and `tickets` with the expected
  columns, enum types, unique constraints, and foreign keys.

**Reasoning:**
A database-first slice keeps the foundation provable and small before any HTTP
work, and surfaces environment issues (like the pre-existing conflicting schema)
early rather than mid-feature.

## Completing the Core Database Layer

**Tool:** Claude Code  
**Model:** Claude Opus 4.7

**Goal:** Complete the core persistence model before moving to API endpoints, while keeping the scope limited to database entities only.

**Prompt:**
> Continue the DB foundation, but keep the scope limited.
> Add only the Comment, AuditLog, and TicketDependency entities, plus the audit enums they require.
> Register the entities in TypeORM and verify that the new tables are created.
> Keep the same conventions: plural table names, snake_case database columns, camelCase TypeScript properties, and explicit foreign keys.
> Add timestamps where they are useful for comments, dependencies, and audit logs.
> Do not add services, controllers, DTOs, authentication, attachments, mentions, scheduler logic, or business logic yet.

**Outcome:**
- Added `Comment`, `AuditLog`, and `TicketDependency` entities.
- Added audit-related enums for action, actor, and entity type.
- Registered the new entities in TypeORM.
- Verified that the project builds successfully.
- Verified that the app boots and TypeORM synchronizes cleanly.
- Verified that PostgreSQL now contains six core tables with the expected foreign keys, enum columns, timestamps, and unique dependency constraint.

**Reasoning:**
This completed the main database layer while avoiding unnecessary scope expansion. With the persistence model verified, the next step can move to a vertical API slice starting with the Users API.

## Users API Vertical Slice

**Tool:** Claude Code  
**Model:** Claude Opus 4.7

**Goal:** Implement the first complete API flow using the Users API.

**Prompt:**
> Implement the Users vertical slice only. Add the users module, service, controller, and DTOs. Implement the README Users API endpoints with validation, duplicate handling, not-found handling, and 200 OK responses. Do not add auth, projects, tickets, comments, audit logs, or other features yet.

**Outcome:**
- Added Users module, controller, service, and DTOs.
- Implemented create, list, get by id, update, and delete users.
- Added global validation pipe.
- Verified success and negative cases using manual curl requests.

**Reasoning:**
This was the first vertical API slice after completing the database layer, proving the full request-to-response path (controller → service → TypeORM repository → PostgreSQL) works before expanding to other API groups.

## Projects API Vertical Slice

**Tool:** Claude Code  
**Model:** Claude Opus 4.7

**Goal:** Implement the README Projects API as the second vertical slice, including the required soft-delete behavior.

**Prompt:**
> Implement the Projects vertical slice only. Add the projects module, service, controller, and DTOs. Implement the README Projects endpoints (GET all, GET by id, POST, PATCH, DELETE). Use TypeORM soft delete for DELETE via a deleted_at column — do not hard-remove the row — and make sure GET endpoints exclude soft-deleted projects. Validate that ownerId references an existing user. Do not add /projects/deleted or restore endpoints, and do not add tickets, auth, audit logs, workload, attachments, or scheduler yet.

**Outcome:**
- Added Projects module, controller, service, and create/update DTOs.
- Added a `deleted_at` soft-delete column to the Project entity and implemented DELETE as a soft delete (`softRemove`); GET endpoints exclude soft-deleted rows.
- Validated `ownerId` against existing users, returning a clear 400 for an unknown owner.
- Hid `deletedAt` from API responses with `@Exclude` + `ClassSerializerInterceptor`.
- Verified the positive flow, negative cases (400/404), and confirmed in the DB that a deleted project is retained with `deleted_at` set while being hidden from the API.

**Reasoning:**
Projects was the right next slice because it depends only on users and is itself a dependency for tickets. It also introduced the soft-delete pattern the assignment requires for projects and tickets, in an isolated, verifiable way.

## Tickets CRUD Vertical Slice

**Tool:** Claude Code  
**Model:** Claude Opus 4.7

**Goal:** Implement basic Ticket CRUD as a vertical slice, deliberately excluding the status state machine.

**Prompt:**
> Implement the Tickets basic CRUD vertical slice only. Add the tickets module, service, controller, and DTOs. Add dueDate, isOverdue, and a deleted_at soft-delete column to the Ticket entity, and hide deletedAt from responses. Implement the README Tickets endpoints (GET by project, GET by id, POST, PATCH, DELETE) with soft delete and DTO validation. Validate that projectId exists and assigneeId exists when provided. Do not add the ticket state-machine rules, dependencies logic, audit logs, comments, auth, auto-assignment, CSV, attachments, or scheduler yet.

**Outcome:**
- Added Tickets module, controller, service, and create/update DTOs.
- Extended the Ticket entity with `dueDate`, `isOverdue`, and a `deleted_at` soft-delete column.
- Implemented CRUD with soft delete; GET endpoints exclude soft-deleted tickets.
- Validated `projectId` and optional `assigneeId` against existing records (clear 400s).
- Verified the positive flow, negative cases (400/404), DB retention of soft-deleted rows with `deleted_at` set, and that `deletedAt` does not leak in responses.

**Reasoning:**
Keeping CRUD separate from the lifecycle rules made the slice easy to verify on its own. The state machine (forward-only transitions, no edits when DONE, no DONE with unresolved blockers) is intentionally deferred to the next step so the basic create/read/update/delete route is proven first.

## Ticket State Machine

**Tool:** Claude Code  
**Model:** Claude Opus 4.7

**Goal:** Add the ticket lifecycle business rules on top of the CRUD slice, isolated in a dedicated service.

**Prompt:**
> Implement the ticket state-machine rules only. Add a TicketStateService and wire it into TicketsModule; update only TicketsService.update to use it. Enforce strict single-step forward transitions (TODO -> IN_PROGRESS -> IN_REVIEW -> DONE), reject backward transitions and forward jumps, reject any update once a ticket is DONE, and reject moving to DONE when unresolved blockers exist (read existing TicketDependency rows; do not add dependency endpoints). Do not add audit logs, auth, comments, auto-assignment, CSV, attachments, or scheduler.

**Outcome:**
- Added `TicketStateService` with a strict forward-transition map and three guards: `assertCanUpdate` (DONE is locked), `assertValidTransition` (single-step only), and `assertNoOpenBlockers` (checks `blockedBy` ticket statuses).
- Wired the service into `TicketsModule` and called it from `TicketsService.update`; CRUD methods otherwise unchanged.
- Verified every transition case (forward 200; backward, forward-jump, and update-when-DONE 400) and the blocker gate (DONE blocked while a blocker is open, allowed once it is DONE) via curl, inserting a dependency row directly in the DB since the dependency endpoints are not built yet.

**Reasoning:**
Putting the lifecycle rules in their own service keeps `TicketsService` focused on persistence and makes the rules independently testable. Using strict single-step transitions (not arbitrary forward jumps) matches the assignment's lifecycle and makes invalid jumps like TODO -> DONE fail explicitly.

## Ticket Dependencies API

**Tool:** Claude Code  
**Model:** Claude Opus 4.7

**Goal:** Expose the ticket dependency endpoints so the blocker rule is usable and testable through the public API instead of manual SQL.

**Prompt:**
> Implement the ticket dependencies API only. Add a TicketDependenciesService, a controller for POST/GET/DELETE under /tickets/:ticketId/dependencies, and a CreateDependencyDto. Validate that both tickets exist, that they belong to the same project, prevent duplicate dependencies, and prevent a ticket from depending on itself. GET should return the blocker tickets as id/title/status. Do not add auth, audit, comments, mentions, attachments, scheduler, auto-assignment, CSV, or cycle detection.

**Outcome:**
- Added `TicketDependenciesService` and `TicketDependenciesController` (`tickets/:ticketId/dependencies`) plus `CreateDependencyDto`, registered in `TicketsModule`.
- Implemented add/list/remove with validations: path ticket missing -> 404, unknown blocker -> 400, cross-project -> 400, duplicate -> 409, self-dependency -> 400.
- GET returns blockers as `{id, title, status}`.
- Verified the full flow with curl, including re-running the state-machine blocker rule through the real API: adding a dependency blocks `-> DONE` (400), and removing it via DELETE allows `-> DONE` (200).

**Reasoning:**
This completed the dependency feature so the Step 6 blocker rule is driven by real API data rather than hand-inserted rows, which makes the lifecycle behavior verifiable end-to-end.

## Comments API

**Tool:** Claude Code  
**Model:** Claude Opus 4.7

**Goal:** Implement the comments API as a vertical slice, deferring mention parsing to a later step.

**Prompt:**
> Implement the comments API only. Add a CommentsModule, service, controller, and create/update DTOs, and register the module. Implement GET/POST/PATCH/DELETE under /tickets/:ticketId/comments. Validate the ticket exists and the authorId user exists. Do not implement mentions, audit, auth, or concurrency yet. For now return mentionedUsers as an empty array, but mark clearly that real @username parsing and persistence will be implemented in the mentions slice.

**Outcome:**
- Added `CommentsModule`, `CommentsService`, `CommentsController`, and create/update DTOs, wired into `AppModule`.
- Implemented list/create/update/delete with validations: ticket missing -> 404, unknown author -> 400, comment not on the ticket -> 404, empty content -> 400.
- Mapped responses to `{ id, ticketId, authorId, content, mentionedUsers }` with `mentionedUsers: []` and a `// TODO(mentions slice)` marker; `createdAt`/`updatedAt` are kept on the entity but excluded from responses.
- Verified the full CRUD flow and negative cases with curl.

**Reasoning:**
Keeping the comment response shape aligned with the README now (including a stubbed `mentionedUsers: []`) means the later mentions slice only has to populate that array, with no contract change. Mentions are a distinct feature (parsing, persistence, a lookup endpoint), so isolating them keeps this slice small and verifiable.

## Auth / JWT

**Tool:** Claude Code  
**Model:** Claude Opus 4.7

**Goal:** Add JWT authentication and protect the API, including the password field the User entity was missing.

**Prompt:**
> Implement Auth/JWT only. Add login/logout/me and a global JWT guard. Hash passwords with Node's crypto scrypt in a reusable PasswordService (no bcrypt/bcryptjs, no passport; only add @nestjs/jwt if needed). Add passwordHash to the User entity and a password field to CreateUserDto, hash it on create, and never return passwordHash. Use a global guard with @Public() on POST /auth/login and POST /users (bootstrap); protect everything else. In-memory token deny-list for logout. No role authorization yet. Document the create -> login -> Bearer flow in run.md, and note the hardcoded JWT secret is local-dev only.

**Outcome:**
- Added `AuthModule` (`auth.service`, `auth.controller`, `jwt-auth.guard`, `password.service`, `token-denylist.service`, `@Public()` and `@CurrentUser()` decorators, `LoginDto`); only new dependency is `@nestjs/jwt`.
- Added nullable `passwordHash` (`@Exclude`) to `User` and a required `password` to `CreateUserDto`; passwords hashed with scrypt and excluded from all responses via `ClassSerializerInterceptor`.
- Global `JwtAuthGuard` (`APP_GUARD`) protects every route except `POST /auth/login` and `POST /users`.
- Verified: protected routes 401 without a token and 200 with one; login returns `{accessToken, tokenType:"Bearer", expiresIn:3600}`; `/auth/me` returns the profile without `passwordHash`; wrong password 401; logout revokes the token (subsequent use 401); DB stores a scrypt `salt:hash`, not plaintext.
- Filled in `run.md` with the setup/build/run steps and the auth flow; flagged the hardcoded secret as local-dev only.

**Reasoning:**
A global guard plus a small `@Public()` allow-list means "protect everything" is enforced in one place rather than per-route, and keeping `POST /users` public solves the bootstrap chicken-and-egg (no user = no token = no way to create a user). Using Node `crypto` for hashing avoids a native dependency, and isolating it in `PasswordService` lets both user-create and login share one implementation.

## Audit Logging

**Tool:** Claude Code  
**Model:** Claude Opus 4.7

**Goal:** Record every state-changing action with the real authenticated user, now that JWT auth exists.

**Prompt:**
> Implement audit logging only. Add AuditLogsService, AuditLogsController (GET /audit-logs with entityType/entityId/action/actor filters), and an AuditLogQueryDto. Thread actorId explicitly: controllers read @CurrentUser().sub and pass it into state-changing service methods, which write an audit record after the mutation succeeds. Keep AuditLogsService singleton. Public POST /users logs CREATE/USER with performedBy null. Dependency add/remove logs UPDATE/TICKET with entityId = ticketId. Read-only methods do not log. No role authorization, restore endpoints, mentions, attachments, CSV, scheduler, or auto-assignment yet.

**Outcome:**
- Added `AuditLogsModule`/`Service`/`Controller` + query DTO; `GET /audit-logs` is JWT-protected and supports the four filters; rows are returned newest-first.
- Threaded `actorId` through every mutating method in Users, Projects, Tickets, Comments, and Ticket Dependencies; each writes an audit row after success. Read methods are untouched.
- Verified: `/audit-logs` 401 without a token; CREATE/USER logs `performedBy: null` for public registration; CREATE/PROJECT, CREATE/TICKET, UPDATE/TICKET (incl. status change and dependency add/remove), CREATE/COMMENT, and the DELETE rows all carry the real `performedBy`; filters by `entityType`, `entityId`, `action`, and `actor` narrow correctly; DB cross-check confirms persistence.

**Reasoning:**
Explicit `actorId` threading keeps the audit trail transparent and debuggable (clear who did what), avoids request-scoped DI, and leaves services usable from non-HTTP contexts (e.g. future system jobs that will log with `actor: SYSTEM`, `performedBy: null`). Writing the record after the mutation ensures only successful state changes are logged.

## Soft-Delete Admin Endpoints

**Tool:** Claude Code  
**Model:** Claude Opus 4.7

**Goal:** Complete the soft-delete feature with ADMIN-only list/restore endpoints, now that auth and audit exist.

**Prompt:**
> Implement the soft-delete admin endpoints only. Add GET /projects/deleted, POST /projects/:id/restore, GET /tickets/deleted?projectId=, POST /tickets/:id/restore. Make them ADMIN-only using a reusable @Roles decorator + RolesGuard that reads req.user.role from the JWT (non-admin -> 403); apply it only to these 4 routes, not globally, and don't add role checks to normal CRUD. Restore should clear deletedAt and be audited as RESTORE. Do not add mentions/attachments/CSV/scheduler/auto-assignment.

**Outcome:**
- Added `@Roles(...UserRole[])` decorator and `RolesGuard` in `src/auth/`, applied per-route via `@UseGuards(RolesGuard)` on the 4 admin endpoints.
- Added `findDeleted` (using `withDeleted` + `deletedAt IS NOT NULL`) and `restore` (clears `deleted_at`, audits `RESTORE`) to the projects and tickets services; restoring an unknown/not-deleted id returns 404.
- Declared the `/deleted` routes before the `/:id` routes to avoid `deleted` being parsed as an id.
- Verified: no token 401, DEVELOPER 403, ADMIN 200; restore clears `deleted_at` and the records reappear in normal GETs; deleted lists no longer show them; two RESTORE audit rows with the admin's `performedBy`.

**Reasoning:**
A reusable guard + decorator keeps role enforcement declarative and ready for any future ADMIN route, while staying scoped to just these endpoints (no blanket role gating). Reusing TypeORM's `restore()`/`withDeleted` keeps the soft-delete lifecycle consistent with how `softRemove` was implemented earlier.

## @Mentions

**Tool:** Claude Code  
**Model:** Claude Opus 4.7

**Goal:** Replace the `mentionedUsers: []` stub left in Step 8 with real `@username` parsing/persistence, and add the per-user mentions endpoint.

**Prompt:**
> Implement the @Mentions slice only. Add a CommentMention join entity (comment_id + user_id, unique, ON DELETE CASCADE) and a MentionsModule with MentionsService + MentionsController for GET /users/:userId/mentions (paginated, newest first). Parse @username from comment content (case-insensitive match against existing usernames; unknown handles ignored). Populate mentionedUsers on every comment response. Re-sync mentions on comment update. No circular module deps — CommentsModule imports MentionsModule; MentionsModule does not import CommentsModule. No notifications, audit changes, or other features.

**Outcome:**
- Added `CommentMention` entity with cascade delete, registered in `AppModule`.
- Added `@OneToMany mentions` to `Comment` (metadata only; no schema change to `comments`).
- Built `MentionsService` (parse + sync + paginated query) and `MentionsController` (`GET /users/:userId/mentions?page=&pageSize=`); `MentionsQueryDto` validates page/pageSize.
- Wired `MentionsService` into `CommentsService.create` and `update`; `findByTicket` loads `relations: ['mentions', 'mentions.user']`; `toView` projects to `{id, username, fullName}` (no `passwordHash` leak); the TODO marker was removed.
- Verified end-to-end: case-insensitive match (`@JDoe_*` → `jdoe_*`); unknown `@nobody_*` silently ignored; update re-syncs (removed and re-added); `GET /users/:userId/mentions` returns `{data, total, page}` newest-first with populated `mentionedUsers`; pagination works; JWT-protected (401 without token); DB row exists in `comment_mentions`; deleting the comment cascades the mention row to 0.

**Reasoning:**
A small join entity keeps the relationship explicit and queryable, and centralizing parsing/sync in `MentionsService` means future producers (e.g. system-generated comments) can reuse it without duplicating regex logic. Re-evaluating mentions on every update is simpler and correct (drop + reinsert) — no edge cases around partial updates. The dedicated `MentionsModule` avoids dragging `CommentsModule` into a circular dependency.