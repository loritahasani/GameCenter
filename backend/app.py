from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo
from config.config import Config
from config.routes.auth import auth_bp
from config.routes.scores import scores_bp
from config.routes.assignments import assignments_bp
import os
from werkzeug.exceptions import NotFound

def create_app():
    app = Flask(__name__, static_folder='../frontend', static_url_path='')
    
    # Configure CORS for production
    CORS(app, origins=[
        "http://localhost:3000",
        "http://localhost:8000", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "https://gjeniu-i-vogel.onrender.com",
        "https://gjeniu-i-vogel-frontend.onrender.com",
        "https://gjeniu-i-vogel.vercel.app",
        "https://gjeniu-i-vogel.netlify.app"
    ])
    
    # Load configuration
    app.config.from_object(Config)

    # Configure upload folder
    upload_folder = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'uploads')
    app.config['UPLOAD_FOLDER'] = upload_folder
    os.makedirs(upload_folder, exist_ok=True)
    
    # Initialize MongoDB
    mongo = PyMongo(app)
    
    # Share mongo instance with blueprints
    auth_bp.mongo = mongo
    scores_bp.mongo = mongo
    scores_bp.upload_folder = app.config['UPLOAD_FOLDER']
    assignments_bp.mongo = mongo
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(scores_bp, url_prefix='/api')
    app.register_blueprint(assignments_bp, url_prefix='/api')
    
    # Serve frontend files
    @app.route('/')
    def serve_index():
        return send_from_directory(app.static_folder, 'index.html')
    
    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        try:
            return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=False)
        except NotFound:
            return jsonify({'error': 'File not found'}), 404

    @app.route('/<path:path>')
    def serve_static(path):
        # Prevent /uploads path from being served as static
        if path.startswith('uploads/'):
            return jsonify({'error': 'Access denied'}), 403
        return send_from_directory(app.static_folder, path)
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True) 