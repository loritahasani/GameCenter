from flask import Flask
from flask_cors import CORS
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from config.config import Config
from config.routes.auth import auth_bp
from config.routes.scores import scores_bp
from config.routes.assignments import assignments_bp

mongo = PyMongo()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    CORS(app)
    JWTManager(app)
    mongo.init_app(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(scores_bp, url_prefix='/api')
    app.register_blueprint(assignments_bp, url_prefix='/api')
    
    # Make mongo available to blueprints
    auth_bp.mongo = mongo
    scores_bp.mongo = mongo
    assignments_bp.mongo = mongo
    
    return app 