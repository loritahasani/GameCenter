from datetime import datetime
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash

class User:
    def __init__(self, name, email, password, role, school, teacher_id=None, is_verified=False, verification_code=None):
        self.name = name
        self.email = email
        self.password = generate_password_hash(password) if password else ""
        self.role = role
        self.school = school
        self.teacher_id = ObjectId(teacher_id) if teacher_id else None
        self.scores = {}
        self.created_at = datetime.utcnow()
        self.is_verified = is_verified
        self.verification_code = verification_code

    def to_dict(self):
        return {
            "name": self.name,
            "email": self.email,
            "password": self.password,
            "role": self.role,
            "school": self.school,
            "teacher_id": self.teacher_id,
            "is_verified": self.is_verified,
            "verification_code": self.verification_code
        }

    @classmethod
    def from_dict(cls, data):
        try:
            user = cls(
                name=data.get("name", ""),
                email=data.get("email", ""),
                password="",  # Password is not needed for from_dict
                role=data.get("role", "student"),
                school=data.get("school", ""),
                teacher_id=str(data.get("teacher_id")) if data.get("teacher_id") else None,
                is_verified=data.get("is_verified", False),
                verification_code=data.get("verification_code")
            )
            user.password = data.get("password", "")  # Set the hashed password
            return user
        except Exception as e:
            print(f"Error creating User from dict: {e}")
            print(f"Data: {data}")
            raise

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def update_score(self, game, score):
        self.scores[game] = score 