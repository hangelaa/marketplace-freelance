"""
بازیابی رمز عبور (POST /api/auth/password-reset/ و /api/auth/password-reset-confirm/).
فایل جدید؛ از ابزارهای registration.py و auth.py استفاده می‌کند.
"""
import logging

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.db import connection
from django.http import JsonResponse
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.http import require_POST

from .auth import MarketplaceAuthBackend
from .registration import EMAIL_PATTERN_ERROR, _clean_email, _fetch_user_by_email, _password_error
from .views import _payload

logger = logging.getLogger(__name__)

RESET_REQUEST_MESSAGE = "اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی رمز عبور برای آن ارسال شد."
INVALID_LINK_MESSAGE = "لینک بازیابی نامعتبر است یا منقضی شده است."


class ResetTokenGenerator(PasswordResetTokenGenerator):
    """
    توکن بازیابی زمان‌دار. مولد پیش‌فرض جنگو به مدل User استاندارد نیاز دارد،
    ولی کاربر ما یک dataclass است؛ پس فقط فیلدهای لازم را در هش توکن می‌گذاریم.
    چون هش رمز داخل توکن است، بعد از تغییر رمز توکن خودکار باطل می‌شود (یک‌بار مصرف).
    """

    def _make_hash_value(self, user, timestamp):
        return f"{user.user_id}{user.password_hash}{timestamp}{user.email}"


token_generator = ResetTokenGenerator()


@require_POST
def api_password_reset(request):
    """POST /api/auth/password-reset/ ← بدنه: {email}. همیشه پاسخ یکسان می‌دهد."""
    data = _payload(request)
    if data is None:
        return JsonResponse({"error": "درخواست نامعتبر است."}, status=400)
    email = _clean_email(data.get("email"))
    if email is None:
        return JsonResponse({"error": EMAIL_PATTERN_ERROR}, status=400)

    user = _fetch_user_by_email(email)
    if user is not None and user.is_active:
        uid = urlsafe_base64_encode(force_bytes(user.user_id))
        token = token_generator.make_token(user)
        link = f"{settings.FRONTEND_ORIGIN}/reset-password/?uid={uid}&token={token}"
        try:
            send_mail(
                subject="بازیابی رمز عبور",
                message=(
                    "برای تعیین رمز عبور جدید روی لینک زیر کلیک کنید:\n"
                    f"{link}\n\n"
                    "این لینک ۱ ساعت اعتبار دارد و فقط یک‌بار قابل استفاده است. "
                    "اگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
            )
        except Exception:  # خطای ایمیل نباید وجود یا عدم وجود حساب را لو بدهد
            logger.exception("Failed to send password reset email")

    # چه حساب وجود داشته باشد چه نه، پاسخ دقیقاً یکی است
    return JsonResponse({"ok": True, "message": RESET_REQUEST_MESSAGE})


@require_POST
def api_password_reset_confirm(request):
    """POST /api/auth/password-reset-confirm/ ← بدنه: {uid, token, password}"""
    data = _payload(request)
    if data is None:
        return JsonResponse({"error": "درخواست نامعتبر است."}, status=400)
    uid, token, password = data.get("uid"), data.get("token"), data.get("password")
    if not all(isinstance(value, str) and value for value in (uid, token, password)) or len(password) > 1024:
        return JsonResponse({"error": INVALID_LINK_MESSAGE}, status=400)

    try:
        user_id = int(force_str(urlsafe_base64_decode(uid)))
    except (TypeError, ValueError, OverflowError):
        return JsonResponse({"error": INVALID_LINK_MESSAGE}, status=400)

    user = MarketplaceAuthBackend().get_user(user_id)  # فقط کاربر Active را برمی‌گرداند
    if user is None or not token_generator.check_token(user, token):
        return JsonResponse({"error": INVALID_LINK_MESSAGE}, status=400)

    error = _password_error(password, user.email, user.first_name, user.last_name)
    if error:
        return JsonResponse({"error": error}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE dbo.Users SET PasswordHash = %s, UpdatedAt = SYSDATETIME() WHERE UserID = %s",
            [make_password(password), user.user_id],
        )
    return JsonResponse({"ok": True, "next": "/login/"})
