#!/bin/bash

# Navigate to script directory
cd "$(dirname "$0")"

# Start Backend
echo "Starting Backend..."
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Virtual environment not found in backend/venv"
    exit 1
fi

# Run uvicorn in background
python3 -m uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start Frontend
echo "Starting Frontend..."
cd ../frontend
# Run npm start in background
npm run dev &
FRONTEND_PID=$!

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

echo "App is running. Press Ctrl+C to stop."

# Wait for processes
wait
