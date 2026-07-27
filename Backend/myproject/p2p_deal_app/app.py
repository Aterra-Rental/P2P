import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from admin import admin_bp
from admin.verification import verification_bp
from config import Config
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.room import room_bp
from routes.transaction import transaction_bp
from routes.wallet import wallet_bp
from routes.bakong import bakong_bp
from routes.participant import participant_bp
app = Flask(__name__)
app.config.from_object(Config)

CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")


@app.route("/")
def home():
    return {"message": "P2P Backend is running"}


@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# Register all blueprints
app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(profile_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(verification_bp, url_prefix="/api/admin")
app.register_blueprint(room_bp, url_prefix="/api")
app.register_blueprint(transaction_bp, url_prefix="/api")
app.register_blueprint(wallet_bp, url_prefix="/api")
app.register_blueprint(bakong_bp, url_prefix="/api")
app.register_blueprint(participant_bp, url_prefix="/api")
if __name__ == "__main__":
    app.run(debug=True, port=8000)