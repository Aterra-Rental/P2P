# from flask import Flask, request, jsonify, render_template
# import psycopg2
# import psycopg2.extras

# app = Flask(__name__)

# DB_CONFIG = {
#     "dbname": "p2p_deal_db",
#     "user": "postgres",
#     "password": "12345678",
#     "host": "localhost",
#     "port": "3319",
# }

# def get_db():
#     return psycopg2.connect(**DB_CONFIG)


# @app.route("/")
# def home():
#     return render_template("index.html")


# @app.route("/api/deal", methods=["POST"])
# def create_deal():
#     data = request.get_json()
#     buyer_id = data.get("buyer_id")
#     seller_id = data.get("seller_id")
#     middleman_id = data.get("middleman_id")
#     item_name = data.get("item_name")
#     price = data.get("price")

#     if not all([buyer_id, seller_id, item_name, price]):
#         return jsonify({"error": "missing fields"}), 400

#     conn = get_db()
#     cur = conn.cursor()
#     cur.execute(
#         """INSERT INTO deals (buyer_id, seller_id, middleman_id, item_name, price, status)
#            VALUES (%s, %s, %s, %s, %s, 'pending') RETURNING id""",
#         (buyer_id, seller_id, middleman_id, item_name, price)
#     )
#     deal_id = cur.fetchone()[0]
#     conn.commit()
#     cur.close()
#     conn.close()

#     return jsonify({"deal_id": deal_id, "status": "pending"}), 201


# @app.route("/api/deal/<int:deal_id>", methods=["GET"])
# def get_deal(deal_id):
#     conn = get_db()
#     cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
#     cur.execute("SELECT * FROM deals WHERE id = %s", (deal_id,))
#     deal = cur.fetchone()
#     cur.close()
#     conn.close()

#     if not deal:
#         return jsonify({"error": "deal not found"}), 404

#     return jsonify(dict(deal))


# @app.route("/api/deal/<int:deal_id>/status", methods=["PATCH"])
# def update_status(deal_id):
#     data = request.get_json()
#     new_status = data.get("status")

#     valid_statuses = ["pending", "active", "completed", "cancelled"]
#     if new_status not in valid_statuses:
#         return jsonify({"error": f"status must be one of {valid_statuses}"}), 400

#     conn = get_db()
#     cur = conn.cursor()
#     cur.execute("UPDATE deals SET status = %s WHERE id = %s", (new_status, deal_id))
#     conn.commit()
#     rows_updated = cur.rowcount
#     cur.close()
#     conn.close()

#     if rows_updated == 0:
#         return jsonify({"error": "deal not found"}), 404

#     return jsonify({"deal_id": deal_id, "status": new_status})


# if __name__ == "__main__":
#     app.run(debug=True, port=5000)

from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import psycopg2.extras

app = Flask(__name__)
CORS(app)

# ==============================
# DATABASE CONFIG
# ==============================

DB_CONFIG = {
    "dbname": "p2p_deal_db",
    "user": "postgres",
    "password": "12345678",
    "host": "localhost",
    "port": "3319",
}


def get_db():
    return psycopg2.connect(**DB_CONFIG)


# ==============================
# HOME
# ==============================

@app.route("/")
def home():
    return jsonify({
        "message": "P2P Deal API Running"
    })


# ==============================
# REGISTER
# ==============================

@app.route("/api/register/", methods=["POST"])
def register():

    data = request.get_json()

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({
            "error": "Please fill in all fields."
        }), 400

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=psycopg2.extras.RealDictCursor
    )

    cur.execute(
        "SELECT id FROM users WHERE email=%s",
        (email,)
    )

    existing_user = cur.fetchone()

    if existing_user:

        cur.close()
        conn.close()

        return jsonify({
            "error": "Email already exists."
        }), 400

    cur.execute("""
        INSERT INTO users
        (
            username,
            email,
            password
        )
        VALUES
        (
            %s,
            %s,
            %s
        )
        RETURNING id
    """,
    (
        username,
        email,
        password
    ))

    new_user = cur.fetchone()

    conn.commit()

    cur.close()
    conn.close()

    return jsonify({

        "message": "Registration successful.",

        "token": "demo-token",

        "user_id": new_user["id"]

    }), 201


# ==============================
# LOGIN
# ==============================

@app.route("/api/login/", methods=["POST"])
def login():

    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:

        return jsonify({
            "error": "Email and password are required."
        }), 400

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=psycopg2.extras.RealDictCursor
    )

    cur.execute("""
        SELECT *
        FROM users
        WHERE email=%s
        AND password=%s
    """,
    (
        email,
        password
    ))

    user = cur.fetchone()

    cur.close()
    conn.close()

    if not user:

        return jsonify({
            "error": "Invalid email or password."
        }), 401

    return jsonify({

        "token": "demo-token",

        "user_id": user["id"],

        "username": user["username"],

        "email": user["email"]

    })
# ==============================
# CREATE DEAL
# ==============================

@app.route("/api/deal", methods=["POST"])
def create_deal():

    data = request.get_json()

    buyer_id = data.get("buyer_id")
    seller_id = data.get("seller_id")
    middleman_id = data.get("middleman_id")
    item_name = data.get("item_name")
    price = data.get("price")

    if buyer_id is None or seller_id is None or not item_name or price is None:
        return jsonify({
            "error": "Missing required fields."
        }), 400

    try:

        conn = get_db()

        cur = conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        )

        cur.execute("""
            INSERT INTO deals
            (
                buyer_id,
                seller_id,
                middleman_id,
                item_name,
                price
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s
            )
            RETURNING *
        """,
        (
            buyer_id,
            seller_id,
            middleman_id,
            item_name,
            price
        ))

        deal = cur.fetchone()

        conn.commit()

        cur.close()
        conn.close()

        return jsonify(deal), 201

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# ==============================
# GET DEAL BY ID
# ==============================

@app.route("/api/deal/<int:deal_id>", methods=["GET"])
def get_deal(deal_id):

    try:

        conn = get_db()

        cur = conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        )

        cur.execute("""
            SELECT *
            FROM deals
            WHERE id=%s
        """,
        (deal_id,)
        )

        deal = cur.fetchone()

        cur.close()
        conn.close()

        if not deal:
            return jsonify({
                "error": "Deal not found."
            }), 404

        return jsonify(deal)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# ==============================
# UPDATE DEAL STATUS
# ==============================

@app.route("/api/deal/<int:deal_id>/status", methods=["PATCH"])
def update_status(deal_id):

    data = request.get_json()

    status = data.get("status")

    if not status:
        return jsonify({
            "error": "Status is required."
        }), 400

    try:

        conn = get_db()

        cur = conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        )

        cur.execute("""
            UPDATE deals
            SET status=%s
            WHERE id=%s
            RETURNING *
        """,
        (
            status,
            deal_id
        ))

        updated = cur.fetchone()

        if not updated:

            conn.rollback()

            cur.close()
            conn.close()

            return jsonify({
                "error": "Deal not found."
            }), 404

        conn.commit()

        cur.close()
        conn.close()

        return jsonify(updated)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# ==============================
# LIST ALL DEALS
# ==============================

@app.route("/api/deals", methods=["GET"])
def list_deals():

    try:

        conn = get_db()

        cur = conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        )

        cur.execute("""
            SELECT *
            FROM deals
            ORDER BY created_at DESC
        """)

        deals = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify(deals)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# ==============================
# START SERVER
# ==============================

if __name__ == "__main__":
    app.run(
        debug=True,
    host="0.0.0.0",
    port=8000
    )