"""
CC-BS Events Portal – FastAPI application entry point.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.limiter import limiter

app = FastAPI(
    title="CC-BS Events Portal API",
    description="Backend API for the College Club / BS Events management portal",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Rate Limiter ───────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── CORS ───────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
from app.routers import auth, conclude, conduction, events, registrations  # noqa: E402
from fastapi.staticfiles import StaticFiles
from app.core.s3 import LOCAL_UPLOAD_DIR

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(registrations.router)
app.include_router(registrations.student_registrations_router)
app.include_router(conduction.router)
app.include_router(conclude.router)
app.include_router(conclude.public_verify_router)

# Mount local uploads directory automatically
LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(LOCAL_UPLOAD_DIR)), name="uploads")


# ── Health check ───────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Liveness probe – returns 200 when the server is up."""
    return {"status": "ok", "service": "cc-bs-events-portal"}
