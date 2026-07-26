from flask import Blueprint, request, jsonify
from database import get_db

faq_bp = Blueprint("faq", __name__)

@faq_bp.route("/api/questions", methods=["POST"])
def submit_question():
    data = request.get_json() or {}
    
    question = data.get("question", "").strip()
    user_id = data.get("user_id")  # Optional
    email = data.get("email")      # Optional

    if not question:
        return jsonify({"message": "Question text is required."}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO custom_questions (user_id, email, question, status, created_at)
            VALUES (%s, %s, %s, 'pending', CURRENT_TIMESTAMP)
            """,
            (user_id, email, question)
        )
        conn.commit()

        return jsonify({"message": "Question submitted successfully!"}), 201

    except Exception as e:
        conn.rollback()
        print("Error submitting question:", str(e))
        return jsonify({"message": "Failed to submit question.", "error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()