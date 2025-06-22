from flask import Blueprint, request, jsonify, g
from flask_pymongo import PyMongo
from bson import ObjectId
import jwt
from datetime import datetime, timedelta
from models.user import User
from config.config import Config
import random
import smtplib
from email.mime.text import MIMEText
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/test", methods=["GET"])
def test():
    try:
        # Test MongoDB connection
        auth_bp.mongo.db.command('ping')
        return jsonify({"message": "Server and MongoDB are working!"}), 200
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@auth_bp.route("/simple-test", methods=["GET"])
def simple_test():
    """Simple test route without MongoDB"""
    return jsonify({"message": "Auth blueprint is working!"}), 200

@auth_bp.route("/simple-login-test", methods=["POST"])
def simple_login_test():
    """Simple login test without User model"""
    try:
        print("Simple login test endpoint called")
        data = request.get_json()
        print("Request data:", data)
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        email = data.get("email")
        password = data.get("password")
        
        print(f"Login attempt for email: {email}")
        
        if not email or not password:
            return jsonify({"error": "Email dhe fjalëkalimi janë të detyrueshëm"}), 400

        # Just check if user exists without using User model
        user_data = auth_bp.mongo.db.users.find_one({"email": email})
        print(f"User found: {user_data is not None}")
        
        if not user_data:
            return jsonify({"error": "Email ose fjalëkalim i pasaktë!"}), 401

        # Check if email is verified
        if not user_data.get('is_verified', False):
            return jsonify({"error": "Ju lutem verifikoni email-in tuaj para se të hyni!"}), 401

        # Check password without User model
        if not check_password_hash(user_data['password'], password):
            return jsonify({"error": "Email ose fjalëkalim i pasaktë!"}), 401

        # Create token without User model
        token = jwt.encode({
            "user_id": str(user_data["_id"]),
            "exp": datetime.utcnow() + Config.JWT_ACCESS_TOKEN_EXPIRES
        }, Config.SECRET_KEY, algorithm="HS256")

        return jsonify({
            "token": token,
            "role": user_data.get("role", "student"),
            "name": user_data.get("name", ""),
            "message": "Login successful"
        }), 200
    except Exception as e:
        print(f"Simple login test error: {str(e)}")
        return jsonify({"error": f"Gabim gjatë login-it: {str(e)}"}), 500

@auth_bp.route("/test-login", methods=["POST"])
def test_login():
    """Debug route to test login functionality"""
    try:
        print("Test login endpoint called")
        data = request.get_json()
        print("Request data:", data)
        print("Request headers:", dict(request.headers))
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        email = data.get("email")
        password = data.get("password")
        
        print(f"Login attempt for email: {email}")
        
        if not email or not password:
            return jsonify({"error": "Email dhe fjalëkalimi janë të detyrueshëm"}), 400

        user_data = auth_bp.mongo.db.users.find_one({"email": email})
        print(f"User found: {user_data is not None}")
        
        if not user_data:
            return jsonify({"error": "Email ose fjalëkalim i pasaktë!"}), 401

        # Check if email is verified
        if not user_data.get('is_verified', False):
            return jsonify({"error": "Ju lutem verifikoni email-in tuaj para se të hyni!"}), 401

        user = User.from_dict(user_data)
        if not check_password_hash(user_data['password'], password):
            return jsonify({"error": "Email ose fjalëkalim i pasaktë!"}), 401

        token = jwt.encode({
            "user_id": str(user_data["_id"]),
            "exp": datetime.utcnow() + Config.JWT_ACCESS_TOKEN_EXPIRES
        }, Config.SECRET_KEY, algorithm="HS256")

        return jsonify({
            "token": token,
            "role": user.role,
            "name": user.name,
            "message": "Login successful"
        }), 200
    except Exception as e:
        print(f"Test login error: {str(e)}")
        return jsonify({"error": f"Gabim gjatë login-it: {str(e)}"}), 500

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'student') 
    school = data.get('school')
    
    if not name or not email or not password or not school:
        return jsonify({'error': 'Të dhënat janë të paplota!'}), 400

    if auth_bp.mongo.db.users.find_one({'email': email}):
        return jsonify({'error': 'Ky email ekziston tashmë!'}), 400

    hashed_password = generate_password_hash(password)
    
    # Generate verification code
    verification_code = str(random.randint(100000, 999999))
    
    user_data = {
        'name': name,
        'email': email,
        'password': hashed_password,
        'role': role,
        'school': school,
        'scores': {},
        'verification_code': verification_code,
        'is_verified': False
    }

    if role == 'teacher':
        class_level = data.get('class_level')
        if not class_level:
            return jsonify({'error': 'Ju lutem zgjidhni një klasë.'}), 400
        user_data['class_level'] = int(class_level)
    elif role == 'student':
        teacher_id = data.get('teacher_id')
        if not teacher_id:
            return jsonify({'error': 'Ju lutem zgjidhni një mësues.'}), 400
        try:
            teacher = auth_bp.mongo.db.users.find_one({'_id': ObjectId(teacher_id), 'role': 'teacher'})
            if not teacher:
                return jsonify({'error': 'Mësuesi i zgjedhur nuk është i vlefshëm.'}), 400
            user_data['teacher_id'] = ObjectId(teacher_id)
        except Exception:
            return jsonify({'error': 'Teacher ID i pavlefshëm.'}), 400

    # Insert user and send verification email
    try:
        auth_bp.mongo.db.users.insert_one(user_data)
        send_verification_email(email, verification_code)
        return jsonify({'message': 'Përdoruesi u regjistrua me sukses! Kontrolloni email-in për verifikim.'}), 201
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({'error': 'Gabim gjatë regjistrimit. Provoni përsëri.'}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email dhe fjalëkalimi janë të detyrueshëm"}), 400

        user_data = auth_bp.mongo.db.users.find_one({"email": email})
        if not user_data:
            return jsonify({"error": "Email ose fjalëkalim i pasaktë!"}), 401

        # Check if email is verified
        if not user_data.get('is_verified', False):
            return jsonify({"error": "Ju lutem verifikoni email-in tuaj para se të hyni!"}), 401

        user = User.from_dict(user_data)
        if not check_password_hash(user_data['password'], password):
            return jsonify({"error": "Email ose fjalëkalim i pasaktë!"}), 401

        token = jwt.encode({
            "user_id": str(user_data["_id"]),
            "exp": datetime.utcnow() + Config.JWT_ACCESS_TOKEN_EXPIRES
        }, Config.SECRET_KEY, algorithm="HS256")

        return jsonify({
            "token": token,
            "role": user.role,
            "name": user.name
        }), 200
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"error": f"Gabim gjatë login-it: {str(e)}"}), 500

