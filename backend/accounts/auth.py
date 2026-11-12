import hashlib
import hmac
import re
from dataclasses import dataclass

from django.contrib.auth.hashers import check_password, identify_hasher, make_password
from django.db import connection, transaction


class _PrimaryKey:
    @staticmethod
    def value_to_string(user):
        return str(user.pk)


class _UserMeta:
    pk = _PrimaryKey()


@dataclass
class MarketplaceUser:
    user_id: int
    email: str
    first_name: str
    last_name: str
    password_hash: str
    account_status: str
    is_authenticated: bool = True
    is_anonymous: bool = False
    is_active: bool = True
    is_staff: bool = False
    is_superuser: bool = False
    _meta = _UserMeta()

    @property
    def pk(self): return self.user_id
    @property
    def id(self): return self.user_id
    @property
    def username(self): return self.email
    @property
    def full_name(self): return f"{self.first_name} {self.last_name}".strip()
    def get_username(self): return self.email
    def __str__(self): return self.full_name or self.email


def _verify_legacy_sha256(password: str, encoded: str) -> bool:
    if not re.fullmatch(r"[0-9a-fA-F]{64}", encoded or ""):
        return False
    candidate = hashlib.sha256(password.encode("utf-16le")).hexdigest()
    return hmac.compare_digest(candidate.lower(), encoded.lower())


def verify_password(password: str, encoded: str) -> bool:
    try:
        identify_hasher(encoded)
    except (ValueError, TypeError):
        return _verify_legacy_sha256(password, encoded)
    return check_password(password, encoded)


def _user_from_row(row):
    return MarketplaceUser(
        user_id=row[0], email=row[1], first_name=row[2], last_name=row[3],
        password_hash=row[4], account_status=row[5], is_active=(row[5] == "Active"),
    )


class MarketplaceAuthBackend:
    def authenticate(self, request, username=None, password=None, email=None, **kwargs):
        identifier = (email or username or "").strip()
        if not identifier or not password or len(identifier) > 255 or len(password) > 1024:
            return None
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT UserID, Email, FirstName, LastName, PasswordHash, AccountStatus "
                "FROM dbo.Users WHERE Email = %s", [identifier],
            )
            row = cursor.fetchone()
        if not row:
            return None
        user = _user_from_row(row)
        if not user.is_active or not verify_password(password, user.password_hash):
            return None
        try:
            identify_hasher(user.password_hash)
        except (ValueError, TypeError):
            upgraded = make_password(password)
            with transaction.atomic(), connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE dbo.Users SET PasswordHash = %s WHERE UserID = %s AND PasswordHash = %s",
                    [upgraded, user.user_id, user.password_hash],
                )
            user.password_hash = upgraded
        return user

    def get_user(self, user_id):
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT UserID, Email, FirstName, LastName, PasswordHash, AccountStatus "
                "FROM dbo.Users WHERE UserID = %s", [user_id],
            )
            row = cursor.fetchone()
        if not row:
            return None
        user = _user_from_row(row)
        return user if user.is_active else None
