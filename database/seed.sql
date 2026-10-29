/*
    Freelance Marketplace - Sample data
    Run after schema.sql has completed successfully.
    This script is intended for a newly created, empty database.
*/

USE FreelanceMarketplaceDB;
GO

/* Users: one admin and three regular users */
INSERT INTO dbo.Users
    (FirstName, LastName, Email, Mobile, PasswordHash, AccountStatus, UserType)
VALUES
    (N'Admin', N'User', N'admin@marketplace.local', NULL, N'DEMO_HASH_REPLACE_WITH_REAL_HASH', N'Active', N'Admin'),
    (N'Hana', N'Hatami', N'hana@marketplace.local', N'09120000001', N'DEMO_HASH_REPLACE_WITH_REAL_HASH', N'Active', N'Regular'),
    (N'Arman', N'Karimi', N'arman@marketplace.local', N'09120000002', N'DEMO_HASH_REPLACE_WITH_REAL_HASH', N'Active', N'Regular'),
    (N'Sara', N'Ahmadi', N'sara@marketplace.local', N'09120000003', N'DEMO_HASH_REPLACE_WITH_REAL_HASH', N'Active', N'Regular');
GO

INSERT INTO dbo.AdminAccounts (UserID)
SELECT UserID FROM dbo.Users WHERE Email = N'admin@marketplace.local';
GO

/* Optional profiles for regular users */
INSERT INTO dbo.UserProfiles (UserID, ProfessionalTitle, Bio, Location)
SELECT UserID, N'Full-stack Developer', N'نمونه پروفایل برای تست دیتابیس', N'Tehran'
FROM dbo.Users WHERE Email = N'hana@marketplace.local';

INSERT INTO dbo.UserProfiles (UserID, ProfessionalTitle, Bio, Location)
SELECT UserID, N'Data Analyst', N'نمونه پروفایل برای تست دیتابیس', N'Shiraz'
FROM dbo.Users WHERE Email = N'arman@marketplace.local';

INSERT INTO dbo.UserProfiles (UserID, ProfessionalTitle, Bio, Location)
SELECT UserID, N'UI/UX Designer', N'نمونه پروفایل برای تست دیتابیس', N'Tabriz'
FROM dbo.Users WHERE Email = N'sara@marketplace.local';
GO

/* 3 categories */
INSERT INTO dbo.Categories (CategoryName)
VALUES
    (N'Web Development'),
    (N'Artificial Intelligence'),
    (N'Graphic Design');
GO

/* 5 skills */
INSERT INTO dbo.Skills (SkillName)
VALUES
    (N'SQL'),
    (N'Python'),
    (N'React'),
    (N'UI/UX'),
    (N'Machine Learning');
GO

/* User skills */
INSERT INTO dbo.UserSkills (UserID, SkillID)
SELECT u.UserID, s.SkillID
FROM (VALUES
    (N'hana@marketplace.local', N'SQL'),
    (N'hana@marketplace.local', N'React'),
    (N'arman@marketplace.local', N'Python'),
    (N'arman@marketplace.local', N'Machine Learning'),
    (N'sara@marketplace.local', N'UI/UX')
) AS v(Email, SkillName)
JOIN dbo.Users u ON u.Email = v.Email
JOIN dbo.Skills s ON s.SkillName = v.SkillName;
GO

/* 3 open projects: Hana and Arman both act as employers */
INSERT INTO dbo.Projects
    (EmployerID, Title, Description, PricingType, FixedBudget, HourlyRate, ProjectStatus, Deadline)
SELECT u.UserID, v.Title, v.Description, v.PricingType, v.FixedBudget, v.HourlyRate, N'Open', v.Deadline
FROM (VALUES
    (N'hana@marketplace.local', N'Build a portfolio website', N'Create a responsive portfolio website.', N'Fixed', CAST(1200.00 AS DECIMAL(12,2)), CAST(NULL AS DECIMAL(12,2)), CAST('2026-12-15' AS DATE)),
    (N'arman@marketplace.local', N'Analyze sales data', N'Analyze a sample sales dataset and summarize insights.', N'Hourly', CAST(NULL AS DECIMAL(12,2)), CAST(35.00 AS DECIMAL(12,2)), CAST('2026-12-20' AS DATE)),
    (N'hana@marketplace.local', N'Create a machine learning prototype', N'Build a small proof-of-concept model.', N'Fixed', CAST(2500.00 AS DECIMAL(12,2)), CAST(NULL AS DECIMAL(12,2)), CAST('2027-01-15' AS DATE))
) AS v(EmployerEmail, Title, Description, PricingType, FixedBudget, HourlyRate, Deadline)
JOIN dbo.Users u ON u.Email = v.EmployerEmail;
GO

