from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from flask_pymongo import PyMongo
from flask_cors import CORS
from datetime import timedelta, datetime

app = Flask(__name__)
CORS(app)

# MongoDB configuration
app.config["MONGO_URI"] = "mongodb://localhost:27017/game_center"
mongo = PyMongo(app)

# JWT configuration
app.config["JWT_SECRET_KEY"] = "supersecretkey"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=1)
jwt = JWTManager(app)

# Bcrypt configuration
bcrypt = Bcrypt(app)

# --------------------- REGISTER ---------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")
    school = data.get("school")

    if mongo.db.users.find_one({"email": email}):
        return jsonify({"error": "Ky email ekziston!"}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
    mongo.db.users.insert_one({
        "name": name,
        "email": email,
        "password": hashed_pw,
        "role": role,
        "school": school
    })

    return jsonify({"message": "Regjistrimi u krye me sukses!"}), 201

# --------------------- LOGIN ---------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = mongo.db.users.find_one({"email": email})
    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"error": "Email ose fjalëkalim i pasaktë!"}), 401

    access_token = create_access_token(identity=email)

    return jsonify({
        "message": "Kyçja u krye me sukses!",
        "token": access_token,
        "role": user["role"],
        "studentId": email 
    }), 200

# --------------------- GET TEACHERS ---------------------
@app.route("/teachers", methods=["GET"])
@jwt_required()
def get_teachers():
    school = request.args.get("school")
    if not school:
        return jsonify({"error": "Shkolla nuk është zgjedhur!"}), 400

    teachers = mongo.db.users.find({"role": "teacher", "school": school})
    teacher_list = [{"name": teacher["name"], "email": teacher["email"]} for teacher in teachers]

    return jsonify(teacher_list)

# --------------------- GET PROFILE ---------------------
@app.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    current_user = get_jwt_identity()
    user = mongo.db.users.find_one({"email": current_user}, {"_id": 0, "password": 0})

    if not user:
        return jsonify({"error": "Përdoruesi nuk u gjet!"}), 404

    return jsonify(user), 200

# --------------------- SAVE SCORE ---------------------
@app.route("/save-score", methods=["POST"])
@jwt_required()
def save_score():
    current_user = get_jwt_identity()  # Nxjerrim ID e nxënësit nga tokeni JWT
    data = request.get_json()
    score = data.get("score")
    game = data.get("game", "math_quiz")

    if score is None:
        return jsonify({"error": "Pikët mungojnë!"}), 400

    mongo.db.scores.insert_one({
        "student_id": current_user,  # ID e nxënësit është email-i që vjen nga JWT
        "score": score,
        "game": game,
        "timestamp": datetime.utcnow()
    })

    return jsonify({"message": "Pikët u ruajtën me sukses!"}), 201


# --------------------- RUN APP ---------------------
if __name__ == "__main__":
    app.run(debug=True)
