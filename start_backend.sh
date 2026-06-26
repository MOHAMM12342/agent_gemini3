#!/bin/bash
echo "Starting SIP Server in background..."
python sip_server.py &

echo "Starting FastAPI Controller..."
exec uvicorn controller:app --host 0.0.0.0 --port 8000
