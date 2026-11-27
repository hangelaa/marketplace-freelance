"""
پروژه‌ها: فهرست و جستجو، جزئیات، ساخت، ویرایش، انتشار و «پروژه‌های من».
ساختار فایل: ثابت‌ها ← دسترسی به داده ← اعتبارسنجی ← ویوها.
"""
from django.db import transaction

from .catalog import check_categories_exist, check_skills_exist
from .common import (
    ApiError, Form, endpoint, escape_like, execute, fetch_all, fetch_one, insert,
    is_regular_user, money_str, paginate, placeholders, read_json, read_page, require_regular_user,
)

PRICING_TYPES = ("Fixed", "Hourly")
EDITABLE_STATUSES = ("Draft", "Open")  # فقط در این وضعیت‌ها مالک می‌تواند پروژه را ویرایش کند

PROJECT_SELECT = """
    SELECT p.ProjectID, p.EmployerID, p.Title, p.Description, p.PricingType, p.FixedBudget, p.HourlyRate,
           p.ProjectStatus, p.Deadline, p.CreatedAt, p.UpdatedAt, u.FirstName, u.LastName
    FROM dbo.Projects p
    JOIN dbo.Users u ON u.UserID = p.EmployerID
"""


# ============================================================ دسترسی به داده
def get_project_or_404(project_id):
    row = fetch_one(f"{PROJECT_SELECT} WHERE p.ProjectID = %s", [project_id])
    if row is None:
        raise ApiError(404, "پروژه یافت نشد.")
    return row


def get_owned_project(request, project_id):
    """پروژه را برمی‌گرداند، به شرط اینکه کاربر فعلی مالکش باشد."""
    row = get_project_or_404(project_id)
    if row["EmployerID"] != request.user.pk:
        if row["ProjectStatus"] == "Draft":
            raise ApiError(404, "پروژه یافت نشد.")  # وجود پیش‌نویس دیگران لو نمی‌رود
        raise ApiError(403, "فقط مالک پروژه مجاز به این عملیات است.")
    return row


def load_tags(project_ids):
    """دسته‌بندی‌ها و مهارت‌های چند پروژه را با دو کوئری می‌گیرد (نه یک کوئری برای هر پروژه)."""
    tags = {project_id: {"categories": [], "skills": []} for project_id in project_ids}
    if not project_ids:
        return tags
    marks = placeholders(project_ids)
    for row in fetch_all(
        f"""SELECT pc.ProjectID, c.CategoryID AS id, c.CategoryName AS name
            FROM dbo.ProjectCategories pc JOIN dbo.Categories c ON c.CategoryID = pc.CategoryID
            WHERE pc.ProjectID IN ({marks}) ORDER BY c.CategoryName""", project_ids):
        tags[row["ProjectID"]]["categories"].append({"id": row["id"], "name": row["name"]})
    for row in fetch_all(
        f"""SELECT ps.ProjectID, s.SkillID AS id, s.SkillName AS name
            FROM dbo.ProjectSkills ps JOIN dbo.Skills s ON s.SkillID = ps.SkillID
            WHERE ps.ProjectID IN ({marks}) ORDER BY s.SkillName""", project_ids):
        tags[row["ProjectID"]]["skills"].append({"id": row["id"], "name": row["name"]})
    return tags


def save_tags(project_id, category_ids, skill_ids):
    """دسته‌بندی‌ها و مهارت‌های پروژه را با مقدار جدید جایگزین می‌کند (داخل تراکنش صدا زده شود)."""
    execute("DELETE FROM dbo.ProjectCategories WHERE ProjectID = %s", [project_id])
    execute("DELETE FROM dbo.ProjectSkills WHERE ProjectID = %s", [project_id])
    for category_id in category_ids:
        execute("INSERT INTO dbo.ProjectCategories (ProjectID, CategoryID) VALUES (%s, %s)", [project_id, category_id])
    for skill_id in skill_ids:
        execute("INSERT INTO dbo.ProjectSkills (ProjectID, SkillID) VALUES (%s, %s)", [project_id, skill_id])


def budget_of(row):
    return row["FixedBudget"] if row["PricingType"] == "Fixed" else row["HourlyRate"]


def project_json(row, tags, viewer_id):
    return {
        "id": row["ProjectID"],
        "title": row["Title"],
        "description": row["Description"],
        "pricing_type": row["PricingType"],
        "budget": money_str(budget_of(row)),  # بودجه‌ی ثابت یا نرخ ساعتی، بسته به pricing_type
        "status": row["ProjectStatus"],
        "deadline": row["Deadline"],
        "created_at": row["CreatedAt"],
        "updated_at": row["UpdatedAt"],
        "owner": {"id": row["EmployerID"], "name": f"{row['FirstName']} {row['LastName']}".strip()},
        "is_owner": row["EmployerID"] == viewer_id,
        "categories": tags["categories"],
        "skills": tags["skills"],
    }


def project_response(project_id, viewer_id):
    row = get_project_or_404(project_id)
    return project_json(row, load_tags([project_id])[project_id], viewer_id)


