from flask import Blueprint, request, jsonify
from flask_pymongo import PyMongo
from bson import ObjectId
from functools import wraps
import jwt
from config.config import Config
from datetime import datetime
from werkzeug.utils import secure_filename
import os

scores_bp = Blueprint('api', __name__)

MAX_POINTS = {
    "mathquiz1": 45,
    "memorygame": 35,
    "wordsearch": 30,
    "mathquiz2": 45,
    "mathquiz3": 45,
    "mathquiz4": 45,
    "mathquiz5": 45,
    "crossword": 30,
    "peremri": 15
}

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
            current_user = scores_bp.mongo.db.users.find_one({"_id": ObjectId(data["user_id"])})
            if not current_user:
                return jsonify({"error": "Përdoruesi nuk u gjet!"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token ka skaduar!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token i pavlefshëm!"}), 401

        return f(current_user, *args, **kwargs)
    return decorated

@scores_bp.route("/save-score", methods=["POST"])
@token_required
def save_score(current_user):
    if current_user["role"] != "student":
        return jsonify({"error": "Vetëm studentët mund të ruajnë pikët!"}), 403

    data = request.json
    game = data.get("game")
    score = data.get("score")

    if not game or score is None:
        return jsonify({"error": "Të dhënat janë të paplota!"}), 400

    score = min(score, MAX_POINTS.get(game, score))

    # Shto një tentativë të re me pikë dhe datë
    attempt = {"score": score, "date": datetime.utcnow().isoformat()}
    result = scores_bp.mongo.db.users.update_one(
        {"_id": current_user["_id"]},
        {"$push": {f"scores.{game}": attempt}},
        upsert=True
    )

    return jsonify({"message": "Pikët u ruajtën me sukses!"}), 200

@scores_bp.route("/get-scores", methods=["GET"])
@token_required
def get_scores(current_user):
    if current_user["role"] == "teacher":
        # Get all students' scores for this teacher
        students = list(scores_bp.mongo.db.users.find(
            {"teacher_id": current_user["_id"]},
            {"name": 1, "email": 1, "scores": 1}
        ))
        # Konverto ObjectId në string për JSON
        for s in students:
            s["_id"] = str(s["_id"])
        return jsonify({"students": students}), 200
    elif current_user["role"] == "student":
        # Get all attempts for this student's scores
        scores = current_user.get("scores", {})
        return jsonify({"scores": scores}), 200
    else:
        return jsonify({"error": "Roli i pavlefshëm"}), 403

@scores_bp.route("/student/<student_id>", methods=["GET"])
@token_required
def get_student_detail(current_user, student_id):
    # Vetëm mësuesi mund të shohë nxënësit e tij
    if current_user["role"] != "teacher":
        return jsonify({"error": "Vetëm mësuesit kanë qasje!"}), 403
    try:
        student = scores_bp.mongo.db.users.find_one({"_id": ObjectId(student_id)})
        if not student:
            return jsonify({"error": "Nxënësi nuk u gjet!"}), 404
        # Kontrollo që nxënësi i përket këtij mësuesi
        if str(student.get("teacher_id")) != str(current_user["_id"]):
            return jsonify({"error": "Nuk keni qasje në këtë nxënës!"}), 403
        return jsonify({
            "name": student.get("name"),
            "email": student.get("email"),
            "scores": student.get("scores", {})
        }), 200
    except Exception as e:
        return jsonify({"error": f"Gabim: {str(e)}"}), 500

@scores_bp.route('/assignments', methods=['POST'])
@token_required
def create_assignment(current_user):
    if current_user.get('role') != 'teacher':
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    deadline_str = data.get('deadline')
    
    if not title or not description:
        return jsonify({'error': 'Title and description are required'}), 400

    deadline = None
    if deadline_str:
        try:
            deadline = datetime.fromisoformat(deadline_str)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid deadline format.'}), 400

    new_assignment = {
        'teacher_id': current_user['_id'],
        'title': title,
        'description': description,
        'created_at': datetime.utcnow(),
        'deadline': deadline
    }
    
    scores_bp.mongo.db.assignments.insert_one(new_assignment)
    
    return jsonify({'message': 'Assignment created successfully'}), 201

@scores_bp.route('/assignments', methods=['GET'])
@token_required
def get_assignments(current_user):
    # If teacher, get assignments they created
    if current_user.get('role') == 'teacher':
        assignments = list(scores_bp.mongo.db.assignments.find({'teacher_id': current_user['_id']}))
    # If student, get assignments from their teacher
    elif current_user.get('role') == 'student':
        if 'teacher_id' not in current_user:
             return jsonify({'error': 'Student is not assigned to a teacher'}), 400
        assignments = list(scores_bp.mongo.db.assignments.find({'teacher_id': current_user['teacher_id']}))
    else:
        return jsonify({'error': 'Invalid user role'}), 400

    for assignment in assignments:
        assignment['_id'] = str(assignment['_id'])
        if 'teacher_id' in assignment:
            assignment['teacher_id'] = str(assignment['teacher_id'])
        if assignment.get('deadline') and isinstance(assignment['deadline'], datetime):
            assignment['deadline'] = assignment['deadline'].isoformat()

    return jsonify(assignments), 200

@scores_bp.route('/assignments/<assignment_id>', methods=['GET'])
@token_required
def get_assignment(current_user, assignment_id):
    try:
        assignment = scores_bp.mongo.db.assignments.find_one({'_id': ObjectId(assignment_id)})
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404

        # Ensure either the teacher who created it or a student of that teacher is accessing it
        is_teacher_owner = current_user.get('role') == 'teacher' and str(assignment.get('teacher_id')) == str(current_user.get('_id'))
        is_student_in_class = current_user.get('role') == 'student' and str(assignment.get('teacher_id')) == str(current_user.get('teacher_id'))

        if not is_teacher_owner and not is_student_in_class:
            return jsonify({'error': 'Unauthorized'}), 403

        assignment['_id'] = str(assignment['_id'])
        if 'teacher_id' in assignment:
            assignment['teacher_id'] = str(assignment['teacher_id'])
        if assignment.get('deadline') and isinstance(assignment['deadline'], datetime):
            assignment['deadline'] = assignment['deadline'].isoformat()

        return jsonify(assignment), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scores_bp.route('/assignments/<assignment_id>', methods=['PUT'])
@token_required
def update_assignment(current_user, assignment_id):
    if current_user.get('role') != 'teacher':
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        assignment = scores_bp.mongo.db.assignments.find_one({
            '_id': ObjectId(assignment_id),
            'teacher_id': current_user['_id']
        })
        if not assignment:
            return jsonify({'error': 'Assignment not found or you do not have permission to edit it'}), 404

        data = request.get_json()
        update_data = {}

        if 'title' in data and data['title']:
            update_data['title'] = data['title']
        if 'description' in data and data['description']:
            update_data['description'] = data['description']

        deadline = None
        if 'deadline' in data and data['deadline']:
            try:
                deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid deadline format.'}), 400
        update_data['deadline'] = deadline

        scores_bp.mongo.db.assignments.update_one(
            {'_id': ObjectId(assignment_id)},
            {'$set': update_data}
        )

        return jsonify({'message': 'Assignment updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scores_bp.route('/assignments/<assignment_id>', methods=['DELETE'])
@token_required
def delete_assignment(current_user, assignment_id):
    if current_user.get('role') != 'teacher':
        return jsonify({'error': 'Unauthorized'}), 401

    result = scores_bp.mongo.db.assignments.delete_one({
        '_id': ObjectId(assignment_id),
        'teacher_id': current_user['_id'] 
    })

    if result.deleted_count == 1:
        return jsonify({'message': 'Assignment deleted successfully'}), 200
    else:
        return jsonify({'error': 'Assignment not found or you do not have permission to delete it'}), 404 

@scores_bp.route('/assignments/<assignment_id>/submit', methods=['POST'])
@token_required
def submit_assignment(current_user, assignment_id):
    if current_user.get('role') != 'student':
        return jsonify({'error': 'Only students can submit assignments'}), 403

    try:
        assignment = scores_bp.mongo.db.assignments.find_one({'_id': ObjectId(assignment_id)})
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404

        if assignment.get('deadline') and datetime.utcnow() > assignment['deadline']:
            return jsonify({'error': 'Afati për këtë detyrë ka kaluar.'}), 403

        if assignment.get('teacher_id') != current_user.get('teacher_id'):
            return jsonify({'error': 'This assignment is not for your class'}), 403

        submission_text = request.form.get('text')
        submission_file = request.files.get('file')

        if not submission_text and not submission_file:
            return jsonify({'error': 'Submission cannot be empty. Provide text or a file.'}), 400

        file_path = None
        if submission_file:
            filename = secure_filename(submission_file.filename)
            unique_filename = f"{current_user['_id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
            
            file_path_full = os.path.join(scores_bp.upload_folder, unique_filename)
            submission_file.save(file_path_full)
            
            file_path = os.path.join('uploads', unique_filename)

        new_attempt = {
            'attempt_id': ObjectId(),
            'text': submission_text,
            'file_path': file_path,
            'submitted_at': datetime.utcnow()
        }

        scores_bp.mongo.db.submissions.update_one(
            {'assignment_id': ObjectId(assignment_id), 'student_id': current_user['_id']},
            {
                '$push': {'attempts': new_attempt},
                '$setOnInsert': {
                    'assignment_id': ObjectId(assignment_id),
                    'student_id': current_user['_id']
                }
            },
            upsert=True
        )

        return jsonify({'message': 'Assignment submitted successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scores_bp.route('/assignments/<assignment_id>/mysubmissions', methods=['GET'])
@token_required
def get_my_submissions(current_user, assignment_id):
    if current_user.get('role') != 'student':
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        submission_doc = scores_bp.mongo.db.submissions.find_one({
            'assignment_id': ObjectId(assignment_id),
            'student_id': current_user['_id']
        })

        if not submission_doc or 'attempts' not in submission_doc:
            return jsonify([]), 200

        for attempt in submission_doc['attempts']:
            attempt['attempt_id'] = str(attempt['attempt_id'])
            if isinstance(attempt.get('submitted_at'), datetime):
                attempt['submitted_at'] = attempt['submitted_at'].isoformat()

        return jsonify(submission_doc['attempts']), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scores_bp.route('/assignments/<assignment_id>/submissions', methods=['GET'])
@token_required
def get_assignment_submissions(current_user, assignment_id):
    if current_user.get('role') != 'teacher':
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        assignment = scores_bp.mongo.db.assignments.find_one({
            '_id': ObjectId(assignment_id),
            'teacher_id': current_user['_id']
        })
        if not assignment:
            return jsonify({'error': 'Assignment not found or you are not the owner'}), 404
        
        submissions_cursor = scores_bp.mongo.db.submissions.find({'assignment_id': ObjectId(assignment_id)})
        
        submissions = []
        for sub_doc in submissions_cursor:
            student = scores_bp.mongo.db.users.find_one({'_id': sub_doc['student_id']}, {'name': 1})
            sub_doc['student_name'] = student['name'] if student else 'Unknown Student'
            
            sub_doc['_id'] = str(sub_doc['_id'])
            sub_doc['assignment_id'] = str(sub_doc['assignment_id'])
            sub_doc['student_id'] = str(sub_doc['student_id'])
            
            if 'attempts' in sub_doc:
                for attempt in sub_doc['attempts']:
                    attempt['attempt_id'] = str(attempt['attempt_id'])
                    if isinstance(attempt.get('submitted_at'), datetime):
                        attempt['submitted_at'] = attempt['submitted_at'].isoformat()
            
            submissions.append(sub_doc)

        return jsonify(submissions), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500 