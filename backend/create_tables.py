from app.database import engine
from sqlalchemy import text

# Create candidates table
create_candidates_sql = """
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    email VARCHAR NOT NULL UNIQUE,
    phone VARCHAR,
    location VARCHAR,
    current_company VARCHAR,
    current_position VARCHAR,
    experience_years FLOAT,
    nationality VARCHAR,
    notice_period VARCHAR,
    current_salary FLOAT,
    expected_salary FLOAT,
    skills JSONB,
    education JSONB,
    experience_history JSONB,
    social_links JSONB,
    resume_file_path VARCHAR,
    parsed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS ix_candidates_id ON candidates (id);
CREATE INDEX IF NOT EXISTS ix_candidates_email ON candidates (email);
"""

# Create job_applications table
create_job_applications_sql = """
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY,
    candidate_id UUID NOT NULL REFERENCES candidates(id),
    job_id UUID NOT NULL REFERENCES jobs(id),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_stage VARCHAR,
    application_status VARCHAR
);
"""

# Update alembic version
update_alembic_sql = """
UPDATE alembic_version SET version_num = 'd6351b538d4b';
"""

with engine.connect() as conn:
    print("Creating candidates table...")
    conn.execute(text(create_candidates_sql))
    conn.commit()
    
    print("Creating job_applications table...")
    conn.execute(text(create_job_applications_sql))
    conn.commit()
    
    print("Updating alembic version...")
    conn.execute(text(update_alembic_sql))
    conn.commit()
    
    print("✅ Tables created successfully!")
