/*
    Freelance Marketplace - SQL Server schema
    Database: FreelanceMarketplaceDB

    Run this script after creating/selecting the database.
    The script creates tables, constraints, indexes, and business-rule triggers.
*/

USE FreelanceMarketplaceDB;
GO

/* 1. Users */
CREATE TABLE dbo.Users (
    UserID          INT IDENTITY(1,1) NOT NULL,
    FirstName       NVARCHAR(100) NOT NULL,
    LastName        NVARCHAR(100) NOT NULL,
    Email           NVARCHAR(255) NOT NULL,
    Mobile          NVARCHAR(30) NULL,
    PasswordHash    NVARCHAR(255) NOT NULL,
    AccountStatus   NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Users_AccountStatus DEFAULT ('Active'),
    UserType        NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Users_UserType DEFAULT ('Regular'),
    CreatedAt       DATETIME2(0) NOT NULL
        CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt       DATETIME2(0) NOT NULL
        CONSTRAINT DF_Users_UpdatedAt DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_Users PRIMARY KEY (UserID),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT CK_Users_AccountStatus
        CHECK (AccountStatus IN ('Active', 'Inactive', 'Blocked')),
    CONSTRAINT CK_Users_UserType
        CHECK (UserType IN ('Regular', 'Admin'))
);
GO

/* 2. Admin accounts and the time administrative access was granted */
CREATE TABLE dbo.AdminAccounts (
    UserID      INT NOT NULL,
    GrantedAt   DATETIME2(0) NOT NULL
        CONSTRAINT DF_AdminAccounts_GrantedAt DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_AdminAccounts PRIMARY KEY (UserID),
    CONSTRAINT FK_AdminAccounts_Users
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
);
GO

/* 3. One optional profile per regular user */
CREATE TABLE dbo.UserProfiles (
    ProfileID           INT IDENTITY(1,1) NOT NULL,
    UserID              INT NOT NULL,
    ProfessionalTitle   NVARCHAR(150) NULL,
    Bio                 NVARCHAR(MAX) NULL,
    Location            NVARCHAR(150) NULL,

    CONSTRAINT PK_UserProfiles PRIMARY KEY (ProfileID),
    CONSTRAINT UQ_UserProfiles_UserID UNIQUE (UserID),
    CONSTRAINT FK_UserProfiles_Users
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
);
GO

/* 4. Skills */
CREATE TABLE dbo.Skills (
    SkillID     INT IDENTITY(1,1) NOT NULL,
    SkillName   NVARCHAR(100) NOT NULL,

    CONSTRAINT PK_Skills PRIMARY KEY (SkillID),
    CONSTRAINT UQ_Skills_SkillName UNIQUE (SkillName)
);
GO

/* 5. Skills associated with regular users */
CREATE TABLE dbo.UserSkills (
    UserID  INT NOT NULL,
    SkillID INT NOT NULL,

    CONSTRAINT PK_UserSkills PRIMARY KEY (UserID, SkillID),
    CONSTRAINT FK_UserSkills_Users
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID),
    CONSTRAINT FK_UserSkills_Skills
        FOREIGN KEY (SkillID) REFERENCES dbo.Skills(SkillID)
);
GO

/* 6. Project categories */
CREATE TABLE dbo.Categories (
    CategoryID      INT IDENTITY(1,1) NOT NULL,
    CategoryName    NVARCHAR(100) NOT NULL,

    CONSTRAINT PK_Categories PRIMARY KEY (CategoryID),
    CONSTRAINT UQ_Categories_CategoryName UNIQUE (CategoryName)
);
GO

/* 7. User portfolio items */
CREATE TABLE dbo.UserPortfolios (
    PortfolioID INT IDENTITY(1,1) NOT NULL,
    UserID      INT NOT NULL,
    Title       NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    PortfolioURL NVARCHAR(2048) NULL,
    CreatedAt   DATETIME2(0) NOT NULL
        CONSTRAINT DF_UserPortfolios_CreatedAt DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_UserPortfolios PRIMARY KEY (PortfolioID),
    CONSTRAINT FK_UserPortfolios_Users
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
);
GO

/* 8. User certificates */
CREATE TABLE dbo.UserCertificates (
    CertificateID   INT IDENTITY(1,1) NOT NULL,
    UserID          INT NOT NULL,
    Title           NVARCHAR(200) NOT NULL,
    Issuer          NVARCHAR(200) NULL,
    IssueDate       DATE NULL,
    CertificateURL  NVARCHAR(2048) NULL,
    CreatedAt       DATETIME2(0) NOT NULL
        CONSTRAINT DF_UserCertificates_CreatedAt DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_UserCertificates PRIMARY KEY (CertificateID),
    CONSTRAINT FK_UserCertificates_Users
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
);
GO

