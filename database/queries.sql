------------------------------------------------------------
-- QUERY 1: Open projects with category and employer
-- پروژه‌های باز همراه با دسته‌بندی و نام کارفرما
------------------------------------------------------------
SELECT
    p.ProjectID,
    p.Title,
    c.CategoryName,
    CONCAT(u.FirstName, ' ', u.LastName) AS EmployerName,
    p.ProjectStatus
FROM dbo.Projects AS p
JOIN dbo.Users AS u
    ON p.EmployerID = u.UserID
JOIN dbo.ProjectCategories AS pc
    ON p.ProjectID = pc.ProjectID
JOIN dbo.Categories AS c
    ON pc.CategoryID = c.CategoryID
WHERE p.ProjectStatus = 'Open';


------------------------------------------------------------
-- QUERY 2: Proposals with project and freelancer details
-- پیشنهادها همراه با عنوان پروژه و نام فریلنسر
------------------------------------------------------------
SELECT
    p.Title AS ProjectTitle,
    CONCAT(u.FirstName, ' ', u.LastName) AS FreelancerName,
    pr.ProposedAmount,
    pr.ProposalStatus
FROM dbo.Proposals AS pr
JOIN dbo.Projects AS p
    ON pr.ProjectID = p.ProjectID
JOIN dbo.Users AS u
    ON pr.FreelancerID = u.UserID
ORDER BY p.ProjectID;


------------------------------------------------------------
-- QUERY 3: Proposal count for each employer project
-- تعداد پیشنهادهای دریافتی هر پروژه
------------------------------------------------------------
SELECT
    u.UserID,
    CONCAT(u.FirstName, ' ', u.LastName) AS EmployerName,
    p.Title AS ProjectTitle,
    COUNT(pr.ProposalID) AS ProposalCount
FROM dbo.Users AS u
JOIN dbo.Projects AS p
    ON u.UserID = p.EmployerID
LEFT JOIN dbo.Proposals AS pr
    ON p.ProjectID = pr.ProjectID
GROUP BY
    u.UserID,
    u.FirstName,
    u.LastName,
    p.ProjectID,
    p.Title
ORDER BY ProposalCount DESC;


------------------------------------------------------------
-- QUERY 4: Skills required for each project
-- مهارت‌های موردنیاز هر پروژه
------------------------------------------------------------
SELECT
    p.Title AS ProjectTitle,
    s.SkillName
FROM dbo.Projects AS p
JOIN dbo.ProjectSkills AS ps
    ON p.ProjectID = ps.ProjectID
JOIN dbo.Skills AS s
    ON ps.SkillID = s.SkillID
ORDER BY p.Title, s.SkillName;
