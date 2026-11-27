"""
پیشنهادها: ارسال، «پیشنهادهای من»، انصراف، بررسی توسط کارفرما، پذیرش (اتمیک) و رد.
ساختار فایل: دسترسی به داده ← ویوهای فریلنسر ← ویوهای کارفرما.
"""
from django.db import IntegrityError, transaction

from .common import (
    ApiError, Form, endpoint, execute, fetch_all, fetch_one, insert, lock_hint, money_str,
    placeholders, read_json, require_regular_user,
)
from .projects import get_owned_project, get_project_or_404

PROPOSAL_SELECT = """
    SELECT pr.ProposalID, pr.ProjectID, pr.FreelancerID, pr.ProposedAmount, pr.CoverLetter, pr.EstimatedHours,
           pr.EstimatedDurationDays, pr.ProposalStatus, pr.CreatedAt
    FROM dbo.Proposals pr
"""


# ============================================================ دسترسی به داده
def proposal_json(row):
    return {
        "id": row["ProposalID"],
        "project_id": row["ProjectID"],
        "amount": money_str(row["ProposedAmount"]),  # مبلغ کل (Fixed) یا نرخ ساعتی (Hourly)
        "cover_letter": row["CoverLetter"],
        "estimated_hours": money_str(row["EstimatedHours"]),
        "estimated_days": row["EstimatedDurationDays"],
        "status": row["ProposalStatus"],
        "created_at": row["CreatedAt"],
    }


def get_proposal_or_404(proposal_id):
    row = fetch_one(f"{PROPOSAL_SELECT} WHERE pr.ProposalID = %s", [proposal_id])
    if row is None:
        raise ApiError(404, "پیشنهاد یافت نشد.")
    return row


def load_freelancer_skills(user_ids):
    skills = {user_id: [] for user_id in user_ids}
    if not user_ids:
        return skills
    for row in fetch_all(
        f"""SELECT us.UserID, s.SkillID AS id, s.SkillName AS name
            FROM dbo.UserSkills us JOIN dbo.Skills s ON s.SkillID = us.SkillID
            WHERE us.UserID IN ({placeholders(user_ids)}) ORDER BY s.SkillName""", user_ids):
        skills[row["UserID"]].append({"id": row["id"], "name": row["name"]})
    return skills


# ============================================================ فریلنسر
@endpoint("GET", "POST")
def project_proposals(request, project_id):
    """GET = بررسی پیشنهادهای دریافتی (کارفرما)، POST = ارسال پیشنهاد (فریلنسر)."""
    if request.method == "POST":
        return submit_proposal(request, project_id)
    return review_proposals(request, project_id)


def submit_proposal(request, project_id):
    """POST /api/projects/<id>/proposals/ ← ارسال پیشنهاد جدید (وضعیت Pending)."""
    require_regular_user(request)
    project = get_project_or_404(project_id)
    user_id = request.user.pk
    if project["EmployerID"] == user_id:
        raise ApiError(403, "نمی‌توانید برای پروژه‌ی خودتان پیشنهاد ثبت کنید.")
    if project["ProjectStatus"] != "Open":
        raise ApiError(409, "فقط برای پروژه‌های باز می‌توان پیشنهاد ثبت کرد.")
    # پیشنهاد Withdrawn هم سابقه محسوب می‌شود؛ پس هر وضعیتی مانع ثبت مجدد است
    if fetch_one("SELECT 1 AS found FROM dbo.Proposals WHERE ProjectID = %s AND FreelancerID = %s", [project_id, user_id]):
        raise ApiError(409, "برای این پروژه قبلاً پیشنهاد ثبت کرده‌اید.")

    hourly = project["PricingType"] == "Hourly"
    form = Form(read_json(request))
    amount = form.positive_decimal("amount", "نرخ پیشنهادی" if hourly else "مبلغ پیشنهادی")
    cover_letter = form.text("cover_letter", "توضیحات پیشنهاد", 10000)
    estimated_days = form.positive_int("estimated_days", "زمان تخمینی (روز)")
    estimated_hours = form.positive_decimal("estimated_hours", "ساعات تخمینی", required=False) if hourly else None
    form.check()

    try:
        proposal_id = insert(
            """INSERT INTO dbo.Proposals (ProjectID, FreelancerID, ProposedAmount, CoverLetter, EstimatedHours, EstimatedDurationDays, ProposalStatus)
               VALUES (%s, %s, %s, %s, %s, %s, 'Pending')""",
            [project_id, user_id, amount, cover_letter, estimated_hours, estimated_days],
        )
    except IntegrityError:  # دو ارسال همزمان: قید UNIQUE دیتابیس دومی را رد می‌کند
        raise ApiError(409, "برای این پروژه قبلاً پیشنهاد ثبت کرده‌اید.")
    return {"message": "پیشنهاد شما با موفقیت ثبت شد.", "proposal": proposal_json(get_proposal_or_404(proposal_id))}, 201


