"""پروفایل کاربر عادی: مشاهده و ویرایش نام، عنوان حرفه‌ای، معرفی کوتاه، محل و مهارت‌ها."""
from django.db import transaction

from .catalog import check_skills_exist
from .common import Form, endpoint, execute, fetch_all, fetch_one, read_json, require_regular_user


def load_profile(user_id):
    row = fetch_one(
        """SELECT u.FirstName, u.LastName, u.Email, up.ProfessionalTitle, up.Bio, up.Location
           FROM dbo.Users u LEFT JOIN dbo.UserProfiles up ON up.UserID = u.UserID
           WHERE u.UserID = %s""",
        [user_id],
    )
    skills = fetch_all(
        """SELECT s.SkillID AS id, s.SkillName AS name
           FROM dbo.UserSkills us JOIN dbo.Skills s ON s.SkillID = us.SkillID
           WHERE us.UserID = %s ORDER BY s.SkillName""",
        [user_id],
    )
    return {
        "first_name": row["FirstName"],
        "last_name": row["LastName"],
        "email": row["Email"],  # فقط نمایشی؛ ایمیل شناسه‌ی ورود است و از اینجا تغییر نمی‌کند
        "professional_title": row["ProfessionalTitle"],
        "bio": row["Bio"],
        "location": row["Location"],
        "skills": skills,
    }


@endpoint("GET", "PUT")
def profile(request):
    """GET/PUT /api/profile/"""
    require_regular_user(request)
    user_id = request.user.pk
    if request.method == "GET":
        return load_profile(user_id)

    form = Form(read_json(request))
    first_name = form.text("first_name", "نام", 100)
    last_name = form.text("last_name", "نام خانوادگی", 100)
    title = form.text("professional_title", "عنوان حرفه‌ای", 150, required=False)
    bio = form.text("bio", "معرفی کوتاه", 2000, required=False)
    location = form.text("location", "محل", 150, required=False)
    skill_ids = form.id_list("skill_ids", "مهارت‌ها")
    form.check()
    check_skills_exist(skill_ids)

    with transaction.atomic():
        execute("UPDATE dbo.Users SET FirstName = %s, LastName = %s, UpdatedAt = SYSDATETIME() WHERE UserID = %s", [first_name, last_name, user_id])
        has_profile = fetch_one("SELECT 1 AS found FROM dbo.UserProfiles WHERE UserID = %s", [user_id])
        if has_profile:
            execute("UPDATE dbo.UserProfiles SET ProfessionalTitle = %s, Bio = %s, Location = %s WHERE UserID = %s", [title, bio, location, user_id])
        else:
            execute("INSERT INTO dbo.UserProfiles (UserID, ProfessionalTitle, Bio, Location) VALUES (%s, %s, %s, %s)", [user_id, title, bio, location])
        execute("DELETE FROM dbo.UserSkills WHERE UserID = %s", [user_id])
        for skill_id in skill_ids:
            execute("INSERT INTO dbo.UserSkills (UserID, SkillID) VALUES (%s, %s)", [user_id, skill_id])
    return load_profile(user_id)