# ============================================================ اعتبارسنجی
def parse_project_form(data):
    """فیلدهای فرم ساخت/ویرایش را اعتبارسنجی می‌کند و مقادیر تمیزشده را برمی‌گرداند."""
    form = Form(data)
    budget_label = "نرخ ساعتی" if data.get("pricing_type") == "Hourly" else "بودجه"
    cleaned = {
        "title": form.text("title", "عنوان پروژه", 200),
        "description": form.text("description", "توضیحات پروژه", 20000),
        "pricing_type": form.choice("pricing_type", "نوع قیمت‌گذاری", PRICING_TYPES),
        "budget": form.positive_decimal("budget", budget_label),
        "deadline": form.future_date("deadline", "مهلت تحویل"),
        "category_ids": form.id_list("category_ids", "دسته‌بندی‌ها"),
        "skill_ids": form.id_list("skill_ids", "مهارت‌ها"),
    }
    form.check()
    check_categories_exist(cleaned["category_ids"])
    check_skills_exist(cleaned["skill_ids"])
    return cleaned


def require_complete_for_open(category_ids, skill_ids):
    """پروژه‌ی Open باید حداقل یک دسته‌بندی و یک مهارت داشته باشد."""
    fields = {}
    if not category_ids:
        fields["category_ids"] = "حداقل یک دسته‌بندی انتخاب کنید."
    if not skill_ids:
        fields["skill_ids"] = "حداقل یک مهارت انتخاب کنید."
    if fields:
        raise ApiError(400, "برای انتشار پروژه، اطلاعات الزامی را تکمیل کنید.", fields)


def price_columns(cleaned):
    """بودجه‌ی ثابت یا نرخ ساعتی؛ دیگری باید NULL باشد (قید CHECK دیتابیس)."""
    fixed = cleaned["budget"] if cleaned["pricing_type"] == "Fixed" else None
    hourly = cleaned["budget"] if cleaned["pricing_type"] == "Hourly" else None
    return fixed, hourly


# ============================================================ ویوها
@endpoint("GET", "POST")
def projects_collection(request):
    if request.method == "POST":
        return create_project(request)
    return list_projects(request)


def list_projects(request):
    """GET /api/projects/?q=&category=&page=&page_size= ← فقط پروژه‌های Open."""
    conditions, params = ["p.ProjectStatus = 'Open'"], []
    search = request.GET.get("q", "").strip()
    if search:
        pattern = f"%{escape_like(search)}%"
        conditions.append("(p.Title LIKE %s ESCAPE '\\' OR p.Description LIKE %s ESCAPE '\\')")
        params += [pattern, pattern]
    if request.GET.get("category"):
        try:
            category_id = int(request.GET["category"])
        except ValueError:
            raise ApiError(400, "دسته‌بندی نامعتبر است.")
        conditions.append("EXISTS (SELECT 1 FROM dbo.ProjectCategories pc WHERE pc.ProjectID = p.ProjectID AND pc.CategoryID = %s)")
        params.append(category_id)

    where = " AND ".join(conditions)
    page, page_size = read_page(request)
    total = fetch_one(f"SELECT COUNT(*) AS total FROM dbo.Projects p WHERE {where}", params)["total"]
    sql, page_params = paginate(f"{PROJECT_SELECT} WHERE {where} ORDER BY p.CreatedAt DESC, p.ProjectID DESC", params, page, page_size)
    rows = fetch_all(sql, page_params)
    tags = load_tags([row["ProjectID"] for row in rows])
    return {
        "results": [project_json(row, tags[row["ProjectID"]], request.user.pk) for row in rows],
        "page": page, "page_size": page_size, "total": total,
    }


@endpoint("GET", "PUT")
def project_detail(request, project_id):
    if request.method == "PUT":
        return update_project(request, project_id)

    row = get_project_or_404(project_id)
    viewer_id = request.user.pk
    is_owner = row["EmployerID"] == viewer_id
    if row["ProjectStatus"] == "Draft" and not is_owner:
        raise ApiError(404, "پروژه یافت نشد.")  # پیش‌نویس فقط برای مالک دیده می‌شود

    data = project_json(row, load_tags([project_id])[project_id], viewer_id)
    my_proposal = fetch_one(
        "SELECT ProposalID AS id, ProposalStatus AS status FROM dbo.Proposals WHERE ProjectID = %s AND FreelancerID = %s",
        [project_id, viewer_id],
    )
    data["my_proposal"] = my_proposal
    # فرانت با این فلگ تصمیم می‌گیرد دکمه‌ی «ارسال پیشنهاد» را نشان بدهد (بک‌اند در هر حال خودش دوباره چک می‌کند)
    data["can_submit_proposal"] = row["ProjectStatus"] == "Open" and not is_owner and my_proposal is None and is_regular_user(request)
    data["can_edit"] = is_owner and row["ProjectStatus"] in EDITABLE_STATUSES
    if is_owner:
        data["proposal_count"] = fetch_one("SELECT COUNT(*) AS total FROM dbo.Proposals WHERE ProjectID = %s", [project_id])["total"]
    return data


