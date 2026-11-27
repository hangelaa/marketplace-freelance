# Marketplace Freelance - Backend API (MVP)

Base URL: `http://127.0.0.1:8000`. All bodies and responses are JSON.

## Conventions
- **Login required** for every endpoint below (session cookie `sessionid`, see `/api/auth/*` for login/register/password reset). Without login: `401`.
- **CSRF:** every `POST`/`PUT` must send the `X-CSRFToken` header (value of the `csrftoken` cookie).
- **Roles:** an `Admin` account may browse projects but gets `403` on every action that creates or changes projects, proposals or the profile.
- **Money** is returned as a string with two decimals (`"1500.00"`). Send numbers or numeric strings.
- **Dates** use `YYYY-MM-DD` (deadline) or ISO datetime (created_at).
- **Errors:** `{"error": "message"}`; form errors also contain `"fields": {"field_name": "message"}` (status `400`).
  Other statuses: `403` not allowed, `404` not found (also used to hide other users' drafts), `409` conflicts with the current state.
- Pagination: `?page=1&page_size=10` (max 50) returns `{"results": [...], "page", "page_size", "total"}`.

## Reference data
| Method | URL | Response |
|---|---|---|
| GET | `/api/categories/` | `{"results": [{"id", "name"}]}` |
| GET | `/api/skills/` | `{"results": [{"id", "name"}]}` |

## Projects
`pricing_type` is `"Fixed"` or `"Hourly"`; `budget` is the fixed budget or the hourly rate. `status`: `Draft`, `Open`, `In Progress`, `Completed`, `Cancelled`.

| Method | URL | Purpose |
|---|---|---|
| GET | `/api/projects/?q=&category=<id>&page=` | Open projects only. `q` searches title and description. |
| POST | `/api/projects/` | Create. Body below. `publish: true` creates it as `Open`, otherwise `Draft`. Returns `201` + project. |
| GET | `/api/projects/<id>/` | Details (drafts are visible to the owner only). |
| PUT | `/api/projects/<id>/` | Edit (owner only; only `Draft` and `Open`; price is locked once a proposal exists). |
| POST | `/api/projects/<id>/publish/` | `Draft` to `Open` (needs at least one category and one skill). |
| GET | `/api/my/projects/` | My projects with `proposal_count`, `pending_proposal_count`, `can_edit`, `can_publish`. |

Create/edit body:
```json
{"title": "...", "description": "...", "pricing_type": "Fixed", "budget": "1500",
 "deadline": "2026-12-31", "category_ids": [1], "skill_ids": [2, 3], "publish": false}
```
Project object: `id, title, description, pricing_type, budget, status, deadline, created_at, updated_at, owner{id,name}, is_owner, categories[{id,name}], skills[{id,name}]`.
The details endpoint adds `my_proposal` (`{id,status}` or null), `can_submit_proposal`, `can_edit`, and `proposal_count` (owner only).

## Proposals
`amount` is the total price for `Fixed` projects and the hourly rate for `Hourly` ones. Statuses: `Pending`, `Accepted`, `Rejected`, `Withdrawn`.

| Method | URL | Purpose |
|---|---|---|
| POST | `/api/projects/<id>/proposals/` | Submit. Body: `{"amount": "1200", "cover_letter": "...", "estimated_days": 10, "estimated_hours": "80"}` (`estimated_hours` only for Hourly, optional). Returns `201`. |
| GET | `/api/my/proposals/` | My proposals: proposal fields + `project{id,title,pricing_type,status}` + `can_withdraw`. |
| POST | `/api/proposals/<id>/withdraw/` | Withdraw my `Pending` proposal. |
| GET | `/api/projects/<id>/proposals/` | Owner review list: proposal fields + `freelancer{id,name,professional_title,bio,location,skills[]}` + `can_decide`. |
| POST | `/api/proposals/<id>/accept/` | Owner accepts: proposal `Accepted`, project `In Progress`, other `Pending` proposals `Rejected` (one transaction). |
| POST | `/api/proposals/<id>/reject/` | Owner rejects a `Pending` proposal. |

Rules enforced by the backend: only `Open` projects accept proposals; not your own project; one proposal per user and project (a withdrawn one still counts); positive amounts; only the project owner can review/accept/reject.

## Profile
| Method | URL | Purpose |
|---|---|---|
| GET | `/api/profile/` | `{first_name, last_name, email, professional_title, bio, location, skills[]}` |
| PUT | `/api/profile/` | Body: `first_name, last_name` (required), `professional_title, bio, location` (optional), `skill_ids`. Email cannot be changed. |
