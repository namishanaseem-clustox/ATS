import psycopg2
import os

# Get database URL from environment or use default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/clustox_ats")

# Parse the URL
# Format: postgresql://user:password@host/database
parts = DATABASE_URL.replace("postgresql://", "").split("@")
user_pass = parts[0].split(":")
host_db = parts[1].split("/")

user = user_pass[0]
password = user_pass[1] if len(user_pass) > 1 else ""
host = host_db[0]
database = host_db[1]

# Connect and run the ALTER TABLE
conn = psycopg2.connect(
    dbname=database,
    user=user,
    password=password,
    host=host
)

cursor = conn.cursor()

# Add columns if they don't exist
sql = """
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS score_details JSONB,
ADD COLUMN IF NOT EXISTS overall_score FLOAT,
ADD COLUMN IF NOT EXISTS recommendation VARCHAR;
"""

cursor.execute(sql)
conn.commit()

print("Successfully added columns to job_applications table")

cursor.close()
conn.close()