def create_project(request):
    """POST /api/projects/ ← بدنه‌ی فرم + publish (true = Open، وگرنه Draft)."""
    require_regular_user(request)
    data = read_json(request)
    cleaned = parse_project_form(data)
    publish = data.get("publish") is True
    if publish:
        require_complete_for_open(cleaned["category_ids"], cleaned["skill_ids"])

    fixed, hourly = price_columns(cleaned)
    with transaction.atomic():  # پروژه و دسته‌ها و مهارت‌ها یا همه ذخیره می‌شوند یا هیچ‌کدام
        project_id = insert(
            """INSERT INTO dbo.Projects (EmployerID, Title, Description, PricingType, FixedBudget, HourlyRate, ProjectStatus, Deadline)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            [request.user.pk, cleaned["title"], cleaned["description"], cleaned["pricing_type"], fixed, hourly,
             "Open" if publish else "Draft", cleaned["deadline"]],
        )
        save_tags(project_id, cleaned["category_ids"], cleaned["skill_ids"])
    return project_response(project_id, request.user.pk), 201


def update_project(request, project_id):
    """PUT /api/projects/<id>/ ← ویرایش توسط مالک (فقط Draft و Open)."""
    require_regular_user(request)
    row = get_owned_project(request, project_id)
    if row["ProjectStatus"] not in EDITABLE_STATUSES:
        raise ApiError(409, "پروژه در این وضعیت قابل ویرایش نیست.")

    cleaned = parse_project_form(read_json(request))
    if row["ProjectStatus"] == "Open":
        require_complete_for_open(cleaned["category_ids"], cleaned["skill_ids"])

    price_changed = cleaned["pricing_type"] != row["PricingType"] or money_str(cleaned["budget"]) != money_str(budget_of(row))
    has_proposals = fetch_one("SELECT COUNT(*) AS total FROM dbo.Proposals WHERE ProjectID = %s", [project_id])["total"] > 0
    if price_changed and has_proposals:
        raise ApiError(409, "پس از دریافت پیشنهاد، قیمت پروژه قابل تغییر نیست.", {"budget": "قیمت قفل شده است."})

    fixed, hourly = price_columns(cleaned)
    with transaction.atomic():
        execute(
            """UPDATE dbo.Projects SET Title = %s, Description = %s, PricingType = %s, FixedBudget = %s,
                      HourlyRate = %s, Deadline = %s, UpdatedAt = SYSDATETIME()
               WHERE ProjectID = %s""",
            [cleaned["title"], cleaned["description"], cleaned["pricing_type"], fixed, hourly, cleaned["deadline"], project_id],
        )
        save_tags(project_id, cleaned["category_ids"], cleaned["skill_ids"])
    return project_response(project_id, request.user.pk)


@endpoint("POST")
def publish_project(request, project_id):
    """POST /api/projects/<id>/publish/ ← انتشار پیش‌نویس (Draft → Open)."""
    require_regular_user(request)
    row = get_owned_project(request, project_id)
    if row["ProjectStatus"] != "Draft":
        raise ApiError(409, "فقط پروژه‌ی پیش‌نویس قابل انتشار است.")

    tags = load_tags([project_id])[project_id]
    require_complete_for_open(tags["categories"], tags["skills"])
    changed = execute(
        "UPDATE dbo.Projects SET ProjectStatus = 'Open', UpdatedAt = SYSDATETIME() WHERE ProjectID = %s AND ProjectStatus = 'Draft'",
        [project_id],
    )
    if not changed:
        raise ApiError(409, "وضعیت پروژه در همین لحظه تغییر کرد.")
    return project_response(project_id, request.user.pk)


@endpoint("GET")
def my_projects(request):
    """GET /api/my/projects/ ← پروژه‌های خود کاربر با تعداد پیشنهادها."""
    require_regular_user(request)
    rows = fetch_all(
        """SELECT p.ProjectID, p.Title, p.PricingType, p.FixedBudget, p.HourlyRate, p.ProjectStatus, p.Deadline, p.CreatedAt,
                  (SELECT COUNT(*) FROM dbo.Proposals x WHERE x.ProjectID = p.ProjectID) AS ProposalCount,
                  (SELECT COUNT(*) FROM dbo.Proposals x WHERE x.ProjectID = p.ProjectID AND x.ProposalStatus = 'Pending') AS PendingCount
           FROM dbo.Projects p WHERE p.EmployerID = %s
           ORDER BY p.CreatedAt DESC, p.ProjectID DESC""",
        [request.user.pk],
    )
    return {
        "results": [
            {
                "id": row["ProjectID"],
                "title": row["Title"],
                "pricing_type": row["PricingType"],
                "budget": money_str(budget_of(row)),
                "status": row["ProjectStatus"],
                "deadline": row["Deadline"],
                "created_at": row["CreatedAt"],
                "proposal_count": row["ProposalCount"],
                "pending_proposal_count": row["PendingCount"],
                "can_edit": row["ProjectStatus"] in EDITABLE_STATUSES,
                "can_publish": row["ProjectStatus"] == "Draft",
            }
            for row in rows
        ]
    }
