from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

from fastapi.middleware.cors import CORSMiddleware
from app.routers import departments, job, candidate, activity, auth, feedback, dashboard, pipeline
from app.routers import scorecard as scorecard_router
from app.routers import preferences as preferences_router
from app.routers import requisitions as requisitions_router
from app.models import user_preferences  # ensure table is registered in metadata
from app.database import Base, engine


from fastapi.staticfiles import StaticFiles

# Create tables if not using Alembic (for dev/testing simplicity before migration setup)
Base.metadata.create_all(bind=engine) 

app = FastAPI(title="Clustox ATS API")

# Mount uploads directory for static access
app.mount("/static", StaticFiles(directory="uploads"), name="static")

# CORS Configuration
origins = [
    "http://localhost:5173", # Vite default
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(departments.router)
app.include_router(job.router)
app.include_router(candidate.router)
app.include_router(activity.router)
app.include_router(auth.router)
app.include_router(feedback.router)
app.include_router(dashboard.router)
app.include_router(scorecard_router.router)
app.include_router(pipeline.router)
app.include_router(preferences_router.router)
app.include_router(requisitions_router.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Clustox ATS API"}