@endpoint("GET")
def my_proposals(request):
    """GET /api/my/proposals/ ← پیشنهادهایی که کاربر فرستاده است."""
    require_regular_user(request)
    rows = fetch_all(
        """SELECT pr.ProposalID, pr.ProjectID, pr.FreelancerID, pr.ProposedAmount, pr.CoverLetter, pr.EstimatedHours,
                  pr.EstimatedDurationDays, pr.ProposalStatus, pr.CreatedAt,
                  p.Title AS ProjectTitle, p.PricingType, p.ProjectStatus
           FROM dbo.Proposals pr JOIN dbo.Projects p ON p.ProjectID = pr.ProjectID
           WHERE pr.FreelancerID = %s ORDER BY pr.CreatedAt DESC, pr.ProposalID DESC""",
        [request.user.pk],
    )
    results = []
    for row in rows:
        item = proposal_json(row)
        item["project"] = {"id": row["ProjectID"], "title": row["ProjectTitle"],
                           "pricing_type": row["PricingType"], "status": row["ProjectStatus"]}
        item["can_withdraw"] = row["ProposalStatus"] == "Pending"
        results.append(item)
    return {"results": results}


@endpoint("POST")
def withdraw_proposal(request, proposal_id):
    """POST /api/proposals/<id>/withdraw/ ← انصراف از پیشنهاد Pending خودِ کاربر."""
    require_regular_user(request)
    row = get_proposal_or_404(proposal_id)
    if row["FreelancerID"] != request.user.pk:
        raise ApiError(404, "پیشنهاد یافت نشد.")  # پیشنهاد دیگران دیده نمی‌شود
    if row["ProposalStatus"] != "Pending":
        raise ApiError(409, "فقط پیشنهاد در انتظار بررسی قابل انصراف است.")
    changed = execute(
        "UPDATE dbo.Proposals SET ProposalStatus = 'Withdrawn' WHERE ProposalID = %s AND ProposalStatus = 'Pending'",
        [proposal_id],
    )
    if not changed:
        raise ApiError(409, "وضعیت پیشنهاد در همین لحظه تغییر کرد.")
    return {"message": "پیشنهاد شما پس گرفته شد.", "proposal": proposal_json(get_proposal_or_404(proposal_id))}


# ============================================================ کارفرما
def review_proposals(request, project_id):
    """GET /api/projects/<id>/proposals/ ← پیشنهادهای دریافتی (فقط مالک پروژه)."""
    require_regular_user(request)
    get_owned_project(request, project_id)
    rows = fetch_all(
        """SELECT pr.ProposalID, pr.ProjectID, pr.FreelancerID, pr.ProposedAmount, pr.CoverLetter, pr.EstimatedHours,
                  pr.EstimatedDurationDays, pr.ProposalStatus, pr.CreatedAt,
                  u.FirstName, u.LastName, up.ProfessionalTitle, up.Bio, up.Location
           FROM dbo.Proposals pr
           JOIN dbo.Users u ON u.UserID = pr.FreelancerID
           LEFT JOIN dbo.UserProfiles up ON up.UserID = pr.FreelancerID
           WHERE pr.ProjectID = %s ORDER BY pr.CreatedAt DESC, pr.ProposalID DESC""",
        [project_id],
    )
    skills = load_freelancer_skills(list({row["FreelancerID"] for row in rows}))
    results = []
    for row in rows:
        item = proposal_json(row)
        item["freelancer"] = {
            "id": row["FreelancerID"],
            "name": f"{row['FirstName']} {row['LastName']}".strip(),
            "professional_title": row["ProfessionalTitle"],
            "bio": row["Bio"],
            "location": row["Location"],
            "skills": skills[row["FreelancerID"]],
        }
        item["can_decide"] = row["ProposalStatus"] == "Pending"
        results.append(item)
    return {"results": results}


