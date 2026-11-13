"""TEST ONLY: real Django CSRF/sessions; isolated identity provider, NOT SQL Server evidence.
Never imported by production. Uses a disposable SQLite database outside the repo.
"""
import os
from pathlib import Path
import secrets
import sys
import tempfile
from wsgiref.simple_server import make_server

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / "backend"))
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["DJANGO_SECRET_KEY"] = secrets.token_urlsafe(48)
os.environ["DJANGO_DEBUG"] = "true"
os.environ["DB_ENGINE"] = "sqlite"
scratch = Path.home() / "AppData/Local/hermes/cache/scratch" if sys.platform == "win32" else Path(os.environ.get("TMPDIR", "/tmp"))
scratch.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix="peyvand-test-", dir=scratch) as temporary:
    os.environ["SQLITE_PATH"] = str(Path(temporary) / "sessions.sqlite3")
    import django
    django.setup()
    from django.core.management import call_command
    from django.contrib.auth.hashers import make_password, check_password
    from accounts.auth import MarketplaceAuthBackend, MarketplaceUser
    from django.core.wsgi import get_wsgi_application

    user = MarketplaceUser(41, "test@example.test", "همکار", "آزمایشی", make_password("FixtureOnly9!"), "Active")
    def authenticate(self, request, username=None, password=None, email=None, **kwargs):
        return user if (email or username) == user.email and check_password(password or "", user.password_hash) else None
    def get_user(self, user_id):
        return user if str(user_id) == str(user.pk) else None
    MarketplaceAuthBackend.authenticate = authenticate
    MarketplaceAuthBackend.get_user = get_user
    call_command("migrate", verbosity=0)
    print("TEST FIXTURE ONLY: real CSRF and DB-backed Django sessions; fake identity provider on :8001", flush=True)
    with make_server("127.0.0.1", 8001, get_wsgi_application()) as server:
        server.serve_forever()