@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    data = request.json
    email = data.get("email")
    code = data.get("code")
    if not email or not code:
        return jsonify({"error": "Email dhe kodi janë të detyrueshëm."}), 400
    user = auth_bp.mongo.db.users.find_one({"email": email})
    if not user:
        return jsonify({"error": "Përdoruesi nuk u gjet."}), 404
    if user.get("is_verified"):
        return jsonify({"message": "Email-i është verifikuar tashmë."}), 200
    if user.get("verification_code") != code:
        return jsonify({"error": "Kodi i verifikimit është i pasaktë."}), 400
    auth_bp.mongo.db.users.update_one(
        {"email": email},
        {"$set": {"is_verified": True}, "$unset": {"verification_code": ""}}
    )
    return jsonify({"message": "Email-i u verifikua me sukses!"}), 200

def send_verification_email(to_email, code):
    subject = "Kodi i verifikimit për Gjeniu i vogël"
    body = f"Përshëndetje!\n\nKodi juaj i verifikimit është: {code}\n\nFaleminderit që u regjistruat!"
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = Config.MAIL_DEFAULT_SENDER
    msg["To"] = to_email
    try:
        with smtplib.SMTP(Config.MAIL_SERVER, Config.MAIL_PORT) as server:
            server.starttls()
            server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
            server.sendmail(Config.MAIL_DEFAULT_SENDER, [to_email], msg.as_string())
    except Exception as e:
        print(f"Gabim gjatë dërgimit të emailit: {e}")

@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    data = request.json
    email = data.get("email")
    if not email:
        return jsonify({"error": "Email është i detyrueshëm."}), 400
    
    user = auth_bp.mongo.db.users.find_one({"email": email})
    if not user:
        return jsonify({"error": "Përdoruesi nuk u gjet."}), 404
    
    if user.get("is_verified"):
        return jsonify({"message": "Email-i është verifikuar tashmë."}), 200
    
    # Generate new verification code
    verification_code = str(random.randint(100000, 999999))
    
    try:
        auth_bp.mongo.db.users.update_one(
            {"email": email},
            {"$set": {"verification_code": verification_code}}
        )
        send_verification_email(email, verification_code)
        return jsonify({"message": "Kodi i verifikimit u dërgua përsëri!"}), 200
    except Exception as e:
        print(f"Resend verification error: {str(e)}")
        return jsonify({"error": "Gabim gjatë dërgimit të kodit. Provoni përsëri."}), 500

@auth_bp.route("/me", methods=["GET"])
def me():
    token = None
    if "Authorization" in request.headers:
        auth_header = request.headers["Authorization"]
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    if not token:
        return jsonify({"error": "Token mungon!"}), 401
    try:
        data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        user = auth_bp.mongo.db.users.find_one({"_id": ObjectId(data["user_id"])})
        if not user:
            return jsonify({"error": "Përdoruesi nuk u gjet!"}), 401

        # If user is a student, fetch their teacher's class_level
        if user.get('role') == 'student' and 'teacher_id' in user:
            try:
                teacher = auth_bp.mongo.db.users.find_one({"_id": ObjectId(user['teacher_id'])})
                if teacher and 'class_level' in teacher:
                    user['class_level'] = teacher['class_level']
            except Exception as e:
                print(f"Could not fetch teacher details for student: {str(e)}")

        # Prepare user data for sending, removing sensitive info
        user_data_to_send = user.copy()
        if 'password' in user_data_to_send:
            del user_data_to_send['password']
        
        # Convert ObjectIds to strings for JSON serialization
        user_data_to_send['_id'] = str(user_data_to_send['_id'])
        if 'teacher_id' in user_data_to_send:
            user_data_to_send['teacher_id'] = str(user_data_to_send['teacher_id'])

        return jsonify(user_data_to_send), 200
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token ka skaduar!"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Token i pavlefshëm!"}), 401

