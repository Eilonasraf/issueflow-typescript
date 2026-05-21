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