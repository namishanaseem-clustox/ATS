# Clustox ATS - Departments Module

A complete Departments management module for the Clustox ATS application.

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start PostgreSQL and create database
createdb clustox_ats

# Run migrations
export PYTHONPATH=$PYTHONPATH:$(pwd)
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173/departments`

## Features

- ✅ Create, Read, Update, Delete departments
- ✅ Soft delete (archive) functionality
- ✅ Active/Inactive status management
- ✅ Modern UI with Tailwind CSS
- ✅ Real-time updates with React Query
- ✅ Responsive design

## Tech Stack

**Backend:** FastAPI, SQLAlchemy, PostgreSQL, Alembic  
**Frontend:** React, Vite, Tailwind CSS v4, TanStack Query, Zustand

## API Endpoints

- `GET /departments` - List all departments
- `POST /departments` - Create department
- `GET /departments/{id}` - Get department by ID
- `PUT /departments/{id}` - Update department
- `DELETE /departments/{id}` - Archive department (soft delete)

## License

MIT