def load_proposal_for_owner(request, proposal_id, lock=False):
    """پیشنهاد را همراه وضعیت پروژه می‌خواند؛ فقط مالک پروژه اجازه‌ی ادامه دارد."""
    hint = lock_hint() if lock else ""  # قفل ردیف پروژه تا پایان تراکنش
    row = fetch_one(
        f"""SELECT pr.ProposalID, pr.ProjectID, pr.ProposalStatus, p.EmployerID, p.ProjectStatus
            FROM dbo.Proposals pr JOIN dbo.Projects p {hint} ON p.ProjectID = pr.ProjectID
            WHERE pr.ProposalID = %s""",
        [proposal_id],
    )
    if row is None:
        raise ApiError(404, "پیشنهاد یافت نشد.")
    if row["EmployerID"] != request.user.pk:
        raise ApiError(403, "فقط مالک پروژه مجاز به بررسی پیشنهادهای آن است.")
    return row


@endpoint("POST")
def accept_proposal(request, proposal_id):
    """
    POST /api/proposals/<id>/accept/ ← پذیرش پیشنهاد، یک عملیات اتمیک:
    ۱) پیشنهاد Accepted  ۲) پروژه In Progress  ۳) بقیه‌ی Pending های همان پروژه Rejected.
    اگر هر مرحله خطا بدهد، هیچ‌کدام ذخیره نمی‌شود.
    """
    require_regular_user(request)
    with transaction.atomic():
        row = load_proposal_for_owner(request, proposal_id, lock=True)
        if row["ProjectStatus"] != "Open":
            raise ApiError(409, "فقط در پروژه‌ی باز می‌توان پیشنهاد را پذیرفت.")
        if row["ProposalStatus"] != "Pending":
            raise ApiError(409, "فقط پیشنهاد در انتظار بررسی قابل پذیرش است.")
        project_id = row["ProjectID"]

        # ترتیب مهم است: تریگر دیتابیس پذیرش را فقط وقتی که پروژه هنوز Open است قبول می‌کند
        execute("UPDATE dbo.Proposals SET ProposalStatus = 'Accepted' WHERE ProposalID = %s", [proposal_id])
        execute(
            "UPDATE dbo.Projects SET ProjectStatus = 'In Progress', UpdatedAt = SYSDATETIME() WHERE ProjectID = %s AND ProjectStatus = 'Open'",
            [project_id],
        )
        rejected = execute(
            "UPDATE dbo.Proposals SET ProposalStatus = 'Rejected' WHERE ProjectID = %s AND ProposalStatus = 'Pending' AND ProposalID <> %s",
            [project_id, proposal_id],
        )
    return {
        "message": "پیشنهاد پذیرفته شد و پروژه در وضعیت «در حال انجام» قرار گرفت.",
        "project_id": project_id,
        "accepted_proposal_id": proposal_id,
        "rejected_count": rejected,
    }


@endpoint("POST")
def reject_proposal(request, proposal_id):
    """POST /api/proposals/<id>/reject/ ← رد پیشنهاد Pending توسط مالک پروژه."""
    require_regular_user(request)
    row = load_proposal_for_owner(request, proposal_id)
    if row["ProposalStatus"] != "Pending":
        raise ApiError(409, "فقط پیشنهاد در انتظار بررسی قابل رد است.")
    changed = execute(
        "UPDATE dbo.Proposals SET ProposalStatus = 'Rejected' WHERE ProposalID = %s AND ProposalStatus = 'Pending'",
        [proposal_id],
    )
    if not changed:
        raise ApiError(409, "وضعیت پیشنهاد در همین لحظه تغییر کرد.")
    return {"message": "پیشنهاد رد شد.", "proposal": proposal_json(get_proposal_or_404(proposal_id))}
