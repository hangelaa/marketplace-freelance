import json
from unittest.mock import patch

from django.contrib.auth.hashers import PBKDF2PasswordHasher, make_password
from django.core.cache import cache
from django.db import connection
from django.test import TestCase, override_settings

PASSWORD = "Str0ng!Pass-123"


class FastPBKDF2Hasher(PBKDF2PasswordHasher):
    """همان PBKDF2 ولی با تکرار کم، فقط برای سریع شدن تست‌ها (در برنامه‌ی اصلی استفاده نمی‌شود)."""

    iterations = 1000


# ساختار جدول‌ها شبیه schema.sql (برای تست روی SQLite؛ تریگرهای T-SQL در SQLite اجرا نمی‌شوند)
DDL = [
    """CREATE TABLE dbo.Users (UserID INTEGER PRIMARY KEY AUTOINCREMENT, FirstName TEXT NOT NULL, LastName TEXT NOT NULL,
       Email TEXT NOT NULL UNIQUE, Mobile TEXT, PasswordHash TEXT NOT NULL, AccountStatus TEXT NOT NULL DEFAULT 'Active',
       UserType TEXT NOT NULL DEFAULT 'Regular', CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UpdatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
    """CREATE TABLE dbo.UserProfiles (ProfileID INTEGER PRIMARY KEY AUTOINCREMENT, UserID INTEGER NOT NULL UNIQUE,
       ProfessionalTitle TEXT, Bio TEXT, Location TEXT)""",
    "CREATE TABLE dbo.AdminAccounts (UserID INTEGER PRIMARY KEY, GrantedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE dbo.Skills (SkillID INTEGER PRIMARY KEY AUTOINCREMENT, SkillName TEXT NOT NULL UNIQUE)",
    "CREATE TABLE dbo.UserSkills (UserID INTEGER NOT NULL, SkillID INTEGER NOT NULL, PRIMARY KEY (UserID, SkillID))",
    "CREATE TABLE dbo.Categories (CategoryID INTEGER PRIMARY KEY AUTOINCREMENT, CategoryName TEXT NOT NULL UNIQUE)",
    """CREATE TABLE dbo.Projects (ProjectID INTEGER PRIMARY KEY AUTOINCREMENT, EmployerID INTEGER NOT NULL, Title TEXT NOT NULL,
       Description TEXT NOT NULL, PricingType TEXT NOT NULL CHECK (PricingType IN ('Fixed','Hourly')), FixedBudget NUMERIC, HourlyRate NUMERIC,
       ProjectStatus TEXT NOT NULL DEFAULT 'Draft', Deadline TEXT, CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UpdatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       CHECK ((PricingType = 'Fixed' AND FixedBudget > 0 AND HourlyRate IS NULL) OR (PricingType = 'Hourly' AND HourlyRate > 0 AND FixedBudget IS NULL)))""",
    "CREATE TABLE dbo.ProjectCategories (ProjectID INTEGER NOT NULL, CategoryID INTEGER NOT NULL, PRIMARY KEY (ProjectID, CategoryID))",
    "CREATE TABLE dbo.ProjectSkills (ProjectID INTEGER NOT NULL, SkillID INTEGER NOT NULL, PRIMARY KEY (ProjectID, SkillID))",
    """CREATE TABLE dbo.Proposals (ProposalID INTEGER PRIMARY KEY AUTOINCREMENT, ProjectID INTEGER NOT NULL, FreelancerID INTEGER NOT NULL,
       ProposedAmount NUMERIC NOT NULL CHECK (ProposedAmount > 0), CoverLetter TEXT NOT NULL, EstimatedHours NUMERIC, EstimatedDurationDays INTEGER,
       ProposalStatus TEXT NOT NULL DEFAULT 'Pending', CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE (ProjectID, FreelancerID))""",
    "CREATE UNIQUE INDEX dbo.UX_OneAccepted ON Proposals(ProjectID) WHERE ProposalStatus = 'Accepted'",
]


@override_settings(PASSWORD_HASHERS=["marketplace.test_marketplace.FastPBKDF2Hasher"])
class MarketplaceTestCase(TestCase):
    """پایه‌ی همه‌ی تست‌ها: دیتابیس dbo، ساخت کاربر، ورود واقعی با API و ابزارهای ساده."""

    @classmethod
    def setUpClass(cls):
        connection.ensure_connection()
        connection.connection.create_function("SYSDATETIME", 0, lambda: "2026-01-01 00:00:00")
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA database_list")
            if any(row[1] == "dbo" for row in cursor.fetchall()):
                cursor.execute("DETACH DATABASE dbo")
            cursor.execute("ATTACH DATABASE ':memory:' AS dbo")
            for statement in DDL:
                cursor.execute(statement)
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        with connection.cursor() as cursor:
            cursor.execute("DETACH DATABASE dbo")

    def setUp(self):
        cache.clear()
        self.categories = [self.sql("INSERT INTO dbo.Categories (CategoryName) VALUES (%s)", [name]) for name in ("Web", "Design", "Mobile")]
        self.skills = [self.sql("INSERT INTO dbo.Skills (SkillName) VALUES (%s)", [name]) for name in ("Python", "Django", "Figma")]
        self.owner = self.make_user("owner@example.test", "Olivia", "Owner")
        self.freelancer = self.make_user("free@example.test", "Farid", "Freelancer")
        self.other = self.make_user("other@example.test", "Omid", "Other")
        self.admin = self.make_user("admin@example.test", "Ada", "Admin", user_type="Admin")

    # ---------- ابزارها
    def sql(self, statement, params=()):
        with connection.cursor() as cursor:
            cursor.execute(statement, list(params))
            return cursor.lastrowid

    def scalar(self, statement, params=()):
        with connection.cursor() as cursor:
            cursor.execute(statement, list(params))
            return cursor.fetchone()[0]

    def make_user(self, email, first, last, user_type="Regular"):
        return self.sql(
            "INSERT INTO dbo.Users (FirstName, LastName, Email, PasswordHash, UserType) VALUES (%s, %s, %s, %s, %s)",
            [first, last, email, make_password(PASSWORD), user_type],
        )

    def login(self, email):
        self.client.post("/api/auth/logout/")
        res = self.client.post("/api/auth/login/", json.dumps({"email": email, "password": PASSWORD}), content_type="application/json")
        self.assertEqual(res.status_code, 200)

    def call(self, method, url, data=None):
        body = json.dumps(data) if data is not None else None
        return getattr(self.client, method)(url, data=body, content_type="application/json")

    def project_payload(self, **overrides):
        payload = {"title": "Build a shop", "description": "Online shop with Django", "pricing_type": "Fixed", "budget": "1500",
                   "category_ids": [self.categories[0]], "skill_ids": [self.skills[0]]}
        return {**payload, **overrides}

    def create_project(self, publish=True, **overrides):
        """پروژه را مستقیم با API به‌عنوان owner می‌سازد و شناسه‌اش را برمی‌گرداند."""
        self.login("owner@example.test")
        res = self.call("post", "/api/projects/", self.project_payload(publish=publish, **overrides))
        self.assertEqual(res.status_code, 201, res.content)
        return res.json()["id"]

    def submit(self, project_id, email="free@example.test", **overrides):
        self.login(email)
        payload = {"amount": "1200", "cover_letter": "I can do it", "estimated_days": 10, **overrides}
        return self.call("post", f"/api/projects/{project_id}/proposals/", payload)


# ============================================================ دسترسی و داده‌های مرجع
class AccessTests(MarketplaceTestCase):
    def test_anonymous_users_get_401_everywhere(self):
        for method, url in [("get", "/api/projects/"), ("post", "/api/projects/"), ("get", "/api/my/projects/"),
                            ("get", "/api/my/proposals/"), ("get", "/api/profile/"), ("get", "/api/categories/"),
                            ("post", "/api/proposals/1/accept/")]:
            self.assertEqual(getattr(self.client, method)(url).status_code, 401, url)

    def test_categories_and_skills_come_from_database(self):
        self.login("owner@example.test")
        names = [item["name"] for item in self.client.get("/api/categories/").json()["results"]]
        self.assertEqual(names, ["Design", "Mobile", "Web"])
        self.assertEqual(len(self.client.get("/api/skills/").json()["results"]), 3)

    def test_wrong_method_is_405(self):
        self.login("owner@example.test")
        self.assertEqual(self.client.delete("/api/projects/").status_code, 405)


# ============================================================ پروژه‌ها
class ProjectTests(MarketplaceTestCase):
    def test_create_draft_and_publish_flow(self):
        project_id = self.create_project(publish=False)
        self.assertEqual(self.client.get(f"/api/projects/{project_id}/").json()["status"], "Draft")
        res = self.call("post", f"/api/projects/{project_id}/publish/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "Open")
        self.assertEqual(self.call("post", f"/api/projects/{project_id}/publish/").status_code, 409)  # دوباره منتشر نمی‌شود

    def test_publish_requires_categories_and_skills(self):
        self.login("owner@example.test")
        res = self.call("post", "/api/projects/", self.project_payload(publish=True, category_ids=[], skill_ids=[]))
        self.assertEqual(res.status_code, 400)
        self.assertIn("category_ids", res.json()["fields"])
        draft = self.call("post", "/api/projects/", self.project_payload(publish=False, category_ids=[], skill_ids=[]))
        self.assertEqual(draft.status_code, 201)                      # پیش‌نویس بدون دسته مجاز است
        self.assertEqual(self.call("post", f"/api/projects/{draft.json()['id']}/publish/").status_code, 400)

    def test_budget_validation(self):
        self.login("owner@example.test")
        for bad in ("0", "-5", "abc", None, 0, True, "1e400"):
            res = self.call("post", "/api/projects/", self.project_payload(budget=bad))
            self.assertEqual(res.status_code, 400, bad)
            self.assertIn("budget", res.json()["fields"])
        self.assertEqual(self.scalar("SELECT COUNT(*) FROM dbo.Projects"), 0)

    def test_hourly_project_stores_rate_not_fixed_budget(self):
        project_id = self.create_project(pricing_type="Hourly", budget="40.5")
        self.assertEqual(self.scalar("SELECT HourlyRate FROM dbo.Projects WHERE ProjectID = %s", [project_id]), 40.5)
        self.assertIsNone(self.scalar("SELECT FixedBudget FROM dbo.Projects WHERE ProjectID = %s", [project_id]))
        self.assertEqual(self.client.get(f"/api/projects/{project_id}/").json()["budget"], "40.50")

    def test_required_fields_and_invalid_ids(self):
        self.login("owner@example.test")
        res = self.call("post", "/api/projects/", {"publish": False})
        self.assertEqual(res.status_code, 400)
        self.assertTrue({"title", "description", "pricing_type", "budget"} <= set(res.json()["fields"]))
        bad_category = self.call("post", "/api/projects/", self.project_payload(category_ids=[999]))
        self.assertEqual(bad_category.status_code, 400)
        self.assertIn("category_ids", bad_category.json()["fields"])
        self.assertEqual(self.call("post", "/api/projects/", self.project_payload(deadline="2001-01-01")).status_code, 400)

    def test_admin_cannot_create_project(self):
        self.login("admin@example.test")
        self.assertEqual(self.call("post", "/api/projects/", self.project_payload()).status_code, 403)
        self.assertEqual(self.scalar("SELECT COUNT(*) FROM dbo.Projects"), 0)

    def test_listing_shows_only_open_projects_with_tags_and_pagination(self):
        open_id = self.create_project(title="Open one")
        self.create_project(publish=False, title="Hidden draft")
        self.login("free@example.test")
        data = self.client.get("/api/projects/").json()
        self.assertEqual([p["id"] for p in data["results"]], [open_id])
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["results"][0]["categories"][0]["name"], "Web")
        self.assertEqual(data["results"][0]["skills"][0]["name"], "Python")
        self.assertEqual(data["results"][0]["owner"]["name"], "Olivia Owner")
        for index in range(12):
            self.create_project(title=f"Extra {index}")
        self.login("free@example.test")
        page2 = self.client.get("/api/projects/?page=2&page_size=5").json()
        self.assertEqual((page2["total"], len(page2["results"]), page2["page"]), (13, 5, 2))

    def test_search_filter_and_empty_result(self):
        self.create_project(title="Django shop", description="Backend work")
        self.create_project(title="Logo", description="Brand identity", category_ids=[self.categories[1]])
        self.login("free@example.test")
        titles = lambda query: [p["title"] for p in self.client.get(f"/api/projects/{query}").json()["results"]]
        self.assertEqual(titles("?q=django"), ["Django shop"])
        self.assertEqual(titles("?q=identity"), ["Logo"])                       # جستجو در توضیحات
        self.assertEqual(titles(f"?category={self.categories[1]}"), ["Logo"])
        self.assertEqual(titles(f"?q=logo&category={self.categories[0]}"), [])
        self.assertEqual(titles("?q=nothing-matches"), [])                       # فرانت پیام «پروژه‌ای یافت نشد» نشان می‌دهد
        self.assertEqual(titles("?q=%25"), [])                                   # علامت % متن ساده است، نه wildcard
        self.assertEqual(self.client.get("/api/projects/?category=abc").status_code, 400)

    def test_draft_is_visible_only_to_owner(self):
        project_id = self.create_project(publish=False)
        self.login("free@example.test")
        self.assertEqual(self.client.get(f"/api/projects/{project_id}/").status_code, 404)
        self.assertEqual(self.call("put", f"/api/projects/{project_id}/", self.project_payload()).status_code, 404)
        self.login("owner@example.test")
        self.assertEqual(self.client.get(f"/api/projects/{project_id}/").status_code, 200)

    def test_detail_has_owner_info_flags_and_404(self):
        project_id = self.create_project()
        self.login("free@example.test")
        data = self.client.get(f"/api/projects/{project_id}/").json()
        self.assertEqual((data["is_owner"], data["can_submit_proposal"], data["can_edit"]), (False, True, False))
        self.assertEqual(self.client.get("/api/projects/9999/").status_code, 404)
        self.login("owner@example.test")
        mine = self.client.get(f"/api/projects/{project_id}/").json()
        self.assertEqual((mine["is_owner"], mine["can_submit_proposal"], mine["can_edit"]), (True, False, True))

    def test_only_owner_can_edit_and_status_limits_apply(self):
        project_id = self.create_project()
        self.login("other@example.test")
        self.assertEqual(self.call("put", f"/api/projects/{project_id}/", self.project_payload()).status_code, 403)
        self.login("owner@example.test")
        res = self.call("put", f"/api/projects/{project_id}/", self.project_payload(title="New title", budget="2000"))
        self.assertEqual((res.status_code, res.json()["title"], res.json()["budget"]), (200, "New title", "2000.00"))
        self.sql("UPDATE dbo.Projects SET ProjectStatus = 'In Progress' WHERE ProjectID = %s", [project_id])
        self.assertEqual(self.call("put", f"/api/projects/{project_id}/", self.project_payload()).status_code, 409)

    def test_price_is_locked_after_first_proposal(self):
        project_id = self.create_project()
        self.assertEqual(self.submit(project_id).status_code, 201)
        self.login("owner@example.test")
        locked = self.call("put", f"/api/projects/{project_id}/", self.project_payload(budget="9999"))
        self.assertEqual(locked.status_code, 409)
        same_price = self.call("put", f"/api/projects/{project_id}/", self.project_payload(title="Only title changed"))
        self.assertEqual(same_price.status_code, 200)

    def test_my_projects_with_proposal_counts(self):
        project_id = self.create_project()
        self.create_project(publish=False, title="Draft")
        self.submit(project_id)
        self.submit(project_id, email="other@example.test")
        self.login("owner@example.test")
        mine = {p["title"]: p for p in self.client.get("/api/my/projects/").json()["results"]}
        self.assertEqual(mine["Build a shop"]["proposal_count"], 2)
        self.assertEqual((mine["Draft"]["can_publish"], mine["Draft"]["proposal_count"]), (True, 0))
        self.login("free@example.test")
        self.assertEqual(self.client.get("/api/my/projects/").json()["results"], [])  # فقط پروژه‌های خودش


# ============================================================ پیشنهادها
class ProposalTests(MarketplaceTestCase):
    def test_submit_creates_pending_proposal(self):
        project_id = self.create_project()
        res = self.submit(project_id, amount="1300.456", estimated_days=7)
        self.assertEqual(res.status_code, 201)
        proposal = res.json()["proposal"]
        self.assertEqual((proposal["status"], proposal["amount"], proposal["estimated_days"]), ("Pending", "1300.46", 7))
        self.assertEqual(self.client.get(f"/api/projects/{project_id}/").json()["my_proposal"]["status"], "Pending")

    def test_business_rules_on_submit(self):
        project_id = self.create_project()
        self.assertEqual(self.submit(project_id, email="owner@example.test").status_code, 403)   # پروژه‌ی خودش
        self.assertEqual(self.submit(project_id, email="admin@example.test").status_code, 403)   # ادمین
        self.assertEqual(self.submit(project_id).status_code, 201)
        self.assertEqual(self.submit(project_id).status_code, 409)                               # تکراری
        draft_id = self.create_project(publish=False)
        self.assertEqual(self.submit(draft_id).status_code, 409)                                 # غیر Open
        self.assertEqual(self.submit(9999).status_code, 404)

    def test_amount_and_fields_validation(self):
        project_id = self.create_project()
        for bad in ("0", "-1", "abc", None):
            res = self.submit(project_id, amount=bad)
            self.assertEqual(res.status_code, 400, bad)
            self.assertIn("amount", res.json()["fields"])
        self.assertEqual(self.submit(project_id, cover_letter="  ").status_code, 400)
        self.assertEqual(self.submit(project_id, estimated_days=0).status_code, 400)
        self.assertEqual(self.scalar("SELECT COUNT(*) FROM dbo.Proposals"), 0)

    def test_hourly_project_accepts_estimated_hours(self):
        project_id = self.create_project(pricing_type="Hourly", budget="30")
        res = self.submit(project_id, amount="35", estimated_hours="120")
        self.assertEqual(res.json()["proposal"]["estimated_hours"], "120.00")
        fixed_id = self.create_project(title="Fixed one")
        res = self.submit(fixed_id, estimated_hours="120", email="other@example.test")
        self.assertIsNone(res.json()["proposal"]["estimated_hours"])                           # برای Fixed نادیده گرفته می‌شود

    def test_my_proposals_and_withdraw(self):
        project_id = self.create_project()
        proposal_id = self.submit(project_id).json()["proposal"]["id"]
        listing = self.client.get("/api/my/proposals/").json()["results"]
        self.assertEqual((listing[0]["project"]["title"], listing[0]["can_withdraw"]), ("Build a shop", True))
        self.assertEqual(self.call("post", f"/api/proposals/{proposal_id}/withdraw/").json()["proposal"]["status"], "Withdrawn")
        self.assertEqual(self.call("post", f"/api/proposals/{proposal_id}/withdraw/").status_code, 409)   # دوباره نه
        self.assertEqual(self.submit(project_id).status_code, 409)                                         # Withdrawn هم سابقه است

    def test_cannot_withdraw_accepted_or_foreign_proposal(self):
        project_id = self.create_project()
        proposal_id = self.submit(project_id).json()["proposal"]["id"]
        self.login("other@example.test")
        self.assertEqual(self.call("post", f"/api/proposals/{proposal_id}/withdraw/").status_code, 404)
        self.login("owner@example.test")
        self.assertEqual(self.call("post", f"/api/proposals/{proposal_id}/accept/").status_code, 200)
        self.login("free@example.test")
        self.assertEqual(self.call("post", f"/api/proposals/{proposal_id}/withdraw/").status_code, 409)


# ============================================================ بررسی، پذیرش و رد
class ReviewTests(MarketplaceTestCase):
    def setUp(self):
        super().setUp()
        self.project_id = self.create_project()
        self.sql("INSERT INTO dbo.UserProfiles (UserID, ProfessionalTitle, Bio) VALUES (%s, 'Backend dev', 'Hi')", [self.freelancer])
        self.sql("INSERT INTO dbo.UserSkills (UserID, SkillID) VALUES (%s, %s)", [self.freelancer, self.skills[0]])
        self.first = self.submit(self.project_id).json()["proposal"]["id"]
        self.second = self.submit(self.project_id, email="other@example.test", amount="900").json()["proposal"]["id"]
        self.login("owner@example.test")

    def statuses(self):
        rows = {}
        with connection.cursor() as cursor:
            cursor.execute("SELECT ProposalID, ProposalStatus FROM dbo.Proposals")
            rows = dict(cursor.fetchall())
        return rows, self.scalar("SELECT ProjectStatus FROM dbo.Projects WHERE ProjectID = %s", [self.project_id])

    def test_owner_sees_proposals_with_freelancer_details(self):
        results = self.client.get(f"/api/projects/{self.project_id}/proposals/").json()["results"]
        by_id = {item["id"]: item for item in results}
        freelancer = by_id[self.first]["freelancer"]
        self.assertEqual((freelancer["name"], freelancer["professional_title"], freelancer["skills"][0]["name"]),
                         ("Farid Freelancer", "Backend dev", "Python"))
        self.assertEqual(by_id[self.second]["freelancer"]["skills"], [])
        self.assertTrue(by_id[self.first]["can_decide"])

    def test_only_owner_can_review_and_decide(self):
        for email in ("free@example.test", "other@example.test"):
            self.login(email)
            self.assertEqual(self.client.get(f"/api/projects/{self.project_id}/proposals/").status_code, 403)
            self.assertEqual(self.call("post", f"/api/proposals/{self.first}/accept/").status_code, 403)
            self.assertEqual(self.call("post", f"/api/proposals/{self.first}/reject/").status_code, 403)
        self.login("admin@example.test")
        self.assertEqual(self.client.get(f"/api/projects/{self.project_id}/proposals/").status_code, 403)
        statuses, project_status = self.statuses()
        self.assertEqual((set(statuses.values()), project_status), ({"Pending"}, "Open"))

    def test_accept_updates_everything_together(self):
        res = self.call("post", f"/api/proposals/{self.first}/accept/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual((res.json()["accepted_proposal_id"], res.json()["rejected_count"]), (self.first, 1))
        statuses, project_status = self.statuses()
        self.assertEqual(statuses, {self.first: "Accepted", self.second: "Rejected"})
        self.assertEqual(project_status, "In Progress")

    def test_accept_is_atomic_when_a_step_fails(self):
        from marketplace import proposals as module

        original, calls = module.execute, []

        def failing_execute(sql, params=()):
            calls.append(sql)
            if len(calls) == 3:  # مرحله‌ی «رد بقیه‌ی پیشنهادها» خطا می‌دهد
                raise RuntimeError("simulated failure")
            return original(sql, params)

        with patch.object(module, "execute", failing_execute):
            with self.assertRaises(RuntimeError):
                self.call("post", f"/api/proposals/{self.first}/accept/")
        statuses, project_status = self.statuses()
        self.assertEqual((set(statuses.values()), project_status), ({"Pending"}, "Open"))   # هیچ تغییری ذخیره نشد

    def test_second_accept_and_late_actions_are_rejected(self):
        self.assertEqual(self.call("post", f"/api/proposals/{self.first}/accept/").status_code, 200)
        self.assertEqual(self.call("post", f"/api/proposals/{self.second}/accept/").status_code, 409)   # پروژه دیگر Open نیست
        self.assertEqual(self.call("post", f"/api/proposals/{self.first}/accept/").status_code, 409)
        self.assertEqual(self.call("post", f"/api/proposals/{self.second}/reject/").status_code, 409)   # قبلاً Rejected شده
        self.assertEqual(self.submit(self.project_id, email="admin@example.test").status_code, 403)

    def test_reject_changes_only_that_proposal(self):
        res = self.call("post", f"/api/proposals/{self.first}/reject/")
        self.assertEqual(res.json()["proposal"]["status"], "Rejected")
        statuses, project_status = self.statuses()
        self.assertEqual((statuses[self.first], statuses[self.second], project_status), ("Rejected", "Pending", "Open"))
        self.assertEqual(self.call("post", f"/api/proposals/{self.first}/reject/").status_code, 409)
        self.assertEqual(self.call("post", "/api/proposals/9999/accept/").status_code, 404)

    def test_final_statuses_visible_to_freelancers(self):
        self.call("post", f"/api/proposals/{self.first}/accept/")
        self.login("free@example.test")
        self.assertEqual(self.client.get("/api/my/proposals/").json()["results"][0]["status"], "Accepted")
        self.login("other@example.test")
        mine = self.client.get("/api/my/proposals/").json()["results"][0]
        self.assertEqual((mine["status"], mine["project"]["status"]), ("Rejected", "In Progress"))


# ============================================================ پروفایل
class ProfileTests(MarketplaceTestCase):
    def test_get_and_update_profile_with_skills(self):
        self.login("free@example.test")
        before = self.client.get("/api/profile/").json()
        self.assertEqual((before["first_name"], before["email"], before["skills"]), ("Farid", "free@example.test", []))
        payload = {"first_name": "Farid", "last_name": "Updated", "professional_title": "Dev", "bio": "About me",
                   "location": "Tehran", "skill_ids": [self.skills[0], self.skills[1]]}
        res = self.call("put", "/api/profile/", payload)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(sorted(s["name"] for s in res.json()["skills"]), ["Django", "Python"])
        again = self.call("put", "/api/profile/", {**payload, "bio": None, "skill_ids": [self.skills[2]]}).json()  # بدون ردیف تکراری
        self.assertEqual((again["bio"], [s["name"] for s in again["skills"]]), (None, ["Figma"]))
        self.assertEqual(self.scalar("SELECT COUNT(*) FROM dbo.UserProfiles WHERE UserID = %s", [self.freelancer]), 1)

    def test_validation_and_admin_block(self):
        self.login("free@example.test")
        res = self.call("put", "/api/profile/", {"first_name": "", "last_name": "X", "skill_ids": [999]})
        self.assertEqual(res.status_code, 400)
        self.assertIn("first_name", res.json()["fields"])
        self.login("admin@example.test")
        self.assertEqual(self.client.get("/api/profile/").status_code, 403)


# ============================================================ داده‌ی نمونه‌ی توسعه
class SeedTests(MarketplaceTestCase):
    def test_seed_is_idempotent_and_accounts_can_login(self):
        from marketplace import seed_dev

        with patch("builtins.print"):
            seed_dev.run()
            seed_dev.run()  # بار دوم چیزی تکراری نمی‌سازد
        self.assertEqual(self.scalar("SELECT COUNT(*) FROM dbo.Projects"), 3)
        self.assertEqual(self.scalar("SELECT COUNT(*) FROM dbo.Proposals"), 2)
        res = self.client.post("/api/auth/login/", json.dumps({"email": "demo.client@marketplace.local", "password": seed_dev.DEMO_PASSWORD}),
                               content_type="application/json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(self.client.get("/api/my/projects/").json()["results"]), 3)
