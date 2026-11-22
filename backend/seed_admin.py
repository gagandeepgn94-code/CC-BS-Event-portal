"""
Seed script: creates default HOD/Admin and Coordinator users if they do not exist.
Usage:
    cd backend
    python seed_admin.py

Environment variables (optional):
    SEED_ADMIN_PASSWORD : Initial password for admin@ccbs.edu.in (default: Admin@123)
    SEED_COORD_PASSWORD : Initial password for coord@ccbs.edu.in (default: Coord@123)
"""
import os
import sys
from sqlalchemy import select
from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.models import User

def seed():
    admin_password = os.environ.get("SEED_ADMIN_PASSWORD", "Admin@123")
    coord_password = os.environ.get("SEED_COORD_PASSWORD", "Coord@123")

    if admin_password == "Admin@123":
        print("[NOTICE] Using default development password for Admin. Set SEED_ADMIN_PASSWORD in production.")
    if coord_password == "Coord@123":
        print("[NOTICE] Using default development password for Coordinator. Set SEED_COORD_PASSWORD in production.")

    print("Connecting to database...")
    db = SessionLocal()
    try:
        # 1. HOD / Admin User
        admin_email = "admin@ccbs.edu.in"
        admin = db.execute(select(User).where(User.email == admin_email)).scalar_one_or_none()
        if not admin:
            admin = User(
                name="HOD / Department Admin",
                email=admin_email,
                password_hash=hash_password(admin_password),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            print(f"Created default Admin user: {admin_email}")
        else:
            print(f"Admin user already exists: {admin_email}")

        # 2. Coordinator User
        coord_email = "coord@ccbs.edu.in"
        coord = db.execute(select(User).where(User.email == coord_email)).scalar_one_or_none()
        if not coord:
            coord = User(
                name="Event Coordinator",
                email=coord_email,
                password_hash=hash_password(coord_password),
                role="coordinator",
                is_active=True,
            )
            db.add(coord)
            print(f"Created default Coordinator user: {coord_email}")
        else:
            print(f"Coordinator user already exists: {coord_email}")

        db.commit()
        print("Database seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed()
