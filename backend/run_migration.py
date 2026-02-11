from alembic.config import Config
from alembic import command

# Create alembic config
alembic_cfg = Config("/home/ct-20032/Documents/Clustox ATS/backend/alembic.ini")

# Run upgrade
print("Running alembic upgrade head...")
command.upgrade(alembic_cfg, "head")
print("Migration completed!")
