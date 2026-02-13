# Clustox ATS 


### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### Clone the Repository
```bash
git clone <repository-url>
cd "Clustox ATS"
```

### Backend Setup
1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Database Setup:**
   Ensure PostgreSQL is running and create the database:
   ```bash
   createdb clustox_ats
   ```
   *Note: Update `alembic.ini` line 89 (`sqlalchemy.url`) if your database credentials differ from `postgres:postgres@localhost/clustox_ats`.*

5. **Run Migrations:**
   ```bash
   export PYTHONPATH=$PYTHONPATH:$(pwd)  # On Windows: set PYTHONPATH=%cd%
   alembic upgrade head
   ```

6. **Start the Server:**
   ```bash
   uvicorn app.main:app --reload
   ```
   Server will run at `http://127.0.0.1:8000`. API Docs at `http://127.0.0.1:8000/docs`.

### Frontend Setup
1. **Navigate to frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Application will run at `http://localhost:5173`.

## Tech Stack

**Backend:** FastAPI, SQLAlchemy, PostgreSQL, Alembic  
**Frontend:** React, Vite, Tailwind CSS v4, TanStack Query, Zustand

## License

MIT
