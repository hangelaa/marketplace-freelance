from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse

from accounts.auth import MarketplaceUser

WRONG = '{"email":"user@example.test","password":"wrong"}'


class LoginRateLimitTests(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)

    def _post(self, ip="10.0.0.1", body=WRONG):
        return self.client.post(reverse("api-login"), data=body, content_type="application/json", REMOTE_ADDR=ip)

    @patch("accounts.views.authenticate", return_value=None)
    def test_sixth_attempt_after_five_failures_is_429(self, authenticate_mock):
        for _ in range(5):
            self.assertEqual(self._post().status_code, 401)
        response = self._post()
        self.assertEqual(response.status_code, 429)
        self.assertTrue(1 <= int(response["Retry-After"]) <= 300)
        # Blocked requests never reach authentication.
        self.assertEqual(authenticate_mock.call_count, 5)

    @patch("accounts.views.authenticate", return_value=None)
    def test_limit_is_per_ip(self, authenticate_mock):
        for _ in range(5):
            self._post(ip="10.0.0.1")
        self.assertEqual(self._post(ip="10.0.0.1").status_code, 429)
        self.assertEqual(self._post(ip="10.0.0.2").status_code, 401)

    @patch("accounts.views.authenticate", return_value=None)
    def test_correct_password_is_also_blocked_once_limited(self, authenticate_mock):
        for _ in range(5):
            self._post()
        user = MarketplaceUser(user_id=1, email="user@example.test", first_name="U", last_name="T", password_hash="x", account_status="Active")
        authenticate_mock.return_value = user
        self.assertEqual(self._post().status_code, 429)

    @patch("accounts.views.authenticate", return_value=None)
    def test_block_lifts_after_window(self, authenticate_mock):
        with patch("accounts.login_ratelimit.time.time", return_value=1_000_000.0):
            for _ in range(5):
                self._post()
            self.assertEqual(self._post().status_code, 429)
        # Simulate cache expiry at the end of the 5-minute window.
        cache.clear()
        self.assertEqual(self._post().status_code, 401)

    def test_malformed_requests_do_not_count(self):
        for _ in range(10):
            self.assertEqual(self._post(body='{"email":"","password":""}').status_code, 400)
        with patch("accounts.views.authenticate", return_value=None):
            self.assertEqual(self._post().status_code, 401)