/* 9. Projects */
CREATE TABLE dbo.Projects (
    ProjectID       INT IDENTITY(1,1) NOT NULL,
    EmployerID      INT NOT NULL,
    Title           NVARCHAR(200) NOT NULL,
    Description     NVARCHAR(MAX) NOT NULL,
    PricingType     NVARCHAR(20) NOT NULL,
    FixedBudget     DECIMAL(12,2) NULL,
    HourlyRate      DECIMAL(12,2) NULL,
    ProjectStatus   NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Projects_ProjectStatus DEFAULT ('Draft'),
    Deadline        DATE NULL,
    CreatedAt       DATETIME2(0) NOT NULL
        CONSTRAINT DF_Projects_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt       DATETIME2(0) NOT NULL
        CONSTRAINT DF_Projects_UpdatedAt DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_Projects PRIMARY KEY (ProjectID),
    CONSTRAINT FK_Projects_Employer
        FOREIGN KEY (EmployerID) REFERENCES dbo.Users(UserID),
    CONSTRAINT CK_Projects_PricingType
        CHECK (PricingType IN ('Fixed', 'Hourly')),
    CONSTRAINT CK_Projects_PricingAmount
        CHECK (
            (PricingType = 'Fixed'
                AND FixedBudget IS NOT NULL AND FixedBudget > 0
                AND HourlyRate IS NULL)
            OR
            (PricingType = 'Hourly'
                AND HourlyRate IS NOT NULL AND HourlyRate > 0
                AND FixedBudget IS NULL)
        ),
    CONSTRAINT CK_Projects_Status
        CHECK (ProjectStatus IN ('Draft', 'Open', 'In Progress', 'Completed', 'Cancelled'))
);
GO

/* 10. Many-to-many relationship: projects and categories */
CREATE TABLE dbo.ProjectCategories (
    ProjectID   INT NOT NULL,
    CategoryID  INT NOT NULL,

    CONSTRAINT PK_ProjectCategories PRIMARY KEY (ProjectID, CategoryID),
    CONSTRAINT FK_ProjectCategories_Projects
        FOREIGN KEY (ProjectID) REFERENCES dbo.Projects(ProjectID),
    CONSTRAINT FK_ProjectCategories_Categories
        FOREIGN KEY (CategoryID) REFERENCES dbo.Categories(CategoryID)
);
GO

/* 11. Many-to-many relationship: projects and required skills */
CREATE TABLE dbo.ProjectSkills (
    ProjectID   INT NOT NULL,
    SkillID     INT NOT NULL,

    CONSTRAINT PK_ProjectSkills PRIMARY KEY (ProjectID, SkillID),
    CONSTRAINT FK_ProjectSkills_Projects
        FOREIGN KEY (ProjectID) REFERENCES dbo.Projects(ProjectID),
    CONSTRAINT FK_ProjectSkills_Skills
        FOREIGN KEY (SkillID) REFERENCES dbo.Skills(SkillID)
);
GO

/* 12. Freelancer proposals */
CREATE TABLE dbo.Proposals (
    ProposalID              INT IDENTITY(1,1) NOT NULL,
    ProjectID               INT NOT NULL,
    FreelancerID            INT NOT NULL,
    ProposedAmount          DECIMAL(12,2) NOT NULL,
    CoverLetter             NVARCHAR(MAX) NOT NULL,
    EstimatedHours          DECIMAL(8,2) NULL,
    EstimatedDurationDays   INT NULL,
    ProposalStatus          NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Proposals_Status DEFAULT ('Pending'),
    CreatedAt               DATETIME2(0) NOT NULL
        CONSTRAINT DF_Proposals_CreatedAt DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_Proposals PRIMARY KEY (ProposalID),
    CONSTRAINT FK_Proposals_Projects
        FOREIGN KEY (ProjectID) REFERENCES dbo.Projects(ProjectID),
    CONSTRAINT FK_Proposals_Freelancer
        FOREIGN KEY (FreelancerID) REFERENCES dbo.Users(UserID),
    CONSTRAINT UQ_Proposals_Project_Freelancer UNIQUE (ProjectID, FreelancerID),
    CONSTRAINT CK_Proposals_ProposedAmount CHECK (ProposedAmount > 0),
    CONSTRAINT CK_Proposals_EstimatedHours
        CHECK (EstimatedHours IS NULL OR EstimatedHours > 0),
    CONSTRAINT CK_Proposals_EstimatedDurationDays
        CHECK (EstimatedDurationDays IS NULL OR EstimatedDurationDays > 0),
    CONSTRAINT CK_Proposals_Status
        CHECK (ProposalStatus IN ('Pending', 'Accepted', 'Rejected', 'Withdrawn'))
);
GO

