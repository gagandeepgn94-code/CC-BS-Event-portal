"""
Database Initialization Script:
1. Connects to the default PostgreSQL database ('postgres').
2. Checks if 'ccbs_events' database exists, and creates it if not.
3. Tests connection to 'ccbs_events'.
"""
import sys
import psycopg
from psycopg import sql
from urllib.parse import urlparse
from app.core.database import settings

def init_database():
    raw_url = settings.DATABASE_URL
    # Normalise driver scheme for psycopg connection: postgresql+psycopg:// -> postgresql://
    clean_url = raw_url.replace("postgresql+psycopg://", "postgresql://")
    parsed = urlparse(clean_url)
    
    user = parsed.username or "postgres"
    password = parsed.password or ""
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    target_db = parsed.path.lstrip("/") or "ccbs_events"

    print(f"Connecting to PostgreSQL server at {host}:{port} as user '{user}'...")
    try:
        # Connect to default maintenance database 'postgres'
        conn = psycopg.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host,
            port=port,
            autocommit=True,
        )
    except Exception as e:
        print(f"Error connecting to PostgreSQL server: {e}")
        print("\nPlease check that PostgreSQL service is running and the password in backend/.env is correct.")
        sys.exit(1)

    with conn.cursor() as cur:
        # Check if database exists
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (target_db,))
        exists = cur.fetchone()
        if not exists:
            print(f"Database '{target_db}' not found. Creating...")
            cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(target_db)))
            print(f"Database '{target_db}' created successfully.")
        else:
            print(f"Database '{target_db}' already exists.")

    conn.close()

    # Test connecting to the new database
    print(f"Testing connection to target database '{target_db}'...")
    try:
        target_conn = psycopg.connect(
            dbname=target_db,
            user=user,
            password=password,
            host=host,
            port=port,
        )
        target_conn.close()
        print(f"Connection to '{target_db}' succeeded!")
    except Exception as e:
        print(f"Error connecting to '{target_db}': {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_database()
