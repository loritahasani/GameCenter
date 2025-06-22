from datetime import timedelta
import os

class Config:
    MONGO_URI = os.environ.get('MONGODB_URI', "mongodb://localhost:27017/gamecenter")
    MONGODB_SETTINGS = {
        'host': os.environ.get('MONGODB_URI', "mongodb://localhost:27017/gamecenter")
    }
    SECRET_KEY = os.environ.get('SECRET_KEY', "sekreti-i-fshehtë")  # Change in production
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=5)
    
    VALID_SCHOOLS = [
        "Shkolla Fillore '1 Maj'",
        "Shkolla Fillore '28 Nëntori'",
        "Shkolla Fillore '7 Marsi'",
        "Shkolla Fillore '11 Janari'",
        "Shkolla Fillore 'Deshmoret e Kombit'"
    ]

    # SMTP/Email settings
    MAIL_SERVER = os.environ.get('MAIL_SERVER', "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', "loritahasani5@gmail.com")
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', "evyy tspm puhx uclb")
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', "loritahasani5@gmail.com") 