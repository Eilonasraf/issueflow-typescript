# AI-Assisted Work Process

This project was developed with an AI-assisted engineering workflow.

At the beginning, I focused on understanding the system I needed to build and defining the main relationships between the core entities: users, projects, tickets, comments, audit events, and ticket states.

After that, I chose to structure the backend using the Controller-Service-Repository pattern. This helped separate responsibilities clearly:

- Controllers expose the REST API.
- Services contain the business logic.
- Repositories handle database access.
- DTOs validate input.
- Guards and decorators handle authentication and roles.
- Audit logic and state-machine logic are kept separate from the main flow.

I used AI agents as part of the development process, but in a managed way. I did not want the agent to spread logic across the project without control, so I defined clear rules for what the agent should and should not do.

## Tools and Skills Used

During the work, I used AI-assisted commands, tools, and review workflows:

- `/init` — to help Claude understand and organize the project context.
- `/goal` — to define clear completion conditions for the final audit.
- Figma MCP — to support design thinking and create the architecture diagram.

The `/init` skill was especially useful because it helped organize Claude before each work session. This made it easier to return to the project later with the right context already defined.

## Planning and Design

Before writing code, I worked with the agent to define the database relationships and the main system flow.

I understood that in order to get useful output from the agent, I needed to clearly explain the structure of the system: how users, projects, tickets, comments, audit records, and status transitions relate to each other.

After the plan was organized, I started implementing the system step by step while keeping the architecture consistent.

## Review Process

In parallel to the main implementation flow, I used Codex as an additional review agent.

Codex gave feedback on the architecture, missing edge cases, tests, and requirement coverage. I also used Claude to review Codex's feedback before deciding what to accept.

The process was:

```text
Plan with Claude
→ Implement with Claude
→ Review with Codex
→ Review Codex feedback with Claude
→ Make the final decision manually
```

This helped me use multiple agents without blindly accepting their suggestions.

## Testing Approach

I also defined the testing approach with the agent.

The tests were divided into:

- Unit tests — for focused business logic.
- End-to-end tests — for complete API flows.

This helped verify both the internal logic and the real behavior of the REST API.

## Final Verification

Toward the end, I used `/goal` with comprehensive completion conditions and an iterative review process to check the project again.

The goal was to verify that:

- The assignment requirements were covered.
- The architecture stayed clean.
- The tests passed.
- The implementation did not include unnecessary changes.
- The AI-generated work was reviewed and controlled.

## Summary

AI agents were used as engineering assistants for planning, implementation, review, and verification.

The main principle was to manage the agents with clear rules and boundaries. The final decisions were still manual, while the agents helped improve speed, structure, and review quality.
