from flask import Flask, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from config.config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}}) # Recommended CORS setup
    JWTManager(app)
    
    # Initialize MongoDB
    mongo = PyMongo()
    mongo.init_app(app)
    
    try:
        # Register blueprints
        from config.routes.auth import auth_bp
        from config.routes.scores import scores_bp
        from config.routes.assignments import assignments_bp
        
        app.register_blueprint(auth_bp, url_prefix='/api')
        app.register_blueprint(scores_bp, url_prefix='/api')
        app.register_blueprint(assignments_bp, url_prefix='/api')
        
        # Make mongo available to blueprints
        auth_bp.mongo = mongo
        scores_bp.mongo = mongo
        assignments_bp.mongo = mongo
        
        print("All blueprints registered successfully")
    except Exception as e:
        print(f"Error registering blueprints: {e}")
        # Add a basic route to test if app is working
        @app.route('/api/basic-test')
        def basic_test():
            return jsonify({"message": "App is working but blueprints failed to load", "error": str(e)}), 200
    
    @app.route('/api/health')
    def health_check():
        return jsonify({"status": "ok"}), 200

    # Add a test route to check MongoDB connection
    @app.route('/api/debug-mongo')
    def debug_mongo():
        try:
            # Test MongoDB connection
            mongo.db.command('ping')
            return jsonify({
                "status": "success",
                "message": "MongoDB is connected!",
                "mongo_uri": app.config.get('MONGO_URI', 'Not set'),
                "mongo_object": str(mongo),
                "db_name": mongo.db.name
            }), 200
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"MongoDB connection failed: {str(e)}",
                "mongo_uri": app.config.get('MONGO_URI', 'Not set'),
                "mongo_object": str(mongo)
            }), 500
    
    # Add a route to check environment variables
    @app.route('/api/debug-env')
    def debug_env():
        import os
        return jsonify({
            "MONGODB_URI": os.environ.get('MONGODB_URI', 'Not set'),
            "SECRET_KEY": "Set" if os.environ.get('SECRET_KEY') else "Not set",
            "MAIL_USERNAME": os.environ.get('MAIL_USERNAME', 'Not set'),
            "MAIL_PASSWORD": "Set" if os.environ.get('MAIL_PASSWORD') else "Not set",
            "app_config_mongo_uri": app.config.get('MONGO_URI', 'Not set')
        }), 200
    
    return app 