#!/bin/bash
# Start script for Render deployment

echo "Starting the application..."
gunicorn --bind 0.0.0.0:$PORT run:app 