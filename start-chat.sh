#!/bin/bash

echo "Starting M-Chat application..."

# Start socket server in background
echo "Starting socket server..."
cd socket
npm start &
SOCKET_PID=$!
cd ..

# Wait a moment for socket server to start
sleep 2

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "M-Chat is starting up..."
echo "Socket server PID: $SOCKET_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Frontend will be available at: http://localhost:5173"
echo "Socket server will be available at: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $SOCKET_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "Services stopped."
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait 
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait 