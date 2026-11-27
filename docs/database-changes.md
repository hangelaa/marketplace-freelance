# Database changes (Assignment 4)

**No change to the table structure was needed.** The MVP uses the tables from `database/schema.sql` as they are
(`Users`, `UserProfiles`, `Skills`, `UserSkills`, `Categories`, `Projects`, `ProjectCategories`, `ProjectSkills`, `Proposals`).

How the schema and the backend work together:
- **CHECK on `Projects`**: description and a positive price are required even for a `Draft`, so a draft is saved with title, description and price. Categories and skills become mandatory when the project is published.
- **`UNIQUE (ProjectID, FreelancerID)` on `Proposals`** enforces one proposal per user and project; a `Withdrawn` proposal still counts, so re-submitting is impossible.
- **Filtered unique index** allows at most one `Accepted` proposal per project.
- **Triggers** (admins cannot own projects or send proposals, proposals only for open projects, accepted proposal moves the project to `In Progress`) are a second line of defence; the backend checks the same rules first and returns clear messages.
- The accept operation runs in one transaction with a row lock on the project (`UPDLOCK, HOLDLOCK`).
- SQL uses `SCOPE_IDENTITY()` instead of `OUTPUT` because the tables have triggers.

Development data: `python manage.py shell -c "from marketplace import seed_dev; seed_dev.run()"` creates demo accounts (client, two freelancers, admin), three projects and two proposals. For development only.
