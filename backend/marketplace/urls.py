from django.urls import path

from . import catalog, profile, projects, proposals

urlpatterns = [
    # داده‌های مرجع
    path("categories/", catalog.categories),
    path("skills/", catalog.skills),
    # پروژه‌ها
    path("projects/", projects.projects_collection),                                # GET فهرست، POST ساخت
    path("projects/<int:project_id>/", projects.project_detail),                    # GET جزئیات، PUT ویرایش
    path("projects/<int:project_id>/publish/", projects.publish_project),           # POST انتشار پیش‌نویس
    path("projects/<int:project_id>/proposals/", proposals.project_proposals),      # GET بررسی، POST ارسال پیشنهاد
    path("my/projects/", projects.my_projects),
    # پیشنهادها
    path("my/proposals/", proposals.my_proposals),
    path("proposals/<int:proposal_id>/withdraw/", proposals.withdraw_proposal),
    path("proposals/<int:proposal_id>/accept/", proposals.accept_proposal),
    path("proposals/<int:proposal_id>/reject/", proposals.reject_proposal),
    # پروفایل
    path("profile/", profile.profile),
]
