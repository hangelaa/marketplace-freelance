from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse

from accounts import throttle
from accounts.auth import MarketplaceUser

BAD = '{"email":"hana@example.test","password":"wrong"}'


class LoginRateLimitTests(TestCase):
    def setUp(self):
        cache.clear()
        self.clock = [1000.0]  # زمان جعلی برای تست
        patcher = patch("accounts.throttle._now", side_effect=lambda: self.clock[0])
        patcher.start()
        self.addCleanup(patcher.stop)

    def tearDown(self):
        cache.clear()  # تست‌های دیگر تحت تأثیر شمارنده‌ی این تست‌ها نباشند

    def login(self, body=BAD, **extra):
        return self.client.post(reverse("api-login"), data=body, content_type="application/json", **extra)

def make_failures(self, count, **extra):
    with patch("accounts.views.authenticate", return_value=None):
        return [self.login(**extra) for _ in range(count)]

    def test_five_failures_allowed_sixth_is_429(self):
        statuses = [r.status_code for r in self.make_failures(5)]
        self.assertEqual(statuses, [401] * 5)          # پنج تلاش اشتباه مجاز است
        res = self.login()                             # تلاش ششم
        self.assertEqual(res.status_code, 429)
        self.assertEqual(res["Retry-After"], "300")
        self.assertEqual(res.json()["retry_after"], 300)
        self.assertIn("error", res.json())

    def test_correct_password_is_also_blocked_while_limited(self):
        self.make_failures(5)
        user = MarketplaceUser(user_id=1, email="a@b.co", first_name="A", last_name="B", password_hash="x", account_status="Active")
        with patch("accounts.views.authenticate", return_value=user) as auth:
            res = self.login()
        self.assertEqual(res.status_code, 429)
        auth.assert_not_called()                       # رمز اصلاً بررسی نمی‌شود

    def test_limit_expires_after_window(self):
        self.make_failures(5)
        self.clock[0] += 299
        self.assertEqual(self.login().status_code, 429)
        self.clock[0] += 2                              # از ۳۰۰ ثانیه گذشت
        with patch("accounts.views.authenticate", return_value=None):
            self.assertEqual(self.login().status_code, 401)  # دوباره مجاز است

    def test_retry_after_counts_down(self):
        self.make_failures(5)
        self.clock[0] += 100
        self.assertEqual(self.login()["Retry-After"], "200")

    def test_failures_older_than_window_do_not_count(self):
        self.make_failures(4)
        self.clock[0] += 301
        self.make_failures(4)                                    # فقط ۴ تلاش در پنجره
        with patch("accounts.views.authenticate", return_value=None):
            self.assertEqual(self.login().status_code, 401)

    def test_other_ip_is_not_blocked(self):
        self.make_failures(5, REMOTE_ADDR="10.0.0.1")
        self.assertEqual(self.login(REMOTE_ADDR="10.0.0.1").status_code, 429)
        with patch("accounts.views.authenticate", return_value=None):
            self.assertEqual(self.login(REMOTE_ADDR="10.0.0.2").status_code, 401)

    def test_validation_errors_are_not_counted(self):
        for _ in range(8):
            res = self.login(body='{"email":"","password":""}')
            self.assertEqual(res.status_code, 400)

    def test_successful_login_does_not_reset_counter(self):
        self.make_failures(4)
        user = MarketplaceUser(user_id=1, email="a@b.co", first_name="A", last_name="B", password_hash="x", account_status="Active")
        user.backend = "accounts.auth.MarketplaceAuthBackend"
        with patch("accounts.views.authenticate", return_value=user):
            self.assertEqual(self.login().status_code, 200)
        self.make_failures(1)
        self.assertEqual(self.login().status_code, 429)  # ۵ شکست، هرچند وسطش یک ورود موفق بود

    def test_forwarded_ip_used_only_from_trusted_proxy(self):
        # درخواست از پراکسی مورد اعتماد (127.0.0.1): IP کاربر از X-Forwarded-For خوانده می‌شود
        self.make_failures(5, HTTP_X_FORWARDED_FOR="203.0.113.7")
        self.assertEqual(self.login(HTTP_X_FORWARDED_FOR="203.0.113.7").status_code, 429)
        with patch("accounts.views.authenticate", return_value=None):
            self.assertEqual(self.login(HTTP_X_FORWARDED_FOR="203.0.113.8").status_code, 401)

    def test_forwarded_header_ignored_from_untrusted_source(self):
        # مهاجم مستقیم (غیر پراکسی) با هدر جعلی نمی‌تواند IP عوض کند
        self.make_failures(5, REMOTE_ADDR="198.51.100.9", HTTP_X_FORWARDED_FOR="1.1.1.1")
        res = self.login(REMOTE_ADDR="198.51.100.9", HTTP_X_FORWARDED_FOR="2.2.2.2")
        self.assertEqual(res.status_code, 429)

    def test_ipv4_mapped_ipv6_is_normalized(self):
        self.assertEqual(throttle._normalize_ip("::ffff:127.0.0.1"), "127.0.0.1")
        self.assertIsNone(throttle._normalize_ip("not-an-ip"))

    def test_password_reset_requests_are_limited_separately_from_login(self):
        body = '{"email":"someone@example.test"}'
        with patch("accounts.password_reset._fetch_user_by_email", return_value=None):
            statuses = [self.client.post(reverse("api-password-reset"), data=body, content_type="application/json").status_code for _ in range(5)]
            blocked = self.client.post(reverse("api-password-reset"), data=body, content_type="application/json")
        self.assertEqual(statuses, [200] * 5)
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(blocked["Retry-After"], "300")
        with patch("accounts.views.authenticate", return_value=None):
            self.assertEqual(self.login().status_code, 401)  # شمارنده‌ی ورود جداست و مسدود نشده
