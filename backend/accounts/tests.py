from unittest.mock import patch
import hashlib

from django.test import Client, TestCase
from django.urls import reverse
from django.contrib.auth.hashers import make_password

from accounts.auth import MarketplaceUser


class LoginFlowTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = MarketplaceUser(
            user_id=41,
            email="hana@example.test",
            first_name="Hana",
            last_name="Hatami",
            password_hash=make_password("CorrectHorse9!"),
            account_status="Active",
        )
        self.user.backend = "accounts.auth.MarketplaceAuthBackend"
        self.get_user_patch = patch("accounts.auth.MarketplaceAuthBackend.get_user", return_value=self.user)
        self.get_user_patch.start()
        self.addCleanup(self.get_user_patch.stop)
        with patch("accounts.views.authenticate", return_value=self.user):
            self.client.post(reverse("api-login"), data='{"email":"hana@example.test","password":"CorrectHorse9!"}', content_type="application/json")

    def test_authenticated_user_endpoint_returns_session_identity(self):
        response = self.client.get(reverse("api-me"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], "hana@example.test")

    def test_logout_invalidates_session(self):
        response = self.client.post(reverse("api-logout"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get(reverse("api-me")).status_code, 401)

    def test_protected_welcome_redirects_without_authentication(self):
        self.client.cookies.clear()
        response = self.client.get(reverse("welcome"))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("login-page"), response.url)

    def test_password_hash_verification(self):
        from accounts.auth import verify_password
        self.assertTrue(verify_password("CorrectHorse9!", self.user.password_hash))
        self.assertFalse(verify_password("incorrect", self.user.password_hash))

    def test_legacy_sql_server_hash_is_verified_as_utf16le_sha256(self):
        from accounts.auth import verify_password
        password = "موقت-رمز-123"
        legacy_hash = hashlib.sha256(password.encode("utf-16le")).hexdigest()
        self.assertTrue(verify_password(password, legacy_hash))
        self.assertFalse(verify_password("wrong", legacy_hash))


class LoginApiTests(TestCase):
    @patch("accounts.views.authenticate", return_value=None)
    def test_invalid_credentials_use_generic_error(self, authenticate_mock):
        response = self.client.post(
            reverse("api-login"),
            data='{"email":"missing@example.test","password":"wrong"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"], "نام کاربری یا رمز عبور اشتباه است.")

    def test_empty_fields_are_rejected(self):
        response = self.client.post(
            reverse("api-login"),
            data='{"email":"","password":""}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

