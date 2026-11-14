import json
import re
from unittest.mock import patch

from django.core import mail
from django.db import connection
from django.test import TestCase
from django.urls import reverse

# ساختار جدول dbo.Users شبیه schema.sql (برای تست روی SQLite)
USERS_DDL = """
CREATE TABLE dbo.Users (
    UserID INTEGER PRIMARY KEY AUTOINCREMENT,
    FirstName TEXT NOT NULL,
    LastName TEXT NOT NULL,
    Email TEXT NOT NULL UNIQUE,
    Mobile TEXT NULL,
    PasswordHash TEXT NOT NULL,
    AccountStatus TEXT NOT NULL DEFAULT 'Active',
    UserType TEXT NOT NULL DEFAULT 'Regular',
    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""
STRONG = "Str0ng!Pass-123"


class RegistrationFlowTests(TestCase):
    @classmethod
    def setUpClass(cls):
        # SQLite اسکیمای dbo را ندارد؛ یک دیتابیس حافظه‌ای با نام dbo وصل می‌کنیم
        connection.ensure_connection()
        connection.connection.create_function("SYSDATETIME", 0, lambda: "2026-01-01 00:00:00")
        with connection.cursor() as cursor:
            cursor.execute("ATTACH DATABASE ':memory:' AS dbo")
            cursor.execute(USERS_DDL)
        super().setUpClass()

    def post(self, name, payload):
        return self.client.post(reverse(name), data=json.dumps(payload), content_type="application/json")

    def register(self, **overrides):
        body = {"fullName": "Hana Hatami", "email": "hana@example.test", "password": STRONG}
        return self.post("api-register", {**body, **overrides})

    def login(self, email="hana@example.test", password=STRONG):
        return self.post("api-login", {"email": email, "password": password})

    def stored_row(self, email="hana@example.test"):
        with connection.cursor() as cursor:
            cursor.execute("SELECT FirstName, LastName, PasswordHash, AccountStatus, UserType FROM dbo.Users WHERE Email = %s", [email])
            return cursor.fetchone()

    # ---------- ثبت‌نام
    def test_register_saves_split_name_and_pbkdf2_hash(self):
        res = self.register()
        self.assertEqual(res.status_code, 201)
        first, last, pwd_hash, status, user_type = self.stored_row()
        self.assertEqual((first, last), ("Hana", "Hatami"))
        self.assertTrue(pwd_hash.startswith("pbkdf2_sha256$"))   # هش امن
        self.assertNotIn(STRONG, pwd_hash)                        # متن ساده نیست
        self.assertEqual((status, user_type), ("Active", "Regular"))

    def test_register_single_word_name(self):
        self.assertEqual(self.register(fullName="Madonna").status_code, 201)
        self.assertEqual(self.stored_row()[:2], ("Madonna", ""))

    def test_register_duplicate_email_case_insensitive(self):
        self.register()
        res = self.register(email="HANA@Example.test")
        self.assertEqual(res.status_code, 409)
        self.assertIn("error", res.json())

    def test_register_validation_errors(self):
        self.assertEqual(self.register(email="bad").status_code, 400)
        self.assertEqual(self.register(fullName="  ").status_code, 400)
        self.assertEqual(self.register(password="12345678").status_code, 400)  # ضعیف
        self.assertEqual(self.register(password="short").status_code, 400)

    def test_registered_user_can_login(self):
        self.register()
        self.assertEqual(self.login().status_code, 200)
        self.assertEqual(self.client.get(reverse("api-me")).json()["name"], "Hana Hatami")
        self.assertEqual(self.login(password="Wrong!Pass-999").status_code, 401)

    # ---------- بازیابی رمز
    def reset_link(self):
        self.post("api-password-reset", {"email": "hana@example.test"})
        match = re.search(r"uid=([^&\s]+)&token=(\S+)", mail.outbox[-1].body)
        return match.group(1), match.group(2)

    def test_reset_flow_and_single_use(self):
        self.register()
        uid, token = self.reset_link()
        new = "N3w!Password-456"
        ok = self.post("api-password-reset-confirm", {"uid": uid, "token": token, "password": new})
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(self.login(password=STRONG).status_code, 401)   # رمز قدیمی
        self.assertEqual(self.login(password=new).status_code, 200)      # رمز جدید
        again = self.post("api-password-reset-confirm", {"uid": uid, "token": token, "password": "An0ther!Pass-789"})
        self.assertEqual(again.status_code, 400)                         # لینک مصرف‌شده

    def test_reset_invalid_token_and_weak_password(self):
        self.register()
        uid, token = self.reset_link()
        bad = self.post("api-password-reset-confirm", {"uid": uid, "token": "bad-token", "password": STRONG})
        self.assertEqual(bad.status_code, 400)
        weak = self.post("api-password-reset-confirm", {"uid": uid, "token": token, "password": "12345678"})
        self.assertEqual(weak.status_code, 400)

    def test_reset_expired_token(self):
        self.register()
        uid, token = self.reset_link()
        with patch("django.contrib.auth.tokens.PasswordResetTokenGenerator._now") as now:
            from datetime import datetime, timedelta
            now.return_value = datetime.now() + timedelta(hours=2)
            res = self.post("api-password-reset-confirm", {"uid": uid, "token": token, "password": STRONG + "x"})
        self.assertEqual(res.status_code, 400)

    def test_reset_request_does_not_reveal_email(self):
        self.register()
        known = self.post("api-password-reset", {"email": "hana@example.test"})
        sent = len(mail.outbox)
        unknown = self.post("api-password-reset", {"email": "ghost@example.test"})
        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.json(), unknown.json())
        self.assertEqual(len(mail.outbox), sent)

    def test_blocked_account_gets_no_reset_mail(self):
        self.register()
        with connection.cursor() as cursor:
            cursor.execute("UPDATE dbo.Users SET AccountStatus = 'Blocked' WHERE Email = %s", ["hana@example.test"])
        self.post("api-password-reset", {"email": "hana@example.test"})
        self.assertEqual(len(mail.outbox), 0)
