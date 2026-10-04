"""Admin authentication.

Two jobs: check a password against the bcrypt hash in the database, and issue
/verify a bearer token for subsequent admin requests.

The token is an HMAC-signed `username|expiry` pair rather than a session row:
no table to clean up, no extra dependency, and it is stateless across function
instances. The secret lives in `ADMIN_TOKEN_SECRET` and is never in the repo.

The token is handed to the browser as an httpOnly cookie, so page JavaScript
cannot read it and a cross-site script injection cannot exfiltrate it. The API
and the site are served from the same origin, so there is no CORS surface and
no `credentials` handling to get wrong.
"""

import base64
import hmac
import os
import time
from hashlib import sha256

import bcrypt
from fastapi import Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from .db import get_db
from .models import Admin

# Seconds a session lasts. The default is 0: never — the admin stays signed
# in until Sign out, a browser-side delete, or an admin removal. Any positive
# value restores a real TTL (older deployments used 12 hours). `or` treats an
# empty value as unset — `ADMIN_TOKEN_TTL=` must not crash int() at import.
TOKEN_TTL = int(os.environ.get("ADMIN_TOKEN_TTL") or 0)

SESSION_COOKIE = "admin_session"

# bcrypt only considers the first 72 bytes of a password and raises beyond it.
_BCRYPT_MAX_BYTES = 72


def _secret() -> bytes:
    secret = os.environ.get("ADMIN_TOKEN_SECRET")
    if not secret:
        # Fail closed: without a secret we cannot sign or verify anything, and
        # silently allowing logins would be worse than refusing them.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ADMIN_TOKEN_SECRET is not set on the server.",
        )
    return secret.encode()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:_BCRYPT_MAX_BYTES], bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            password.encode()[:_BCRYPT_MAX_BYTES], password_hash.encode()
        )
    except ValueError:
        # Malformed hash in the database. Deny rather than crash.
        return False


def make_token(username: str) -> str:
    # Expiry 0 means "never" on both ends; see read_token.
    expiry = int(time.time()) + TOKEN_TTL if TOKEN_TTL > 0 else 0
    payload = f"{username}|{expiry}".encode()
    encoded = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    signature = hmac.new(_secret(), payload, sha256).hexdigest()
    return f"{encoded}.{signature}"


def read_token(token: str) -> str | None:
    """Return the username if the token is authentic and unexpired."""
    try:
        encoded, signature = token.split(".", 1)
    except ValueError:
        return None

    padding = "=" * (-len(encoded) % 4)
    try:
        payload = base64.urlsafe_b64decode(encoded + padding)
    except (ValueError, TypeError):
        return None

    expected = hmac.new(_secret(), payload, sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None

    username, _, expiry = payload.decode().partition("|")
    if not expiry.isdigit():
        return None
    if int(expiry) != 0 and int(expiry) < time.time():
        return None
    return username


def require_admin(
    session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> Admin:
    """FastAPI dependency guarding every mutating admin endpoint."""
    username = read_token(session) if session else None
    admin = db.query(Admin).filter(Admin.username == username).first() if username else None
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to continue."
        )
    return admin


def optional_admin(session: str | None = Cookie(default=None, alias=SESSION_COOKIE)) -> str | None:
    """Username behind a valid cookie, or None. Used by `/admin/me`, which must
    answer 200 either way so the SPA can tell "signed out" from "server broken"."""
    return read_token(session) if session else None


def set_session_cookie(response: Response, token: str) -> None:
    # Secure cookies are dropped over plain http on Safari, so the flag follows
    # SITE_URL rather than being its own knob: an https origin gets a secure
    # cookie, a localhost origin gets a usable one. COOKIE_SECURE overrides.
    default_secure = "1" if os.environ.get("SITE_URL", "").startswith("https://") else "0"
    response.set_cookie(
        SESSION_COOKIE,
        token,
        # httpOnly keeps the token out of reach of page JavaScript; sameSite
        # stops another origin from driving an authenticated request.
        httponly=True,
        samesite="lax",
        secure=os.environ.get("COOKIE_SECURE", default_secure) == "1",
        path="/",
        # A never-expiring session must also survive a browser restart, so the
        # cookie gets a long fixed life instead of a session cookie's.
        max_age=TOKEN_TTL or 10 * 365 * 24 * 3600,
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")