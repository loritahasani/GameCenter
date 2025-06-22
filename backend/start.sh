#!/usr/bin/env bash
# Start script for Render deployment

echo "Starting Gjeniu i vogël backend..."
gunicorn run:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120 