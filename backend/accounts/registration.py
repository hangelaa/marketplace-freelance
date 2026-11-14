"""
ثبت‌نام کاربر جدید (POST /api/auth/register/).
این فایل جدید است و به views.py و auth.py موجود دست نمی‌زند؛ از ابزارهای آن‌ها استفاده می‌کند.
"""
from types import SimpleNamespace

from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from .auth import _user_from_row

from .views import _payload  # همان تابع خواندن JSON که ورود هم استفاده می‌کند

EMAIL_PATTERN_ERROR = "ایمیل نامعتبر است."


def _fetch_user_by_email(email):
    """کاربر را با ایمیل از dbo.Users می‌خواند (یا None)."""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT UserID, Email, FirstName, LastName, PasswordHash, AccountStatus "
            "FROM dbo.Users WHERE Email = %s",
            [email],
        )
        row = cursor.fetchone()
    return _user_from_row(row) if row else None


def _password_error(password, email="", first_name="", last_name=""):
    """قوانین AUTH_PASSWORD_VALIDATORS را اجرا می‌کند؛ متن خطا یا None برمی‌گرداند."""
    candidate = SimpleNamespace(email=email, first_name=first_name, last_name=last_name, username=email)
    try:
        validate_password(password, user=candidate)
    except ValidationError as exc:
        return " ".join(exc.messages)
    return None


def _clean_email(value):
    """ایمیل را تمیز و کوچک‌حرف می‌کند؛ اگر معتبر نبود None."""
    import re

    if not isinstance(value, str):
        return None
    value = value.strip().lower()
    if len(value) > 255 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
        return None
    return value


@require_POST
def api_register(request):
    """POST /api/auth/register/ ← بدنه: {fullName, email, password}"""
    data = _payload(request)
    if data is None:
        return JsonResponse({"error": "درخواست نامعتبر است."}, status=400)

    full_name = data.get("fullName")
    password = data.get("password")
    email = _clean_email(data.get("email"))
    if not isinstance(full_name, str) or not full_name.strip():
        return JsonResponse({"error": "نام و نام خانوادگی را وارد کنید."}, status=400)
    if email is None:
        return JsonResponse({"error": EMAIL_PATTERN_ERROR}, status=400)
    if not isinstance(password, str) or not password or len(password) > 1024:
        return JsonResponse({"error": "رمز عبور را وارد کنید."}, status=400)

    # جدول Users نام و نام‌خانوادگی را جدا ذخیره می‌کند: اولین کلمه = نام، بقیه = نام خانوادگی
    parts = full_name.strip().split(None, 1)
    first_name = parts[0]
    last_name = parts[1].strip() if len(parts) > 1 else ""
    if len(first_name) > 100 or len(last_name) > 100:
        return JsonResponse({"error": "نام یا نام خانوادگی بیش از حد طولانی است."}, status=400)

    error = _password_error(password, email, first_name, last_name)
    if error:
        return JsonResponse({"error": error}, status=400)

    if _fetch_user_by_email(email) is not None:
        return JsonResponse({"error": "این ایمیل قبلاً ثبت شده است."}, status=409)

    try:
        with connection.cursor() as cursor:
            # AccountStatus, UserType, CreatedAt, UpdatedAt مقدار پیش‌فرض خود دیتابیس را می‌گیرند
            cursor.execute(
                "INSERT INTO dbo.Users (FirstName, LastName, Email, PasswordHash) VALUES (%s, %s, %s, %s)",
                [first_name, last_name, email, make_password(password)],  # فقط هش PBKDF2 ذخیره می‌شود
            )
    except IntegrityError:
        # دو ثبت‌نام همزمان با یک ایمیل: قید UNIQUE دیتابیس جلوی دومی را می‌گیرد
        return JsonResponse({"error": "این ایمیل قبلاً ثبت شده است."}, status=409)

    return JsonResponse({"ok": True, "next": "/login/"}, status=201)


