from flask import jsonify
from . import admin_bp

@admin_bp.route("/dashboard", methods=["GET"])
def dashboard():
    return jsonify({
        "message": "Admin Dashboard API is working!"
    })