from flask import Flask, request, jsonify, render_template
import psycopg2
import psycopg2.extras

app = Flask(__name__)

DB_CONFIG = {
    "dbname": "p2p_deal_db",
    "user": "postgres",
    "password": "320606531",
    "host": "localhost",
    "port": "3620",
}

def get_db():
    return psycopg2.connect(**DB_CONFIG)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/deal", methods=["POST"])
def create_deal():
    data = request.get_json()
    buyer_id = data.get("buyer_id")
    seller_id = data.get("seller_id")
    middleman_id = data.get("middleman_id")
    item_name = data.get("item_name")
    price = data.get("price")

    if not all([buyer_id, seller_id, item_name, price]):
        return jsonify({"error": "missing fields"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO deals (buyer_id, seller_id, middleman_id, item_name, price, status)
           VALUES (%s, %s, %s, %s, %s, 'pending') RETURNING id""",
        (buyer_id, seller_id, middleman_id, item_name, price)
    )
    deal_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"deal_id": deal_id, "status": "pending"}), 201


@app.route("/api/deal/<int:deal_id>", methods=["GET"])
def get_deal(deal_id):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM deals WHERE id = %s", (deal_id,))
    deal = cur.fetchone()
    cur.close()
    conn.close()

    if not deal:
        return jsonify({"error": "deal not found"}), 404

    return jsonify(dict(deal))


@app.route("/api/deal/<int:deal_id>/status", methods=["PATCH"])
def update_status(deal_id):
    data = request.get_json()
    new_status = data.get("status")

    valid_statuses = ["pending", "active", "completed", "cancelled"]
    if new_status not in valid_statuses:
        return jsonify({"error": f"status must be one of {valid_statuses}"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE deals SET status = %s WHERE id = %s", (new_status, deal_id))
    conn.commit()
    rows_updated = cur.rowcount
    cur.close()
    conn.close()

    if rows_updated == 0:
        return jsonify({"error": "deal not found"}), 404

    return jsonify({"deal_id": deal_id, "status": new_status})


if __name__ == "__main__":
    app.run(debug=True, port=5000)