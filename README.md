<<<<<<< Updated upstream

# marketplace-freelance

=======

# Freelance Marketplace

A freelancing marketplace web application where clients can post projects and freelancers can browse available projects and submit proposals. Clients can review proposals and select a freelancer to work with.

This project is developed as part of the **Software Engineering Lab** course.

## Project Goal

The goal is to design and implement a web application similar to Upwork and Ponisha, in which:

- Clients create and manage projects.
- Freelancers build their profiles and portfolios.
- Freelancers browse projects and submit proposals.
- Clients review proposals and select a freelancer.
- Admins manage users and oversee platform activities.

## Main Roles

| Role       | Description                                                                            |
| ---------- | -------------------------------------------------------------------------------------- |
| Client     | Posts projects, reviews proposals, and selects a freelancer.                           |
| Freelancer | Creates a professional profile and portfolio, browses projects, and submits proposals. |
| Admin      | Manages users and oversees platform activities.                                        |

## Database

- **DBMS:** Microsoft SQL Server
- **Minimum SQL Server version:** SQL Server 2012 or later
- **Database name:** `FreelanceMarketplaceDB`
- **Database management tool:** SQL Server Management Studio (SSMS)

The database supports users, freelancer profiles, skills, portfolios, certificates, projects, project categories, required project skills, and proposals.

### Database Structure

The database contains 12 main tables:

| Table               | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| `Users`             | Stores user account information and user types.     |
| `AdminAccounts`     | Identifies users who have administrative accounts.  |
| `UserProfiles`      | Stores additional professional profile information. |
| `Skills`            | Stores the skills available on the platform.        |
| `UserSkills`        | Connects users with their skills.                   |
| `Categories`        | Stores project categories.                          |
| `UserPortfolios`    | Stores users' portfolio items.                      |
| `UserCertificates`  | Stores users' certificates and credentials.         |
| `Projects`          | Stores projects posted by clients.                  |
| `ProjectCategories` | Connects projects with their categories.            |
| `ProjectSkills`     | Connects projects with their required skills.       |
| `Proposals`         | Stores freelancers' proposals for projects.         |

### Design Decisions

- **Primary keys and foreign keys:** Primary keys identify records, while foreign keys maintain valid relationships between related tables.
- **Many-to-many relationships:** `UserSkills`, `ProjectCategories`, and `ProjectSkills` are junction tables. Their composite primary keys prevent duplicate relationships.
- **Project pricing:** A project uses either fixed pricing (`Fixed`) or hourly pricing (`Hourly`). A `CHECK` constraint ensures that only the relevant price field is populated and that its value is positive.
- **Proposal uniqueness:** A `UNIQUE` constraint on `(ProjectID, FreelancerID)` prevents a freelancer from submitting more than one proposal for the same project.
- **Data validation:** `CHECK`, `UNIQUE`, `DEFAULT`, and foreign-key constraints enforce important data-integrity rules.
- **Indexes:** Indexes support common lookups. A filtered unique index ensures that a project can have at most one accepted proposal.
- **Triggers:** Triggers enforce business rules involving multiple records, such as restricting project creation and proposals to regular users, preventing proposals on one's own project, allowing new proposals only for open projects, and updating a project's status when a proposal is accepted.
- **Password storage:** The `Users` table stores a password hash rather than a plaintext password. The demo seed values are placeholders and must be replaced with real password hashes before production use.

## Database Setup

### Prerequisites

- Microsoft SQL Server 2012 or later
- SQL Server Management Studio (SSMS)

### 1. Create the database

Open SSMS, connect to your SQL Server instance, and execute:

```sql
CREATE DATABASE FreelanceMarketplaceDB;
GO
```

Then select `FreelanceMarketplaceDB` as the active database, or make sure each script is executed against that database.

### 2. Execute the SQL files

Run the files in the following order:

1. **`database/schema.sql`** — creates the tables, constraints, indexes, and triggers.
2. **`database/seed.sql`** — inserts sample data for testing and demonstration.
3. **`database/queries.sql`** — contains example queries for retrieving and examining the stored data.

In SSMS, open each file using **File → Open → File**, select `FreelanceMarketplaceDB` in the database dropdown, and click **Execute**.

> Run `schema.sql` before `seed.sql`, because the seed data depends on the tables and constraints created by the schema. Run `queries.sql` after the seed file if you want to see results based on the sample data.

### 3. Verify the setup

After running the scripts, expand **Databases → FreelanceMarketplaceDB → Tables** in Object Explorer. You should see the tables listed in the Database Structure section.

**Note:** The sample data is for development and testing only. In particular, replace the placeholder password-hash values with properly generated password hashes before using the application with real accounts.

## Documentation

- [Requirements analysis](docs/requirements.md)

## Team Members

- Hana Hatami — GitHub: [hangelaa](https://github.com/hangelaa)
- Matin Sadeghi — GitHub: [Matin-sadeghi](https://github.com/Matin-sadeghi)
- Hossein Ahmadian — GitHub: [Hossein-Ahmadian](https://github.com/hsn827613)

## Project Management

- Jira board: [Freelance Marketplace project board](https://hatamihaana188.atlassian.net/jira/software/projects/SCRUM/boards/1)
  > > > > > > > Stashed changes
