import json
import re

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from accounts import login_ratelimit


@ensure_csrf_cookie
def login_page(request):
    if request.user.is_authenticated:
        return redirect("welcome")
    return render(request, "login.html")


def welcome_page(request):
    if not request.user.is_authenticated:
        return redirect("login-page")
    return render(request, "welcome.html")


def _payload(request):
    try:
        value = json.loads(request.body or b"{}")
        return value if isinstance(value, dict) else {}
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


@require_POST
def api_login(request):
    ip = login_ratelimit.client_ip(request)
    wait = login_ratelimit.retry_after(ip)
    if wait:
        response = JsonResponse({"error": "تعداد تلاش‌های ناموفق زیاد است. لطفاً بعداً دوباره تلاش کنید."}, status=429)
        response["Retry-After"] = str(wait)
        return response
    data = _payload(request)
    if data is None:
        return JsonResponse({"error": "درخواست نامعتبر است."}, status=400)
    email = data.get("email")
    password = data.get("password")
    if not isinstance(email, str) or not email.strip() or not isinstance(password, str) or not password:
        return JsonResponse({"error": "ایمیل و رمز عبور را وارد کنید."}, status=400)
    if len(email) > 255 or len(password) > 1024 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email.strip()):
        return JsonResponse({"error": "ایمیل یا رمز عبور نامعتبر است."}, status=400)
    user = authenticate(request, email=email.strip(), password=password)
    if user is None:
        login_ratelimit.register_failure(ip)
        return JsonResponse({"error": "نام کاربری یا رمز عبور اشتباه است."}, status=401)
    login(request, user)
    return JsonResponse({"ok": True, "next": "/welcome/"})


@require_POST
def api_logout(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "ابتدا وارد شوید."}, status=401)
    logout(request)
    return JsonResponse({"ok": True, "next": "/login/"})


@require_GET
def api_me(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "احراز هویت لازم است."}, status=401)
    return JsonResponse({"email": request.user.email, "name": request.user.full_name or request.user.email})
