"""
ابزارهای مشترک API بازار کار: دسترسی به SQL، اعتبارسنجی ورودی و مدیریت خطا.
فایل‌های دیگر این اپ (catalog, projects, proposals, profile) فقط از همین ماژول کمک می‌گیرند.
"""
import json
import logging
from datetime import date
from decimal import Decimal, InvalidOperation
from functools import wraps

from django.db import DatabaseError, connection
from django.http import HttpResponse, JsonResponse
from django.utils import timezone

logger = logging.getLogger(__name__)

MAX_DECIMAL = Decimal("9999999999.99")  # سقف ستون‌های DECIMAL(12,2)
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50


# ============================================================ خطا و پاسخ
class ApiError(Exception):
    """خطای قابل نمایش به کاربر؛ status کد HTTP و fields خطای هر فیلد فرم است."""

    def __init__(self, status, message, fields=None):
        super().__init__(message)
        self.status = status
        self.message = message
        self.fields = fields


def error_response(status, message, fields=None):
    body = {"error": message}
    if fields:
        body["fields"] = fields
    return JsonResponse(body, status=status)


def endpoint(*methods):
    """
    دکوراتور مشترک همه‌ی ویوها:
    متد HTTP را چک می‌کند، ورود کاربر را الزامی می‌کند، خروجی dict را به JSON تبدیل می‌کند
    و خطاها (ApiError و خطای دیتابیس) را به پاسخ JSON مناسب تبدیل می‌کند.
    ویو می‌تواند dict یا (dict, status) برگرداند.
    """

    def decorator(view):
        @wraps(view)
        def wrapper(request, *args, **kwargs):
            if request.method not in methods:
                return error_response(405, "متد درخواست مجاز نیست.")
            if not request.user.is_authenticated:
                return error_response(401, "ابتدا وارد شوید.")
            try:
                result = view(request, *args, **kwargs)
            except ApiError as exc:
                return error_response(exc.status, exc.message, exc.fields)
            except DatabaseError:
                # مثلاً تریگر یا قید دیتابیس در شرایط رقابتی جلوی عملیات را گرفته است
                logger.exception("Database rule rejected the operation")
                return error_response(409, "عملیات با قوانین پایگاه داده سازگار نیست. دوباره تلاش کنید.")
            if isinstance(result, HttpResponse):
                return result
            data, status = result if isinstance(result, tuple) else (result, 200)
            return JsonResponse(data, status=status)

        return wrapper

    return decorator


def read_json(request):
    """بدنه‌ی JSON درخواست را می‌خواند (باید یک شیء باشد)."""
    try:
        data = json.loads(request.body or b"{}")
    except (ValueError, UnicodeDecodeError):
        raise ApiError(400, "درخواست نامعتبر است.")
    if not isinstance(data, dict):
        raise ApiError(400, "درخواست نامعتبر است.")
    return data


def read_page(request):
    """پارامترهای page و page_size را می‌خواند و در بازه‌ی مجاز نگه می‌دارد."""
    try:
        page = max(1, int(request.GET.get("page", 1)))
        page_size = int(request.GET.get("page_size", DEFAULT_PAGE_SIZE))
    except ValueError:
        raise ApiError(400, "پارامتر صفحه‌بندی نامعتبر است.")
    return page, min(max(1, page_size), MAX_PAGE_SIZE)


# ============================================================ دسترسی به SQL
# همه‌ی کوئری‌ها پارامتری هستند (%s)؛ مقدار کاربر هرگز داخل متن SQL قرار نمی‌گیرد.
def _rows(cursor):
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def fetch_all(sql, params=()):
    with connection.cursor() as cursor:
        cursor.execute(sql, list(params))
        return _rows(cursor)


def fetch_one(sql, params=()):
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def execute(sql, params=()):
    """دستور INSERT/UPDATE/DELETE را اجرا می‌کند و تعداد ردیف‌های تغییرکرده را برمی‌گرداند."""
    with connection.cursor() as cursor:
        cursor.execute(sql, list(params))
        return cursor.rowcount


def insert(sql, params=()):
    """
    یک ردیف درج می‌کند و شناسه‌ی جدید را برمی‌گرداند.
    از SCOPE_IDENTITY استفاده می‌کنیم، نه OUTPUT، چون جدول‌های ما تریگر دارند
    و SQL Server اجازه‌ی OUTPUT روی جدول دارای تریگر را نمی‌دهد.
    """
    with connection.cursor() as cursor:
        if connection.vendor == "microsoft":
            cursor.execute(f"SET NOCOUNT ON; {sql}; SELECT CAST(SCOPE_IDENTITY() AS INT)", list(params))
            return cursor.fetchone()[0]
        cursor.execute(sql, list(params))  # SQLite (فقط در تست‌ها)
        return cursor.lastrowid