@auth_bp.route('/teachers', methods=['GET'])
def get_teachers():
    try:
        school = request.args.get('school')
        teacher_id = request.args.get('id')
        
        query = {'role': 'teacher'}
        if school:
            query['school'] = school
        if teacher_id:
            query['_id'] = ObjectId(teacher_id)
        
        print(f"Searching for teachers with query: {query}")
        teachers = list(auth_bp.mongo.db.users.find(query, {'_id': 1, 'name': 1, 'class_level': 1, 'school': 1}))
        print(f"Found {len(teachers)} teachers")
        
        for teacher in teachers:
            teacher['_id'] = str(teacher['_id'])
        return jsonify({'teachers': teachers}), 200
    except Exception as e:
        print(f"Error in get_teachers: {str(e)}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/debug/teachers', methods=['GET'])
def debug_teachers():
    try:
        all_teachers = list(auth_bp.mongo.db.users.find({'role': 'teacher'}, {'_id': 1, 'name': 1, 'class_level': 1, 'school': 1, 'email': 1}))
        for teacher in all_teachers:
            teacher['_id'] = str(teacher['_id'])
        return jsonify({'all_teachers': all_teachers, 'count': len(all_teachers)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get("email")
    
    if not email:
        return jsonify({"error": "Email është i detyrueshëm."}), 400
    
    user = auth_bp.mongo.db.users.find_one({"email": email})
    if not user:
        return jsonify({"error": "Nuk u gjet përdorues me këtë email."}), 404
    
    # Generate reset token
    reset_token = str(random.randint(100000, 999999))
    reset_expires = datetime.utcnow() + timedelta(hours=1)  # Token valid for 1 hour
    
    try:
        auth_bp.mongo.db.users.update_one(
            {"email": email},
            {"$set": {
                "reset_token": reset_token,
                "reset_expires": reset_expires
            }}
        )
        
        # Send reset email
        send_reset_email(email, reset_token)
        
        return jsonify({"message": "Email-i për rivendosjen e fjalëkalimit u dërgua me sukses!"}), 200
    except Exception as e:
        print(f"Forgot password error: {str(e)}")
        return jsonify({"error": "Gabim gjatë dërgimit të email-it. Provoni përsëri."}), 500

def send_reset_email(to_email, reset_token):
    subject = "Rivendos Fjalëkalimin - Gjeniu i vogël"
    body = f"""Përshëndetje!

Keni kërkuar të rivendosni fjalëkalimin tuaj për Gjeniu i vogël.

Kodi juaj për rivendosjen e fjalëkalimit është: {reset_token}

Ky kod është i vlefshëm për 1 orë.

Nëse nuk keni kërkuar këtë, ju lutem injoroni këtë email.

Faleminderit!
Gjeniu i vogël Team"""
    
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = Config.MAIL_DEFAULT_SENDER
    msg["To"] = to_email
    
    try:
        with smtplib.SMTP(Config.MAIL_SERVER, Config.MAIL_PORT) as server:
            server.starttls()
            server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
            server.sendmail(Config.MAIL_DEFAULT_SENDER, [to_email], msg.as_string())
    except Exception as e:
        print(f"Gabim gjatë dërgimit të emailit të reset: {e}")

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.json
    email = data.get("email")
    reset_token = data.get("reset_token")
    new_password = data.get("new_password")
    
    if not email or not reset_token or not new_password:
        return jsonify({"error": "Të gjitha fushat janë të detyrueshme."}), 400
    
    user = auth_bp.mongo.db.users.find_one({"email": email})
    if not user:
        return jsonify({"error": "Përdoruesi nuk u gjet."}), 404
    
    if not user.get("reset_token") or user.get("reset_token") != reset_token:
        return jsonify({"error": "Kodi i rivendosjes është i pasaktë."}), 400
    
    if user.get("reset_expires") and user.get("reset_expires") < datetime.utcnow():
        return jsonify({"error": "Kodi i rivendosjes ka skaduar."}), 400
    
    # Hash new password and update user
    hashed_password = generate_password_hash(new_password)
    
    try:
        auth_bp.mongo.db.users.update_one(
            {"email": email},
            {"$set": {"password": hashed_password}, "$unset": {"reset_token": "", "reset_expires": ""}}
        )
        return jsonify({"message": "Fjalëkalimi u ndryshua me sukses!"}), 200
    except Exception as e:
        print(f"Reset password error: {str(e)}")
        return jsonify({"error": "Gabim gjatë ndryshimit të fjalëkalimit. Provoni përsëri."}), 500 