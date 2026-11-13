from django.urls import path
from accounts import password_reset, registration, views

urlpatterns = [
    path("", views.login_page, name="home"),
    path("login/", views.login_page, name="login-page"),
    path("welcome/", views.welcome_page, name="welcome"),
    path("api/auth/login/", views.api_login, name="api-login"),
    path("api/auth/logout/", views.api_logout, name="api-logout"),
    path("api/auth/me/", views.api_me, name="api-me"),
    path("api/auth/register/", registration.api_register, name="api-register"),
    path("api/auth/password-reset/", password_reset.api_password_reset, name="api-password-reset"),
    path("api/auth/password-reset-confirm/", password_reset.api_password_reset_confirm, name="api-password-reset-confirm"),
]
