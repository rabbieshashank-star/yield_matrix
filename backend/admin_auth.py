"""
admin_auth.py — JWT-based authentication for the Yield Matrix admin portal.
District passwords are stored in the SQLite DB (managed by superadmin).
Superadmin credentials are in .env.
"""
import os
import jwt
import datetime
from dotenv import load_dotenv
from db import get_district_password, get_district_names

load_dotenv()

JWT_SECRET       = os.environ.get("JWT_SECRET", "fallback-secret")
JWT_EXPIRY_HOURS = 8
SUPERADMIN_USER  = "superadmin"
SUPERADMIN_PASS  = os.environ.get("SUPERADMIN_PASS", "")


def get_valid_districts() -> list:
    """Return district names stored in the DB."""
    return get_district_names()


def authenticate(district: str, password: str) -> str:
    """
    Validate a district operator login.
    Password is checked against the districts table in SQLite.
    Returns a JWT token on success, raises ValueError on failure.
    """
    stored = get_district_password(district)
    if stored is None:
        raise ValueError(f"Unknown district: {district}")
    if password != stored:
        raise ValueError("Incorrect password")

    payload = {
        "role":     "district",
        "district": district,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def authenticate_superadmin(username: str, password: str) -> str:
    """
    Validate superadmin credentials from .env.
    Returns a JWT token on success, raises ValueError on failure.
    """
    if username != SUPERADMIN_USER:
        raise ValueError("Invalid superadmin username")
    if not SUPERADMIN_PASS:
        raise ValueError("Superadmin password not configured")
    if password != SUPERADMIN_PASS:
        raise ValueError("Incorrect superadmin password")

    payload = {
        "role": "superadmin",
        "exp":  datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRY_HOURS),
        "iat":  datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_token(token: str) -> dict:
    """
    Decode and verify any JWT. Returns the full payload dict.
    Raises jwt.ExpiredSignatureError or jwt.InvalidTokenError on failure.
    """
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])


def verify_district_token(token: str) -> str:
    """Verify token and return district name. Raises PermissionError if not a district token."""
    payload = verify_token(token)
    if payload.get("role") != "district":
        raise PermissionError("Not a district token")
    return payload["district"]


def verify_superadmin_token(token: str):
    """Verify token is a superadmin token. Raises PermissionError if not."""
    payload = verify_token(token)
    if payload.get("role") != "superadmin":
        raise PermissionError("Superadmin access required")
