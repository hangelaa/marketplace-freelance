"""داده‌های مرجع: فهرست دسته‌بندی‌ها و مهارت‌ها (از دیتابیس) و بررسی وجود شناسه‌ها."""
from .common import ApiError, endpoint, fetch_all, placeholders


# ============================================================ بررسی شناسه‌ها
def _check_ids_exist(field, label, table, column, ids):
    """اگر یکی از شناسه‌ها در جدول مرجع نباشد، خطای ۴۰۰ برای همان فیلد می‌دهد."""
    if not ids:
        return
    found = {row["id"] for row in fetch_all(f"SELECT {column} AS id FROM {table} WHERE {column} IN ({placeholders(ids)})", ids)}
    if found != set(ids):
        raise ApiError(400, "اطلاعات واردشده نامعتبر است.", {field: f"{label} انتخاب‌شده معتبر نیست."})


def check_categories_exist(ids):
    _check_ids_exist("category_ids", "دسته‌بندی", "dbo.Categories", "CategoryID", ids)


def check_skills_exist(ids, field="skill_ids"):
    _check_ids_exist(field, "مهارت", "dbo.Skills", "SkillID", ids)


# ============================================================ ویوها
@endpoint("GET")
def categories(request):
    rows = fetch_all("SELECT CategoryID AS id, CategoryName AS name FROM dbo.Categories ORDER BY CategoryName")
    return {"results": rows}


@endpoint("GET")
def skills(request):
    rows = fetch_all("SELECT SkillID AS id, SkillName AS name FROM dbo.Skills ORDER BY SkillName")
    return {"results": rows}