/* At most one accepted proposal per project */
CREATE UNIQUE INDEX UX_Proposals_OneAcceptedPerProject
    ON dbo.Proposals(ProjectID)
    WHERE ProposalStatus = 'Accepted';
GO

/* Helpful indexes for common lookups */
CREATE INDEX IX_Projects_EmployerID ON dbo.Projects(EmployerID);
CREATE INDEX IX_Projects_Status ON dbo.Projects(ProjectStatus);
CREATE INDEX IX_Proposals_FreelancerID ON dbo.Proposals(FreelancerID);
CREATE INDEX IX_Proposals_ProjectID ON dbo.Proposals(ProjectID);
GO

/*
    Business-rule triggers.
    These are included because SQL CHECK constraints cannot safely validate
    conditions that depend on rows in other tables.
*/

/* Admin accounts must reference Users marked as Admin */
CREATE TRIGGER dbo.TR_AdminAccounts_RequireAdminUser
ON dbo.AdminAccounts
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN dbo.Users u ON u.UserID = i.UserID
        WHERE u.UserType <> 'Admin'
    )
    BEGIN
        THROW 50001, 'Only users with UserType = Admin can be added to AdminAccounts.', 1;
    END;
END;
GO

/* Only regular users can create projects */
CREATE TRIGGER dbo.TR_Projects_RegularEmployerOnly
ON dbo.Projects
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN dbo.Users u ON u.UserID = i.EmployerID
        WHERE u.UserType <> 'Regular'
    )
    BEGIN
        THROW 50002, 'Admin accounts cannot create or own projects.', 1;
    END;
END;
GO

/* Only regular users can have profile information and professional items */
CREATE TRIGGER dbo.TR_UserProfiles_RegularUsersOnly
ON dbo.UserProfiles
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN dbo.Users u ON u.UserID = i.UserID
        WHERE u.UserType <> 'Regular'
    )
    BEGIN
        THROW 50003, 'Only regular users can have user profiles.', 1;
    END;
END;
GO

CREATE TRIGGER dbo.TR_UserSkills_RegularUsersOnly
ON dbo.UserSkills
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN dbo.Users u ON u.UserID = i.UserID
        WHERE u.UserType <> 'Regular'
    )
    BEGIN
        THROW 50004, 'Only regular users can have user skills.', 1;
    END;
END;
GO

CREATE TRIGGER dbo.TR_UserPortfolios_RegularUsersOnly
ON dbo.UserPortfolios
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN dbo.Users u ON u.UserID = i.UserID
        WHERE u.UserType <> 'Regular'
    )
    BEGIN
        THROW 50005, 'Only regular users can have portfolio items.', 1;
    END;
END;
GO

CREATE TRIGGER dbo.TR_UserCertificates_RegularUsersOnly
ON dbo.UserCertificates
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN dbo.Users u ON u.UserID = i.UserID
        WHERE u.UserType <> 'Regular'
    )
    BEGIN
        THROW 50006, 'Only regular users can have certificates.', 1;
    END;
END;
GO

/* Proposals are allowed only from regular users, for another user's open project.
   Accepting a proposal changes the project status to In Progress. */
CREATE TRIGGER dbo.TR_Proposals_ValidateAndAccept
ON dbo.Proposals
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN dbo.Users freelancer ON freelancer.UserID = i.FreelancerID
        INNER JOIN dbo.Projects p ON p.ProjectID = i.ProjectID
        WHERE freelancer.UserType <> 'Regular'
           OR p.EmployerID = i.FreelancerID
    )
    BEGIN
        THROW 50007, 'Admins cannot submit proposals, and users cannot bid on their own projects.', 1;
    END;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN dbo.Projects p ON p.ProjectID = i.ProjectID
        WHERE
            (i.ProposalStatus = 'Pending' AND p.ProjectStatus <> 'Open')
            OR
            (i.ProposalStatus = 'Accepted'
             AND p.ProjectStatus <> 'Open'
             AND NOT EXISTS (
                 SELECT 1
                 FROM deleted d
                 WHERE d.ProposalID = i.ProposalID
                   AND d.ProposalStatus = 'Accepted'
             ))
    )
    BEGIN
        THROW 50008, 'Proposals can be submitted only to open projects; acceptance requires an open project.', 1;
    END;

    UPDATE p
    SET ProjectStatus = 'In Progress',
        UpdatedAt = SYSDATETIME()
    FROM dbo.Projects p
    INNER JOIN inserted i ON i.ProjectID = p.ProjectID
    WHERE i.ProposalStatus = 'Accepted'
      AND p.ProjectStatus = 'Open';
END;
GO