def paginate(sql, params, page, page_size):
    """به کوئری (که باید ORDER BY داشته باشد) صفحه‌بندی اضافه می‌کند."""
    offset = (page - 1) * page_size
    if connection.vendor == "microsoft":
        return f"{sql} OFFSET %s ROWS FETCH NEXT %s ROWS ONLY", [*params, offset, page_size]
    return f"{sql} LIMIT %s OFFSET %s", [*params, page_size, offset]


def lock_hint():
    """قفل ردیف تا پایان تراکنش (جلوگیری از پذیرش همزمان دو پیشنهاد)؛ فقط SQL Server."""
    return "WITH (UPDLOCK, HOLDLOCK)" if connection.vendor == "microsoft" else ""


def placeholders(values):
    return ", ".join(["%s"] * len(values))


def escape_like(text):
    """کاراکترهای خاص LIKE را خنثی می‌کند تا جستجوی کاربر فقط متن ساده باشد."""
    for char in ("\\", "%", "_", "["):
        text = text.replace(char, "\\" + char)
    return text


def money_str(value):
    """مبلغ را به رشته‌ی دو رقم اعشار تبدیل می‌کند (برای JSON بدون خطای اعشار)."""
    return None if value is None else str(Decimal(str(value)).quantize(Decimal("0.01")))


# ============================================================ نقش‌ها
def is_regular_user(request):
    row = fetch_one("SELECT UserType FROM dbo.Users WHERE UserID = %s", [request.user.pk])
    return bool(row) and row["UserType"] == "Regular"


def require_regular_user(request):
    """حساب Admin اجازه‌ی ثبت پروژه یا پیشنهاد (و داشتن پروفایل) ندارد."""
    if not is_regular_user(request):
        raise ApiError(403, "حساب ادمین مجاز به انجام این عملیات نیست.")


# ============================================================ اعتبارسنجی فرم
class Form:
    """
    اعتبارسنجی فیلد به فیلد؛ خطاها جمع می‌شوند و با check() یکجا برمی‌گردند.
    هر متد مقدار تمیزشده را برمی‌گرداند.
    """

    def __init__(self, data):
        self.data = data
        self.errors = {}

    def _fail(self, name, message):
        self.errors.setdefault(name, message)  # فقط اولین خطای هر فیلد

    def _value(self, name):
        value = self.data.get(name)
        return None if isinstance(value, str) and not value.strip() else value

    def text(self, name, label, max_length, required=True):
        value = self._value(name)
        if value is None:
            if required:
                self._fail(name, f"{label} را وارد کنید.")
            return None
        if not isinstance(value, str):
            self._fail(name, f"{label} نامعتبر است.")
            return None
        value = value.strip()
        if len(value) > max_length:
            self._fail(name, f"{label} نباید بیش از {max_length} کاراکتر باشد.")
        return value

    def choice(self, name, label, allowed):
        value = self._value(name)
        if value not in allowed:
            self._fail(name, f"{label} نامعتبر است.")
            return None
        return value

    def positive_decimal(self, name, label, required=True):
        value = self._value(name)
        if value is None or isinstance(value, bool):
            if required or isinstance(value, bool):
                self._fail(name, f"{label} را وارد کنید.")
            return None
        try:
            number = Decimal(str(value).strip())
        except InvalidOperation:
            self._fail(name, f"{label} باید عدد باشد.")
            return None
        if not number.is_finite() or number <= 0:
            self._fail(name, f"{label} باید بیشتر از صفر باشد.")
            return None
        if number > MAX_DECIMAL:
            self._fail(name, f"{label} بیش از حد بزرگ است.")
            return None
        return number.quantize(Decimal("0.01"))

    def positive_int(self, name, label, required=True):
        value = self._value(name)
        if value is None:
            if required:
                self._fail(name, f"{label} را وارد کنید.")
            return None
        if isinstance(value, bool) or not isinstance(value, int) or not 0 < value <= 100000:
            self._fail(name, f"{label} باید عدد صحیح مثبت باشد.")
            return None
        return value

    def future_date(self, name, label, required=False):
        value = self._value(name)
        if value is None:
            if required:
                self._fail(name, f"{label} را وارد کنید.")
            return None
        try:
            parsed = date.fromisoformat(value)
        except (TypeError, ValueError):
            self._fail(name, f"{label} باید به شکل YYYY-MM-DD باشد.")
            return None
        if parsed < timezone.localdate():
            self._fail(name, f"{label} نمی‌تواند در گذشته باشد.")
        return parsed

    def id_list(self, name, label):
        """لیست شناسه‌های یکتا (مثلاً category_ids)؛ نبودن فیلد = لیست خالی."""
        value = self.data.get(name, [])
        valid = isinstance(value, list) and all(
            isinstance(item, int) and not isinstance(item, bool) and item > 0 for item in value
        )
        if not valid:
            self._fail(name, f"{label} نامعتبر است.")
            return []
        return list(dict.fromkeys(value))

    def check(self):
        if self.errors:
            raise ApiError(400, "اطلاعات واردشده نامعتبر است.", self.errors)
