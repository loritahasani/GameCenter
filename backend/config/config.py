from datetime import timedelta

class Config:
    MONGO_URI = "mongodb://localhost:27017/gamecenter"
    SECRET_KEY = "sekreti-i-fshehtë"  # Change in production
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=5)
    
    VALID_SCHOOLS = [
        "Shkolla Fillore '1 Maj'",
        "Shkolla Fillore '28 Nëntori'",
        "Shkolla Fillore '7 Marsi'",
        "Shkolla Fillore '11 Janari'",
        "Shkolla Fillore 'Deshmoret e Kombit'"
    ]

    # SMTP/Email settings
    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = "loritahasani5@gmail.com"  # Ndrysho me emailin tënd
    MAIL_PASSWORD = "evyy tspm puhx uclb"   # Ndrysho me passwordin ose app password
    MAIL_DEFAULT_SENDER = "loritahasani5@gmail.com"  # Ndrysho me emailin tënd 