from flask import Blueprint, jsonify, request
from database import get_db
from socketio_instance import get_online_user_ids, is_user_online

users_bp = Blueprint("admin_users", __name__)


@users_bp.route("/users/stats", methods=["GET"])
def get_user_stats():

    conn = get_db()
    cur = conn.cursor()

    try:

        cur.execute("SELECT COUNT(*) FROM user_login;")
        total = cur.fetchone()[0]

        online = len(get_online_user_ids())
        offline = max(total - online, 0)

        return jsonify({
            "total": total,
            "online": online,
            "offline": offline
        }), 200

    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()


@users_bp.route("/users", methods=["GET"])
def get_users():

    conn = get_db()
    cur = conn.cursor()

    try:

        search = request.args.get("search", "", type=str).strip()
        status = request.args.get("status", "", type=str).strip()

        try:
            page = int(request.args.get("page", 1))
        except (TypeError, ValueError):
            page = 1

        try:
            per_page = int(request.args.get("per_page", 10))
        except (TypeError, ValueError):
            per_page = 10

        if page < 1:
            page = 1

        if per_page < 1:
            per_page = 10

        if per_page > 100:
            per_page = 100

        conditions = []
        params = []

        if search:
            conditions.append("""
                (
                    ul.email ILIKE %s
                    OR ud.firstname ILIKE %s
                    OR ud.lastname ILIKE %s
                    OR ud.username ILIKE %s
                    OR ud.phonenumber ILIKE %s
                )
            """)
            like_term = f"%{search}%"
            params += [like_term, like_term, like_term, like_term, like_term]

        if status:
            if status.lower() == "not_started":
                conditions.append("ud.verify_status IS NULL")
            else:
                conditions.append("ud.verify_status = %s")
                params.append(status)

        where_clause = ""

        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)

        # Total count for pagination (same filters, same join)
        cur.execute(
            f"""
            SELECT COUNT(*)
            FROM user_login ul
            LEFT JOIN user_details ud
                ON ul.user_id = ud.user_id
            {where_clause};
            """,
            tuple(params),
        )

        total = cur.fetchone()[0]

        pages = (total + per_page - 1) // per_page if total > 0 else 1
        offset = (page - 1) * per_page

        cur.execute(
            f"""
            SELECT
                ul.user_id,
                ul.email,
                ud.firstname,
                ud.lastname,
                ud.username,
                ud.phonenumber,
                ud.verify_status,
                ud.joined_at,
                ud.profile_picture
            FROM user_login ul
            LEFT JOIN user_details ud
                ON ul.user_id = ud.user_id
            {where_clause}
            ORDER BY ul.user_id DESC
            LIMIT %s OFFSET %s;
            """,
            tuple(params) + (per_page, offset),
        )

        rows = cur.fetchall()

        users = []

        for row in rows:
            user_id = row[0]
            firstname = row[2]
            lastname = row[3]

            fullname = None

            if firstname or lastname:
                fullname = f"{firstname or ''} {lastname or ''}".strip()

            users.append({
                "user_id": user_id,
                "email": row[1],
                "fullname": fullname,
                "username": row[4],
                "phonenumber": row[5],
                "verify_status": row[6],
                "joined_at": row[7].isoformat() if row[7] else None,
                "profile_picture": row[8],
                "online": is_user_online(user_id)
            })

        return jsonify({
            "users": users,
            "page": page,
            "pages": pages,
            "total": total
        }), 200

    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()


@users_bp.route("/users/<int:user_id>", methods=["GET"])
def get_user_detail(user_id):

    conn = get_db()
    cur = conn.cursor()

    try:

        cur.execute(
            """
            SELECT
                ul.user_id,
                ul.email,
                ud.firstname,
                ud.lastname,
                ud.username,
                ud.phonenumber,
                ud.address,
                ud.dob,
                ud.verify_status,
                ud.joined_at,
                ud.profile_picture
            FROM user_login ul
            LEFT JOIN user_details ud
                ON ul.user_id = ud.user_id
            WHERE ul.user_id = %s;
            """,
            (user_id,),
        )

        row = cur.fetchone()

        if row is None:
            return jsonify({
                "message": "User not found"
            }), 404

        return jsonify({
            "user_id": row[0],
            "email": row[1],
            "firstname": row[2],
            "lastname": row[3],
            "username": row[4],
            "phonenumber": row[5],
            "address": row[6],
            "dob": row[7].isoformat() if row[7] else None,
            "verify_status": row[8],
            "joined_at": row[9].isoformat() if row[9] else None,
            "profile_picture": row[10],
            "online": is_user_online(user_id)
        }), 200

    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()