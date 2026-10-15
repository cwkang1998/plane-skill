---
name: plane
description: Read and update a Plane project board through the Plane REST API with the PLANE_TOKEN_FOR_AI token. Use for listing tickets, syncing ticket state or dates with shipped git work, and proposing or creating tickets.
---

# Plane

Use `scripts/plane.ts` (Bun) for every call. It reads three environment variables: `PLANE_BASE_URL` (the Plane host), `PLANE_WORKSPACE` (the workspace slug), and `PLANE_TOKEN_FOR_AI` (a personal access token). If the script reports one as unset, stop and tell the user to export it.

```sh
bun <skill-dir>/scripts/plane.ts issues <PROJECT>                    # TSV of every ticket in the project
bun <skill-dir>/scripts/plane.ts issues <PROJECT> "<module name>"    # only tickets in that module
bun <skill-dir>/scripts/plane.ts api GET /users/me/
bun <skill-dir>/scripts/plane.ts api GET '/workspaces/{ws}/projects/' --all
bun <skill-dir>/scripts/plane.ts api PATCH '/workspaces/{ws}/projects/<project-id>/issues/<issue-id>/' '{"target_date":"2026-01-31"}'
```

`{ws}` in a path expands to the workspace slug. `--all` follows cursor pagination and prints the merged `results`. Use the `issues` TSV for reading. Fetch a single issue through `api` only when you need its `description_html`.

## Model

- Projects: `GET /workspaces/{ws}/projects/`. `<PROJECT>` is a project's `identifier`, the prefix in ticket keys such as `WEB-12`. Look up ids at runtime instead of hardcoding them.
- States: `GET .../projects/<id>/states/`. Match by `group` (`backlog`, `unstarted`, `started`, `completed`, `cancelled`), not by name.
- Modules group tickets by product area. A repo usually maps to one module. Match the repo to a module by name, and ask the user when no name fits. List modules with `GET .../modules/`.
- Membership: `GET .../modules/<module-id>/module-issues/`. Add with `POST` to the same path and body `{"issues": ["<issue-id>", ...]}`.
- Ticket dates: `start_date` and `target_date` are plain `YYYY-MM-DD`. "End time" and "due date" mean `target_date`.
- Create: `POST .../projects/<id>/issues/` with `name`, `state`, `assignees` (user ids), `start_date`, `target_date`, and `description_html`.
- The current user's id comes from `GET /users/me/`.

## Rules

- Any write to a ticket in a `completed` state resets `completed_at` to now. The API ignores attempts to set it back. Put every change to a ticket in one PATCH. Before you edit a ticket that is already done, tell the user its completion date will move.
- Before creating tickets, list each proposal with title, state, dates, assignee, module, and the commit or PR that supports it. Wait for the user to confirm. Moving or dating existing tickets the user asked you to sync needs no confirmation.
- Take dates from evidence such as PR merge times (`gh pr list --state all --json number,title,mergedAt,createdAt`) and commit dates. Say which source each date came from.
- After every write, read the ticket back and report the fields you changed.