/* Link projects to categories */
INSERT INTO dbo.ProjectCategories (ProjectID, CategoryID)
SELECT p.ProjectID, c.CategoryID
FROM (VALUES
    (N'Build a portfolio website', N'Web Development'),
    (N'Analyze sales data', N'Artificial Intelligence'),
    (N'Create a machine learning prototype', N'Artificial Intelligence')
) AS v(ProjectTitle, CategoryName)
JOIN dbo.Projects p ON p.Title = v.ProjectTitle
JOIN dbo.Categories c ON c.CategoryName = v.CategoryName;
GO

/* Link projects to required skills */
INSERT INTO dbo.ProjectSkills (ProjectID, SkillID)
SELECT p.ProjectID, s.SkillID
FROM (VALUES
    (N'Build a portfolio website', N'React'),
    (N'Build a portfolio website', N'SQL'),
    (N'Analyze sales data', N'Python'),
    (N'Analyze sales data', N'SQL'),
    (N'Create a machine learning prototype', N'Python'),
    (N'Create a machine learning prototype', N'Machine Learning')
) AS v(ProjectTitle, SkillName)
JOIN dbo.Projects p ON p.Title = v.ProjectTitle
JOIN dbo.Skills s ON s.SkillName = v.SkillName;
GO

/* 4 proposals. One regular user acts as both employer and freelancer.
   The accepted proposal is for Hana's third project and will move it to In Progress. */
INSERT INTO dbo.Proposals
    (ProjectID, FreelancerID, ProposedAmount, CoverLetter, EstimatedHours, EstimatedDurationDays, ProposalStatus)
SELECT p.ProjectID, u.UserID, v.ProposedAmount, v.CoverLetter, v.EstimatedHours, v.EstimatedDurationDays, v.ProposalStatus
FROM (VALUES
    (N'Build a portfolio website', N'arman@marketplace.local', CAST(1100.00 AS DECIMAL(12,2)), N'I can build a responsive website.', CAST(NULL AS DECIMAL(8,2)), 10, N'Pending'),
    (N'Build a portfolio website', N'sara@marketplace.local', CAST(950.00 AS DECIMAL(12,2)), N'I can also help with the visual design.', CAST(NULL AS DECIMAL(8,2)), 8, N'Pending'),
    (N'Analyze sales data', N'hana@marketplace.local', CAST(30.00 AS DECIMAL(12,2)), N'I can analyze the data and prepare a report.', CAST(12.00 AS DECIMAL(8,2)), 4, N'Pending'),
    (N'Create a machine learning prototype', N'sara@marketplace.local', CAST(2300.00 AS DECIMAL(12,2)), N'I can build and document the prototype.', CAST(NULL AS DECIMAL(8,2)), 14, N'Accepted')
) AS v(ProjectTitle, FreelancerEmail, ProposedAmount, CoverLetter, EstimatedHours, EstimatedDurationDays, ProposalStatus)
JOIN dbo.Projects p ON p.Title = v.ProjectTitle
JOIN dbo.Users u ON u.Email = v.FreelancerEmail;
GO

/* Quick count checks */
SELECT 'Users' AS TableName, COUNT(*) AS RowCount FROM dbo.Users
UNION ALL SELECT 'AdminAccounts', COUNT(*) FROM dbo.AdminAccounts
UNION ALL SELECT 'Categories', COUNT(*) FROM dbo.Categories
UNION ALL SELECT 'Skills', COUNT(*) FROM dbo.Skills
UNION ALL SELECT 'Projects', COUNT(*) FROM dbo.Projects
UNION ALL SELECT 'Proposals', COUNT(*) FROM dbo.Proposals;
GO
