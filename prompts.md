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