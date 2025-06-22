# Gjeniu i vogël - Educational Game Center

An educational gaming platform for elementary school students in Albania.

## Project Structure

```
GameCenter/
├── backend/          # Flask API server
├── frontend/         # Static HTML/CSS/JS files
├── data/            # MongoDB data directory
└── venv/            # Python virtual environment
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd GameCenter/backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `SECRET_KEY`: A secure secret key for JWT tokens
   - `MAIL_USERNAME`: Your Gmail address
   - `MAIL_PASSWORD`: Your Gmail app password

4. Start the server:
   ```bash
   python run.py
   ```

### Frontend Setup

The frontend is a static site that can be served by any web server. Simply open `index.html` in a browser or deploy to a static hosting service.

## Deployment

### Render.com Deployment

1. **Backend**: The `render.yaml` file is configured for Render.com deployment
2. **Frontend**: The frontend `render.yaml` is configured for static site hosting

### Environment Variables for Production

Update the `render.yaml` file with your actual values:
- Replace `username:password@cluster.mongodb.net` with your MongoDB Atlas connection string
- Replace `your-email@gmail.com` with your actual Gmail address
- Replace `your-app-password` with your Gmail app password

## Features

- User authentication (students and teachers)
- Educational games for grades 1-5
- Score tracking and leaderboards
- Assignment management for teachers
- Email verification system
- Responsive design

## Games Included

- Math Quiz (grades 1-5)
- Memory Game
- Word Search
- Crossword
- Grammar exercises

## Technologies Used

- **Backend**: Flask, MongoDB, JWT authentication
- **Frontend**: HTML5, CSS3, JavaScript
- **Deployment**: Render.com 