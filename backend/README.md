# Login module setup (Windows)

Install into an isolated environment from the repository root:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item backend\.env.example backend\.env
```

Set strong `DJANGO_SECRET_KEY` and SQL Server connection values in `backend/.env`. Confirm SQL Server and ODBC Driver 18 are available. Then:

```powershell
cd backend
python manage.py check
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Open `http://127.0.0.1:8000/login/`. `migrate` adds Django session/contenttype tables to the configured database, without resetting marketplace tables or user records; it is required for server-side sessions and logout invalidation.

Isolated tests (no live SQL Server required):

```powershell
$env:DB_ENGINE='sqlite'
$env:SQLITE_PATH=':memory:'
$env:DJANGO_SECRET_KEY='test-only-secret'
cd backend
python manage.py test accounts
```

These tests use a test-only replacement for database authentication and do not prove SQL Server connectivity. A real DB test requires valid SQL Server credentials and an existing account.

## Existing password hashes

The SQL trigger hashes an inserted `NVARCHAR` value with SHA2_256 and stores hex. The backend checks legacy hashes as SHA-256 of UTF-16LE password bytes, using constant-time comparison. On successful verification only, it upgrades that user's exact prior hash to Django PBKDF2 using a conditional parameterized `UPDATE`. Failed attempts never write or log credentials. This compatibility interpretation should be checked against actual account creation behavior before production deployment. No existing records are altered in advance. The trigger remains untouched and applies only to inserts.

Endpoints: `POST /api/auth/login/`, `GET /api/auth/me/`, `POST /api/auth/logout/`; protected temporary page `/welcome/`. Registration and password recovery are not implemented; their links are marked as coming soon.
