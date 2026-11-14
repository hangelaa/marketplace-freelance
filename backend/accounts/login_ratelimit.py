"""Per-IP limit on failed login attempts (fixed window).

An IP may make at most LOGIN_FAILURE_LIMIT failed login attempts within
LOGIN_FAILURE_WINDOW seconds. The window starts at the first failure; once
the limit is reached every login request from that IP is rejected with 429
until the window expires.

State lives in Django's cache. The default LocMemCache is per-process, so a
multi-worker deployment needs a shared cache backend (e.g. Redis) for the
limit to hold across workers.
"""

import math
import time

from django.conf import settings
from django.core.cache import cache

_PREFIX = "login-fail"


def _limit():
    return getattr(settings, "LOGIN_FAILURE_LIMIT", 5)


def _window():
    return getattr(settings, "LOGIN_FAILURE_WINDOW", 300)


def client_ip(request):
    # REMOTE_ADDR only: X-Forwarded-For is client-controlled and would let an
    # attacker pick a fresh "IP" per request. If a trusted reverse proxy is
    # added, resolve the real client IP there before trusting a header.
    return request.META.get("REMOTE_ADDR") or "unknown"


def _keys(ip):
    return f"{_PREFIX}:count:{ip}", f"{_PREFIX}:reset:{ip}"


def retry_after(ip):
    """Seconds until the IP may try again, or 0 if it is not blocked."""
    count_key, reset_key = _keys(ip)
    if (cache.get(count_key) or 0) < _limit():
        return 0
    reset_at = cache.get(reset_key)
    if reset_at is None:
        return _window()
    return max(1, math.ceil(reset_at - time.time()))


def register_failure(ip):
    count_key, reset_key = _keys(ip)
    window = _window()
    # add() only sets when absent, so the window is anchored at the first failure.
    cache.add(reset_key, time.time() + window, window)
    cache.add(count_key, 0, window)
    try:
        cache.incr(count_key)
    except ValueError:
        # Key expired between add() and incr(): start a new window.
        cache.set(reset_key, time.time() + window, window)
        cache.set(count_key, 1, window)
