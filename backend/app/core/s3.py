"""
S3 storage helper with graceful local fallback.

If AWS credentials are empty in .env, all operations fall back to
backend/uploads/ on disk so local dev works with zero AWS setup.

Public API
----------
upload_file(file_obj, key)        → s3_key (str)
get_presigned_url(s3_key)         → URL valid for PRESIGN_EXPIRY seconds
delete_file(s3_key)               → None
"""
from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path
from typing import BinaryIO

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.database import settings

# ── Constants ──────────────────────────────────────────────────────────────────

PRESIGN_EXPIRY = 3600  # seconds (1 hour)
LOCAL_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"  # backend/uploads/

# ── Mode detection ─────────────────────────────────────────────────────────────

def _use_s3() -> bool:
    """Return True only when real AWS credentials are configured."""
    return bool(
        settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
        and settings.AWS_S3_BUCKET
        and settings.AWS_ACCESS_KEY_ID != "YOUR_AWS_ACCESS_KEY_ID"
    )


def _s3_client():
    """Return a boto3 S3 client configured from settings."""
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


# ── Key helpers ────────────────────────────────────────────────────────────────

def build_key(folder: str, filename: str) -> str:
    """
    Build a unique S3 object key (or local sub-path).

    Example: build_key("circulars", "notice.pdf")
             → "circulars/<uuid4>/notice.pdf"
    """
    safe_name = Path(filename).name  # strip any path traversal
    return f"{folder}/{uuid.uuid4()}/{safe_name}"


# ── Core operations ────────────────────────────────────────────────────────────

def upload_file(file_obj: BinaryIO, key: str, content_type: str = "application/octet-stream") -> str:
    """
    Upload *file_obj* to S3 (or local disk) under *key*.

    Parameters
    ----------
    file_obj     : file-like object (FastAPI UploadFile.file)
    key          : object key / relative local path returned by build_key()
    content_type : MIME type for S3 metadata

    Returns
    -------
    The same *key* string — stored in DB for later presigned-URL generation.
    """
    if _use_s3():
        try:
            _s3_client().upload_fileobj(
                file_obj,
                settings.AWS_S3_BUCKET,
                key,
                ExtraArgs={"ContentType": content_type},
            )
        except (BotoCoreError, ClientError) as exc:
            raise RuntimeError(f"S3 upload failed: {exc}") from exc
    else:
        # ── Local fallback ─────────────────────────────────────────────────
        dest = LOCAL_UPLOAD_DIR / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        file_obj.seek(0)
        with dest.open("wb") as fh:
            shutil.copyfileobj(file_obj, fh)

    return key


def get_presigned_url(s3_key: str | None, expiry: int = PRESIGN_EXPIRY) -> str | None:
    """
    Return a time-limited URL to download the object at *s3_key*.

    - S3 mode  : generates a presigned GET URL valid for *expiry* seconds.
    - Local mode: returns a relative path string (frontend must handle it).
    - None key : returns None gracefully.
    """
    if s3_key is None:
        return None

    if _use_s3():
        try:
            return _s3_client().generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.AWS_S3_BUCKET, "Key": s3_key},
                ExpiresIn=expiry,
            )
        except (BotoCoreError, ClientError) as exc:
            raise RuntimeError(f"Presigned URL generation failed: {exc}") from exc
    else:
        # Return local serve path from backend server
        return f"http://localhost:8000/uploads/{s3_key}"


def delete_file(s3_key: str | None) -> None:
    """
    Delete an object from S3 (or local disk). Silently ignores missing keys.
    """
    if s3_key is None:
        return

    if _use_s3():
        try:
            _s3_client().delete_object(Bucket=settings.AWS_S3_BUCKET, Key=s3_key)
        except (BotoCoreError, ClientError):
            pass  # best-effort deletion
    else:
        local = LOCAL_UPLOAD_DIR / s3_key
        local.unlink(missing_ok=True)
