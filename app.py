from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
import jwt
import datetime
from functools import wraps

app = Flask(__name__)
CORS(app)

app.config["MONGO_URI"] = "mongodb://localhost:27017/gamecenter"
app.config["SECRET_KEY"] = "sekreti-i-fshehtë"  # Ndryshoje në prodhim
mongo = PyMongo(app)

VALID_SCHOOLS = [
    "Shkolla Fillore 'Iliria'",
    "Shkolla Fillore 'Dr. Ibrahim Rugova'",
    "Shkolla Fillore 'Ismail Qemali'",
    "Shkolla Fillore 'Dardania'"
]

# ========================== JWT DECORATOR ==========================

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        if not token:
            return jsonify({"error": "Token mungon!"}), 401
        try:
            data = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
            current_user = mongo.db.users.find_one({"_id": ObjectId(data["user_id"])})
            if not current_user:
                return jsonify({"error": "Përdoruesi nuk u gjet!"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token ka skaduar!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token i pavlefshëm!"}), 401

        return f(current_user, *args, **kwargs)
    return decorated

# ========================== REGISTER ==========================

@app.route("/register", methods=["POST"])
def register():
    data = request.json
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")
    school = data.get("school")
    teacher_id = data.get("teacher_id")

    if not all([name, email, password, role]):
        return jsonify({"error": "Të gjitha fushat janë të detyrueshme"}), 400

    if role == "teacher":
        if not school or school not in VALID_SCHOOLS:
            return jsonify({"error": "Shkolla e pavlefshme për mësuesin"}), 400
    elif role == "student":
        if not teacher_id:
            return jsonify({"error": "Duhet të zgjidhet mësuesi për studentin"}), 400
        teacher = mongo.db.users.find_one({"_id": ObjectId(teacher_id), "role": "teacher"})
        if not teacher:
            return jsonify({"error": "Mësuesi i zgjedhur nuk ekziston"}), 400
    else:
        return jsonify({"error": "Roli i pavlefshëm"}), 400

    if mongo.db.users.find_one({"email": email}):
        return jsonify({"error": "Email-i ekziston tashmë"}), 409

    hashed_password = generate_password_hash(password)

    user_doc = {
        "name": name,
        "email": email,
        "password": hashed_password,
        "role": role
    }

    if role == "teacher":
        user_doc["school"] = school
    else:
        user_doc["teacher_id"] = ObjectId(teacher_id)

    mongo.db.users.insert_one(user_doc)

    return jsonify({"message": "Regjistrimi u krye me sukses!"}), 201

# ========================== LOGIN ==========================

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = mongo.db.users.find_one({"email": email})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Email ose fjalëkalim i pasaktë!"}), 401

    token = jwt.encode({
        "user_id": str(user["_id"]),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=5)
    }, app.config["SECRET_KEY"], algorithm="HS256")

    return jsonify({
        "token": token,
        "role": user["role"],
        "name": user["name"]
    }), 200

# ========================== SAVE SCORE ==========================

@app.route("/save-score", methods=["POST"])
@token_required
def save_score(current_user):
    if current_user["role"] != "student":
        return jsonify({"error": "Vetëm studentët mund të ruajnë pikët!"}), 403

    data = request.json
    print("Data nga frontend:", data)
    game = data.get("game")
    score = data.get("score")

    if not game or score is None:
        return jsonify({"error": "Të dhënat janë të paplota!"}), 400

    print(f"Ruaj score për user: {current_user['_id']}, lojë: {game}, score: {score}")

    result = mongo.db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {f"scores.{game}": score}},
        upsert=True
    )

    print("Result update:", result.raw_result)

    return jsonify({"message": "Pikët u ruajtën me sukses!"}), 200


# ========================== GET SCORES (opsionale) ==========================

@app.route("/get-scores", methods=["GET"])
@token_required
def get_scores(current_user):
    if current_user["role"] != "student":
        return jsonify({"error": "Vetëm studentët mund të marrin pikët!"}), 403

    scores = current_user.get("scores", {})
    return jsonify({"scores": scores}), 200

# ========================== GET SCHOOLS ==========================

@app.route("/schools", methods=["GET"])
def get_schools():
    return jsonify(VALID_SCHOOLS), 200

# ========================== GET TEACHERS ==========================

@app.route("/teachers/<school>", methods=["GET"])
def get_teachers_by_school(school):
    if school not in VALID_SCHOOLS:
        return jsonify({"error": "Shkolla nuk ekziston"}), 404

    teachers = list(mongo.db.users.find(
        {"role": "teacher", "school": school},
        {"_id": 1, "name": 1}
    ))

    for t in teachers:
        t["_id"] = str(t["_id"])

    return jsonify({"teachers": teachers}), 200

# ========================== RUN ==========================

if __name__ == "__main__":
    app.run(debug=True)
