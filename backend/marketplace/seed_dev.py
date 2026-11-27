"""
داده‌ی نمونه فقط برای محیط توسعه و ارائه: حساب‌های آزمایشی با نقش‌های مختلف و چند پروژه و پیشنهاد.
اجرا (در پوشه‌ی backend):  python manage.py shell -c "from marketplace import seed_dev; seed_dev.run()"
چند بار اجرا کردن آن ضرری ندارد؛ چیزی که از قبل هست دوباره ساخته نمی‌شود.
"""
from django.contrib.auth.hashers import make_password

from .common import execute, fetch_all, fetch_one, insert

DEMO_PASSWORD = "Demo-Pass-2026!"
DEMO_USERS = [
    # (ایمیل, نام, نام خانوادگی, نوع حساب)
    ("demo.client@marketplace.local", "Nima", "Client", "Regular"),
    ("demo.freelancer@marketplace.local", "Sara", "Freelancer", "Regular"),
    ("demo.freelancer2@marketplace.local", "Arman", "Developer", "Regular"),
    ("demo.admin@marketplace.local", "Ada", "Admin", "Admin"),
]


def _ensure_user(email, first_name, last_name, user_type):
    row = fetch_one("SELECT UserID FROM dbo.Users WHERE Email = %s", [email])
    if row:
        return row["UserID"]
    user_id = insert(
        "INSERT INTO dbo.Users (FirstName, LastName, Email, PasswordHash, UserType) VALUES (%s, %s, %s, %s, %s)",
        [first_name, last_name, email, make_password(DEMO_PASSWORD), user_type],
    )
    if user_type == "Admin":
        execute("INSERT INTO dbo.AdminAccounts (UserID) VALUES (%s)", [user_id])
    return user_id


def _ensure_catalog():
    """دسته‌بندی و مهارت‌های موجود را برمی‌گرداند؛ اگر جدول‌ها خالی بودند چند نمونه می‌سازد."""
    if not fetch_all("SELECT CategoryID FROM dbo.Categories"):
        for name in ("Web Development", "Mobile Development", "Graphic Design"):
            execute("INSERT INTO dbo.Categories (CategoryName) VALUES (%s)", [name])
    if not fetch_all("SELECT SkillID FROM dbo.Skills"):
        for name in ("Python", "Django", "React", "Figma", "SQL"):
            execute("INSERT INTO dbo.Skills (SkillName) VALUES (%s)", [name])
    categories = [row["CategoryID"] for row in fetch_all("SELECT CategoryID FROM dbo.Categories ORDER BY CategoryID")]
    skills = [row["SkillID"] for row in fetch_all("SELECT SkillID FROM dbo.Skills ORDER BY SkillID")]
    return categories, skills


def _create_project(owner_id, title, description, pricing_type, amount, status, category_id, skill_ids):
    fixed, hourly = (amount, None) if pricing_type == "Fixed" else (None, amount)
    project_id = insert(
        """INSERT INTO dbo.Projects (EmployerID, Title, Description, PricingType, FixedBudget, HourlyRate, ProjectStatus)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        [owner_id, title, description, pricing_type, fixed, hourly, status],
    )
    execute("INSERT INTO dbo.ProjectCategories (ProjectID, CategoryID) VALUES (%s, %s)", [project_id, category_id])
    for skill_id in skill_ids:
        execute("INSERT INTO dbo.ProjectSkills (ProjectID, SkillID) VALUES (%s, %s)", [project_id, skill_id])
    return project_id


def run():
    ids = {email: _ensure_user(email, first, last, user_type) for email, first, last, user_type in DEMO_USERS}
    client_id = ids["demo.client@marketplace.local"]
    if fetch_one("SELECT 1 AS found FROM dbo.Projects WHERE EmployerID = %s", [client_id]):
        print("Demo data already exists.")
    else:
        categories, skills = _ensure_catalog()
        web = _create_project(client_id, "Company website redesign", "Redesign our marketing website and make it responsive.",
                              "Fixed", 1500, "Open", categories[0], skills[:2])
        _create_project(client_id, "Part-time backend developer", "Maintain our Django API for a few hours per week.",
                        "Hourly", 25, "Open", categories[0], skills[:1])
        _create_project(client_id, "Mobile app prototype (draft)", "Prototype for a delivery app.",
                        "Fixed", 3000, "Draft", categories[min(1, len(categories) - 1)], skills[-1:])
        for email, amount in (("demo.freelancer@marketplace.local", 1400), ("demo.freelancer2@marketplace.local", 1250)):
            execute(
                """INSERT INTO dbo.Proposals (ProjectID, FreelancerID, ProposedAmount, CoverLetter, EstimatedDurationDays, ProposalStatus)
                   VALUES (%s, %s, %s, %s, %s, 'Pending')""",
                [web, ids[email], amount, "I have built similar websites and can start this week.", 14],
            )
    print(f"Demo accounts (password for all: {DEMO_PASSWORD}):")
    for email, _, _, user_type in DEMO_USERS:
        print(f"  {user_type:8} {email}")
