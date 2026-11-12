from django.urls import path
from accounts import views

urlpatterns = [
    path("", views.login_page, name="home"),
    path("login/", views.login_page, name="login-page"),
    path("welcome/", views.welcome_page, name="welcome"),
    path("api/auth/login/", views.api_login, name="api-login"),
    path("api/auth/logout/", views.api_logout, name="api-logout"),
    path("api/auth/me/", views.api_me, name="api-me"),
]
