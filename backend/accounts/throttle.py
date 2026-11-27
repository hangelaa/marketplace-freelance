"""
محدودیت تلاش ناموفق ورود برای هر IP.
قانون: حداکثر ۵ ورود ناموفق در ۵ دقیقه؛ از تلاش بعدی تا آزاد شدن محدودیت، پاسخ 429 داده می‌شود.
شمارنده‌ها در cache جنگو (حافظه‌ی همین سرور) نگه داشته می‌شوند.
"""
import ipaddress
import math
import threading
import time

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse

# قفل: دو درخواست همزمان نباید لیست تلاش‌ها را با هم خراب کنند
_lock = threading.Lock()


def _max_attempts():
    return int(getattr(settings, "LOGIN_RATE_LIMIT_ATTEMPTS", 5))


def _window():
    return int(getattr(settings, "LOGIN_RATE_LIMIT_WINDOW_SECONDS", 300))


def _now():
    return time.time()  # جدا نوشته شده تا در تست‌ها بشود زمان را جعل کرد


def _normalize_ip(value):
    """متن IP را استاندارد می‌کند (مثلاً ::ffff:127.0.0.1 → 127.0.0.1)؛ اگر IP معتبر نبود None."""
    try:
        ip = ipaddress.ip_address(str(value).strip())
    except ValueError:
        return None
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return str(ip)


def _is_trusted_proxy(ip):
    """آیا درخواست مستقیماً از یک پراکسی مورد اعتماد (مثل سرور Next.js) آمده؟"""
    networks = getattr(settings, "TRUSTED_PROXY_NETWORKS", ["127.0.0.1/32", "::1/128"])
    address = ipaddress.ip_address(ip)
    return any(address in ipaddress.ip_network(net, strict=False) for net in networks)


def get_client_ip(request):
    """
    IP واقعی کاربر. فرانت (Next.js) همه‌ی درخواست‌ها را به Django می‌رساند، پس REMOTE_ADDR
    همیشه آدرس خود Next است. فقط اگر درخواست از یک پراکسی مورد اعتماد آمده باشد،
    IP کاربر را از هدر X-Forwarded-For (آخرین مقدار) می‌خوانیم؛ وگرنه هدر نادیده گرفته می‌شود
    تا کسی با جعل هدر نتواند محدودیت را دور بزند.
    """
    remote = _normalize_ip(request.META.get("REMOTE_ADDR", "")) or "0.0.0.0"
    if _is_trusted_proxy(remote):
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
        parts = [part.strip() for part in forwarded.split(",") if part.strip()]
        if parts:
            candidate = _normalize_ip(parts[-1])
            if candidate:
                return candidate
    return remote


def _key(scope, ip):
    return f"{scope}-failures:{ip}"  # هر scope (login, password-reset) شمارنده‌ی جدا دارد


def _recent_failures(scope, ip, now):
    """زمان تلاش‌های این IP در پنجره‌ی اخیر (قدیمی‌ترها حذف می‌شوند)."""
    window = _window()
    return [stamp for stamp in cache.get(_key(scope, ip), []) if now - stamp < window]


def blocked_seconds(ip, scope="login"):
    """اگر IP مسدود است، تعداد ثانیه‌ی باقی‌مانده؛ وگرنه 0."""
    now = _now()
    recent = _recent_failures(scope, ip, now)
    limit = _max_attempts()
    if len(recent) < limit:
        return 0
    # وقتی قدیمی‌ترین تلاش‌های اضافه از پنجره خارج شوند، IP دوباره آزاد می‌شود
    release_at = recent[len(recent) - limit] + _window()
    return max(1, math.ceil(release_at - now))


def record_failure(ip, scope="login"):
    """یک تلاش برای این IP ثبت می‌کند (در ورود: تلاش ناموفق، در بازیابی رمز: هر درخواست)."""
    with _lock:
        now = _now()
        recent = _recent_failures(scope, ip, now)
        recent.append(now)
        # فقط آخرین N مورد لازم است؛ حافظه‌ی هر IP محدود می‌ماند
        cache.set(_key(scope, ip), recent[-_max_attempts():], timeout=_window())


record_attempt = record_failure  # نام عمومی‌تر برای استفاده در بازیابی رمز


def _to_persian_digits(value):
    return str(value).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))


def too_many_requests_response(seconds, subject="تلاش‌های ناموفق ورود"):
    """پاسخ 429 با پیام فارسی، هدر استاندارد Retry-After و مقدار retry_after برای فرانت."""
    minutes = math.ceil(seconds / 60)
    response = JsonResponse(
        {
            "error": f"تعداد {subject} بیش از حد مجاز است. لطفاً {_to_persian_digits(minutes)} دقیقه‌ی دیگر دوباره تلاش کنید.",
            "retry_after": seconds,
        },
        status=429,
    )
    response["Retry-After"] = str(seconds)
    return response
