from flask import Blueprint, request, jsonify
from bson import ObjectId
from functools import wraps
import jwt
from config.config import Config
from datetime import datetime

assignments_bp = Blueprint('assignments', __name__)

# This is the same token_required decorator from scores.py
# In a larger application, this would be moved to a shared utility file
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
            data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
            # The user data is attached to the request object in some frameworks,
            # but here we'll pass it as the first argument to the decorated function.
            current_user = assignments_bp.mongo.db.users.find_one({"_id": ObjectId(data["user_id"])})
            if not current_user:
                return jsonify({"error": "Përdoruesi nuk u gjet!"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token ka skaduar!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token i pavlefshëm!"}), 401

        return f(current_user, *args, **kwargs)
    return decorated

@assignments_bp.route("/assignments", methods=["POST"])
@token_required
def create_assignment(current_user):
    if current_user.get("role") != "teacher":
        return jsonify({"error": "Only teachers can create assignments."}), 403

    data = request.get_json()
    title = data.get("title")
    description = data.get("description")

    if not title or not description:
        return jsonify({"error": "Title and description are required."}), 400

    new_assignment = {
        "teacher_id": current_user["_id"],
        "title": title,
        "description": description,
        "created_at": datetime.utcnow()
    }

    result = assignments_bp.mongo.db.assignments.insert_one(new_assignment)
    new_assignment["_id"] = str(result.inserted_id)
    new_assignment["teacher_id"] = str(new_assignment["teacher_id"])


    return jsonify({"message": "Assignment created successfully.", "assignment": new_assignment}), 201

@assignments_bp.route("/assignments", methods=["GET"])
@token_required
def get_assignments(current_user):
    if current_user.get("role") != "teacher":
        return jsonify({"error": "Only teachers can view assignments."}), 403

    assignments = list(assignments_bp.mongo.db.assignments.find({"teacher_id": current_user["_id"]}).sort("created_at", -1))

    for assignment in assignments:
        assignment["_id"] = str(assignment["_id"])
        assignment["teacher_id"] = str(assignment["teacher_id"])

    return jsonify(assignments), 200

# Game and content filtering logic
GAME_CONFIG = {
    "1": ["mathquiz1", "memorygame", "wordsearch"],
    "2": ["mathquiz2", "crossword", "peremri"],
    "3": ["mathquiz3", "memorygame", "wordsearch"],
    "4": ["mathquiz4", "crossword", "peremri"],
    "5": ["mathquiz5", "memorygame", "wordsearch"]
}

@assignments_bp.route("/my-games", methods=["GET"])
@token_required
def get_my_games(current_user):
    print(f"DEBUG: get_my_games called for user: {current_user.get('name')} with role: {current_user.get('role')}")
    
    if current_user.get("role") != "student":
        print("DEBUG: User is not a student")
        return jsonify({"error": "Only students can view games."}), 403
    
    teacher_id = current_user.get("teacher_id")
    print(f"DEBUG: Student's teacher_id: {teacher_id}")
    
    if not teacher_id:
        print("DEBUG: Student has no teacher_id")
        return jsonify({"error": "Student is not associated with a teacher."}), 400

    # The teacher_id from the student document is already an ObjectId
    teacher = assignments_bp.mongo.db.users.find_one({"_id": teacher_id})
    print(f"DEBUG: Found teacher: {teacher.get('name') if teacher else 'None'}")
    
    if not teacher:
        print("DEBUG: Teacher not found")
        return jsonify({"error": "Teacher not found."}), 404
        
    class_level = teacher.get("class_level")
    print(f"DEBUG: Teacher's class_level: {class_level}")
    
    if not class_level or str(class_level) not in GAME_CONFIG:
        class_level = "1"
        print(f"DEBUG: Using default class_level: {class_level}")
    else:
        class_level = str(class_level)
        print(f"DEBUG: Using teacher's class_level: {class_level}")
    
    game_list = GAME_CONFIG.get(class_level, [])
    print(f"DEBUG: Games for class {class_level}: {game_list}")
    
    return jsonify({"games": game_list}), 200

@assignments_bp.route("/my-assignments", methods=["GET"])
@token_required
def get_my_assignments(current_user):
    if current_user.get("role") != "student":
        return jsonify({"error": "Only students can view assignments."}), 403

    teacher_id = current_user.get("teacher_id")
    if not teacher_id:
        return jsonify({"error": "Student is not associated with a teacher."}), 400
    
    # Find all assignments from the student's teacher
    assignments = list(assignments_bp.mongo.db.assignments.find({
        "teacher_id": ObjectId(teacher_id)
    }).sort("created_at", -1))

    for assignment in assignments:
        assignment["_id"] = str(assignment["_id"])
        assignment["teacher_id"] = str(assignment["teacher_id"])

    return jsonify(assignments), 200

@assignments_bp.route("/submit-assignment", methods=["POST"])
@token_required
def submit_assignment(current_user):
    if current_user.get("role") != "student":
        return jsonify({"error": "Only students can submit assignments."}), 403

    file = request.files.get('file')
    assignment_id = request.form.get('assignment_id')
    message = request.form.get('message')

    if not assignment_id:
        return jsonify({"error": "Assignment ID is required."}), 400

    if not file and not message:
        return jsonify({"error": "A file or a message is required for submission."}), 400
    
    # Check if assignment exists and belongs to student's teacher
    try:
        assignment = assignments_bp.mongo.db.assignments.find_one({"_id": ObjectId(assignment_id)})
        if not assignment:
            return jsonify({"error": "Assignment not found."}), 404
        if assignment["teacher_id"] != current_user.get("teacher_id"):
            return jsonify({"error": "You can only submit assignments from your teacher."}), 403
    except Exception:
        return jsonify({"error": "Invalid Assignment ID."}), 400

    submission = {
        "student_id": current_user["_id"],
        "assignment_id": ObjectId(assignment_id),
        "submitted_at": datetime.utcnow()
    }

    if file and file.filename != '':
        # In a real app, save file to a secure location (e.g., S3) and store URL
        submission["filename"] = file.filename
    if message:
        submission["message"] = message

    assignments_bp.mongo.db.submissions.insert_one(submission)

    return jsonify({"message": "Assignment submitted successfully."}), 201

@assignments_bp.route("/assignments/<assignment_id>", methods=["DELETE"])
@token_required
def delete_assignment(current_user, assignment_id):
    if current_user.get("role") != "teacher":
        return jsonify({"error": "Only teachers can delete assignments."}), 403

    try:
        # Check if assignment exists and belongs to the teacher
        assignment = assignments_bp.mongo.db.assignments.find_one({"_id": ObjectId(assignment_id)})
        if not assignment:
            return jsonify({"error": "Assignment not found."}), 404
        
        if assignment["teacher_id"] != current_user["_id"]:
            return jsonify({"error": "You can only delete your own assignments."}), 403

        # Delete the assignment
        result = assignments_bp.mongo.db.assignments.delete_one({"_id": ObjectId(assignment_id)})
        
        if result.deleted_count > 0:
            # Also delete any submissions for this assignment
            assignments_bp.mongo.db.submissions.delete_many({"assignment_id": ObjectId(assignment_id)})
            return jsonify({"message": "Assignment deleted successfully."}), 200
        else:
            return jsonify({"error": "Failed to delete assignment."}), 500
            
    except Exception as e:
        return jsonify({"error": "Invalid assignment ID."}), 400

@assignments_bp.route("/assignments/<assignment_id>/submissions", methods=["GET"])
@token_required
def get_assignment_submissions(current_user, assignment_id):
    if current_user.get("role") != "teacher":
        return jsonify({"error": "Only teachers can view assignment submissions."}), 403

    try:
        # Check if assignment exists and belongs to the teacher
        assignment = assignments_bp.mongo.db.assignments.find_one({"_id": ObjectId(assignment_id)})
        if not assignment:
            return jsonify({"error": "Assignment not found."}), 404
        
        if assignment["teacher_id"] != current_user["_id"]:
            return jsonify({"error": "You can only view submissions for your own assignments."}), 403

        # Get all submissions for this assignment
        submissions = list(assignments_bp.mongo.db.submissions.find({
            "assignment_id": ObjectId(assignment_id)
        }).sort("submitted_at", -1))

        # Add student names to submissions
        for submission in submissions:
            submission["_id"] = str(submission["_id"])
            submission["assignment_id"] = str(submission["assignment_id"])
            submission["student_id"] = str(submission["student_id"])
            
            # Get student name
            student = assignments_bp.mongo.db.users.find_one({"_id": submission["student_id"]})
            if student:
                submission["student_name"] = student.get("name", "E panjohur")
            else:
                submission["student_name"] = "E panjohur"

        return jsonify(submissions), 200
        
    except Exception as e:
        return jsonify({"error": "Invalid assignment ID."}), 400

@assignments_bp.route("/test-games", methods=["GET"])
def test_games():
    """Simple test endpoint to verify games configuration"""
    return jsonify({
        "message": "Games API is working",
        "game_config": GAME_CONFIG
    }), 200 