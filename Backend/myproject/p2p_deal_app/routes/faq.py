from flask import Blueprint, request, jsonify
from database import get_db

faq_bp = Blueprint("faq", __name__)

@faq_bp.route("/api/faq/submit-question", methods=["POST"])
def submit_question():
    data = request.get_json()
    question = (data.get("question") or "").strip()
    if not question:
        return jsonify({"message": "Question is required"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO faq_questions (user_id, email, firstname, lastname, question, status, created_at)
            VALUES (%s, %s, %s, %s, %s, 'New', NOW())
            RETURNING question_id
            """,
            (data.get("user_id"), data.get("email"), data.get("firstname"), data.get("lastname"), question),
        )
        question_id = cursor.fetchone()[0]
        conn.commit()
        return jsonify({"question_id": question_id, "status": "New"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@faq_bp.route("/api/faq/questions", methods=["GET"])
def list_questions():
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT question_id, user_id, email, firstname, lastname, question, status, created_at
            FROM faq_questions
            ORDER BY created_at DESC
            """
        )
        rows = cursor.fetchall()
        result = [
            {
                "question_id": r[0], "user_id": r[1], "email": r[2],
                "firstname": r[3], "lastname": r[4], "question": r[5],
                "status": r[6], "created_at": r[7].isoformat() if r[7] else None,
            }
            for r in rows
        ]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()