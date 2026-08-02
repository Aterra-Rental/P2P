from flask import Blueprint, request, jsonify
from database import get_db
from socketio_instance import socketio

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
            INSERT INTO faq_questions
            (
                user_id,
                question
            )
            VALUES
            (
                %s,
                %s
            )
            RETURNING question_id;
            """,
            (
                data.get("user_id"),
                question,
            ),
        )

        question_id = cursor.fetchone()[0]

        conn.commit()

        socketio.emit(
            "faq_question_submitted",
            {"question_id": question_id},
            room="admins",
        )

        return jsonify(
            {
                "question_id": question_id,
                "status": "Pending",
            }
        ), 201

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
            SELECT
                fq.question_id,
                fq.user_id,
                ul.email,
                ud.firstname,
                ud.lastname,
                fq.question,
                fq.status,
                fq.admin_reply,
                fq.created_at,
                fq.answered_at
            FROM faq_questions fq
            JOIN user_login ul
                ON fq.user_id = ul.user_id
            LEFT JOIN user_details ud
                ON fq.user_id = ud.user_id
            ORDER BY fq.created_at DESC;
            """
        )

        rows = cursor.fetchall()

        result = []

        for r in rows:
            result.append(
                {
                    "question_id": r[0],
                    "user_id": r[1],
                    "email": r[2],
                    "firstname": r[3],
                    "lastname": r[4],
                    "question": r[5],
                    "status": r[6],
                    "admin_reply": r[7],
                    "created_at": r[8].isoformat() if r[8] else None,
                    "answered_at": r[9].isoformat() if r[9] else None,
                }
            )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@faq_bp.route("/api/faq/reply", methods=["POST"])
def reply_question():
    data = request.get_json()

    question_id = data.get("question_id")
    admin_reply = (data.get("admin_reply") or "").strip()
    answered_by = data.get("answered_by")

    if not question_id or not admin_reply:
        return jsonify({"message": "Missing required fields"}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE faq_questions
            SET
                admin_reply = %s,
                status = 'Answered',
                answered_at = NOW(),
                answered_by = %s
            WHERE question_id = %s
            """,
            (
                admin_reply,
                answered_by,
                question_id,
            ),
        )

        conn.commit()

        return jsonify({"message": "Reply submitted successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()