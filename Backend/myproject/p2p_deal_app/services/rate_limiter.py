"""
Minimal in-memory rate limiter.

No external dependency (no Flask-Limiter, no Redis). This is fine for a
single-process dev/demo deployment -- app.py currently runs via
socketio.run() as a single process. If this project ever moves to
multiple Gunicorn/eventlet workers, this in-memory store will NOT be
shared across workers, and each worker will enforce its own separate
limit. That's a real gap worth knowing about later, not a silent one.
"""

import threading
import time
from collections import defaultdict, deque

_lock = threading.Lock()
_attempts = defaultdict(deque)


def _prune(key, window_seconds, now):
    bucket = _attempts[key]
    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()


def is_rate_limited(key, max_attempts, window_seconds):
    """
    Returns (is_limited, retry_after_seconds).

    Only checks -- does not record. Call record_attempt() separately
    at the point you actually want to count against the limit.
    """
    now = time.time()

    with _lock:
        _prune(key, window_seconds, now)
        bucket = _attempts[key]

        if len(bucket) >= max_attempts:
            retry_after = int(window_seconds - (now - bucket[0])) + 1
            return True, max(retry_after, 1)

        return False, 0


def record_attempt(key, window_seconds):
    now = time.time()

    with _lock:
        _prune(key, window_seconds, now)
        _attempts[key].append(now)


def reset(key):
    """Clear a key's history -- e.g. call after a successful login."""
    with _lock:
        _attempts.pop(key, None)