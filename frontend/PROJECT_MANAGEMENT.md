# Project management workspace

## Routes and entry flow

- `/my/projects/`: employer workspace, real overview counts, complete owned-project list, local title/status filters, local sorting and 10-row pagination.
- `/my/projects/new/`: create, review, save Draft or create-and-publish.
- `/my/projects/[id]/edit/`: owner-only full edit, review, save, and optional Draft publication.
- `/projects/`: freelancer discovery, backend title/description search, category filtering and backend pagination.
- `/projects/[id]/`: shared detail. Owners review received proposals; eligible non-owners submit proposals.
- `/my/proposals/`: sent proposals, status tracking, local filtering and confirmed withdrawal.
- `/profile/`: view and edit the user profile (first/last name, professional title, bio, location, skills). Email is read-only. Admin accounts get a 403 state.
- `/welcome/` is preserved as the post-login entry. After session verification it routes freelancer intent to `/projects/`; employer or unspecified intent goes to `/my/projects/`. Both workspaces remain reachable from shared navigation.

Registration, login, password recovery, role selection, Django sessions and CSRF remain the existing mechanisms. No second identity store, bearer token, role mutation or credential storage is introduced. Employer/freelancer are workflow intentions; a Regular account may use both. Admin/ownership restrictions are enforced by Django. The form establishes participation permission through the existing `GET /api/my/projects/` endpoint, not the onboarding cookie.

## Source ownership

- `app/(workspace)/layout.tsx`, `workspace.css`: server session boundary and scoped native-brand layout.
- `components/marketplace/workspace-shell.tsx`: Brand, signed-in name, LogoutButton, SessionGuard, desktop/sidebar and narrow horizontal navigation.
- `components/marketplace/my-projects.tsx`: employer list, filters, overview and publish confirmation.
- `components/marketplace/project-form.tsx` and its CSS module: shared create/edit editor and review.
- `components/marketplace/project-detail.tsx` and its CSS module: shared detail, received proposals, freelancer proposal review/submission.
- `components/marketplace/browse-projects.tsx`: server-paginated discovery.
- `components/marketplace/my-proposals.tsx`: sent proposal tracking/withdrawal.
- `components/marketplace/profile.tsx`: profile view and editor (reuses the project form catalog styles for the skill picker).
- `components/marketplace/primitives.tsx`: shared headings, status badges, empty/loading/error states, field errors and native modal confirmations.
- `components/marketplace/hooks.ts`: keyed, race-safe reads/reload plus dirty-form refresh/close and ordinary in-app link protection. No automatic draft storage.
- `lib/api/marketplace.ts`, `marketplace-proxy.ts`, `app/api/marketplace/[...path]/route.ts`: typed browser requests and a restricted same-origin bridge.
- `types/marketplace.ts`, `lib/marketplace.ts`: existing API shapes, Persian labels, exact decimal display and date helpers.

## API integration

The browser bridge `/api/marketplace/...` maps only an explicit path/method allowlist to the existing Django `/api/...` endpoints:

| Django endpoint | Methods | Consumer |
| --- | --- | --- |
| `categories/`, `skills/` | GET | Live form catalogs/discovery filter |
| `my/projects/` | GET | Employer counts/list and participation permission |
| `projects/` | GET, POST | Discovery and project creation |
| `projects/<id>/` | GET, PUT | Detail, edit and mutation readback |
| `projects/<id>/publish/` | POST | Publish Draft |
| `projects/<id>/proposals/` | GET, POST | Owner review / freelancer submission |
| `my/proposals/` | GET | Sent proposal tracking |
| `proposals/<id>/accept/` | POST | Atomic backend acceptance |
| `proposals/<id>/reject/` | POST | Reject Pending |
| `proposals/<id>/withdraw/` | POST | Withdraw own Pending |
| `profile/` | GET, PUT | User profile view and edit |

Session cookies, all Set-Cookie flags, Origin checks and CSRF validation are preserved. The bridge is not an open proxy: arbitrary URLs, paths or methods cannot be forwarded. Reads are private/no-store; requests have bounded timeouts. Discovery forwards only supported `q`, `category`, `page`, `page_size` query fields. JSON field errors remain connected to inputs; 401 returns to login, 403/404 display explicit permission/not-found states, and 409 preserves useful draft information.

## Mutation rules and UX

- Project fields follow the backend: title, description, pricing type, budget/rate, optional deadline, category IDs and skill IDs. Additional requirements live in description, not an invented field.
- Publication requires at least one category and skill. Open edits retain those requirements. Received proposals lock pricing type and amount.
- Review precedes writes. Forms retain input on validation failure. Creation retains its returned ID before readback; an uncertain create response blocks blind resubmission and directs the user to My Projects.
- Owner statistics derive from the complete `my/projects/` result, independent of list filters; no sums of incompatible pricing measures or fabricated trends.
- Proposal review compares actual amounts, days, optional hours, statuses, freelancer skills, and supplied profile fields. Details expand on demand; missing metadata is explicitly absent.
- Acceptance is one backend POST, never simulated through multiple frontend writes. It changes the project to In Progress and rejects the other Pending proposals in the backend transaction. Detail and proposal lists are then fetched again.
- Pending buttons/ref guards prevent repeated clicks. Uncertain detail/proposal mutation results block writes; recovery reads current state rather than blindly repeating the operation.
- Only an eligible non-owner with `can_submit_proposal` can open submission. One proposal per project remains enforced, including withdrawn proposals.
- Confirmations use native modal dialogs with focus containment, Escape/cancel, focus return and textual errors. Native fields, explicit labels, visible focus, mobile-sized text/targets and inherited reduced-motion rules are retained.

## Existing backend boundaries

- No project delete, cancel, complete, reopen, archive or arbitrary status-transition endpoint. These statuses are displayed when returned; no unsupported action buttons exist.
- No attachments, milestones, payments, chat, reviews, separate requirement fields or freelancer directory in this module.
- Currency is absent from the API/schema. Amounts retain exact decimal-string values without inventing USD, rial or toman.
- `my/projects/`, `my/proposals/` and received proposals return complete unpaginated results. Local filters/sorts apply to that complete result. Discovery uses real backend pagination and its fixed newest-created ordering; no unsupported server sorting is advertised.
- Dates submit Gregorian ISO `YYYY-MM-DD`; visible dates use the existing Persian locale with Tehran timezone. A past stored deadline must be cleared or updated to satisfy existing backend edit validation.
- The backend has no idempotency-key facility for project creation. The UI prevents repeated pending clicks and blind retries after an uncertain response, but cannot guarantee cross-tab/server-wide deduplication.

## Validation boundary

No automated tests or test harnesses were created, changed or executed for this feature, as requested. Linting, TypeScript and the production build passed. Anonymous API probes confirmed existing Django authentication and bridge path/method restrictions; cross-origin writes and same-origin writes without CSRF returned 403. The existing signed-in native browser's employer empty dashboard was visually inspected.

The managed browser had no marketplace session, and login saving was declined. No account/session was fabricated or authentication bypassed. No persistent projects/proposals were created solely for verification. Authenticated create/edit/publish/submit/accept/reject/withdraw interactions, nonempty comparison layouts, and authenticated mobile/tablet rendering remain unverified; build success is not evidence of those workflows.
